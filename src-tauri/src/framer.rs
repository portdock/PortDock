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

pub struct Framer {
    mode: FrameMode,
    buf: Vec<u8>,
    last_rx: Option<Instant>,
}

impl Framer {
    pub fn new(mode: FrameMode) -> Self {
        Self { mode, buf: Vec::new(), last_rx: None }
    }

    pub fn set_mode(&mut self, mode: FrameMode) {
        self.mode = mode;
    }

    /// 받은 바이트를 넣고, 확정된 프레임들을 돌려준다.
    pub fn feed(&mut self, data: &[u8], now: Instant) -> Vec<Vec<u8>> {
        let mut out = Vec::new();
        // 직전 바이트와 간격이 gap 을 넘었으면 이전 덩어리부터 내보낸다
        if let Some(t) = self.last_rx
            && !self.buf.is_empty() && now.duration_since(t) >= self.mode.gap() {
                out.push(std::mem::take(&mut self.buf));
            }
        self.last_rx = Some(now);
        for &b in data {
            self.buf.push(b);
            if let Some(frame) = self.try_cut() {
                out.push(frame);
            }
        }
        out
    }

    /// 시간이 흘렀는지 확인해 무응답 시간이 지났으면 쌓인 것을 내보낸다.
    pub fn poll(&mut self, now: Instant) -> Option<Vec<u8>> {
        let t = self.last_rx?;
        if !self.buf.is_empty() && now.duration_since(t) >= self.mode.gap() {
            return Some(std::mem::take(&mut self.buf));
        }
        None
    }

    fn try_cut(&mut self) -> Option<Vec<u8>> {
        let cut = match &self.mode {
            FrameMode::Gap { .. } => None,
            FrameMode::Terminator { bytes, .. } => {
                (!bytes.is_empty() && self.buf.ends_with(bytes)).then_some(self.buf.len())
            }
            FrameMode::Fixed { len, .. } => (*len > 0 && self.buf.len() >= *len).then_some(*len),
            FrameMode::ModbusRtu { .. } => modbus_expected_len(&self.buf).filter(|n| self.buf.len() >= *n),
        }?;
        let rest = self.buf.split_off(cut);
        Some(std::mem::replace(&mut self.buf, rest))
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

#[cfg(test)]
mod tests {
    use super::*;

    fn t0() -> Instant {
        Instant::now()
    }

    #[test]
    fn gap_splits_on_silence() {
        let start = t0();
        let mut f = Framer::new(FrameMode::Gap { gap_ms: 10 });
        assert!(f.feed(b"AB", start).is_empty());
        assert!(f.feed(b"C", start + Duration::from_millis(5)).is_empty());
        assert_eq!(f.poll(start + Duration::from_millis(9)), None);
        assert_eq!(f.poll(start + Duration::from_millis(16)), Some(b"ABC".to_vec()));
        // 다음 덩어리가 gap 뒤에 오면 앞 것이 먼저 나간다
        f.feed(b"X", start + Duration::from_millis(20));
        let out = f.feed(b"Y", start + Duration::from_millis(40));
        assert_eq!(out, vec![b"X".to_vec()]);
    }

    #[test]
    fn terminator_cuts_immediately() {
        let mut f = Framer::new(FrameMode::Terminator { bytes: b"\r\n".to_vec(), gap_ms: 100 });
        let out = f.feed(b"OK\r\nERR\r\nPART", t0());
        assert_eq!(out, vec![b"OK\r\n".to_vec(), b"ERR\r\n".to_vec()]);
    }

    #[test]
    fn fixed_length() {
        let mut f = Framer::new(FrameMode::Fixed { len: 3, gap_ms: 100 });
        let out = f.feed(&[1, 2, 3, 4, 5, 6, 7], t0());
        assert_eq!(out, vec![vec![1, 2, 3], vec![4, 5, 6]]);
    }

    #[test]
    fn modbus_known_lengths() {
        let mut f = Framer::new(FrameMode::ModbusRtu { baud: 9600 });
        // 06 쓰기(8) + 예외 응답(5) 가 붙어 와도 나뉜다
        let mut data = vec![0x01, 0x06, 0x00, 0x01, 0x00, 0x03, 0x98, 0x0B];
        data.extend([0x01, 0x83, 0x02, 0xC0, 0xF1]);
        let out = f.feed(&data, t0());
        assert_eq!(out.len(), 2);
        assert_eq!(out[0].len(), 8);
        assert_eq!(out[1].len(), 5);
    }

    #[test]
    fn modbus_gap_floor() {
        assert_eq!(modbus_gap(115_200), Duration::from_millis(3));
        assert!(modbus_gap(1_200) > Duration::from_millis(30));
    }
}
