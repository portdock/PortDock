//! 레지스터 타입(u16·s16·u32·s32·f32·f64)과 워드·바이트 순서, 값 자동 변화(시뮬레이션), 난수.
//! 화면(apps/modbus-slave/src/regmap.ts)과 같은 규칙 — 순서 이름은 바이트 A(최상위)…를 레지스터에 놓는 모양이다.
//!
//! - ABCD: 레지스터 0 = AB, 1 = CD (Modbus 기본, 빅 엔디언)
//! - CDAB: 워드 바꿈 — 레지스터 순서를 뒤집는다(64비트면 GH EF CD AB)
//! - BADC: 바이트 바꿈 — 레지스터 안의 두 바이트를 바꾼다
//! - DCBA: 둘 다(리틀 엔디언)

use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ValueType {
    /// 코일·입력 접점(0/1)
    Bit,
    #[default]
    U16,
    S16,
    U32,
    S32,
    F32,
    F64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum WordOrder {
    #[default]
    Abcd,
    Cdab,
    Badc,
    Dcba,
}

impl WordOrder {
    fn word_swap(self) -> bool {
        matches!(self, Self::Cdab | Self::Dcba)
    }
    fn byte_swap(self) -> bool {
        matches!(self, Self::Badc | Self::Dcba)
    }
}

impl ValueType {
    /// 차지하는 레지스터(비트 표는 칸) 수
    pub fn regs(self) -> usize {
        match self {
            Self::Bit | Self::U16 | Self::S16 => 1,
            Self::U32 | Self::S32 | Self::F32 => 2,
            Self::F64 => 4,
        }
    }

    fn is_int(self) -> bool {
        !matches!(self, Self::F32 | Self::F64)
    }

    /// 정수형의 범위(실수형은 무한)
    fn bounds(self) -> (f64, f64) {
        match self {
            Self::Bit => (0.0, 1.0),
            Self::U16 => (0.0, u16::MAX as f64),
            Self::S16 => (i16::MIN as f64, i16::MAX as f64),
            Self::U32 => (0.0, u32::MAX as f64),
            Self::S32 => (i32::MIN as f64, i32::MAX as f64),
            Self::F32 => (f32::MIN as f64, f32::MAX as f64),
            Self::F64 => (f64::MIN, f64::MAX),
        }
    }

    /// 이 타입에 넣을 수 있게 — 정수형은 반올림해 범위 안으로
    pub fn fit(self, v: f64) -> f64 {
        if v.is_nan() {
            return 0.0;
        }
        let (lo, hi) = self.bounds();
        let v = if self.is_int() { v.round() } else { v };
        v.clamp(lo, hi)
    }
}

/// 바이트(최상위 먼저) → 레지스터, 순서 적용
fn bytes_to_regs(bytes: &[u8], order: WordOrder) -> Vec<u16> {
    let mut regs: Vec<u16> = bytes
        .chunks(2)
        .map(|c| if order.byte_swap() { u16::from_be_bytes([c[1], c[0]]) } else { u16::from_be_bytes([c[0], c[1]]) })
        .collect();
    if order.word_swap() {
        regs.reverse();
    }
    regs
}

fn regs_to_bytes(regs: &[u16], order: WordOrder) -> Vec<u8> {
    let mut r = regs.to_vec();
    if order.word_swap() {
        r.reverse();
    }
    r.iter()
        .flat_map(|v| {
            let b = v.to_be_bytes();
            if order.byte_swap() { [b[1], b[0]] } else { b }
        })
        .collect()
}

/// 값 → 레지스터(타입의 칸 수만큼). 범위를 넘으면 맞춘다(`ValueType::fit`)
pub fn encode(v: f64, t: ValueType, order: WordOrder) -> Vec<u16> {
    let v = t.fit(v);
    let bytes: Vec<u8> = match t {
        ValueType::Bit => return vec![(v != 0.0) as u16],
        ValueType::U16 => (v as u16).to_be_bytes().to_vec(),
        ValueType::S16 => (v as i16).to_be_bytes().to_vec(),
        ValueType::U32 => (v as u32).to_be_bytes().to_vec(),
        ValueType::S32 => (v as i32).to_be_bytes().to_vec(),
        ValueType::F32 => (v as f32).to_be_bytes().to_vec(),
        ValueType::F64 => v.to_be_bytes().to_vec(),
    };
    bytes_to_regs(&bytes, order)
}


/// 레지스터 → 값. 칸이 모자라면 None
pub fn decode(regs: &[u16], t: ValueType, order: WordOrder) -> Option<f64> {
    let n = t.regs();
    if regs.len() < n {
        return None;
    }
    if t == ValueType::Bit {
        return Some((regs[0] != 0) as u8 as f64);
    }
    let b = regs_to_bytes(&regs[..n], order);
    Some(match t {
        ValueType::U16 => u16::from_be_bytes([b[0], b[1]]) as f64,
        ValueType::S16 => i16::from_be_bytes([b[0], b[1]]) as f64,
        ValueType::U32 => u32::from_be_bytes([b[0], b[1], b[2], b[3]]) as f64,
        ValueType::S32 => i32::from_be_bytes([b[0], b[1], b[2], b[3]]) as f64,
        ValueType::F32 => f32::from_be_bytes([b[0], b[1], b[2], b[3]]) as f64,
        ValueType::F64 => f64::from_be_bytes([b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7]]),
        ValueType::Bit => unreachable!(),
    })
}

