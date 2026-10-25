//! 체크섬·CRC — 송신 시 붙이고, 수신 시 프레임 끝(또는 정한 자리)의 바이트와 비교한다.
//!
//! 종류(`Algo`)와 자리 옵션(`ChecksumSpec`: 앞 n바이트 빼고 계산, 끝에서 m바이트 앞에 넣기, 바이트 순서 뒤집기)을
//! 함께 쓰려면 `ChecksumKind::Spec`. 예전 JSON(«"crc16-modbus"» 같은 문자열)도 그대로 받는다.

use serde::{Deserialize, Serialize};

/// 범용 CRC 매개변수 — reveng 카탈로그 표기(width·poly·init·refin·refout·xorout)와 같다
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", try_from = "CrcParamsRaw")]
pub struct CrcParams {
    /// 8 · 16 · 32
    pub width: u8,
    pub poly: u32,
    pub init: u32,
    pub refin: bool,
    pub refout: bool,
    pub xorout: u32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CrcParamsRaw {
    width: u8,
    poly: u32,
    #[serde(default)]
    init: u32,
    #[serde(default)]
    refin: bool,
    #[serde(default)]
    refout: bool,
    #[serde(default)]
    xorout: u32,
}

impl TryFrom<CrcParamsRaw> for CrcParams {
    type Error = String;
    fn try_from(r: CrcParamsRaw) -> Result<Self, String> {
        let p = CrcParams { width: r.width, poly: r.poly, init: r.init, refin: r.refin, refout: r.refout, xorout: r.xorout };
        p.validate()?;
        Ok(p)
    }
}

impl CrcParams {
    /// CRC-32 (ISO-HDLC · zip · 이더넷)
    pub const CRC32: CrcParams = CrcParams { width: 32, poly: 0x04C1_1DB7, init: 0xFFFF_FFFF, refin: true, refout: true, xorout: 0xFFFF_FFFF };

    pub fn validate(&self) -> Result<(), String> {
        if !matches!(self.width, 8 | 16 | 32) {
            return Err(crate::tr!(format!("CRC 너비는 8·16·32 중 하나입니다: {}", self.width), format!("CRC width must be 8, 16 or 32: {}", self.width)));
        }
        let max = self.mask();
        for (name, v) in [("poly", self.poly), ("init", self.init), ("xorout", self.xorout)] {
            if v as u64 > max {
                return Err(crate::tr!(
                    format!("CRC {name} 0x{v:X} 가 {}비트를 넘습니다", self.width),
                    format!("CRC {name} 0x{v:X} does not fit in {} bits", self.width)
                ));
            }
        }
        if self.poly == 0 {
            return Err(crate::tr!("CRC 다항식(poly)이 0 입니다", "The CRC polynomial (poly) is 0").into());
        }
        Ok(())
    }

    fn mask(&self) -> u64 {
        (1u64 << self.width) - 1
    }

    /// 비트 단위 계산(표 없이) — 수십 KB 프레임까지 충분히 빠르다
    pub fn compute(&self, data: &[u8]) -> u32 {
        let w = self.width as u32;
        let mask = self.mask();
        let top = 1u64 << (w - 1);
        let poly = self.poly as u64;
        let mut crc = self.init as u64 & mask;
        for &b in data {
            let b = if self.refin { b.reverse_bits() } else { b };
            crc ^= (b as u64) << (w - 8);
            for _ in 0..8 {
                crc = if crc & top != 0 { ((crc << 1) ^ poly) & mask } else { (crc << 1) & mask };
            }
        }
        if self.refout {
            crc = (crc as u32).reverse_bits() as u64 >> (32 - w);
        }
        ((crc ^ self.xorout as u64) & mask) as u32
    }

