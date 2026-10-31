//! Modbus Slave «장비 프로필로 흉내»(0.10.0) — 장비 데이터(data/devices)의 읽기/쓰기 제한을 지키고,
//! 칸끼리 이어 값을 만든다(운전 지령 → 출력 주파수 가감속, 전력 → 전력량 누적, 비례).
//!
//! - `Guard`: 칸마다 읽기 전용(r)·쓰기 전용(w)·읽기/쓰기(rw). 읽기 전용 칸에 쓰거나 쓰기 전용 칸을 읽으면 정한 예외(02·03),
//!   장비 맵에 없는 주소를 건드리면 예외 02(끌 수 있음). 화면에서 고치는 값(set_values)에는 걸지 않는다 — 마스터 요청에만.
//! - `LinkSpec`: 백엔드 주기(`tick`, 100ms 쯤)마다 원본 칸을 읽어 결과 칸을 쓴다. 시간은 실제 지난 시간(한 번에 최대 1초)으로 센다.
//!
//! 값은 매뉴얼 표를 옮긴 것과 그럴듯한 가정이다 — 실제 장비의 가감속 시간·제어 동작과 다르다(화면에도 그 문구).

use crate::modbus_slave::Table;
use crate::regmap::{ValueType, WordOrder, decode, encode};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::time::{Duration, Instant};

/// 칸의 읽기/쓰기
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Access {
    R,
    W,
    Rw,
}

/// 장비 맵의 칸 하나(시작 주소부터 count 칸)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GuardCell {
    pub table: Table,
    pub addr: u16,
    pub count: u16,
    pub access: Access,
}

/// 읽기/쓰기 제한 — 마스터 요청에만 건다
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Guard {
    pub cells: Vec<GuardCell>,
    /// 읽기 전용 칸 쓰기·쓰기 전용 칸 읽기를 막는다
    #[serde(default = "yes")]
    pub access: bool,
    /// 그때 돌려줄 예외(2 또는 3)
    #[serde(default = "two")]
    pub deny_exception: u8,
    /// 맵에 없는 주소를 건드리면 예외 02
    #[serde(default = "yes")]
    pub unmapped: bool,
}

fn yes() -> bool {
    true
}
fn two() -> u8 {
    2
}

/// 만들어 둔 제한 — 표마다 시작 주소 → (끝(제외), 읽기/쓰기)
#[derive(Debug, Clone, Default)]
pub struct GuardMap {
    by_table: BTreeMap<Table, BTreeMap<u16, (u32, Access)>>,
    access: bool,
    deny: u8,
    unmapped: bool,
}

impl Guard {
    pub fn check(&self) -> Result<(), String> {
        if !matches!(self.deny_exception, 2 | 3) {
            return Err(crate::tr!("제한 위반 예외는 02 또는 03 입니다", "The access exception must be 02 or 03").into());
        }
        for c in &self.cells {
            if c.count == 0 || c.addr as u32 + c.count as u32 > 65_536 {
                return Err(crate::tr!(format!("주소 {} 의 칸이 65535 를 넘습니다", c.addr), format!("Address {} runs past 65535", c.addr)));
            }
        }
        Ok(())
    }

    pub fn build(&self) -> GuardMap {
        let mut by_table: BTreeMap<Table, BTreeMap<u16, (u32, Access)>> = BTreeMap::new();
        for c in &self.cells {
            by_table.entry(c.table).or_default().insert(c.addr, (c.addr as u32 + c.count as u32, c.access));
        }
        GuardMap { by_table, access: self.access, deny: self.deny_exception, unmapped: self.unmapped }
    }
}

impl GuardMap {
    /// 주소 a 를 덮는 칸의 읽기/쓰기(없으면 None)
    fn at(&self, t: Table, a: u16) -> Option<Access> {
        let (_, &(end, acc)) = self.by_table.get(&t)?.range(..=a).next_back()?;
        ((a as u32) < end).then_some(acc)
    }

    /// 마스터 요청 검사 — 범위 [start, start + qty). 쓰기면 write. Err(예외 코드)
    pub fn allow(&self, t: Table, start: u16, qty: u16, write: bool) -> Result<(), u8> {
        for i in 0..qty as u32 {
            let a = start as u32 + i;
            if a > u16::MAX as u32 {
                break;
            }
            match self.at(t, a as u16) {
                None if self.unmapped => return Err(2),
                Some(Access::R) if write && self.access => return Err(self.deny),
                Some(Access::W) if !write && self.access => return Err(self.deny),
                _ => {}
            }
        }
        Ok(())
    }
}