// ------------------------------------------------------------------ 난수

/// xorshift64* — 씨앗이 같으면 같은 순서(장애 주입·랜덤 값 시험이 재현되게)
#[derive(Debug, Clone)]
pub struct Rng(u64);

impl Rng {
    pub fn new(seed: u64) -> Self {
        Self(seed.max(1))
    }

    /// 시각으로 씨앗을 정한다
    pub fn from_time() -> Self {
        let n = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos() as u64).unwrap_or(0x9E37_79B9);
        Self::new(n ^ 0x2545_F491_4F6C_DD1D)
    }

    pub fn next_u64(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.0 = x;
        x.wrapping_mul(0x2545_F491_4F6C_DD1D)
    }

    /// [0, 1)
    pub fn unit(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1u64 << 53) as f64
    }

    /// [lo, hi] 정수
    pub fn range(&mut self, lo: u64, hi: u64) -> u64 {
        if hi <= lo {
            return lo;
        }
        lo + self.next_u64() % (hi - lo + 1)
    }
}

// ------------------------------------------------------------------ 값 자동 변화

/// 변화 방식. 화면: «증가·감소·랜덤·사인·램프·토글»
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum SimKind {
    /// 지금 값에 step 을 더한다. max 를 넘으면 wrap 이면 min 으로, 아니면 max 에 멈춘다
    Increment { step: f64, min: f64, max: f64, wrap: bool },
    /// 지금 값에서 step 을 뺀다. min 아래면 wrap 이면 max 로, 아니면 min 에 멈춘다
    Decrement { step: f64, min: f64, max: f64, wrap: bool },
    /// min~max 사이 아무 값(정수형은 정수)
    Random { min: f64, max: f64 },
    /// offset + amp·sin(2π·t/주기)
    Sine {
        amp: f64,
        offset: f64,
        #[serde(rename = "waveMs")]
        wave_ms: u64,
    },
    /// 주기 동안 min → max 로 오르고 다시 min 부터
    Ramp {
        min: f64,
        max: f64,
        #[serde(rename = "waveMs")]
        wave_ms: u64,
    },
    /// 0 ↔ 1
    Toggle,
}

/// 칸(또는 타입 지정 점) 하나의 자동 변화
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimSpec {
    pub addr: u16,
    #[serde(default)]
    pub value_type: ValueType,
    #[serde(default)]
    pub order: WordOrder,
    /// 바꾸는 간격(ms). 0 이면 마스터가 읽을 때마다
    #[serde(default)]
    pub period_ms: u64,
    pub sim: SimKind,
}

