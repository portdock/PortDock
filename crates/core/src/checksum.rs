//! 체크섬·CRC — 송신 시 붙이고, 수신 시 마지막 바이트와 비교한다.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum ChecksumKind {
    /// Modbus RTU CRC16 (poly 0xA001, init 0xFFFF), 하위 바이트 먼저
    Crc16Modbus,
    /// CRC16-CCITT (poly 0x1021, init 0xFFFF), 상위 바이트 먼저
    Crc16Ccitt,
    /// CRC16-XMODEM (poly 0x1021, init 0x0000), 상위 바이트 먼저
    Crc16Xmodem,
    /// CRC8 (poly 0x07, init 0x00)
    Crc8,
    /// LRC — 바이트 합의 2의 보수(Modbus ASCII 의 LRC 계산식을 원시 바이트에 적용)
    Lrc,
    /// BCC — 모든 바이트 XOR
    Bcc,
    /// 바이트 합 하위 8비트
    Sum8,
    /// 바이트 합 16비트, 상위 바이트 먼저
    Sum16,
}

impl ChecksumKind {
    pub fn name(self) -> &'static str {
        match self {
            Self::Crc16Modbus => "crc16-modbus",
            Self::Crc16Ccitt => "crc16-ccitt",
            Self::Crc16Xmodem => "crc16-xmodem",
            Self::Crc8 => "crc8",
            Self::Lrc => "lrc",
            Self::Bcc => "bcc",
            Self::Sum8 => "sum8",
            Self::Sum16 => "sum16",
        }
    }

    pub fn width(self) -> usize {
        match self {
            Self::Crc16Modbus | Self::Crc16Ccitt | Self::Crc16Xmodem | Self::Sum16 => 2,
            Self::Crc8 | Self::Lrc | Self::Bcc | Self::Sum8 => 1,
        }
    }

    /// 데이터에 대한 체크섬 바이트(붙일 순서대로)
    pub fn compute(self, data: &[u8]) -> Vec<u8> {
        match self {
            Self::Crc16Modbus => crc16_modbus(data).to_le_bytes().to_vec(),
            Self::Crc16Ccitt => crc16_1021(data, 0xFFFF).to_be_bytes().to_vec(),
            Self::Crc16Xmodem => crc16_1021(data, 0x0000).to_be_bytes().to_vec(),
            Self::Crc8 => vec![crc8(data)],
            Self::Lrc => vec![lrc(data)],
            Self::Bcc => vec![data.iter().fold(0u8, |a, b| a ^ b)],
            Self::Sum8 => vec![data.iter().fold(0u8, |a, b| a.wrapping_add(*b))],
            Self::Sum16 => data
                .iter()
                .fold(0u16, |a, b| a.wrapping_add(*b as u16))
                .to_be_bytes()
                .to_vec(),
        }
    }

    /// 끝 문자(예: CR LF)로 끝나는 프레임이면 그 앞의 체크섬을 검사한다.
    /// 보낼 때 «본문 + 체크섬 + 끝 문자» 로 붙이는 것과 짝이다.
    pub fn verify_before(self, frame: &[u8], terminator: &[u8]) -> Option<bool> {
        if !terminator.is_empty() && frame.ends_with(terminator) {
            self.verify(&frame[..frame.len() - terminator.len()])
        } else {
            self.verify(frame)
        }
    }

    /// 프레임 끝의 체크섬이 맞는지. 프레임이 체크섬보다 짧으면 None.
    pub fn verify(self, frame: &[u8]) -> Option<bool> {
        let n = self.width();
        if frame.len() <= n {
            return None;
        }
        let (body, tail) = frame.split_at(frame.len() - n);
        Some(self.compute(body) == tail)
    }
}

pub fn crc16_modbus(data: &[u8]) -> u16 {
    let mut crc: u16 = 0xFFFF;
    for &b in data {
        crc ^= b as u16;
        for _ in 0..8 {
            crc = if crc & 1 != 0 { (crc >> 1) ^ 0xA001 } else { crc >> 1 };
        }
    }
    crc
}

fn crc16_1021(data: &[u8], init: u16) -> u16 {
    let mut crc = init;
    for &b in data {
        crc ^= (b as u16) << 8;
        for _ in 0..8 {
            crc = if crc & 0x8000 != 0 { (crc << 1) ^ 0x1021 } else { crc << 1 };
        }
    }
    crc
}

fn crc8(data: &[u8]) -> u8 {
    let mut crc: u8 = 0;
    for &b in data {
        crc ^= b;
        for _ in 0..8 {
            crc = if crc & 0x80 != 0 { (crc << 1) ^ 0x07 } else { crc << 1 };
        }
    }
    crc
}

fn lrc(data: &[u8]) -> u8 {
    data.iter().fold(0u8, |a, b| a.wrapping_add(*b)).wrapping_neg()
}

#[cfg(test)]
mod tests {
    use super::*;

    const CHECK: &[u8] = b"123456789";

    #[test]
    fn known_check_values() {
        // 표준 «check» 값 (reveng 카탈로그)
        assert_eq!(crc16_modbus(CHECK), 0x4B37);
        assert_eq!(crc16_1021(CHECK, 0xFFFF), 0x29B1);
        assert_eq!(crc16_1021(CHECK, 0x0000), 0x31C3);
        assert_eq!(crc8(CHECK), 0xF4);
    }

    #[test]
    fn modbus_frame_crc_low_byte_first() {
        // 01 03 00 00 00 0A → CRC C5 CD
        let req = [0x01, 0x03, 0x00, 0x00, 0x00, 0x0A];
        assert_eq!(ChecksumKind::Crc16Modbus.compute(&req), vec![0xC5, 0xCD]);
        let mut frame = req.to_vec();
        frame.extend([0xC5, 0xCD]);
        assert_eq!(ChecksumKind::Crc16Modbus.verify(&frame), Some(true));
        frame[2] = 0x01;
        assert_eq!(ChecksumKind::Crc16Modbus.verify(&frame), Some(false));
    }

    #[test]
    fn simple_sums() {
        assert_eq!(ChecksumKind::Lrc.compute(&[0x01, 0x03, 0x00, 0x00, 0x00, 0x0A]), vec![0xF2]);
        assert_eq!(ChecksumKind::Bcc.compute(&[0x02, 0x41, 0x03]), vec![0x40]);
        assert_eq!(ChecksumKind::Sum8.compute(&[0xFF, 0x02]), vec![0x01]);
        assert_eq!(ChecksumKind::Sum16.compute(&[0xFF, 0x02]), vec![0x01, 0x01]);
        assert_eq!(ChecksumKind::Bcc.verify(&[0x40]), None);
    }
}
