//! Modbus 슬레이브 흉내 — 레지스터 표를 들고 마스터 요청에 답한다.
//! 요청 처리는 PDU(함수 코드 + 데이터) 하나로 하고, 감싸는 모양만 RTU(주소 + CRC)·TCP(MBAP 머리)로 나눈다.
//! 하드웨어 시험용 장애 주입: 응답 지연(범위), 무응답, 예외 강제, CRC·MBAP 길이 깨기 — 국번·함수·주소·N번째·확률로 대상 지정.
//! 값 자동 변화(증가·랜덤·사인…)는 `tick`(주기) 또는 읽을 때(`period_ms` 0) 바꾼다.

use crate::checksum::crc16_modbus;
use crate::regmap::{Rng, SimRun, SimSpec, ValueType, decode, encode};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::time::{Duration, Instant};

pub const TABLE_SIZE: usize = 65_536;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Table {
    Coils,
    DiscreteInputs,
    HoldingRegisters,
    InputRegisters,
}

impl Table {
    pub fn is_bits(self) -> bool {
        matches!(self, Self::Coils | Self::DiscreteInputs)
    }
}

/// 슬레이브 하나의 데이터. 비트 표도 u16 으로 들고(0/1) 화면과 같은 모양으로 다룬다.
#[derive(Clone)]
pub struct Model {
    pub coils: Vec<u16>,
    pub discrete: Vec<u16>,
    pub holding: Vec<u16>,
    pub input: Vec<u16>,
    /// 응답하는 주소 범위(시작, 개수). 범위 밖이면 예외 02.
    pub ranges: BTreeMap<Table, (u16, u32)>,
    /// 값 자동 변화 — 표마다
    pub sims: BTreeMap<Table, Vec<SimRun>>,
}

impl Default for Model {
    fn default() -> Self {
        let mut ranges = BTreeMap::new();
        for t in [Table::Coils, Table::DiscreteInputs, Table::HoldingRegisters, Table::InputRegisters] {
            ranges.insert(t, (0, 100));
        }
        Self {
            coils: vec![0; TABLE_SIZE],
            discrete: vec![0; TABLE_SIZE],
            holding: vec![0; TABLE_SIZE],
            input: vec![0; TABLE_SIZE],
            ranges,
            sims: BTreeMap::new(),
        }
    }
}

impl PartialOrd for Table {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for Table {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        (*self as u8).cmp(&(*other as u8))
    }
}

/// 자동 변화 하나를 표에 적용한다 — 지금 값(마스터가 쓴 값 포함)에서 다음 값을 만든다
fn apply_sim(table: &mut [u16], spec: &SimSpec, t: Duration, rng: &mut Rng) {
    let (a, b) = spec.span();
    let (a, b) = (a as usize, b as usize);
    if b > table.len() {
        return;
    }
    let ty = spec.value_type;
    let cur = decode(&table[a..b], ty, spec.order).unwrap_or(0.0);
    let v = spec.next(cur, t, rng);
    table[a..b].copy_from_slice(&encode(v, ty, spec.order));
}

impl Model {
    pub fn table(&self, t: Table) -> &Vec<u16> {
        match t {
            Table::Coils => &self.coils,
            Table::DiscreteInputs => &self.discrete,
            Table::HoldingRegisters => &self.holding,
            Table::InputRegisters => &self.input,
        }
    }

    pub fn table_mut(&mut self, t: Table) -> &mut Vec<u16> {
        match t {
            Table::Coils => &mut self.coils,
            Table::DiscreteInputs => &mut self.discrete,
            Table::HoldingRegisters => &mut self.holding,
            Table::InputRegisters => &mut self.input,
        }
    }

    fn in_range(&self, t: Table, start: u16, qty: u16) -> bool {
        let (s, n) = self.ranges.get(&t).copied().unwrap_or((0, TABLE_SIZE as u32));
        let (start, end) = (start as u32, start as u32 + qty as u32);
        start >= s as u32 && end <= s as u32 + n
    }

    /// «읽을 때마다» 자동 변화 — 읽는 범위에 걸친 것만
    fn sims_on_read(&mut self, t: Table, start: u16, qty: u16, ctx: &mut Ctx) {
        let Some(list) = self.sims.get(&t) else { return };
        let (lo, hi) = (start as u32, start as u32 + qty as u32);
        let due: Vec<SimSpec> = list.iter().filter(|r| r.spec.on_read() && r.spec.span().0 < hi && r.spec.span().1 > lo).map(|r| r.spec.clone()).collect();
        for spec in due {
            apply_sim(self.table_mut(t), &spec, ctx.t, ctx.rng);
        }
    }

    /// 주기 자동 변화 — 때가 된 것만
    fn tick(&mut self, now: Instant, t: Duration, rng: &mut Rng) {
        let tables: Vec<Table> = self.sims.keys().copied().collect();
        for tb in tables {
            let mut list = std::mem::take(self.sims.get_mut(&tb).unwrap());
            for run in list.iter_mut().filter(|r| !r.spec.on_read()) {
                if run.last.is_some_and(|l| now.duration_since(l) < Duration::from_millis(run.spec.period_ms)) {
                    continue;
                }
                run.last = Some(now);
                apply_sim(self.table_mut(tb), &run.spec, t, rng);
            }
            *self.sims.get_mut(&tb).unwrap() = list;
        }
    }
}

/// 장애를 걸 요청 고르기. 비어 있으면 모두
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FaultTarget {
    /// 이 국번(유닛 ID)으로 온 요청만
    #[serde(default)]
    pub slave_ids: Vec<u8>,
    /// 이 함수 코드만
    #[serde(default)]
    pub functions: Vec<u8>,
    /// 요청 주소 범위가 [from, to] 와 겹칠 때만(주소가 없는 08·2B 는 이 조건이 있으면 빠진다)
    #[serde(default)]
    pub addr_from: Option<u16>,
    #[serde(default)]
    pub addr_to: Option<u16>,
    /// 조건에 맞는 요청 N번째마다(0·1 = 매번)
    #[serde(default)]
    pub every_nth: u32,
    /// 확률(%) — 100 이면 늘
    #[serde(default = "full")]
    pub probability: u8,
}

fn full() -> u8 {
    100
}

impl Default for FaultTarget {
    fn default() -> Self {
        Self { slave_ids: Vec::new(), functions: Vec::new(), addr_from: None, addr_to: None, every_nth: 0, probability: 100 }
    }
}