impl SimSpec {
    pub fn span(&self) -> (u32, u32) {
        (self.addr as u32, self.addr as u32 + self.value_type.regs() as u32)
    }

    pub fn on_read(&self) -> bool {
        self.period_ms == 0
    }

    /// 화면에서 온 설정 검사
    pub fn check(&self) -> Result<(), String> {
        if self.span().1 > 65_536 {
            return Err(crate::tr!(format!("주소 {} 의 칸이 65535 를 넘습니다", self.addr), format!("Address {} runs past 65535", self.addr)));
        }
        let bad = |what: &str| Err(crate::tr!(format!("주소 {}: {what}", self.addr), format!("Address {}: {what}", self.addr)));
        match &self.sim {
            SimKind::Increment { step, min, max, .. } | SimKind::Decrement { step, min, max, .. } => {
                if !(step.is_finite() && min.is_finite() && max.is_finite()) || *step <= 0.0 || min > max {
                    return bad(crate::tr!("증가·감소는 step > 0, 최소 ≤ 최대", "step > 0 and min ≤ max are required"));
                }
            }
            SimKind::Random { min, max } | SimKind::Ramp { min, max, .. } => {
                if !(min.is_finite() && max.is_finite()) || min > max {
                    return bad(crate::tr!("최소 ≤ 최대여야 합니다", "min must be ≤ max"));
                }
            }
            SimKind::Sine { amp, offset, .. } => {
                if !(amp.is_finite() && offset.is_finite()) {
                    return bad(crate::tr!("진폭·중심값이 숫자가 아닙니다", "amplitude/offset must be numbers"));
                }
            }
            SimKind::Toggle => {}
        }
        if let SimKind::Sine { wave_ms, .. } | SimKind::Ramp { wave_ms, .. } = &self.sim
            && *wave_ms == 0
        {
            return bad(crate::tr!("사인·램프의 주기는 1ms 이상", "sine/ramp period must be ≥ 1 ms"));
        }
        Ok(())
    }

    /// 다음 값. `cur` 는 지금 표 값(마스터가 쓴 값이면 그것부터), `t` 는 시작부터 지난 시간
    pub fn next(&self, cur: f64, t: Duration, rng: &mut Rng) -> f64 {
        let ty = self.value_type;
        let phase = |wave_ms: u64| (t.as_millis() % wave_ms.max(1) as u128) as f64 / wave_ms.max(1) as f64;
        let v = match &self.sim {
            SimKind::Increment { step, min, max, wrap } => {
                let n = cur + step;
                if cur < *min || cur > *max {
                    *min
                } else if n > *max + 1e-9 {
                    if *wrap { *min } else { *max }
                } else {
                    n
                }
            }
            SimKind::Decrement { step, min, max, wrap } => {
                let n = cur - step;
                if cur < *min || cur > *max {
                    *max
                } else if n < *min - 1e-9 {
                    if *wrap { *max } else { *min }
                } else {
                    n
                }
            }
            SimKind::Random { min, max } => {
                if ty.is_int() {
                    let (lo, hi) = (ty.fit(min.ceil()), ty.fit(max.floor()));
                    if hi < lo { lo } else { lo + (rng.unit() * (hi - lo + 1.0)).floor().min(hi - lo) }
                } else {
                    min + rng.unit() * (max - min)
                }
            }
            SimKind::Sine { amp, offset, wave_ms } => offset + amp * (std::f64::consts::TAU * phase(*wave_ms)).sin(),
            SimKind::Ramp { min, max, wave_ms } => min + (max - min) * phase(*wave_ms),
            SimKind::Toggle => (cur == 0.0) as u8 as f64,
        };
        ty.fit(v)
    }
}

/// 돌아가는 자동 변화 — 설정 + 마지막으로 바꾼 시각
#[derive(Debug, Clone)]
pub struct SimRun {
    pub spec: SimSpec,
    pub last: Option<Instant>,
}