    pub fn bytes(&self) -> usize {
        self.width as usize / 8
    }
}

/// 계산 방식
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum Algo {
    Crc16Modbus,
    Crc16Ccitt,
    Crc16Xmodem,
    Crc8,
    Lrc,
    Bcc,
    Sum8,
    Sum16,
    /// CRC-32 (ISO-HDLC), 낮은 바이트 먼저
    Crc32,
    /// 범용 CRC — 높은 바이트 먼저(뒤집기 옵션으로 바꾼다)
    Crc(CrcParams),
}

impl Algo {
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
            Self::Crc32 => "crc32",
            Self::Crc(_) => "crc",
        }
    }

    pub fn width(self) -> usize {
        match self {
            Self::Crc16Modbus | Self::Crc16Ccitt | Self::Crc16Xmodem | Self::Sum16 => 2,
            Self::Crc8 | Self::Lrc | Self::Bcc | Self::Sum8 => 1,
            Self::Crc32 => 4,
            Self::Crc(p) => p.bytes(),
        }
    }

    /// 체크섬 바이트(이 방식의 기본 순서)
    pub fn raw(self, data: &[u8]) -> Vec<u8> {
        match self {
            Self::Crc16Modbus => crc16_modbus(data).to_le_bytes().to_vec(),
            Self::Crc16Ccitt => crc16_1021(data, 0xFFFF).to_be_bytes().to_vec(),
            Self::Crc16Xmodem => crc16_1021(data, 0x0000).to_be_bytes().to_vec(),
            Self::Crc8 => vec![crc8(data)],
            Self::Lrc => vec![lrc(data)],
            Self::Bcc => vec![data.iter().fold(0u8, |a, b| a ^ b)],
            Self::Sum8 => vec![data.iter().fold(0u8, |a, b| a.wrapping_add(*b))],
            Self::Sum16 => data.iter().fold(0u16, |a, b| a.wrapping_add(*b as u16)).to_be_bytes().to_vec(),
            Self::Crc32 => CrcParams::CRC32.compute(data).to_le_bytes().to_vec(),
            Self::Crc(p) => {
                let v = p.compute(data).to_be_bytes();
                v[4 - p.bytes()..].to_vec()
            }
        }
    }
}

/// 방식 + 자리 옵션
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChecksumSpec {
    pub algo: Algo,
    /// 앞에서 이만큼 빼고 계산(STX·주소 머리 등)
    #[serde(default)]
    pub skip_head: u16,
    /// 끝에서 이만큼 앞에 넣는다(ETX 앞 등). 그 끝 바이트들은 계산에서도 빠진다
    #[serde(default)]
    pub before_end: u16,
    /// 바이트 순서 뒤집기
    #[serde(default)]
    pub swap: bool,
}

impl ChecksumSpec {
    pub fn plain(algo: Algo) -> Self {
        Self { algo, skip_head: 0, before_end: 0, swap: false }
    }

    fn sum_of(&self, region: &[u8]) -> Vec<u8> {
        let mut c = self.algo.raw(region);
        if self.swap {
            c.reverse();
        }
        c
    }
}

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
    /// CRC-32 (ISO-HDLC), 하위 바이트 먼저
    Crc32,
    /// 방식 + 자리 옵션 · 범용 CRC. JSON: {"spec": {"algo": …, "skipHead": 1, "beforeEnd": 1, "swap": false}}
    Spec(ChecksumSpec),
}

impl ChecksumKind {
    pub fn spec(self) -> ChecksumSpec {
        let algo = match self {
            Self::Crc16Modbus => Algo::Crc16Modbus,
            Self::Crc16Ccitt => Algo::Crc16Ccitt,
            Self::Crc16Xmodem => Algo::Crc16Xmodem,
            Self::Crc8 => Algo::Crc8,
            Self::Lrc => Algo::Lrc,
            Self::Bcc => Algo::Bcc,
            Self::Sum8 => Algo::Sum8,
            Self::Sum16 => Algo::Sum16,
            Self::Crc32 => Algo::Crc32,
            Self::Spec(s) => return s,
        };
        ChecksumSpec::plain(algo)
    }