/// 장애 주입 설정
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Faults {
    /// 응답 지연(ms). `delay_max_ms` 가 더 크면 그 사이 아무 값(흔들림)
    pub delay_ms: u64,
    #[serde(default)]
    pub delay_max_ms: u64,
    /// 응답하지 않음(타임아웃 시험). 요청은 평소대로 처리한다 — 쓰기 요청(05·06·0F·10·16·17)이면
    /// 값은 표에 반영되고 응답만 나가지 않는다(«받아서 처리했지만 응답이 사라진» 장비 흉내).
    /// 쓰기까지 막으려면 이 옵션 대신 연결을 닫는다.
    pub no_response: bool,
    /// 이 예외 코드로 답함(0 이면 끔)
    pub force_exception: u8,
    /// 응답 CRC 를 일부러 틀리게(RTU)
    pub bad_crc: bool,
    /// 응답 MBAP 길이 칸을 일부러 틀리게(Modbus TCP)
    #[serde(default)]
    pub bad_mbap_len: bool,
    #[serde(default)]
    pub target: FaultTarget,
}

impl Faults {
    pub fn active(&self) -> bool {
        self.delay_ms > 0 || self.delay_max_ms > 0 || self.no_response || self.force_exception != 0 || self.bad_crc || self.bad_mbap_len
    }
}

/// 2B/0E 장치 식별(기본 등급: 제조사·제품 코드·버전)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceId {
    pub vendor: String,
    pub product_code: String,
    pub revision: String,
}

impl Default for DeviceId {
    fn default() -> Self {
        Self { vendor: "PortDock".into(), product_code: "Modbus Slave".into(), revision: "1.0".into() }
    }
}

/// 장치 식별 문자열 한 개의 최대 길이(바이트) — 세 개가 응답 한 개(PDU 253)에 들어가게
pub const DEVICE_ID_MAX: usize = 80;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SlaveOptions {
    /// 어떤 유닛 ID(0·255 포함)로 와도 답한다 — 목록에 있는 국번이면 그 표, 아니면 첫 국번의 표
    #[serde(default)]
    pub ignore_unit_id: bool,
}

/// 요청 하나를 처리한 결과 — 화면 기록·통계용
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Outcome {
    pub slave: u8,
    pub function: u8,
    /// "ok" | "exception" | "broadcast" | "ignored-crc" | "ignored-mbap" | "ignored-id" | "no-response"
    pub result: &'static str,
    pub exception: Option<u8>,
    /// 마스터가 값을 바꿨으면 그 표
    pub written: Option<Table>,
    /// 응답을 이만큼 늦게(장애 주입)
    pub delay_ms: u64,
    /// 이 요청에 장애 주입이 걸렸는지
    pub faulted: bool,
}

impl Outcome {
    fn new(slave: u8, function: u8, result: &'static str) -> Self {
        Self { slave, function, result, exception: None, written: None, delay_ms: 0, faulted: false }
    }
}

pub struct Slave {
    pub models: BTreeMap<u8, Model>,
    pub faults: Faults,
    pub options: SlaveOptions,
    pub device: DeviceId,
    rng: Rng,
    /// 대상 조건에 맞은 요청 수(N번째마다)
    fault_count: u64,
    /// 사인·램프의 시각 기준
    t0: Instant,
}

impl Default for Slave {
    fn default() -> Self {
        Self::with_rng(Rng::from_time())
    }
}

/// 함수 실행에 필요한 것(자동 변화의 시각·난수, 장치 식별)
struct Ctx<'a> {
    t: Duration,
    rng: &'a mut Rng,
    device: &'a DeviceId,
}

fn with_crc(mut body: Vec<u8>, bad: bool) -> Vec<u8> {
    let crc = crc16_modbus(&body) ^ if bad { 0xFFFF } else { 0 };
    body.extend(crc.to_le_bytes());
    body
}

fn u16_at(b: &[u8], i: usize) -> Option<u16> {
    Some(u16::from_be_bytes([*b.get(i)?, *b.get(i + 1)?]))
}

fn pack_bits(bits: &[u16]) -> Vec<u8> {
    let mut out = vec![0u8; bits.len().div_ceil(8)];
    for (i, &b) in bits.iter().enumerate() {
        if b != 0 {
            out[i / 8] |= 1 << (i % 8);
        }
    }
    out
}

/// 요청이 건드리는 주소 범위들(시작, 개수) — 장애 대상의 주소 조건에 쓴다
pub fn request_spans(func: u8, d: &[u8]) -> Vec<(u16, u32)> {
    let (Some(a), Some(b)) = (u16_at(d, 0), u16_at(d, 2)) else { return Vec::new() };
    match func {
        0x01..=0x04 | 0x0F | 0x10 => vec![(a, b as u32)],
        0x05 | 0x06 | 0x16 => vec![(a, 1)],
        0x17 => {
            let mut v = vec![(a, b as u32)];
            if let (Some(c), Some(e)) = (u16_at(d, 4), u16_at(d, 6)) {
                v.push((c, e as u32));
            }
            v
        }
        _ => Vec::new(),
    }
}

impl Slave {
    /// 씨앗을 정해 만든다(시험에서 확률 장애·랜덤 값을 재현)
    pub fn with_seed(seed: u64) -> Self {
        Self::with_rng(Rng::new(seed))
    }

    fn with_rng(rng: Rng) -> Self {
        let mut models = BTreeMap::new();
        models.insert(1, Model::default());
        Self { models, faults: Faults::default(), options: SlaveOptions::default(), device: DeviceId::default(), rng, fault_count: 0, t0: Instant::now() }
    }

    /// 장애 설정을 바꾼다 — N번째 세기도 처음부터
    pub fn set_faults(&mut self, f: Faults) {
        self.faults = f;
        self.fault_count = 0;
    }

    /// 장치 식별 문자열 검사(ASCII 가 아니어도 되지만 길이는 바이트로 센다)
    pub fn set_device(&mut self, d: DeviceId) -> Result<(), String> {
        for (name, s) in [("vendor", &d.vendor), ("product code", &d.product_code), ("revision", &d.revision)] {
            if s.len() > DEVICE_ID_MAX {
                return Err(crate::tr!(format!("장치 식별 «{name}» 이 {DEVICE_ID_MAX}바이트를 넘습니다"), format!("Device ID «{name}» is longer than {DEVICE_ID_MAX} bytes")));
            }
        }
        self.device = d;
        Ok(())
    }

