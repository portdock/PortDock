//! Modbus RTU 슬레이브 흉내 — 레지스터 표를 들고 마스터 요청에 답한다.
//! 하드웨어 시험용 장애 주입: 응답 지연, 무응답, 예외 강제, CRC 깨기.

use crate::checksum::crc16_modbus;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const TABLE_SIZE: usize = 65_536;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Table {
    Coils,
    DiscreteInputs,
    HoldingRegisters,
    InputRegisters,
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
}

/// 장애 주입 설정
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Faults {
    /// 응답 지연(ms)
    pub delay_ms: u64,
    /// 응답하지 않음(타임아웃 시험)
    pub no_response: bool,
    /// 모든 요청에 이 예외 코드로 답함(0 이면 끔)
    pub force_exception: u8,
    /// 응답 CRC 를 일부러 틀리게
    pub bad_crc: bool,
}

/// 요청 하나를 처리한 결과 — 화면 기록용
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Outcome {
    pub slave: u8,
    pub function: u8,
    /// "ok" | "exception" | "broadcast" | "ignored-crc" | "ignored-id" | "no-response"
    pub result: &'static str,
    pub exception: Option<u8>,
    /// 마스터가 값을 바꿨으면 그 표
    pub written: Option<Table>,
}

pub struct Slave {
    pub models: BTreeMap<u8, Model>,
    pub faults: Faults,
}

