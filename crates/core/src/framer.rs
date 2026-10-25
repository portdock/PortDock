//! 수신 바이트를 «한 덩어리(프레임)» 로 끊는다.
//! 모든 방식에 공통으로 «무응답 시간(gap)» 이 지나면 쌓인 것을 내보낸다.

use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum FrameMode {
    /// 무응답 시간으로만 끊기
    Gap { gap_ms: u64 },
    /// 종결 바이트(예: 0D 0A, 03)가 오면 끊기
    Terminator { bytes: Vec<u8>, gap_ms: u64 },
    /// 고정 길이마다 끊기
    Fixed { len: usize, gap_ms: u64 },
    /// Modbus RTU — 함수 코드로 길이를 알아내고, 모르면 3.5 문자 시간으로 끊기
    ModbusRtu { baud: u32 },
    /// Modbus RTU 슬레이브가 받는 요청 — 요청 길이(01~06 = 8, 0F·10 = 9 + 바이트 수)를 알면
    /// 다 모이는 즉시 끊는다. USB 어댑터가 요청을 쪼개 보내도(지연 16ms) 이어 붙도록
    /// 무응답 시간은 3.5 문자와 `min_gap_ms` 중 긴 쪽. 모르는 함수 코드는 무응답 시간으로만.
    ModbusRtuRequest {
        baud: u32,
        #[serde(default)]
        min_gap_ms: u64,
    },
    /// 머리의 길이 칸으로 끊기(Modbus TCP 의 MBAP 등). 길이 칸은 `offset` 에서 `size`(1·2·4)바이트,
    /// 빅 엔디언. 프레임 전체 길이 = 길이 값 + `adjust`. `max` 를 넘거나 머리보다 짧은 길이면
    /// 믿을 수 없으므로 길이로 끊지 않고 무응답 시간(`gap_ms`)에 맡긴다.
    LengthField {
        offset: usize,
        size: u8,
        adjust: i64,
        max: usize,
        #[serde(default = "default_length_gap")]
        gap_ms: u64,
    },
}

fn default_length_gap() -> u64 {
    1_000
}

impl Default for FrameMode {
    fn default() -> Self {
        Self::Gap { gap_ms: 20 }
    }
}

impl FrameMode {
    fn gap(&self) -> Duration {
        match self {
            Self::Gap { gap_ms } | Self::Terminator { gap_ms, .. } | Self::Fixed { gap_ms, .. } => {
                Duration::from_millis((*gap_ms).max(1))
            }
            Self::ModbusRtu { baud } => modbus_gap(*baud),
            Self::ModbusRtuRequest { baud, min_gap_ms } => modbus_gap(*baud).max(Duration::from_millis(*min_gap_ms)),
            Self::LengthField { gap_ms, .. } => Duration::from_millis((*gap_ms).max(1)),
        }
    }

    /// Modbus TCP 요청·응답(MBAP 7바이트 머리: 트랜잭션 2 · 프로토콜 2 · 길이 2 · 유닛 1).
    /// 길이 칸(4번째부터 2바이트)은 유닛 ID 부터 센다 → 전체 = 길이 + 6. ADU 최대 260.
    pub fn modbus_tcp() -> Self {
        Self::LengthField { offset: 4, size: 2, adjust: 6, max: 260, gap_ms: default_length_gap() }
    }

    /// 끝 문자 방식이면 그 바이트들, 아니면 빈 것
    pub fn terminator(&self) -> &[u8] {
        match self {
            Self::Terminator { bytes, .. } => bytes,
            _ => &[],
        }
    }
}

/// 3.5 문자 시간(1문자 = 11비트). 19200bps 초과는 규격대로 1.75ms 고정.
/// USB-시리얼 지연을 고려해 최소 3ms 로 잡는다.
fn modbus_gap(baud: u32) -> Duration {
    // 3.5 × 11비트 / baud 초 = 38_500_000 / baud 마이크로초
    let micros = if baud > 19_200 { 1_750 } else { 38_500_000 / baud.max(1) as u64 };
    Duration::from_micros(micros.max(3_000))
}

/// 끊김 없는 스트림에서 버퍼가 끝없이 커지지 않도록 이 길이에서 강제로 자른다
pub const MAX_FRAME: usize = 16 * 1024;

/// 확정된 프레임과 그 첫 바이트를 받은 시각
pub type Cut = (Instant, Vec<u8>);

pub struct Framer {
    mode: FrameMode,
    buf: Vec<u8>,
    /// 지금 쌓는 프레임의 첫 바이트 시각
    first_rx: Option<Instant>,
    last_rx: Option<Instant>,
}