    /// 표 하나의 자동 변화를 바꾼다. 비트 표는 0/1 만(타입을 bit 로)
    pub fn set_sims(&mut self, id: u8, table: Table, specs: Vec<SimSpec>) -> Result<(), String> {
        let mut runs = Vec::with_capacity(specs.len());
        for mut s in specs {
            if table.is_bits() {
                s.value_type = ValueType::Bit;
            } else if s.value_type == ValueType::Bit {
                s.value_type = ValueType::U16;
            }
            s.check()?;
            runs.push(SimRun::from(s));
        }
        let m = self.models.get_mut(&id).ok_or_else(|| crate::tr!("없는 슬레이브", "Unknown slave ID").to_string())?;
        if runs.is_empty() {
            m.sims.remove(&table);
        } else {
            m.sims.insert(table, runs);
        }
        Ok(())
    }

    /// 주기 자동 변화 — 앱이 100ms 쯤마다 부른다
    pub fn tick(&mut self, now: Instant) {
        let t = now.saturating_duration_since(self.t0);
        let Slave { models, rng, .. } = self;
        for m in models.values_mut() {
            m.tick(now, t, rng);
        }
    }

    /// 자동 변화가 하나라도 있는지(없으면 tick 을 건너뛰어도 된다)
    pub fn has_sims(&self) -> bool {
        self.models.values().any(|m| !m.sims.is_empty())
    }

    /// RTU 프레임 하나를 처리한다(국번 + PDU + CRC). 돌려주는 응답이 None 이면 아무것도 보내지 않는다.
    pub fn handle(&mut self, frame: &[u8]) -> (Option<Vec<u8>>, Outcome) {
        let mut o = Outcome::new(frame.first().copied().unwrap_or(0), frame.get(1).copied().unwrap_or(0), "ignored-crc");
        if frame.len() < 4 || crc16_modbus(&frame[..frame.len() - 2]).to_le_bytes() != frame[frame.len() - 2..] {
            return (None, o);
        }
        let unit = frame[0];
        let resp = self.handle_pdu(unit, &frame[1..frame.len() - 2], &mut o);
        let bad = o.faulted && self.faults.bad_crc;
        (resp.map(|pdu| with_crc([&[unit][..], &pdu].concat(), bad)), o)
    }

    /// Modbus TCP 요청 하나(MBAP 7바이트 + PDU). 트랜잭션 ID·유닛 ID 는 그대로 돌려준다.
    /// 프로토콜 ID 가 0 이 아니거나 길이 칸이 실제 길이와 다르면 답하지 않는다(«ignored-mbap»).
    pub fn handle_tcp(&mut self, adu: &[u8]) -> (Option<Vec<u8>>, Outcome) {
        let mut o = Outcome::new(adu.get(6).copied().unwrap_or(0), adu.get(7).copied().unwrap_or(0), "ignored-mbap");
        let (Some(proto), Some(len)) = (u16_at(adu, 2), u16_at(adu, 4)) else { return (None, o) };
        if adu.len() < 8 || proto != 0 || len as usize != adu.len() - 6 {
            return (None, o);
        }
        let unit = adu[6];
        let Some(pdu) = self.handle_pdu(unit, &adu[7..], &mut o) else { return (None, o) };
        let wrong = (o.faulted && self.faults.bad_mbap_len) as u16;
        let n = (pdu.len() as u16 + 1).wrapping_add(wrong);
        let mut r = vec![adu[0], adu[1], 0, 0];
        r.extend(n.to_be_bytes());
        r.push(unit);
        r.extend(pdu);
        (Some(r), o)
    }

    /// 감싸는 모양과 상관없는 처리. 응답 PDU(함수 코드부터) 또는 None(답하지 않음)
    fn handle_pdu(&mut self, unit: u8, pdu: &[u8], o: &mut Outcome) -> Option<Vec<u8>> {
        let (&func, data) = pdu.split_first()?;
        o.function = func;
        let ignore = self.options.ignore_unit_id;
        if unit == 0 && !ignore {
            // 브로드캐스트는 쓰기만 모든 슬레이브에 적용하고 답하지 않는다
            let ids: Vec<u8> = self.models.keys().copied().collect();
            for i in ids {
                if let Ok((_, w)) = self.exec(i, func, data) {
                    o.written = o.written.or(w);
                }
            }
            o.result = "broadcast";
            return None;
        }
        let id = if self.models.contains_key(&unit) {
            unit
        } else if ignore && let Some(&first) = self.models.keys().next() {
            first
        } else {
            o.result = "ignored-id";
            return None;
        };

        let faulted = self.fault_applies(unit, func, data);
        o.faulted = faulted;
        if faulted {
            o.delay_ms = self.pick_delay();
        }
        let ex = if faulted && self.faults.force_exception != 0 { Err(self.faults.force_exception) } else { self.exec(id, func, data) };
        let resp = match ex {
            Ok((body, written)) => {
                o.result = "ok";
                o.written = written;
                [&[func][..], &body].concat()
            }
            Err(code) => {
                o.result = "exception";
                o.exception = Some(code);
                vec![func | 0x80, code]
            }
        };
        // 쓰기는 위에서 이미 표에 반영됐다 — 일부러 그렇게 둔다(Faults::no_response 참고)
        if faulted && self.faults.no_response {
            o.result = "no-response";
            o.delay_ms = 0;
            return None;
        }
        Some(resp)
    }

    fn exec(&mut self, id: u8, func: u8, data: &[u8]) -> Result<(Vec<u8>, Option<Table>), u8> {
        let t = self.t0.elapsed();
        let Slave { models, rng, device, .. } = self;
        let m = models.get_mut(&id).ok_or(4u8)?;
        execute(m, func, data, &mut Ctx { t, rng, device })
    }