impl Default for Slave {
    fn default() -> Self {
        let mut models = BTreeMap::new();
        models.insert(1, Model::default());
        Self { models, faults: Faults::default() }
    }
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

impl Slave {
    /// RTU 프레임 하나를 처리한다. 돌려주는 응답이 None 이면 아무것도 보내지 않는다.
    pub fn handle(&mut self, frame: &[u8]) -> (Option<Vec<u8>>, Outcome) {
        let mut o = Outcome {
            slave: frame.first().copied().unwrap_or(0),
            function: frame.get(1).copied().unwrap_or(0),
            result: "ignored-crc",
            exception: None,
            written: None,
        };
        if frame.len() < 4 || crc16_modbus(&frame[..frame.len() - 2]).to_le_bytes() != frame[frame.len() - 2..] {
            return (None, o);
        }
        let (id, func) = (frame[0], frame[1]);
        let pdu = &frame[2..frame.len() - 2];
        let broadcast = id == 0;
        if !broadcast && !self.models.contains_key(&id) {
            o.result = "ignored-id";
            return (None, o);
        }

        let exception = |code: u8| with_crc(vec![id, func | 0x80, code], false);
        let ex = if self.faults.force_exception != 0 && !broadcast {
            Err(self.faults.force_exception)
        } else if broadcast {
            // 브로드캐스트는 쓰기만 모든 슬레이브에 적용하고 답하지 않는다
            let ids: Vec<u8> = self.models.keys().copied().collect();
            for i in ids {
                let m = self.models.get_mut(&i).unwrap();
                if let Ok((_, w)) = execute(m, func, pdu) {
                    o.written = o.written.or(w);
                }
            }
            o.result = "broadcast";
            return (None, o);
        } else {
            execute(self.models.get_mut(&id).unwrap(), func, pdu)
        };

        let resp = match ex {
            Ok((body, written)) => {
                o.result = "ok";
                o.written = written;
                let mut v = vec![id, func];
                v.extend(body);
                with_crc(v, self.faults.bad_crc)
            }
            Err(code) => {
                o.result = "exception";
                o.exception = Some(code);
                let mut r = exception(code);
                if self.faults.bad_crc {
                    let n = r.len();
                    r[n - 1] ^= 0xFF;
                }
                r
            }
        };
        if self.faults.no_response {
            o.result = "no-response";
            return (None, o);
        }
        (Some(resp), o)
    }
}

/// 함수 코드 실행. Ok(응답 본문(주소·함수 뒤), 쓴 표), Err(예외 코드)
fn execute(m: &mut Model, func: u8, pdu: &[u8]) -> Result<(Vec<u8>, Option<Table>), u8> {
    let start = u16_at(pdu, 0).ok_or(3u8)?;
    let second = u16_at(pdu, 2).ok_or(3u8)?;
    match func {
        0x01 | 0x02 => {
            let t = if func == 0x01 { Table::Coils } else { Table::DiscreteInputs };
            let qty = second;
            if !(1..=2000).contains(&qty) {
                return Err(3);
            }
            if !m.in_range(t, start, qty) {
                return Err(2);
            }
            let bits = &m.table(t)[start as usize..start as usize + qty as usize];
            let packed = pack_bits(bits);
            let mut body = vec![packed.len() as u8];
            body.extend(packed);
            Ok((body, None))
        }
        0x03 | 0x04 => {
            let t = if func == 0x03 { Table::HoldingRegisters } else { Table::InputRegisters };
            let qty = second;
            if !(1..=125).contains(&qty) {
                return Err(3);
            }
            if !m.in_range(t, start, qty) {
                return Err(2);
            }
            let mut body = vec![(qty * 2) as u8];
            for v in &m.table(t)[start as usize..start as usize + qty as usize] {
                body.extend(v.to_be_bytes());
            }
            Ok((body, None))
        }
        0x05 => {
            let v = match second {
                0xFF00 => 1,
                0x0000 => 0,
                _ => return Err(3),
            };
            if !m.in_range(Table::Coils, start, 1) {
                return Err(2);
            }
            m.coils[start as usize] = v;
            Ok((pdu[..4].to_vec(), Some(Table::Coils)))
        }
        0x06 => {
            if !m.in_range(Table::HoldingRegisters, start, 1) {
                return Err(2);
            }
            m.holding[start as usize] = second;
            Ok((pdu[..4].to_vec(), Some(Table::HoldingRegisters)))
        }
        0x0F => {
            let qty = second;
            let n = *pdu.get(4).ok_or(3u8)? as usize;
            if !(1..=1968).contains(&qty) || n != (qty as usize).div_ceil(8) || pdu.len() < 5 + n {
                return Err(3);
            }
            if !m.in_range(Table::Coils, start, qty) {
                return Err(2);
            }
            for i in 0..qty as usize {
                m.coils[start as usize + i] = ((pdu[5 + i / 8] >> (i % 8)) & 1) as u16;
            }
            Ok((pdu[..4].to_vec(), Some(Table::Coils)))
        }
        0x10 => {
            let qty = second;
            let n = *pdu.get(4).ok_or(3u8)? as usize;
            if !(1..=123).contains(&qty) || n != qty as usize * 2 || pdu.len() < 5 + n {
                return Err(3);
            }
            if !m.in_range(Table::HoldingRegisters, start, qty) {
                return Err(2);
            }
            for i in 0..qty as usize {
                m.holding[start as usize + i] = u16_at(pdu, 5 + i * 2).unwrap();
            }
            Ok((pdu[..4].to_vec(), Some(Table::HoldingRegisters)))
        }
        _ => Err(1),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn req(body: &[u8]) -> Vec<u8> {
        with_crc(body.to_vec(), false)
    }

    fn crc_ok(f: &[u8]) -> bool {
        crc16_modbus(&f[..f.len() - 2]).to_le_bytes() == f[f.len() - 2..]
    }

    #[test]
    fn read_holding() {
        let mut s = Slave::default();
        s.models.get_mut(&1).unwrap().holding[10] = 555;
        let (r, o) = s.handle(&req(&[1, 3, 0, 10, 0, 2]));
        let r = r.unwrap();
        assert_eq!(&r[..7], &[1, 3, 4, 0x02, 0x2B, 0, 0]);
        assert!(crc_ok(&r));
        assert_eq!(o.result, "ok");
    }

    #[test]
    fn write_single_and_multiple() {
        let mut s = Slave::default();
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
        let mut s = Slave::default();
        s.handle(&req(&[1, 0x0F, 0, 0, 0, 10, 2, 0b1010_0101, 0b10]));
        let (r, _) = s.handle(&req(&[1, 1, 0, 0, 0, 10]));
        assert_eq!(&r.unwrap()[..5], &[1, 1, 2, 0b1010_0101, 0b10]);
        s.handle(&req(&[1, 5, 0, 1, 0xFF, 0]));
        assert_eq!(s.models[&1].coils[1], 1);
    }

    #[test]
    fn exceptions() {
        let mut s = Slave::default();
        // 범위 밖(기본 0~99)
        let (r, o) = s.handle(&req(&[1, 3, 0, 99, 0, 2]));
        assert_eq!(&r.unwrap()[..3], &[1, 0x83, 2]);
        assert_eq!(o.exception, Some(2));
        // 없는 함수
        let (r, _) = s.handle(&req(&[1, 0x2B, 0, 0, 0, 0]));
        assert_eq!(&r.unwrap()[..3], &[1, 0xAB, 1]);
        // 개수 0
        let (r, _) = s.handle(&req(&[1, 3, 0, 0, 0, 0]));
        assert_eq!(&r.unwrap()[..3], &[1, 0x83, 3]);
    }

    #[test]
    fn ignores_other_id_and_bad_crc_broadcast_writes_silently() {
        let mut s = Slave::default();
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
        let mut s = Slave::default();
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
    }
}