    pub fn name(self) -> &'static str {
        self.spec().algo.name()
    }

    /// 사건 줄용 설명 «crc16-modbus skip 1 before-end 1 swap», 범용 CRC 는 매개변수까지
    pub fn describe(self) -> String {
        let s = self.spec();
        let mut out = match s.algo {
            Algo::Crc(p) => format!(
                "crc{}(poly=0x{:X} init=0x{:X}{}{} xorout=0x{:X})",
                p.width,
                p.poly,
                p.init,
                if p.refin { " refin" } else { "" },
                if p.refout { " refout" } else { "" },
                p.xorout
            ),
            a => a.name().to_string(),
        };
        if s.skip_head > 0 {
            out.push_str(&format!(" skip {}", s.skip_head));
        }
        if s.before_end > 0 {
            out.push_str(&format!(" before-end {}", s.before_end));
        }
        if s.swap {
            out.push_str(" swap");
        }
        out
    }

    pub fn width(self) -> usize {
        self.spec().algo.width()
    }

    /// 데이터에 대한 체크섬 바이트(붙일 순서대로). 자리 옵션이 있으면 그 범위로 계산한다(넣기는 `apply`)
    pub fn compute(self, data: &[u8]) -> Vec<u8> {
        let s = self.spec();
        let lo = (s.skip_head as usize).min(data.len());
        let hi = data.len().saturating_sub(s.before_end as usize).max(lo);
        s.sum_of(&data[lo..hi])
    }

    /// 본문에 체크섬을 넣은 결과 — 옵션이 없으면 끝에 붙인다.
    /// 뺄 바이트(앞 n + 끝 m)가 본문보다 길면 오류
    pub fn apply(self, body: &[u8]) -> Result<Vec<u8>, String> {
        let s = self.spec();
        let (head, tail) = (s.skip_head as usize, s.before_end as usize);
        if head + tail > body.len() {
            return Err(crate::tr!(
                format!("체크섬 범위: 본문 {}바이트에서 앞 {head}·끝 {tail}바이트를 뺄 수 없습니다", body.len()),
                format!("Checksum range: cannot leave out {head} leading and {tail} trailing bytes of a {}-byte body", body.len())
            ));
        }
        let at = body.len() - tail;
        let c = s.sum_of(&body[head..at]);
        let mut out = Vec::with_capacity(body.len() + c.len());
        out.extend_from_slice(&body[..at]);
        out.extend(c);
        out.extend_from_slice(&body[at..]);
        Ok(out)
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

    /// 체크섬이 맞는지(자리 옵션 반영: 앞 n 빼고, 끝 m 앞의 체크섬). 계산할 바이트가 하나도 없으면 None.
    pub fn verify(self, frame: &[u8]) -> Option<bool> {
        let s = self.spec();
        let n = s.algo.width();
        let (head, tail) = (s.skip_head as usize, s.before_end as usize);
        if frame.len() <= head + n + tail {
            return None;
        }
        let at = frame.len() - tail - n;
        Some(s.sum_of(&frame[head..at]) == frame[at..at + n])
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

    fn crc(width: u8, poly: u32, init: u32, refin: bool, refout: bool, xorout: u32) -> CrcParams {
        let p = CrcParams { width, poly, init, refin, refout, xorout };
        p.validate().unwrap();
        p
    }

    #[test]
    fn known_check_values() {
        // 표준 «check» 값 (reveng 카탈로그)
        assert_eq!(crc16_modbus(CHECK), 0x4B37);
        assert_eq!(crc16_1021(CHECK, 0xFFFF), 0x29B1);
        assert_eq!(crc16_1021(CHECK, 0x0000), 0x31C3);
        assert_eq!(crc8(CHECK), 0xF4);
    }

    /// 범용 CRC — reveng 카탈로그(https://reveng.sourceforge.io/crc-catalogue/)의 check 값
    #[test]
    fn generic_crc_reveng_catalogue() {
        let cases: [(&str, CrcParams, u32); 13] = [
            ("CRC-8/SMBUS", crc(8, 0x07, 0, false, false, 0), 0xF4),
            ("CRC-8/MAXIM-DOW", crc(8, 0x31, 0, true, true, 0), 0xA1),
            ("CRC-8/ROHC", crc(8, 0x07, 0xFF, true, true, 0), 0xD0),
            ("CRC-16/ARC", crc(16, 0x8005, 0, true, true, 0), 0xBB3D),
            ("CRC-16/MODBUS", crc(16, 0x8005, 0xFFFF, true, true, 0), 0x4B37),
            ("CRC-16/IBM-3740", crc(16, 0x1021, 0xFFFF, false, false, 0), 0x29B1),
            ("CRC-16/XMODEM", crc(16, 0x1021, 0, false, false, 0), 0x31C3),
            ("CRC-16/KERMIT", crc(16, 0x1021, 0, true, true, 0), 0x2189),
            ("CRC-16/IBM-SDLC", crc(16, 0x1021, 0xFFFF, true, true, 0xFFFF), 0x906E),
            ("CRC-32/ISO-HDLC", CrcParams::CRC32, 0xCBF4_3926),
            ("CRC-32/BZIP2", crc(32, 0x04C1_1DB7, 0xFFFF_FFFF, false, false, 0xFFFF_FFFF), 0xFC89_1918),
            ("CRC-32/MPEG-2", crc(32, 0x04C1_1DB7, 0xFFFF_FFFF, false, false, 0), 0x0376_E6E7),
            ("CRC-32/ISCSI", crc(32, 0x1EDC_6F41, 0xFFFF_FFFF, true, true, 0xFFFF_FFFF), 0xE306_9283),
        ];
        for (name, p, want) in cases {
            assert_eq!(p.compute(CHECK), want, "{name}");
        }
    }

    #[test]
    fn crc32_and_generic_byte_order() {
        assert_eq!(ChecksumKind::Crc32.compute(CHECK), vec![0x26, 0x39, 0xF4, 0xCB]);
        let arc = Algo::Crc(crc(16, 0x8005, 0, true, true, 0));
        assert_eq!(ChecksumKind::Spec(ChecksumSpec::plain(arc)).compute(CHECK), vec![0xBB, 0x3D]);
        let swapped = ChecksumSpec { swap: true, ..ChecksumSpec::plain(arc) };
        assert_eq!(ChecksumKind::Spec(swapped).compute(CHECK), vec![0x3D, 0xBB]);
    }

    #[test]
    fn crc_params_rejected_when_invalid() {
        let bad: Result<ChecksumKind, _> = serde_json::from_str(r#"{"spec":{"algo":{"crc":{"width":12,"poly":4129}}}}"#);
        assert!(bad.is_err());
        let wide: Result<ChecksumKind, _> = serde_json::from_str(r#"{"spec":{"algo":{"crc":{"width":8,"poly":4129}}}}"#);
        assert!(wide.is_err(), "poly 0x1021 does not fit 8 bits");
        let ok: ChecksumKind = serde_json::from_str(r#"{"spec":{"algo":{"crc":{"width":16,"poly":32773,"refin":true,"refout":true}}}}"#).unwrap();
        assert_eq!(ok.compute(CHECK), vec![0xBB, 0x3D]);
    }

    #[test]
    fn json_compatible_with_old_strings() {
        let k: ChecksumKind = serde_json::from_str(r#""crc16-modbus""#).unwrap();
        assert_eq!(k, ChecksumKind::Crc16Modbus);
        let k: ChecksumKind = serde_json::from_str(r#""crc32""#).unwrap();
        assert_eq!(k, ChecksumKind::Crc32);
        let k: ChecksumKind = serde_json::from_str(r#"{"spec":{"algo":"bcc","skipHead":1,"beforeEnd":1}}"#).unwrap();
        assert_eq!(k.spec(), ChecksumSpec { algo: Algo::Bcc, skip_head: 1, before_end: 1, swap: false });
        assert_eq!(serde_json::to_string(&ChecksumKind::Sum8).unwrap(), r#""sum8""#);
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

    /// STX 41 42 ETX — STX 빼고, ETX 앞에 BCC: 02 41 42 [41^42=03] 03
    #[test]
    fn range_and_position_options() {
        let k = ChecksumKind::Spec(ChecksumSpec { algo: Algo::Bcc, skip_head: 1, before_end: 1, swap: false });
        let body = [0x02, 0x41, 0x42, 0x03];
        let framed = k.apply(&body).unwrap();
        assert_eq!(framed, vec![0x02, 0x41, 0x42, 0x03, 0x03]);
        assert_eq!(k.verify(&framed), Some(true));
        let mut bad = framed.clone();
        bad[1] = 0x40;
        assert_eq!(k.verify(&bad), Some(false));
        // 머리를 바꿔도(계산 밖) 맞다
        let mut head = framed.clone();
        head[0] = 0x7E;
        assert_eq!(k.verify(&head), Some(true));
        // 끝 문자 뒤에 CR LF 가 붙어 와도
        let mut term = framed.clone();
        term.extend([0x0D, 0x0A]);
        assert_eq!(k.verify_before(&term, &[0x0D, 0x0A]), Some(true));
        // 너무 짧으면 판정 안 함, 빼는 게 본문보다 길면 오류
        assert_eq!(k.verify(&[0x02, 0x00, 0x03]), None);
        assert!(k.apply(&[0x02]).is_err());
        // 옵션 없이는 그냥 뒤에 붙는다
        assert_eq!(ChecksumKind::Sum8.apply(&[1, 2]).unwrap(), vec![1, 2, 3]);
    }

    #[test]
    fn swap_and_describe() {
        let k = ChecksumKind::Spec(ChecksumSpec { algo: Algo::Crc16Modbus, skip_head: 0, before_end: 0, swap: true });
        let req = [0x01, 0x03, 0x00, 0x00, 0x00, 0x0A];
        assert_eq!(k.compute(&req), vec![0xCD, 0xC5]);
        let mut f = req.to_vec();
        f.extend([0xCD, 0xC5]);
        assert_eq!(k.verify(&f), Some(true));
        assert_eq!(k.describe(), "crc16-modbus swap");
        assert_eq!(k.name(), "crc16-modbus");
        assert_eq!(ChecksumKind::Spec(ChecksumSpec::plain(Algo::Crc(CrcParams::CRC32))).describe(), "crc32(poly=0x4C11DB7 init=0xFFFFFFFF refin refout xorout=0xFFFFFFFF)");
    }
}