// ------------------------------------------------------------------ 연결 규칙

/// 칸 하나 — 표·주소·형식·순서
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CellRef {
    pub table: Table,
    pub addr: u16,
    #[serde(default)]
    pub value_type: ValueType,
    #[serde(default)]
    pub order: WordOrder,
}

impl CellRef {
    fn ty(&self) -> ValueType {
        if self.table.is_bits() {
            ValueType::Bit
        } else if self.value_type == ValueType::Bit {
            ValueType::U16
        } else {
            self.value_type
        }
    }
    fn span(&self) -> (usize, usize) {
        (self.addr as usize, self.addr as usize + self.ty().regs())
    }
}

/// 규칙 종류. 화면: «따라가기(가감속)·비례·누적»
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum LinkRule {
    /// 결과 칸이 목표(= 원본 × gain)로 초당 rate 만큼 다가간다. run 칸이 있으면 그 칸이 «운전» 일 때만 목표, 아니면 0 으로
    /// (예: 운전 지령에 1 → 출력 주파수가 설정 주파수까지 가속, 0 → 0 까지 감속)
    Approach {
        src: CellRef,
        #[serde(default)]
        run: Option<CellRef>,
        /// run 칸에서 볼 비트 묶음(0 이면 «0 이 아님»)
        #[serde(default, rename = "runMask")]
        run_mask: u32,
        gain: f64,
        /// 결과 칸 단위(원시 값)/초
        rate: f64,
    },
    /// 결과 = 원본 × gain + offset
    Scale { src: CellRef, gain: f64, offset: f64 },
    /// 결과 += (원본 × gain, 원본이 없으면 gain) × 지난 초 — 전력량·운전 시간 누적
    Integrate {
        #[serde(default)]
        src: Option<CellRef>,
        gain: f64,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkSpec {
    pub out: CellRef,
    pub rule: LinkRule,
}

impl LinkSpec {
    pub fn check(&self) -> Result<(), String> {
        let mut cells = vec![self.out];
        let ok = |x: f64| x.is_finite();
        match &self.rule {
            LinkRule::Approach { src, run, gain, rate, .. } => {
                cells.push(*src);
                cells.extend(run.iter());
                if !ok(*gain) || !ok(*rate) || *rate <= 0.0 {
                    return Err(crate::tr!(format!("주소 {}: 따라가기는 배율이 숫자, 빠르기 > 0", self.out.addr), format!("Address {}: follow needs a numeric gain and rate > 0", self.out.addr)));
                }
            }
            LinkRule::Scale { src, gain, offset } => {
                cells.push(*src);
                if !ok(*gain) || !ok(*offset) {
                    return Err(crate::tr!(format!("주소 {}: 배율·더할 값이 숫자가 아닙니다", self.out.addr), format!("Address {}: gain/offset must be numbers", self.out.addr)));
                }
            }
            LinkRule::Integrate { src, gain } => {
                cells.extend(src.iter());
                if !ok(*gain) {
                    return Err(crate::tr!(format!("주소 {}: 배율이 숫자가 아닙니다", self.out.addr), format!("Address {}: gain must be a number", self.out.addr)));
                }
            }
        }
        for c in cells {
            if c.span().1 > 65_536 {
                return Err(crate::tr!(format!("주소 {} 의 칸이 65535 를 넘습니다", c.addr), format!("Address {} runs past 65535", c.addr)));
            }
        }
        Ok(())
    }
}

/// 돌아가는 규칙 — 설정 + 소수 자리까지 든 지금 값(정수 칸도 천천히 움직이게) + 마지막 시각
#[derive(Debug, Clone)]
pub struct LinkRun {
    pub spec: LinkSpec,
    pos: Option<f64>,
    last: Option<Instant>,
}

impl From<LinkSpec> for LinkRun {
    fn from(spec: LinkSpec) -> Self {
        Self { spec, pos: None, last: None }
    }
}

/// 표 4개를 읽고 쓰는 쪽(슬레이브 모델) — 시험에서는 가짜 표로
pub trait Tables {
    fn regs(&self, t: Table) -> &[u16];
    fn regs_mut(&mut self, t: Table) -> &mut [u16];
}

fn read<T: Tables + ?Sized>(m: &T, c: &CellRef) -> f64 {
    let (a, b) = c.span();
    m.regs(c.table).get(a..b).and_then(|r| decode(r, c.ty(), c.order)).unwrap_or(0.0)
}

fn write<T: Tables + ?Sized>(m: &mut T, c: &CellRef, v: f64) {
    let (a, b) = c.span();
    let ty = c.ty();
    if let Some(r) = m.regs_mut(c.table).get_mut(a..b) {
        r.copy_from_slice(&encode(v, ty, c.order));
    }
}

/// 칸에 든 값과 들고 있는 값이 다른지(마스터·화면이 바꿨으면 그 값부터 다시)
fn drifted(ty: ValueType, stored: f64, pos: f64) -> bool {
    let want = ty.fit(pos);
    match ty {
        ValueType::F32 => (stored - want).abs() > (want.abs() * 1e-6).max(1e-6),
        ValueType::F64 => (stored - want).abs() > (want.abs() * 1e-12).max(1e-12),
        _ => stored != want,
    }
}

impl LinkRun {
    /// 한 번 돈다. dt 는 지난 시간(한 번에 최대 1초 — 창이 멈췄다 돌아와도 갑자기 뛰지 않게)
    pub fn step<T: Tables + ?Sized>(&mut self, m: &mut T, now: Instant) {
        let dt = self.last.map(|l| now.saturating_duration_since(l)).unwrap_or(Duration::ZERO).min(Duration::from_secs(1)).as_secs_f64();
        self.last = Some(now);
        let out = self.spec.out;
        let ty = out.ty();
        let cur = read(m, &out);
        let pos = match self.pos {
            Some(p) if !drifted(ty, cur, p) => p,
            _ => cur,
        };
        let raw = match &self.spec.rule {
            LinkRule::Approach { src, run, run_mask, gain, rate } => {
                let on = match run {
                    None => true,
                    Some(r) => {
                        let v = read(m, r);
                        if *run_mask == 0 { v != 0.0 } else { (v.max(0.0) as u64) & (*run_mask as u64) != 0 }
                    }
                };
                let target = if on { read(m, src) * gain } else { 0.0 };
                let d = rate * dt;
                if (target - pos).abs() <= d { target } else if target > pos { pos + d } else { pos - d }
            }
            LinkRule::Scale { src, gain, offset } => read(m, src) * gain + offset,
            LinkRule::Integrate { src, gain } => {
                let per_s = src.as_ref().map(|s| read(m, s) * gain).unwrap_or(*gain);
                pos + per_s * dt
            }
        };
        let next = ty.fit(raw);
        // 정수 칸도 천천히 움직이게 반올림 전 값을 들고 있는다(형식 범위 안으로)
        self.pos = Some(if raw.is_finite() { raw.clamp(ty.fit(f64::MIN), ty.fit(f64::MAX)) } else { next });
        write(m, &out, next);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct Fake {
        t: BTreeMap<Table, Vec<u16>>,
    }
    impl Fake {
        fn new() -> Self {
            let mut t = BTreeMap::new();
            for tb in [Table::Coils, Table::DiscreteInputs, Table::HoldingRegisters, Table::InputRegisters] {
                t.insert(tb, vec![0u16; 65_536]);
            }
            Self { t }
        }
    }
    impl Tables for Fake {
        fn regs(&self, t: Table) -> &[u16] {
            &self.t[&t]
        }
        fn regs_mut(&mut self, t: Table) -> &mut [u16] {
            self.t.get_mut(&t).unwrap()
        }
    }

    fn hr(addr: u16) -> CellRef {
        CellRef { table: Table::HoldingRegisters, addr, value_type: ValueType::U16, order: WordOrder::Abcd }
    }

    #[test]
    fn guard_read_only_write_only_unmapped() {
        let g = Guard {
            cells: vec![
                GuardCell { table: Table::HoldingRegisters, addr: 4, count: 2, access: Access::Rw },
                GuardCell { table: Table::HoldingRegisters, addr: 8, count: 2, access: Access::R },
                GuardCell { table: Table::HoldingRegisters, addr: 10, count: 1, access: Access::W },
            ],
            access: true,
            deny_exception: 3,
            unmapped: true,
        };
        assert!(g.check().is_ok());
        let m = g.build();
        let hr = Table::HoldingRegisters;
        assert_eq!(m.allow(hr, 4, 2, false), Ok(()));
        assert_eq!(m.allow(hr, 4, 2, true), Ok(()));
        assert_eq!(m.allow(hr, 8, 2, false), Ok(()));
        assert_eq!(m.allow(hr, 9, 1, true), Err(3)); // 읽기 전용(32비트의 뒤 칸)
        assert_eq!(m.allow(hr, 10, 1, false), Err(3)); // 쓰기 전용 읽기
        assert_eq!(m.allow(hr, 10, 1, true), Ok(()));
        assert_eq!(m.allow(hr, 6, 1, false), Err(2)); // 빈 주소
        assert_eq!(m.allow(hr, 3, 3, false), Err(2));
        assert_eq!(m.allow(Table::Coils, 0, 1, false), Err(2)); // 칸이 없는 표
        // 끄면 그대로 통과
        let off = Guard { access: false, unmapped: false, ..g.clone() }.build();
        assert_eq!(off.allow(hr, 9, 1, true), Ok(()));
        assert_eq!(off.allow(hr, 6, 1, false), Ok(()));
        // 빈 주소만 끔
        let holes_ok = Guard { unmapped: false, deny_exception: 2, ..g.clone() }.build();
        assert_eq!(holes_ok.allow(hr, 6, 1, false), Ok(()));
        assert_eq!(holes_ok.allow(hr, 8, 1, true), Err(2));
        assert!(Guard { deny_exception: 4, ..g.clone() }.check().is_err());
        assert!(Guard { cells: vec![GuardCell { table: hr, addr: 65_535, count: 2, access: Access::R }], ..g }.check().is_err());
    }

    #[test]
    fn approach_accelerates_and_decelerates() {
        let mut m = Fake::new();
        // 4 = 설정 주파수(0.01 Hz), 5 = 운전 지령(비트 1 정방향), 9 = 출력 주파수(0.01 Hz)
        let spec = LinkSpec { out: hr(9), rule: LinkRule::Approach { src: hr(4), run: Some(hr(5)), run_mask: 0b110, gain: 1.0, rate: 600.0 } };
        assert!(spec.check().is_ok());
        let mut run = LinkRun::from(spec);
        let t0 = Instant::now();
        m.regs_mut(Table::HoldingRegisters)[4] = 3000; // 30.00 Hz
        run.step(&mut m, t0);
        assert_eq!(m.regs(Table::HoldingRegisters)[9], 0); // 운전 지령 없음
        m.regs_mut(Table::HoldingRegisters)[5] = 0b010; // 정방향 운전
        run.step(&mut m, t0 + Duration::from_millis(1000));
        assert_eq!(m.regs(Table::HoldingRegisters)[9], 600); // 1초에 6 Hz
        run.step(&mut m, t0 + Duration::from_millis(5000)); // 한 번에 최대 1초
        assert_eq!(m.regs(Table::HoldingRegisters)[9], 1200);
        for k in 0..10 {
            run.step(&mut m, t0 + Duration::from_millis(6000 + k * 1000));
        }
        assert_eq!(m.regs(Table::HoldingRegisters)[9], 3000); // 목표에서 멈춤
        m.regs_mut(Table::HoldingRegisters)[5] = 0b001; // 정지 비트만 — 운전 아님
        run.step(&mut m, t0 + Duration::from_millis(15_500));
        assert_eq!(m.regs(Table::HoldingRegisters)[9], 2700); // 0.5초에 3 Hz 감속
        // 마스크 0 이면 «0 이 아님» 이 운전
        let mut any = LinkRun::from(LinkSpec { out: hr(20), rule: LinkRule::Approach { src: hr(4), run: Some(hr(5)), run_mask: 0, gain: 0.5, rate: 1.0 } });
        any.step(&mut m, t0);
        any.step(&mut m, t0 + Duration::from_millis(500));
        any.step(&mut m, t0 + Duration::from_millis(1000));
        assert_eq!(m.regs(Table::HoldingRegisters)[20], 1); // 0.5 + 0.5 — 정수 칸도 소수 자리를 모아 움직인다
    }

    #[test]
    fn scale_integrate_and_master_override() {
        let mut m = Fake::new();
        let t0 = Instant::now();
        // 원본: 입력 레지스터 0 의 F32 전력(W) 3600 → 결과: 보유 레지스터 10 의 U32 전력량(0.01 kWh)
        let p = CellRef { table: Table::InputRegisters, addr: 0, value_type: ValueType::F32, order: WordOrder::Cdab };
        m.regs_mut(Table::InputRegisters)[0..2].copy_from_slice(&encode(3600.0, ValueType::F32, WordOrder::Cdab));
        let e = CellRef { table: Table::HoldingRegisters, addr: 10, value_type: ValueType::U32, order: WordOrder::Abcd };
        // W → 0.01 kWh/s: 1 / 3600 / 1000 / 0.01
        let mut integ = LinkRun::from(LinkSpec { out: e, rule: LinkRule::Integrate { src: Some(p), gain: 1.0 / 3600.0 / 1000.0 / 0.01 } });
        integ.step(&mut m, t0);
        for k in 1..=100 {
            integ.step(&mut m, t0 + Duration::from_millis(k * 1000));
        }
        // 3.6 kW × 100 s = 0.1 kWh = 10 × 0.01 kWh
        assert_eq!(read(&m, &e), 10.0);
        // 마스터가 0 으로 지우면 0 부터 다시 센다
        write(&mut m, &e, 0.0);
        integ.step(&mut m, t0 + Duration::from_millis(101_000));
        integ.step(&mut m, t0 + Duration::from_millis(102_000));
        assert!(read(&m, &e) <= 1.0);
        // 원본 없는 누적(운전 시간 0.1 h): 초당 1/360
        let h = hr(30);
        let mut hours = LinkRun::from(LinkSpec { out: h, rule: LinkRule::Integrate { src: None, gain: 1.0 / 360.0 } });
        hours.step(&mut m, t0);
        for k in 1..=360 {
            hours.step(&mut m, t0 + Duration::from_millis(k * 1000));
        }
        assert_eq!(m.regs(Table::HoldingRegisters)[30], 1);
        // 비례: 출력 전류 = 출력 주파수 × 0.5 + 1, 비트 결과는 0/1
        m.regs_mut(Table::HoldingRegisters)[9] = 100;
        let mut sc = LinkRun::from(LinkSpec { out: hr(8), rule: LinkRule::Scale { src: hr(9), gain: 0.5, offset: 1.0 } });
        sc.step(&mut m, t0);
        assert_eq!(m.regs(Table::HoldingRegisters)[8], 51);
        let led = CellRef { table: Table::DiscreteInputs, addr: 0, value_type: ValueType::U16, order: WordOrder::Abcd };
        let mut bit = LinkRun::from(LinkSpec { out: led, rule: LinkRule::Scale { src: hr(9), gain: 1.0, offset: 0.0 } });
        bit.step(&mut m, t0);
        assert_eq!(m.regs(Table::DiscreteInputs)[0], 1);
    }

    #[test]
    fn link_checks_and_json_shape() {
        let j = r#"{"out":{"table":"holding-registers","addr":9},"rule":{"kind":"approach","src":{"table":"holding-registers","addr":4},"run":{"table":"coils","addr":0},"runMask":0,"gain":1,"rate":600}}"#;
        let s: LinkSpec = serde_json::from_str(j).unwrap();
        assert!(s.check().is_ok());
        assert_eq!(s.out.value_type, ValueType::U16);
        let bad = LinkSpec { out: hr(1), rule: LinkRule::Approach { src: hr(2), run: None, run_mask: 0, gain: 1.0, rate: 0.0 } };
        assert!(bad.check().is_err());
        let over = LinkSpec { out: CellRef { table: Table::HoldingRegisters, addr: 65_535, value_type: ValueType::F32, order: WordOrder::Abcd }, rule: LinkRule::Integrate { src: None, gain: 1.0 } };
        assert!(over.check().is_err());
        let g: Guard = serde_json::from_str(r#"{"cells":[{"table":"input-registers","addr":0,"count":2,"access":"r"}]}"#).unwrap();
        assert!(g.access && g.unmapped && g.deny_exception == 2);
    }
}