    /// 이 요청에 장애를 걸지 — 대상 조건 → N번째 → 확률 순
    fn fault_applies(&mut self, unit: u8, func: u8, data: &[u8]) -> bool {
        if !self.faults.active() {
            return false;
        }
        let t = &self.faults.target;
        if !t.slave_ids.is_empty() && !t.slave_ids.contains(&unit) {
            return false;
        }
        if !t.functions.is_empty() && !t.functions.contains(&func) {
            return false;
        }
        if t.addr_from.is_some() || t.addr_to.is_some() {
            let (lo, hi) = (t.addr_from.unwrap_or(0) as u32, t.addr_to.unwrap_or(u16::MAX) as u32);
            let hit = request_spans(func, data).iter().any(|&(s, n)| n > 0 && (s as u32) <= hi && s as u32 + n > lo);
            if !hit {
                return false;
            }
        }
        self.fault_count += 1;
        let nth = t.every_nth.max(1) as u64;
        if !self.fault_count.is_multiple_of(nth) {
            return false;
        }
        let p = t.probability.min(100);
        p >= 100 || self.rng.unit() * 100.0 < p as f64
    }

    fn pick_delay(&mut self) -> u64 {
        let (lo, hi) = (self.faults.delay_ms, self.faults.delay_max_ms);
        if hi > lo { self.rng.range(lo, hi) } else { lo }
    }
}

/// 함수 코드 실행(`d` 는 함수 코드 뒤 데이터). Ok(응답 본문(함수 코드 뒤), 쓴 표), Err(예외 코드)
fn execute(m: &mut Model, func: u8, d: &[u8], ctx: &mut Ctx) -> Result<(Vec<u8>, Option<Table>), u8> {
    // 길이를 보기 전에 함수부터 — 모르는 함수는 본문이 짧아도 01
    if !matches!(func, 0x01..=0x06 | 0x08 | 0x0F | 0x10 | 0x16 | 0x17 | 0x2B) {
        return Err(1);
    }
    let first = u16_at(d, 0);
    let second = u16_at(d, 2);
    match func {
        0x01 | 0x02 => {
            let (start, qty) = (first.ok_or(3u8)?, second.ok_or(3u8)?);
            let t = if func == 0x01 { Table::Coils } else { Table::DiscreteInputs };
            if !(1..=2000).contains(&qty) {
                return Err(3);
            }
            if !m.in_range(t, start, qty) {
                return Err(2);
            }
            m.sims_on_read(t, start, qty, ctx);
            let packed = pack_bits(&m.table(t)[start as usize..start as usize + qty as usize]);
            let mut body = vec![packed.len() as u8];
            body.extend(packed);
            Ok((body, None))
        }
        0x03 | 0x04 => {
            let (start, qty) = (first.ok_or(3u8)?, second.ok_or(3u8)?);
            let t = if func == 0x03 { Table::HoldingRegisters } else { Table::InputRegisters };
            if !(1..=125).contains(&qty) {
                return Err(3);
            }
            if !m.in_range(t, start, qty) {
                return Err(2);
            }
            m.sims_on_read(t, start, qty, ctx);
            Ok((read_regs(m, t, start, qty), None))
        }
        0x05 => {
            let (start, v) = (first.ok_or(3u8)?, second.ok_or(3u8)?);
            let v = match v {
                0xFF00 => 1,
                0x0000 => 0,
                _ => return Err(3),
            };
            if !m.in_range(Table::Coils, start, 1) {
                return Err(2);
            }
            m.coils[start as usize] = v;
            Ok((d[..4].to_vec(), Some(Table::Coils)))
        }
        0x06 => {
            let (start, v) = (first.ok_or(3u8)?, second.ok_or(3u8)?);
            if !m.in_range(Table::HoldingRegisters, start, 1) {
                return Err(2);
            }
            m.holding[start as usize] = v;
            Ok((d[..4].to_vec(), Some(Table::HoldingRegisters)))
        }
        0x0F => {
            let (start, qty) = (first.ok_or(3u8)?, second.ok_or(3u8)?);
            let n = *d.get(4).ok_or(3u8)? as usize;
            if !(1..=1968).contains(&qty) || n != (qty as usize).div_ceil(8) || d.len() < 5 + n {
                return Err(3);
            }
            if !m.in_range(Table::Coils, start, qty) {
                return Err(2);
            }
            for i in 0..qty as usize {
                m.coils[start as usize + i] = ((d[5 + i / 8] >> (i % 8)) & 1) as u16;
            }
            Ok((d[..4].to_vec(), Some(Table::Coils)))
        }
        0x10 => {
            let (start, qty) = (first.ok_or(3u8)?, second.ok_or(3u8)?);
            let n = *d.get(4).ok_or(3u8)? as usize;
            if !(1..=123).contains(&qty) || n != qty as usize * 2 || d.len() < 5 + n {
                return Err(3);
            }
            if !m.in_range(Table::HoldingRegisters, start, qty) {
                return Err(2);
            }
            for i in 0..qty as usize {
                m.holding[start as usize + i] = u16_at(d, 5 + i * 2).unwrap();
            }
            Ok((d[..4].to_vec(), Some(Table::HoldingRegisters)))
        }
        // 마스크 쓰기: 결과 = (지금 AND and) OR (or AND NOT and). 응답은 요청 그대로
        0x16 => {
            let (addr, and) = (first.ok_or(3u8)?, second.ok_or(3u8)?);
            let or = u16_at(d, 4).ok_or(3u8)?;
            if !m.in_range(Table::HoldingRegisters, addr, 1) {
                return Err(2);
            }
            let cur = m.holding[addr as usize];
            m.holding[addr as usize] = (cur & and) | (or & !and);
            Ok((d[..6].to_vec(), Some(Table::HoldingRegisters)))
        }
        // 읽기/쓰기 한 번에 — 규격대로 쓰기 먼저, 그다음 읽기
        0x17 => {
            let (rs, rq) = (first.ok_or(3u8)?, second.ok_or(3u8)?);
            let (ws, wq) = (u16_at(d, 4).ok_or(3u8)?, u16_at(d, 6).ok_or(3u8)?);
            let n = *d.get(8).ok_or(3u8)? as usize;
            if !(1..=125).contains(&rq) || !(1..=121).contains(&wq) || n != wq as usize * 2 || d.len() < 9 + n {
                return Err(3);
            }
            let t = Table::HoldingRegisters;
            if !m.in_range(t, ws, wq) || !m.in_range(t, rs, rq) {
                return Err(2);
            }
            for i in 0..wq as usize {
                m.holding[ws as usize + i] = u16_at(d, 9 + i * 2).unwrap();
            }
            m.sims_on_read(t, rs, rq, ctx);
            Ok((read_regs(m, t, rs, rq), Some(t)))
        }
        // 진단: 하위 함수 00(받은 데이터 되돌려 보내기)만
        0x08 => {
            let sub = first.ok_or(3u8)?;
            if sub != 0 {
                return Err(1);
            }
            Ok((d.to_vec(), None))
        }
        0x2B => read_device_id(d, ctx.device),
        _ => Err(1),
    }
}