impl From<SimSpec> for SimRun {
    fn from(spec: SimSpec) -> Self {
        Self { spec, last: None }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn f32_all_orders() {
        // 123.456 = 0x42F6E979
        let cases = [
            (WordOrder::Abcd, [0x42F6, 0xE979]),
            (WordOrder::Cdab, [0xE979, 0x42F6]),
            (WordOrder::Badc, [0xF642, 0x79E9]),
            (WordOrder::Dcba, [0x79E9, 0xF642]),
        ];
        for (o, regs) in cases {
            assert_eq!(encode(123.456, ValueType::F32, o), regs.to_vec(), "{o:?}");
            let back = decode(&regs, ValueType::F32, o).unwrap();
            assert!((back - 123.456).abs() < 1e-4, "{o:?} {back}");
        }
    }

    #[test]
    fn ints_and_f64_round_trip_all_orders() {
        let orders = [WordOrder::Abcd, WordOrder::Cdab, WordOrder::Badc, WordOrder::Dcba];
        for o in orders {
            for (t, v) in [(ValueType::U16, 65_000.0), (ValueType::S16, -1234.0), (ValueType::U32, 4_000_000_000.0), (ValueType::S32, -70_000.0), (ValueType::F64, -9876.54321)] {
                let r = encode(v, t, o);
                assert_eq!(r.len(), t.regs());
                assert_eq!(decode(&r, t, o), Some(v), "{t:?} {o:?}");
            }
        }
        // 0x12345678 의 네 가지 순서
        assert_eq!(encode(0x1234_5678 as f64, ValueType::U32, WordOrder::Abcd), vec![0x1234, 0x5678]);
        assert_eq!(encode(0x1234_5678 as f64, ValueType::U32, WordOrder::Cdab), vec![0x5678, 0x1234]);
        assert_eq!(encode(0x1234_5678 as f64, ValueType::U32, WordOrder::Badc), vec![0x3412, 0x7856]);
        assert_eq!(encode(0x1234_5678 as f64, ValueType::U32, WordOrder::Dcba), vec![0x7856, 0x3412]);
        // 64비트 워드 바꿈은 레지스터 넷을 뒤집는다
        let a = encode(1.0, ValueType::F64, WordOrder::Abcd);
        let mut rev = a.clone();
        rev.reverse();
        assert_eq!(encode(1.0, ValueType::F64, WordOrder::Cdab), rev);
        // 16비트 바이트 바꿈
        assert_eq!(encode(0x1234 as f64, ValueType::U16, WordOrder::Badc), vec![0x3412]);
        assert_eq!(encode(0x1234 as f64, ValueType::U16, WordOrder::Cdab), vec![0x1234]);
        // 범위 밖은 맞춘다
        assert_eq!(encode(-5.0, ValueType::U16, WordOrder::Abcd), vec![0]);
        assert_eq!(encode(70_000.0, ValueType::S16, WordOrder::Abcd), vec![0x7FFF]);
        assert_eq!(decode(&[1], ValueType::U32, WordOrder::Abcd), None);
    }

    fn spec(sim: SimKind, t: ValueType) -> SimSpec {
        SimSpec { addr: 0, value_type: t, order: WordOrder::Abcd, period_ms: 100, sim }
    }

    #[test]
    fn increment_decrement_wrap_and_clamp() {
        let mut rng = Rng::new(1);
        let inc = spec(SimKind::Increment { step: 5.0, min: 0.0, max: 12.0, wrap: true }, ValueType::U16);
        let t = Duration::ZERO;
        assert_eq!(inc.next(0.0, t, &mut rng), 5.0);
        assert_eq!(inc.next(10.0, t, &mut rng), 0.0); // 15 > 12 → min
        let clamp = spec(SimKind::Increment { step: 5.0, min: 0.0, max: 12.0, wrap: false }, ValueType::U16);
        assert_eq!(clamp.next(10.0, t, &mut rng), 12.0);
        // 마스터가 범위 밖 값을 쓰면 min 부터 다시
        assert_eq!(clamp.next(500.0, t, &mut rng), 0.0);
        let dec = spec(SimKind::Decrement { step: 3.0, min: -5.0, max: 5.0, wrap: true }, ValueType::S16);
        assert_eq!(dec.next(-4.0, t, &mut rng), 5.0);
        assert_eq!(dec.next(5.0, t, &mut rng), 2.0);
        let dec2 = spec(SimKind::Decrement { step: 3.0, min: -5.0, max: 5.0, wrap: false }, ValueType::S16);
        assert_eq!(dec2.next(-4.0, t, &mut rng), -5.0);
        // 실수 증가
        let f = spec(SimKind::Increment { step: 0.5, min: 0.0, max: 2.0, wrap: true }, ValueType::F32);
        assert_eq!(f.next(1.0, t, &mut rng), 1.5);
    }

    #[test]
    fn random_sine_ramp_toggle() {
        let mut rng = Rng::new(42);
        let r = spec(SimKind::Random { min: 10.0, max: 12.0 }, ValueType::U16);
        let mut seen = [false; 3];
        for _ in 0..200 {
            let v = r.next(0.0, Duration::ZERO, &mut rng);
            assert!((10.0..=12.0).contains(&v) && v.fract() == 0.0, "{v}");
            seen[(v - 10.0) as usize] = true;
        }
        assert_eq!(seen, [true; 3]);
        // 같은 씨앗이면 같은 순서
        let (mut a, mut b) = (Rng::new(7), Rng::new(7));
        let fr = spec(SimKind::Random { min: -1.0, max: 1.0 }, ValueType::F32);
        for _ in 0..10 {
            assert_eq!(fr.next(0.0, Duration::ZERO, &mut a), fr.next(0.0, Duration::ZERO, &mut b));
        }

        let s = spec(SimKind::Sine { amp: 100.0, offset: 500.0, wave_ms: 1000 }, ValueType::U16);
        assert_eq!(s.next(0.0, Duration::from_millis(0), &mut rng), 500.0);
        assert_eq!(s.next(0.0, Duration::from_millis(250), &mut rng), 600.0);
        assert_eq!(s.next(0.0, Duration::from_millis(750), &mut rng), 400.0);
        assert_eq!(s.next(0.0, Duration::from_millis(1250), &mut rng), 600.0);

        let ramp = spec(SimKind::Ramp { min: 0.0, max: 100.0, wave_ms: 1000 }, ValueType::F32);
        assert_eq!(ramp.next(0.0, Duration::from_millis(500), &mut rng), 50.0);
        assert_eq!(ramp.next(0.0, Duration::from_millis(1100), &mut rng), 10.0);

        let tg = spec(SimKind::Toggle, ValueType::Bit);
        assert_eq!(tg.next(0.0, Duration::ZERO, &mut rng), 1.0);
        assert_eq!(tg.next(1.0, Duration::ZERO, &mut rng), 0.0);
    }

    #[test]
    fn spec_checks_and_json_shape() {
        let s: SimSpec = serde_json::from_str(r#"{"addr":10,"valueType":"f32","order":"CDAB","periodMs":500,"sim":{"kind":"sine","amp":1,"offset":0,"waveMs":1000}}"#).unwrap();
        assert_eq!(s.value_type, ValueType::F32);
        assert_eq!(s.order, WordOrder::Cdab);
        assert!(s.check().is_ok());
        let bad = SimSpec { addr: 65_535, value_type: ValueType::U32, order: WordOrder::Abcd, period_ms: 0, sim: SimKind::Toggle };
        assert!(bad.check().is_err());
        let bad2 = spec(SimKind::Increment { step: 0.0, min: 0.0, max: 1.0, wrap: true }, ValueType::U16);
        assert!(bad2.check().is_err());
        let bad3 = spec(SimKind::Ramp { min: 0.0, max: 1.0, wave_ms: 0 }, ValueType::U16);
        assert!(bad3.check().is_err());
    }
}