impl Framer {
    pub fn new(mode: FrameMode) -> Self {
        Self { mode, buf: Vec::new(), first_rx: None, last_rx: None }
    }

    pub fn set_mode(&mut self, mode: FrameMode) {
        self.mode = mode;
    }

    pub fn mode(&self) -> &FrameMode {
        &self.mode
    }

    /// 끝 문자 방식이면 그 바이트들(체크섬 검사 때 떼고 본다), 아니면 빈 것
    pub fn terminator(&self) -> &[u8] {
        self.mode.terminator()
    }

    fn take(&mut self) -> Cut {
        let t = self.first_rx.take().unwrap_or_else(Instant::now);
        (t, std::mem::take(&mut self.buf))
    }

    /// 받은 바이트를 넣고, 확정된 프레임들을 돌려준다.
    pub fn feed(&mut self, data: &[u8], now: Instant) -> Vec<Cut> {
        let mut out = Vec::new();
        // 직전 바이트와 간격이 gap 을 넘었으면 이전 덩어리부터 내보낸다
        if let Some(t) = self.last_rx
            && !self.buf.is_empty()
            && now.duration_since(t) >= self.mode.gap()
        {
            out.push(self.take());
        }
        self.last_rx = Some(now);
        for &b in data {
            if self.buf.is_empty() {
                self.first_rx = Some(now);
            }
            self.buf.push(b);
            // 모드를 바꿔 남은 버퍼가 길이보다 길 수 있다 — 자를 수 있는 만큼 모두
            while let Some(frame) = self.try_cut() {
                out.push(frame);
            }
        }
        out
    }

    /// 시간이 흘렀는지 확인해 무응답 시간이 지났으면 쌓인 것을 내보낸다.
    pub fn poll(&mut self, now: Instant) -> Option<Cut> {
        let t = self.last_rx?;
        (!self.buf.is_empty() && now.duration_since(t) >= self.mode.gap()).then(|| self.take())
    }

    /// 무응답 시간과 상관없이 남은 미완성 바이트를 모두 내보낸다(닫기·끊김 직전)
    pub fn flush(&mut self) -> Option<Cut> {
        (!self.buf.is_empty()).then(|| self.take())
    }

    fn try_cut(&mut self) -> Option<Cut> {
        let cut = match &self.mode {
            FrameMode::Gap { .. } => None,
            FrameMode::Terminator { bytes, .. } => {
                (!bytes.is_empty() && self.buf.ends_with(bytes)).then_some(self.buf.len())
            }
            FrameMode::Fixed { len, .. } => (*len > 0 && self.buf.len() >= *len).then_some(*len),
            FrameMode::ModbusRtu { .. } => modbus_expected_len(&self.buf).filter(|n| self.buf.len() >= *n),
            FrameMode::ModbusRtuRequest { .. } => modbus_request_len(&self.buf).filter(|n| self.buf.len() >= *n),
            FrameMode::LengthField { offset, size, adjust, max, .. } => {
                length_field_len(&self.buf, *offset, *size, *adjust, *max).filter(|n| self.buf.len() >= *n)
            }
        }
        .or((self.buf.len() >= MAX_FRAME).then_some(MAX_FRAME))?;
        let rest = self.buf.split_off(cut);
        let t = self.first_rx.unwrap_or_else(Instant::now);
        // 남은 바이트가 있으면 같은 읽기에서 온 것이므로 같은 시각에서 시작한다
        self.first_rx = (!rest.is_empty()).then_some(t);
        Some((t, std::mem::replace(&mut self.buf, rest)))
    }
}

/// Modbus RTU 프레임 길이를 앞부분만 보고 확정할 수 있으면 돌려준다(CRC 포함).
/// 요청·응답 길이가 같은 05·06 과 예외 응답만 확정한다. 01~04·0F·10 은
/// 요청인지 응답인지 앞 바이트로 가릴 수 없어 무응답 시간에 맡긴다.
pub fn modbus_expected_len(buf: &[u8]) -> Option<usize> {
    let func = *buf.get(1)?;
    if func & 0x80 != 0 {
        return Some(5); // 주소 · 함수|0x80 · 예외코드 · CRC 2
    }
    matches!(func, 0x05 | 0x06).then_some(8)
}