fn read_regs(m: &Model, t: Table, start: u16, qty: u16) -> Vec<u8> {
    let mut body = vec![(qty * 2) as u8];
    for v in &m.table(t)[start as usize..start as usize + qty as usize] {
        body.extend(v.to_be_bytes());
    }
    body
}

/// 2B/0E Read Device Identification — 기본 등급(00 제조사, 01 제품 코드, 02 버전).
/// 코드 1(기본 묶음)·2·3(이 장비 등급인 기본으로 답함)·4(하나씩). 등급 0x81 = 기본 + 하나씩 읽기 지원
fn read_device_id(d: &[u8], dev: &DeviceId) -> Result<(Vec<u8>, Option<Table>), u8> {
    let mei = *d.first().ok_or(3u8)?;
    if mei != 0x0E {
        return Err(1);
    }
    let (code, obj) = (*d.get(1).ok_or(3u8)?, *d.get(2).ok_or(3u8)?);
    let objs: [&str; 3] = [&dev.vendor, &dev.product_code, &dev.revision];
    let ids: Vec<u8> = match code {
        1..=3 => {
            // 모르는 객체부터 달라면 처음(0)부터
            let from = if (obj as usize) < objs.len() { obj } else { 0 };
            (from..objs.len() as u8).collect()
        }
        4 => {
            if obj as usize >= objs.len() {
                return Err(2);
            }
            vec![obj]
        }
        _ => return Err(3),
    };
    let mut body = vec![0x0E, code, 0x81, 0x00, 0x00, ids.len() as u8];
    for i in ids {
        let s = objs[i as usize].as_bytes();
        let s = &s[..s.len().min(DEVICE_ID_MAX)];
        body.push(i);
        body.push(s.len() as u8);
        body.extend(s);
    }
    Ok((body, None))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::regmap::{SimKind, WordOrder};

    fn req(body: &[u8]) -> Vec<u8> {
        with_crc(body.to_vec(), false)
    }

    fn crc_ok(f: &[u8]) -> bool {
        crc16_modbus(&f[..f.len() - 2]).to_le_bytes() == f[f.len() - 2..]
    }

    fn slave() -> Slave {
        Slave::with_seed(1)
    }

    #[test]
    fn read_holding() {
        let mut s = slave();
        s.models.get_mut(&1).unwrap().holding[10] = 555;
        let (r, o) = s.handle(&req(&[1, 3, 0, 10, 0, 2]));
        let r = r.unwrap();
        assert_eq!(&r[..7], &[1, 3, 4, 0x02, 0x2B, 0, 0]);
        assert!(crc_ok(&r));
        assert_eq!(o.result, "ok");
    }

    #[test]
    fn write_single_and_multiple() {
        let mut s = slave();
        let (r, o) = s.handle(&req(&[1, 6, 0, 5, 0x12, 0x34]));
        assert_eq!(&r.unwrap()[..6], &[1, 6, 0, 5, 0x12, 0x34]);
        assert_eq!(o.written, Some(Table::HoldingRegisters));
        assert_eq!(s.models[&1].holding[5], 0x1234);

        let (r, _) = s.handle(&req(&[1, 0x10, 0, 0, 0, 2, 4, 0, 1, 0, 2]));
        assert_eq!(&r.unwrap()[..6], &[1, 0x10, 0, 0, 0, 2]);
        assert_eq!(&s.models[&1].holding[0..2], &[1, 2]);
    }

    #[test]
    fn coils_round_trip() {
        let mut s = slave();
        s.handle(&req(&[1, 0x0F, 0, 0, 0, 10, 2, 0b1010_0101, 0b10]));
        let (r, _) = s.handle(&req(&[1, 1, 0, 0, 0, 10]));
        assert_eq!(&r.unwrap()[..5], &[1, 1, 2, 0b1010_0101, 0b10]);
        s.handle(&req(&[1, 5, 0, 1, 0xFF, 0]));
        assert_eq!(s.models[&1].coils[1], 1);
    }

    #[test]
    fn exceptions() {
        let mut s = slave();
        // 범위 밖(기본 0~99)
        let (r, o) = s.handle(&req(&[1, 3, 0, 99, 0, 2]));
        assert_eq!(&r.unwrap()[..3], &[1, 0x83, 2]);
        assert_eq!(o.exception, Some(2));
        // 2B 인데 MEI 가 0E 가 아님 — 01
        let (r, _) = s.handle(&req(&[1, 0x2B, 0, 0, 0, 0]));
        assert_eq!(&r.unwrap()[..3], &[1, 0xAB, 1]);
        // 없는 함수 — 본문이 짧아도 01
        let (r, _) = s.handle(&req(&[1, 0x07]));
        assert_eq!(&r.unwrap()[..3], &[1, 0x87, 1]);
        // 개수 0
        let (r, _) = s.handle(&req(&[1, 3, 0, 0, 0, 0]));
        assert_eq!(&r.unwrap()[..3], &[1, 0x83, 3]);
    }

    #[test]
    fn ignores_other_id_and_bad_crc_broadcast_writes_silently() {
        let mut s = slave();
        assert_eq!(s.handle(&req(&[2, 3, 0, 0, 0, 1])).1.result, "ignored-id");
        let mut bad = req(&[1, 3, 0, 0, 0, 1]);
        bad[7] ^= 1;
        assert_eq!(s.handle(&bad).1.result, "ignored-crc");
        let (r, o) = s.handle(&req(&[0, 6, 0, 3, 0, 9]));
        assert!(r.is_none());
        assert_eq!(o.result, "broadcast");
        assert_eq!(s.models[&1].holding[3], 9);
    }

    #[test]
    fn fault_injection() {
        let mut s = slave();
        s.faults.force_exception = 6;
        assert_eq!(&s.handle(&req(&[1, 3, 0, 0, 0, 1])).0.unwrap()[..3], &[1, 0x83, 6]);
        s.faults.force_exception = 0;
        s.faults.bad_crc = true;
        assert!(!crc_ok(&s.handle(&req(&[1, 3, 0, 0, 0, 1])).0.unwrap()));
        s.faults.bad_crc = false;
        s.faults.no_response = true;
        let (r, o) = s.handle(&req(&[1, 3, 0, 0, 0, 1]));
        assert!(r.is_none());
        assert_eq!(o.result, "no-response");
        s.faults.no_response = false;
        s.faults.delay_ms = 300;
        assert_eq!(s.handle(&req(&[1, 3, 0, 0, 0, 1])).1.delay_ms, 300);
        // 예전 화면이 보내던 모양도 그대로 읽힌다(대상 = 모두, 확률 100)
        let f: Faults = serde_json::from_str(r#"{"delayMs":0,"noResponse":false,"forceException":2,"badCrc":false}"#).unwrap();
        assert_eq!(f.target, FaultTarget::default());
        s.set_faults(f);
        assert_eq!(s.handle(&req(&[1, 3, 0, 0, 0, 1])).1.exception, Some(2));
    }

    // ---------------------------------------------------------------- Modbus TCP

    fn mbap(tid: u16, unit: u8, pdu: &[u8]) -> Vec<u8> {
        let mut v = tid.to_be_bytes().to_vec();
        v.extend([0, 0]);
        v.extend((pdu.len() as u16 + 1).to_be_bytes());
        v.push(unit);
        v.extend(pdu);
        v
    }

    #[test]
    fn mbap_echo_and_checks() {
        let mut s = slave();
        s.models.get_mut(&1).unwrap().holding[0] = 0x1234;
        let (r, o) = s.handle_tcp(&mbap(0xBEEF, 1, &[3, 0, 0, 0, 1]));
        // 트랜잭션 ID·프로토콜 0·길이(유닛 + PDU 4)·유닛 ID
        assert_eq!(r.unwrap(), vec![0xBE, 0xEF, 0, 0, 0, 5, 1, 3, 2, 0x12, 0x34]);
        assert_eq!((o.result, o.slave, o.function), ("ok", 1, 3));
        // 예외도 같은 머리
        let (r, _) = s.handle_tcp(&mbap(7, 1, &[3, 0, 200, 0, 1]));
        assert_eq!(r.unwrap(), vec![0, 7, 0, 0, 0, 3, 1, 0x83, 2]);
        // 프로토콜 ID 가 0 이 아님·길이 칸이 틀림·너무 짧음 → 답하지 않음
        let mut p = mbap(1, 1, &[3, 0, 0, 0, 1]);
        p[3] = 1;
        assert_eq!(s.handle_tcp(&p).1.result, "ignored-mbap");
        let mut l = mbap(1, 1, &[3, 0, 0, 0, 1]);
        l[5] = 9;
        assert_eq!(s.handle_tcp(&l), (None, Outcome::new(1, 3, "ignored-mbap")));
        assert_eq!(s.handle_tcp(&[0, 1, 0, 0, 0, 1, 1]).1.result, "ignored-mbap");
        assert_eq!(s.handle_tcp(&[0, 1]).1.result, "ignored-mbap");
    }

    #[test]
    fn mbap_unit_ids() {
        let mut s = slave();
        // 목록에 없는 유닛은 무시, 0 은 브로드캐스트(쓰기만 하고 답 없음)
        assert_eq!(s.handle_tcp(&mbap(1, 255, &[3, 0, 0, 0, 1])).1.result, "ignored-id");
        let (r, o) = s.handle_tcp(&mbap(1, 0, &[6, 0, 2, 0, 7]));
        assert!(r.is_none());
        assert_eq!(o.result, "broadcast");
        assert_eq!(s.models[&1].holding[2], 7);
        // «Unit ID 무시»: 0·255 도 첫 국번의 표로 답하고, 받은 유닛 ID 를 그대로 돌려준다
        s.options.ignore_unit_id = true;
        for unit in [0u8, 255, 9] {
            let (r, o) = s.handle_tcp(&mbap(3, unit, &[3, 0, 2, 0, 1]));
            assert_eq!(r.unwrap(), vec![0, 3, 0, 0, 0, 5, unit, 3, 2, 0, 7], "unit {unit}");
            assert_eq!(o.result, "ok");
        }
        // 목록에 있는 국번이면 그 표
        s.models.insert(9, Model::default());
        s.models.get_mut(&9).unwrap().holding[2] = 99;
        assert_eq!(s.handle_tcp(&mbap(3, 9, &[3, 0, 2, 0, 1])).0.unwrap()[10], 99);
    }

    #[test]
    fn mbap_bad_length_fault() {
        let mut s = slave();
        s.faults.bad_mbap_len = true;
        let (r, o) = s.handle_tcp(&mbap(1, 1, &[3, 0, 0, 0, 1]));
        let r = r.unwrap();
        assert!(o.faulted);
        assert_eq!(u16::from_be_bytes([r[4], r[5]]) as usize, r.len() - 6 + 1);
        // RTU 쪽에는 영향 없음
        assert!(crc_ok(&s.handle(&req(&[1, 3, 0, 0, 0, 1])).0.unwrap()));
    }

    // ---------------------------------------------------------------- 함수 16·17·08·2B

    #[test]
    fn mask_write_register() {
        let mut s = slave();
        s.models.get_mut(&1).unwrap().holding[4] = 0x12;
        // 규격 예: 0x12 AND 0xF2 OR 0x25 → 0x17
        let (r, o) = s.handle(&req(&[1, 0x16, 0, 4, 0, 0xF2, 0, 0x25]));
        assert_eq!(&r.unwrap()[..8], &[1, 0x16, 0, 4, 0, 0xF2, 0, 0x25]);
        assert_eq!(o.written, Some(Table::HoldingRegisters));
        assert_eq!(s.models[&1].holding[4], 0x17);
        // 범위 밖 02, 짧음 03
        assert_eq!(s.handle(&req(&[1, 0x16, 0, 200, 0, 0, 0, 0])).1.exception, Some(2));
        assert_eq!(s.handle(&req(&[1, 0x16, 0, 4, 0, 0])).1.exception, Some(3));
    }

    #[test]
    fn read_write_multiple_writes_first() {
        let mut s = slave();
        s.models.get_mut(&1).unwrap().holding[0..3].copy_from_slice(&[1, 2, 3]);
        // 0~2 를 읽고 1~2 에 0xAA·0xBB 를 쓴다 — 읽은 값에 새 값이 보여야
        let (r, o) = s.handle(&req(&[1, 0x17, 0, 0, 0, 3, 0, 1, 0, 2, 4, 0, 0xAA, 0, 0xBB]));
        assert_eq!(&r.unwrap()[..9], &[1, 0x17, 6, 0, 1, 0, 0xAA, 0, 0xBB]);
        assert_eq!(o.written, Some(Table::HoldingRegisters));
        // 한도: 읽기 126 → 03, 쓰기 122 → 03, 바이트 수 틀림 → 03, 범위 밖 → 02
        let read_126 = req(&[1, 0x17, 0, 0, 0, 126, 0, 0, 0, 1, 2, 0, 1]);
        assert_eq!(s.handle(&read_126).1.exception, Some(3));
        let mut w122 = vec![1, 0x17, 0, 0, 0, 1, 0, 0, 0, 122, 244];
        w122.extend(vec![0; 244]);
        assert_eq!(s.handle(&req(&w122)).1.exception, Some(3));
        assert_eq!(s.handle(&req(&[1, 0x17, 0, 0, 0, 1, 0, 0, 0, 1, 4, 0, 1])).1.exception, Some(3));
        assert_eq!(s.handle(&req(&[1, 0x17, 0, 0, 0, 1, 0, 150, 0, 1, 2, 0, 1])).1.exception, Some(2));
        // 범위 밖이면 쓰지도 않는다
        assert_eq!(s.models[&1].holding[150], 0);
        // 125 읽기·121 쓰기는 된다
        s.models.get_mut(&1).unwrap().ranges.insert(Table::HoldingRegisters, (0, 1000));
        let mut ok = vec![1, 0x17, 0, 0, 0, 125, 1, 0, 0, 121, 242];
        ok.extend(vec![0; 242]);
        assert_eq!(s.handle(&req(&ok)).1.result, "ok");
    }

    #[test]
    fn diagnostics_echo() {
        let mut s = slave();
        let (r, o) = s.handle(&req(&[1, 8, 0, 0, 0xA5, 0x37]));
        assert_eq!(&r.unwrap()[..6], &[1, 8, 0, 0, 0xA5, 0x37]);
        assert_eq!(o.result, "ok");
        // 다른 하위 함수는 01, 짧으면 03
        assert_eq!(s.handle(&req(&[1, 8, 0, 1, 0, 0])).1.exception, Some(1));
        assert_eq!(s.handle(&req(&[1, 8, 0])).1.exception, Some(3));
    }

    #[test]
    fn read_device_identification() {
        let mut s = slave();
        s.set_device(DeviceId { vendor: "ACME".into(), product_code: "X1".into(), revision: "2.3".into() }).unwrap();
        let (r, _) = s.handle(&req(&[1, 0x2B, 0x0E, 1, 0]));
        let r = r.unwrap();
        let mut want = vec![1, 0x2B, 0x0E, 1, 0x81, 0, 0, 3];
        want.extend([0, 4]);
        want.extend(b"ACME");
        want.extend([1, 2]);
        want.extend(b"X1");
        want.extend([2, 3]);
        want.extend(b"2.3");
        assert_eq!(&r[..r.len() - 2], &want[..]);
        // 하나씩(4): 객체 2
        let (r, _) = s.handle(&req(&[1, 0x2B, 0x0E, 4, 2]));
        assert_eq!(&r.unwrap()[..13], &[1, 0x2B, 0x0E, 4, 0x81, 0, 0, 1, 2, 3, b'2', b'.', b'3']);
        // 묶음에서 모르는 객체부터면 처음부터
        let (r, _) = s.handle(&req(&[1, 0x2B, 0x0E, 2, 0x80]));
        assert_eq!(r.unwrap()[7], 3);
        // 하나씩인데 없는 객체 02, 코드 0·5 는 03, MEI 가 0D 면 01, 짧으면 03
        assert_eq!(s.handle(&req(&[1, 0x2B, 0x0E, 4, 3])).1.exception, Some(2));
        assert_eq!(s.handle(&req(&[1, 0x2B, 0x0E, 5, 0])).1.exception, Some(3));
        assert_eq!(s.handle(&req(&[1, 0x2B, 0x0E, 0, 0])).1.exception, Some(3));
        assert_eq!(s.handle(&req(&[1, 0x2B, 0x0D, 1, 0])).1.exception, Some(1));
        assert_eq!(s.handle(&req(&[1, 0x2B, 0x0E])).1.exception, Some(3));
        // 너무 긴 문자열은 거절
        assert!(s.set_device(DeviceId { vendor: "x".repeat(81), ..DeviceId::default() }).is_err());
    }

    // ---------------------------------------------------------------- 값 자동 변화

    fn sim(addr: u16, period_ms: u64, sim: SimKind, t: ValueType) -> SimSpec {
        SimSpec { addr, value_type: t, order: WordOrder::Abcd, period_ms, sim }
    }

    #[test]
    fn periodic_sim_and_master_override() {
        let mut s = slave();
        let inc = SimKind::Increment { step: 1.0, min: 0.0, max: 1000.0, wrap: true };
        s.set_sims(1, Table::HoldingRegisters, vec![sim(5, 100, inc, ValueType::U16)]).unwrap();
        let t0 = Instant::now();
        s.tick(t0);
        assert_eq!(s.models[&1].holding[5], 1);
        // 주기 전이면 그대로
        s.tick(t0 + Duration::from_millis(50));
        assert_eq!(s.models[&1].holding[5], 1);
        s.tick(t0 + Duration::from_millis(100));
        assert_eq!(s.models[&1].holding[5], 2);
        // 마스터가 쓰면 그 값부터 이어 간다
        s.handle(&req(&[1, 6, 0, 5, 0, 50]));
        assert_eq!(s.models[&1].holding[5], 50);
        s.tick(t0 + Duration::from_millis(200));
        assert_eq!(s.models[&1].holding[5], 51);
        // 끄면 멈춘다
        s.set_sims(1, Table::HoldingRegisters, vec![]).unwrap();
        assert!(!s.has_sims());
        s.tick(t0 + Duration::from_millis(400));
        assert_eq!(s.models[&1].holding[5], 51);
    }

    #[test]
    fn on_read_sim_typed_and_bits() {
        let mut s = slave();
        // 읽을 때마다 f32(CDAB) 1.5 씩 증가 — 레지스터 10·11
        let inc = SimKind::Increment { step: 1.5, min: 0.0, max: 100.0, wrap: false };
        let mut spec = sim(10, 0, inc, ValueType::F32);
        spec.order = WordOrder::Cdab;
        s.set_sims(1, Table::HoldingRegisters, vec![spec]).unwrap();
        s.tick(Instant::now() + Duration::from_secs(5));
        assert_eq!(&s.models[&1].holding[10..12], &[0, 0], "읽을 때마다는 tick 으로 바뀌지 않는다");
        // 범위 밖을 읽으면 그대로
        s.handle(&req(&[1, 3, 0, 0, 0, 5]));
        assert_eq!(s.models[&1].holding[10], 0);
        let (r, _) = s.handle(&req(&[1, 3, 0, 11, 0, 1]));
        assert!(r.is_some());
        let v = decode(&s.models[&1].holding[10..12], ValueType::F32, WordOrder::Cdab).unwrap();
        assert_eq!(v, 1.5);
        s.handle(&req(&[1, 3, 0, 10, 0, 2]));
        assert_eq!(decode(&s.models[&1].holding[10..12], ValueType::F32, WordOrder::Cdab), Some(3.0));
        // 코일 토글 — 타입은 bit 로 고쳐진다
        s.set_sims(1, Table::Coils, vec![sim(3, 0, SimKind::Toggle, ValueType::U16)]).unwrap();
        let (r, _) = s.handle(&req(&[1, 1, 0, 0, 0, 8]));
        assert_eq!(r.unwrap()[3], 0b1000);
        let (r, _) = s.handle(&req(&[1, 1, 0, 0, 0, 8]));
        assert_eq!(r.unwrap()[3], 0);
        // 잘못된 설정·없는 국번은 거절
        assert!(s.set_sims(1, Table::HoldingRegisters, vec![sim(65_535, 0, SimKind::Toggle, ValueType::F64)]).is_err());
        assert!(s.set_sims(7, Table::Coils, vec![]).is_err());
    }

    // ---------------------------------------------------------------- 장애 대상 지정

    fn targeted(target: FaultTarget) -> Slave {
        let mut s = Slave::with_seed(1234);
        s.models.insert(2, Model::default());
        s.set_faults(Faults { force_exception: 4, target, ..Faults::default() });
        s
    }

    fn hit(s: &mut Slave, frame: &[u8]) -> bool {
        s.handle(&req(frame)).1.exception == Some(4)
    }

    #[test]
    fn fault_target_ids_functions_addresses() {
        let mut s = targeted(FaultTarget { slave_ids: vec![2], ..FaultTarget::default() });
        assert!(!hit(&mut s, &[1, 3, 0, 0, 0, 1]));
        assert!(hit(&mut s, &[2, 3, 0, 0, 0, 1]));

        let mut s = targeted(FaultTarget { functions: vec![0x10, 0x06], ..FaultTarget::default() });
        assert!(!hit(&mut s, &[1, 3, 0, 0, 0, 1]));
        assert!(hit(&mut s, &[1, 6, 0, 0, 0, 1]));

        // 주소 10~19 와 겹치는 요청만. 08 처럼 주소가 없는 요청은 빠진다
        let mut s = targeted(FaultTarget { addr_from: Some(10), addr_to: Some(19), ..FaultTarget::default() });
        assert!(!hit(&mut s, &[1, 3, 0, 0, 0, 10]));
        assert!(hit(&mut s, &[1, 3, 0, 5, 0, 6]));
        assert!(hit(&mut s, &[1, 3, 0, 19, 0, 1]));
        assert!(!hit(&mut s, &[1, 3, 0, 20, 0, 1]));
        assert!(!hit(&mut s, &[1, 8, 0, 0, 1, 2]));
        // 17 은 쓰기 범위가 걸려도
        assert!(hit(&mut s, &[1, 0x17, 0, 50, 0, 1, 0, 12, 0, 1, 2, 0, 1]));
    }

    #[test]
    fn fault_every_nth_and_probability_are_deterministic() {
        let mut s = targeted(FaultTarget { every_nth: 3, ..FaultTarget::default() });
        let pattern: Vec<bool> = (0..9).map(|_| hit(&mut s, &[1, 3, 0, 0, 0, 1])).collect();
        assert_eq!(pattern, [false, false, true, false, false, true, false, false, true]);
        // 조건에 안 맞는 요청은 세지 않는다
        let mut s = targeted(FaultTarget { every_nth: 2, slave_ids: vec![1], ..FaultTarget::default() });
        assert!(!hit(&mut s, &[1, 3, 0, 0, 0, 1]));
        assert!(!hit(&mut s, &[2, 3, 0, 0, 0, 1]));
        assert!(hit(&mut s, &[1, 3, 0, 0, 0, 1]));

        // 같은 씨앗이면 같은 결과, 대략 그 비율
        let run = || {
            let mut s = targeted(FaultTarget { probability: 30, ..FaultTarget::default() });
            (0..1000).map(|_| hit(&mut s, &[1, 3, 0, 0, 0, 1])).collect::<Vec<_>>()
        };
        let (a, b) = (run(), run());
        assert_eq!(a, b);
        let n = a.iter().filter(|x| **x).count();
        assert!((230..=370).contains(&n), "{n}");
        // 0% 는 한 번도
        let mut s = targeted(FaultTarget { probability: 0, ..FaultTarget::default() });
        assert!((0..50).all(|_| !hit(&mut s, &[1, 3, 0, 0, 0, 1])));
    }

    #[test]
    fn delay_jitter_range() {
        let mut s = Slave::with_seed(99);
        s.set_faults(Faults { delay_ms: 100, delay_max_ms: 200, ..Faults::default() });
        let ds: Vec<u64> = (0..200).map(|_| s.handle(&req(&[1, 3, 0, 0, 0, 1])).1.delay_ms).collect();
        assert!(ds.iter().all(|d| (100..=200).contains(d)));
        assert!(ds.iter().any(|d| *d < 130) && ds.iter().any(|d| *d > 170));
        // 대상이 아니면 지연도 없다
        s.faults.target.functions = vec![6];
        assert_eq!(s.handle(&req(&[1, 3, 0, 0, 0, 1])).1.delay_ms, 0);
    }
}