/// 마스터가 보내는 요청의 길이(CRC 포함). 0F·10 은 바이트 수(7번째), 17 은 바이트 수(11번째)가
/// 와야 안다. 08 은 하위 함수 00(되돌려 보내기) 모양(데이터 2바이트), 2B 는 0E(장치 식별) 모양.
/// 모르는 함수 코드는 None — 무응답 시간에 맡긴다.
pub fn modbus_request_len(buf: &[u8]) -> Option<usize> {
    match *buf.get(1)? {
        0x01..=0x06 | 0x08 => Some(8),
        0x0F | 0x10 => Some(9 + *buf.get(6)? as usize),
        0x16 => Some(10),
        0x17 => Some(13 + *buf.get(10)? as usize),
        0x2B => Some(7),
        _ => None,
    }
}

/// 길이 칸 방식의 프레임 길이. 길이 칸이 다 오기 전이거나 믿을 수 없는 값이면 None
pub fn length_field_len(buf: &[u8], offset: usize, size: u8, adjust: i64, max: usize) -> Option<usize> {
    let size = size as usize;
    if !matches!(size, 1 | 2 | 4) {
        return None;
    }
    let field = buf.get(offset..offset + size)?;
    let value = field.iter().fold(0u64, |a, &b| (a << 8) | b as u64) as i64;
    let total = value.checked_add(adjust)?;
    let total = usize::try_from(total).ok()?;
    (total >= offset + size && total <= max.min(MAX_FRAME)).then_some(total)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn t0() -> Instant {
        Instant::now()
    }

    fn bytes(v: Vec<Cut>) -> Vec<Vec<u8>> {
        v.into_iter().map(|c| c.1).collect()
    }

    #[test]
    fn timestamp_is_first_byte() {
        let start = t0();
        let mut f = Framer::new(FrameMode::Gap { gap_ms: 10 });
        f.feed(b"A", start);
        f.feed(b"B", start + Duration::from_millis(5));
        let (t, b) = f.poll(start + Duration::from_millis(20)).unwrap();
        assert_eq!(t, start);
        assert_eq!(b, b"AB".to_vec());
    }

    #[test]
    fn endless_stream_is_capped() {
        let mut f = Framer::new(FrameMode::Gap { gap_ms: 1000 });
        let out = f.feed(&vec![0x55; MAX_FRAME * 2 + 3], t0());
        assert_eq!(out.len(), 2);
        assert!(out.iter().all(|c| c.1.len() == MAX_FRAME));
    }

    #[test]
    fn gap_splits_on_silence() {
        let start = t0();
        let mut f = Framer::new(FrameMode::Gap { gap_ms: 10 });
        assert!(f.feed(b"AB", start).is_empty());
        assert!(f.feed(b"C", start + Duration::from_millis(5)).is_empty());
        assert!(f.poll(start + Duration::from_millis(9)).is_none());
        assert_eq!(f.poll(start + Duration::from_millis(16)).map(|c| c.1), Some(b"ABC".to_vec()));
        // 다음 덩어리가 gap 뒤에 오면 앞 것이 먼저 나간다
        f.feed(b"X", start + Duration::from_millis(20));
        let out = f.feed(b"Y", start + Duration::from_millis(40));
        assert_eq!(bytes(out), vec![b"X".to_vec()]);
    }

    #[test]
    fn terminator_cuts_immediately() {
        let mut f = Framer::new(FrameMode::Terminator { bytes: b"\r\n".to_vec(), gap_ms: 100 });
        let out = f.feed(b"OK\r\nERR\r\nPART", t0());
        assert_eq!(bytes(out), vec![b"OK\r\n".to_vec(), b"ERR\r\n".to_vec()]);
    }

    #[test]
    fn fixed_length() {
        let mut f = Framer::new(FrameMode::Fixed { len: 3, gap_ms: 100 });
        let out = f.feed(&[1, 2, 3, 4, 5, 6, 7], t0());
        assert_eq!(bytes(out), vec![vec![1, 2, 3], vec![4, 5, 6]]);
    }

    #[test]
    fn modbus_known_lengths() {
        let mut f = Framer::new(FrameMode::ModbusRtu { baud: 9600 });
        // 06 쓰기(8) + 예외 응답(5) 가 붙어 와도 나뉜다
        let mut data = vec![0x01, 0x06, 0x00, 0x01, 0x00, 0x03, 0x98, 0x0B];
        data.extend([0x01, 0x83, 0x02, 0xC0, 0xF1]);
        let out = f.feed(&data, t0());
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].1.len(), 8);
        assert_eq!(out[1].1.len(), 5);
    }

    fn req_mode(min_gap_ms: u64) -> FrameMode {
        FrameMode::ModbusRtuRequest { baud: 9600, min_gap_ms }
    }

    #[test]
    fn modbus_request_split_by_usb_latency_is_joined() {
        let start = t0();
        let mut f = Framer::new(req_mode(20));
        // 03 읽기 요청이 USB 어댑터 지연(16ms)으로 둘로 쪼개져 온다
        assert!(f.feed(&[0x01, 0x03, 0x00], start).is_empty());
        assert!(f.poll(start + Duration::from_millis(16)).is_none());
        let out = f.feed(&[0x00, 0x00, 0x0A, 0xC5, 0xCD], start + Duration::from_millis(16));
        // 길이가 차면 무응답 시간을 기다리지 않고 바로
        assert_eq!(bytes(out), vec![vec![0x01, 0x03, 0x00, 0x00, 0x00, 0x0A, 0xC5, 0xCD]]);
    }

    #[test]
    fn modbus_request_write_multiple_uses_byte_count() {
        let start = t0();
        let mut f = Framer::new(req_mode(20));
        // 10 쓰기: 주소 2개 = 4바이트 → 9 + 4 = 13
        let req = [0x01, 0x10, 0x00, 0x01, 0x00, 0x02, 0x04, 0x00, 0x0A, 0x01, 0x02, 0x92, 0x30];
        assert!(f.feed(&req[..5], start).is_empty());
        assert!(f.feed(&req[5..9], start + Duration::from_millis(15)).is_empty());
        let out = f.feed(&req[9..], start + Duration::from_millis(30));
        assert_eq!(bytes(out), vec![req.to_vec()]);
        // 붙어 온 두 요청도 나뉜다
        let mut two = vec![0x01, 0x06, 0x00, 0x01, 0x00, 0x03, 0x98, 0x0B];
        two.extend([0x01, 0x05, 0x00, 0x00, 0xFF, 0x00, 0x8C, 0x3A]);
        assert_eq!(f.feed(&two, start + Duration::from_secs(1)).len(), 2);
    }

    #[test]
    fn modbus_request_unknown_function_and_stale_half_fall_back_to_gap() {
        let start = t0();
        let mut f = Framer::new(req_mode(20));
        // 모르는 함수 코드 — 무응답 시간으로
        assert!(f.feed(&[0x01, 0x41, 0x0E, 0x01], start).is_empty());
        assert!(f.poll(start + Duration::from_millis(19)).is_none());
        assert_eq!(f.poll(start + Duration::from_millis(21)).map(|c| c.1.len()), Some(4));
        // 반쪽만 오고 오래 조용하면(마스터가 포기) 그대로 내보낸다
        f.feed(&[0x01, 0x03, 0x00], start + Duration::from_millis(100));
        assert_eq!(f.poll(start + Duration::from_millis(130)).map(|c| c.1.len()), Some(3));
        // 3.5 문자 쪽이 더 길면 그것(1200bps ≈ 32ms)
        assert!(FrameMode::ModbusRtuRequest { baud: 1200, min_gap_ms: 20 }.gap() > Duration::from_millis(30));
    }

    #[test]
    fn modbus_request_new_functions() {
        // 16 마스크 쓰기 = 10, 08/00 되돌려 보내기 = 8, 2B/0E 장치 식별 = 7
        assert_eq!(modbus_request_len(&[1, 0x16]), Some(10));
        assert_eq!(modbus_request_len(&[1, 0x08]), Some(8));
        assert_eq!(modbus_request_len(&[1, 0x2B]), Some(7));
        // 17 읽기/쓰기: 바이트 수(11번째)가 와야 안다 — 쓰기 2칸이면 13 + 4
        let req = [0x01, 0x17, 0x00, 0x00, 0x00, 0x02, 0x00, 0x10, 0x00, 0x02, 0x04, 0x00, 0x01, 0x00, 0x02, 0xAA, 0xBB];
        assert_eq!(modbus_request_len(&req[..10]), None);
        assert_eq!(modbus_request_len(&req[..11]), Some(17));
        // USB 로 쪼개져 와도 길이가 차면 바로
        let start = t0();
        let mut f = Framer::new(req_mode(20));
        assert!(f.feed(&req[..6], start).is_empty());
        assert_eq!(bytes(f.feed(&req[6..], start + Duration::from_millis(16))), vec![req.to_vec()]);
        // 16 과 2B 가 붙어 와도 나뉜다
        let mut two = vec![0x01, 0x16, 0x00, 0x04, 0x00, 0xF2, 0x00, 0x25, 0x66, 0xE7];
        two.extend([0x01, 0x2B, 0x0E, 0x01, 0x00, 0x70, 0x77]);
        let out = f.feed(&two, start + Duration::from_secs(1));
        assert_eq!(out.iter().map(|c| c.1.len()).collect::<Vec<_>>(), vec![10, 7]);
    }

    /// Modbus TCP 요청 하나(트랜잭션 tid, 유닛 1, FC03 0번부터 n개)
    fn mbap(tid: u16, n: u8) -> Vec<u8> {
        let t = tid.to_be_bytes();
        vec![t[0], t[1], 0, 0, 0, 6, 1, 3, 0, 0, 0, n]
    }

    #[test]
    fn length_field_split_and_merged() {
        let start = t0();
        let mut f = Framer::new(FrameMode::modbus_tcp());
        // 쪼개져 오면 기다렸다가 다 모이면 바로(무응답 시간과 상관없이)
        let a = mbap(1, 10);
        assert!(f.feed(&a[..3], start).is_empty());
        assert!(f.feed(&a[3..7], start + Duration::from_millis(5)).is_empty());
        assert!(f.poll(start + Duration::from_millis(50)).is_none());
        assert_eq!(bytes(f.feed(&a[7..], start + Duration::from_millis(60))), vec![a.clone()]);
        // 두 요청이 한 덩어리로 붙어 와도 나뉘고, 세 번째의 앞부분은 남는다
        let (b, c) = (mbap(2, 1), mbap(3, 2));
        let mut merged = [a.clone(), b.clone()].concat();
        merged.extend(&c[..4]);
        assert_eq!(bytes(f.feed(&merged, start + Duration::from_millis(100))), vec![a, b]);
        assert_eq!(bytes(f.feed(&c[4..], start + Duration::from_millis(110))), vec![c]);
        // 길이 값이 최대(260)를 넘으면 길이로 끊지 않고 무응답 시간에 맡긴다
        let junk = [0, 9, 0, 0, 0xFF, 0xFF, 1, 3];
        assert!(f.feed(&junk, start + Duration::from_millis(200)).is_empty());
        assert_eq!(f.poll(start + Duration::from_millis(1300)).map(|c| c.1), Some(junk.to_vec()));
    }

    #[test]
    fn length_field_sizes() {
        // 1바이트 길이 칸(머리 2바이트 뒤 데이터), 4바이트 길이 칸
        assert_eq!(length_field_len(&[0xAA, 3], 1, 1, 2, 100), Some(5));
        assert_eq!(length_field_len(&[0, 0, 1, 0, 0], 0, 4, 4, 1000), Some(260));
        // 머리보다 짧은 길이·잘못된 크기·아직 덜 옴
        assert_eq!(length_field_len(&[0, 0, 0, 0, 0, 0], 4, 2, 0, 260), None);
        assert_eq!(length_field_len(&[0, 0, 0, 0, 0, 6], 4, 3, 6, 260), None);
        assert_eq!(length_field_len(&[0, 0, 0, 0, 0], 4, 2, 6, 260), None);
        let m: FrameMode = serde_json::from_str(r#"{"kind":"length-field","offset":4,"size":2,"adjust":6,"max":260}"#).unwrap();
        assert_eq!(m, FrameMode::modbus_tcp());
    }

    #[test]
    fn modbus_request_mode_serde_name() {
        let m: FrameMode = serde_json::from_str(r#"{"kind":"modbus-rtu-request","baud":9600}"#).unwrap();
        assert_eq!(m, FrameMode::ModbusRtuRequest { baud: 9600, min_gap_ms: 0 });
    }

    /// 닫을 때 남은 바이트는 무응답 시간이 아무리 길어도(설정 파일로 들어온 큰 값) 버리지 않는다
    #[test]
    fn flush_returns_rest_even_with_huge_gap() {
        let start = t0();
        let mut f = Framer::new(FrameMode::Gap { gap_ms: 5 * 3_600_000 });
        assert!(f.feed(b"TAIL", start).is_empty());
        // 예전 닫기 경로: poll(now + 1시간) — 무응답 시간이 1시간을 넘으면 아무것도 나오지 않았다
        assert!(f.poll(start + Duration::from_secs(3600)).is_none());
        assert_eq!(f.flush().map(|c| c.1), Some(b"TAIL".to_vec()));
        assert!(f.flush().is_none());
    }

    #[test]
    fn modbus_gap_floor() {
        assert_eq!(modbus_gap(115_200), Duration::from_millis(3));
        assert!(modbus_gap(1_200) > Duration::from_millis(30));
    }
}
