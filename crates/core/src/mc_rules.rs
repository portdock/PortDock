//! PLC Simulator 조건 규칙 — «조건 → 지연 → 동작». 래더를 돌리지 않고 핸드셰이크 같은 짧은 흐름만 흉내 낸다.
//!
//! 프로토콜이 아니라 이 앱의 동작이라 매뉴얼 근거가 없다. 정한 규칙:
//! - 조건: 비트 ON·OFF(값이 그렇게 «된» 순간), 올라감·내려감(에지), 워드 =·≠·>·<(맞게 «된» 순간), 조건 없음(주기마다).
//!   ON·OFF·워드 비교는 맞지 않다가 맞게 된 때 한 번 예약하고, 지연이 끝나기 전에 다시 맞지 않게 되면 취소한다.
//!   켜는 순간(또는 규칙을 바꾼 순간) 이미 맞으면 한 번 예약한다. 에지는 켜는 순간의 값을 기준으로 삼아 헛에지를 만들지 않는다.
//! - 지연: 고정 ms, 또는 최소~최대 사이 아무 값(예약할 때 고름). 0 이면 같은 평가 안에서 바로.
//! - 동작: 비트 ON·OFF·반전, 워드 값 쓰기·더하기(넘치면 0~65535 를 돈다). 여러 개를 차례로.
//! - 주소: 비트 디바이스 «M100», 워드 «D100», 워드 안 비트 «D100.3»(0~F).
//! - 평가: 클라이언트 쓰기 직후·화면 편집 직후·주기(앱이 20ms 쯤마다). 한 번 평가 안에서 지연 0 인 규칙이 꼬리를 물면
//!   최대 [`MAX_PASSES`] 바퀴까지만 돈다(서로를 바꾸는 규칙이 멈추지 않는 것을 막음).

use crate::mc::{Dev, Memory};
use crate::regmap::Rng;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

/// 규칙 하나의 동작 수 상한
pub const MAX_ACTIONS: usize = 16;
/// 규칙 수 상한
pub const MAX_RULES: usize = 1000;
/// 지연 상한(ms) — 1시간
pub const MAX_DELAY_MS: u64 = 3_600_000;
/// «조건 없음(주기)» 의 가장 짧은 간격(ms)
pub const MIN_PERIOD_MS: u64 = 50;
/// 평가 한 번 안에서 도는 바퀴 수 상한
pub const MAX_PASSES: usize = 8;

/// 규칙이 보는·바꾸는 자리 — 비트 디바이스의 점, 워드 디바이스의 워드, 또는 워드 안의 비트
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Addr {
    pub dev: Dev,
    pub no: u32,
    /// 워드 디바이스 안 비트(0~15). 비트 디바이스에는 쓰지 않는다
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub bit: Option<u8>,
}

impl Addr {
    /// 한 비트를 가리키는지(비트 디바이스 또는 워드.비트)
    pub fn is_bit(&self) -> bool {
        self.dev.bits() || self.bit.is_some()
    }

    pub fn text(&self) -> String {
        match self.bit {
            Some(b) => format!("{}.{b:X}", self.dev.addr_text(self.no)),
            None => self.dev.addr_text(self.no),
        }
    }

    fn check(&self) -> Result<(), String> {
        if let Some(b) = self.bit {
            if self.dev.bits() {
                return Err(crate::tr!(format!("{} 는 비트 디바이스라 «.비트» 를 붙일 수 없습니다", self.dev.name()), format!("{} is a bit device; «.bit» cannot be used", self.dev.name())));
            }
            if b > 15 {
                return Err(crate::tr!("워드 안 비트는 0~F 입니다", "The bit within a word is 0–F").into());
            }
        }
        if self.no >= crate::mc::MAX_SIZE {
            return Err(crate::tr!(format!("{} 번호가 너무 큽니다", self.text()), format!("{} number is too large", self.text())));
        }
        Ok(())
    }

    /// 지금 값 — 비트면 0·1. 범위 밖이면 None
    pub fn read(&self, m: &Memory) -> Option<u16> {
        let w = *m.data.get(&self.dev)?.get(self.no as usize)?;
        Some(match self.bit {
            Some(b) => (w >> b) & 1,
            None => w,
        })
    }

    /// 값 쓰기(비트면 0 이 아닌 값 = ON). 범위 밖이면 false
    pub fn write(&self, m: &mut Memory, v: u16) -> bool {
        let bits = self.dev.bits();
        let Some(cell) = m.data.get_mut(&self.dev).and_then(|t| t.get_mut(self.no as usize)) else { return false };
        match self.bit {
            Some(b) => {
                if v != 0 {
                    *cell |= 1 << b;
                } else {
                    *cell &= !(1 << b);
                }
            }
            None => *cell = if bits { (v != 0) as u16 } else { v },
        }
        true
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CmpOp {
    Eq,
    Ne,
    Gt,
    Lt,
}

impl CmpOp {
    fn sign(self) -> &'static str {
        match self {
            CmpOp::Eq => "=",
            CmpOp::Ne => "≠",
            CmpOp::Gt => ">",
            CmpOp::Lt => "<",
        }
    }
}

/// 조건
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Cond {
    /// 조건 없음 — 지연(주기)마다
    Always,
    On { at: Addr },
    Off { at: Addr },
    /// OFF → ON 순간
    Rise { at: Addr },
    /// ON → OFF 순간
    Fall { at: Addr },
    /// 워드 값 비교(부호 없는 0~65535)
    Word { at: Addr, op: CmpOp, value: u16 },
}

impl Cond {
    fn at(&self) -> Option<&Addr> {
        match self {
            Cond::Always => None,
            Cond::On { at } | Cond::Off { at } | Cond::Rise { at } | Cond::Fall { at } | Cond::Word { at, .. } => Some(at),
        }
    }

    fn edge(&self) -> bool {
        matches!(self, Cond::Rise { .. } | Cond::Fall { .. })
    }

    /// 조건이 맞는지(에지는 «지금 값이 그 쪽인지» — 에지 판단은 앞 값과 함께)
    fn level(&self, m: &Memory) -> bool {
        let v = |at: &Addr| at.read(m);
        match self {
            Cond::Always => true,
            Cond::On { at } | Cond::Rise { at } => v(at) == Some(1),
            Cond::Off { at } | Cond::Fall { at } => v(at) == Some(0),
            Cond::Word { at, op, value } => v(at).is_some_and(|x| match op {
                CmpOp::Eq => x == *value,
                CmpOp::Ne => x != *value,
                CmpOp::Gt => x > *value,
                CmpOp::Lt => x < *value,
            }),
        }
    }

    pub fn text(&self) -> String {
        match self {
            Cond::Always => crate::tr!("주기", "periodic").into(),
            Cond::On { at } => format!("{} ON", at.text()),
            Cond::Off { at } => format!("{} OFF", at.text()),
            Cond::Rise { at } => format!("{} ↑", at.text()),
            Cond::Fall { at } => format!("{} ↓", at.text()),
            Cond::Word { at, op, value } => format!("{} {} {value}", at.text(), op.sign()),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ActOp {
    On,
    Off,
    Toggle,
    /// 워드에 값 쓰기
    Set,
    /// 워드에 더하기(음수면 빼기, 0~65535 를 돈다)
    Add,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Action {
    pub at: Addr,
    pub op: ActOp,
    #[serde(default)]
    pub value: i32,
}

impl Action {
    fn check(&self) -> Result<(), String> {
        self.at.check()?;
        let bit_op = matches!(self.op, ActOp::On | ActOp::Off | ActOp::Toggle);
        if bit_op != self.at.is_bit() {
            return Err(if bit_op {
                crate::tr!(format!("{} 은(는) 워드입니다 — «쓰기»·«더하기» 를 고르세요", self.at.text()), format!("{} is a word — choose «Write» or «Add»", self.at.text()))
            } else {
                crate::tr!(format!("{} 은(는) 비트입니다 — ON·OFF·반전을 고르세요", self.at.text()), format!("{} is a bit — choose ON, OFF or Toggle", self.at.text()))
            });
        }
        if self.op == ActOp::Set && !(0..=0xFFFF).contains(&self.value) {
            return Err(crate::tr!("쓸 값은 0~65535 입니다", "The value to write is 0–65535").into());
        }
        if self.op == ActOp::Add && !(-0xFFFF..=0xFFFF).contains(&self.value) {
            return Err(crate::tr!("더할 값은 -65535~65535 입니다", "The value to add is −65535–65535").into());
        }
        Ok(())
    }

    /// 실행 → 바뀐 뒤 글(«M101=ON», «D0=5»). 범위 밖이면 None
    fn apply(&self, m: &mut Memory) -> Option<String> {
        let cur = self.at.read(m)?;
        let v = match self.op {
            ActOp::On => 1,
            ActOp::Off => 0,
            ActOp::Toggle => (cur == 0) as u16,
            ActOp::Set => self.value as u16,
            ActOp::Add => (cur as i32 + self.value).rem_euclid(0x1_0000) as u16,
        };
        self.at.write(m, v);
        Some(if self.at.is_bit() { format!("{}={}", self.at.text(), if v != 0 { "ON" } else { "OFF" }) } else { format!("{}={v}", self.at.text()) })
    }
}

/// 규칙 하나
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Rule {
    pub id: u32,
    #[serde(default)]
    pub name: String,
    #[serde(default = "yes")]
    pub enabled: bool,
    pub cond: Cond,
    #[serde(default)]
    pub delay_ms: u64,
    /// 0 이거나 `delay_ms` 보다 작으면 고정 지연
    #[serde(default)]
    pub delay_max_ms: u64,
    pub actions: Vec<Action>,
}

fn yes() -> bool {
    true
}

impl Rule {
    pub fn check(&self) -> Result<(), String> {
        let at = |e: String| crate::tr!(format!("규칙 #{}: {e}", self.id), format!("Rule #{}: {e}", self.id));
        if let Some(a) = self.cond.at() {
            a.check().map_err(at)?;
        }
        match &self.cond {
            Cond::Word { at: a, .. } if a.is_bit() => return Err(at(crate::tr!("값 비교는 워드(비트 없이)에만 씁니다", "Value comparison needs a word (without a bit)").into())),
            Cond::On { at: a } | Cond::Off { at: a } | Cond::Rise { at: a } | Cond::Fall { at: a } if !a.is_bit() => {
                return Err(at(crate::tr!(format!("{} 은(는) 워드입니다 — «.비트» 를 붙이거나 값 비교를 고르세요", a.text()), format!("{} is a word — add «.bit» or use a value comparison", a.text()))));
            }
            _ => {}
        }
        if self.actions.is_empty() || self.actions.len() > MAX_ACTIONS {
            return Err(at(crate::tr!(format!("동작은 1~{MAX_ACTIONS}개입니다"), format!("A rule needs 1–{MAX_ACTIONS} actions"))));
        }
        for a in &self.actions {
            a.check().map_err(at)?;
        }
        if self.delay_ms > MAX_DELAY_MS || self.delay_max_ms > MAX_DELAY_MS {
            return Err(at(crate::tr!("지연은 1시간(3600000 ms)까지입니다", "Delays go up to 1 hour (3600000 ms)").into()));
        }
        if self.cond == Cond::Always && self.delay_ms.max(self.delay_max_ms) < MIN_PERIOD_MS {
            return Err(at(crate::tr!(format!("«조건 없음(주기)» 은 지연을 {MIN_PERIOD_MS} ms 이상으로 정합니다"), format!("«No condition (periodic)» needs a delay of {MIN_PERIOD_MS} ms or more"))));
        }
        Ok(())
    }

    fn pick_delay(&self, rng: &mut Rng) -> Duration {
        let ms = if self.delay_max_ms > self.delay_ms { rng.range(self.delay_ms, self.delay_max_ms) } else { self.delay_ms };
        Duration::from_millis(ms)
    }

    pub fn summary(&self) -> String {
        let acts: Vec<String> = self
            .actions
            .iter()
            .map(|a| match a.op {
                ActOp::On => format!("{} ON", a.at.text()),
                ActOp::Off => format!("{} OFF", a.at.text()),
                ActOp::Toggle => format!("{} ⇄", a.at.text()),
                ActOp::Set => format!("{} = {}", a.at.text(), a.value),
                ActOp::Add => format!("{} {:+}", a.at.text(), a.value),
            })
            .collect();
        let d = if self.delay_max_ms > self.delay_ms { format!("{}–{} ms", self.delay_ms, self.delay_max_ms) } else { format!("{} ms", self.delay_ms) };
        format!("{} → {d} → {}", self.cond.text(), acts.join(", "))
    }
}

/// 규칙 하나의 실행 상태 — 화면이 읽는다
#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleStat {
    pub id: u32,
    /// 실행 횟수
    pub count: u64,
    /// 마지막 실행 시각(벽시계 ms)
    pub last_ms: Option<u64>,
    /// 지금 지연을 기다리는 중
    pub waiting: bool,
}

#[derive(Debug, Clone, Default)]
struct RunState {
    /// 앞 평가 때 조건(에지·«맞게 된 순간» 판단)
    prev: Option<bool>,
    due: Option<Instant>,
    count: u64,
    last_ms: Option<u64>,
}

/// 실행한 규칙 하나 — 통신 기록 줄로
#[derive(Debug, Clone, PartialEq)]
pub struct Fired {
    pub id: u32,
    pub text: String,
}

impl Fired {
    /// «RULE #2 완료 켜기: M101=ON»
    pub fn line(&self) -> String {
        format!("RULE #{} {}", self.id, self.text)
    }
}

#[derive(Debug, Clone, Default)]
pub struct Rules {
    rules: Vec<Rule>,
    state: Vec<RunState>,
}

impl Rules {
    /// 규칙 목록을 통째로 바꾼다. 같은 id 의 횟수·마지막 시각은 이어 간다(조건·예약은 새로)
    pub fn set(&mut self, rules: Vec<Rule>) -> Result<(), String> {
        if rules.len() > MAX_RULES {
            return Err(crate::tr!(format!("규칙은 {MAX_RULES}개까지입니다"), format!("Up to {MAX_RULES} rules")));
        }
        let mut ids = std::collections::BTreeSet::new();
        for r in &rules {
            r.check()?;
            if !ids.insert(r.id) {
                return Err(crate::tr!(format!("규칙 번호 #{} 가 겹칩니다", r.id), format!("Rule number #{} is used twice", r.id)));
            }
        }
        let old: Vec<(u32, RunState)> = self.rules.iter().map(|r| r.id).zip(std::mem::take(&mut self.state)).collect();
        self.state = rules
            .iter()
            .map(|r| {
                let o = old.iter().find(|(id, _)| *id == r.id).map(|(_, s)| s.clone()).unwrap_or_default();
                RunState { count: o.count, last_ms: o.last_ms, ..Default::default() }
            })
            .collect();
        self.rules = rules;
        Ok(())
    }

    pub fn rules(&self) -> &[Rule] {
        &self.rules
    }

    pub fn is_empty(&self) -> bool {
        !self.rules.iter().any(|r| r.enabled)
    }

    pub fn stats(&self) -> Vec<RuleStat> {
        self.rules.iter().zip(&self.state).map(|(r, s)| RuleStat { id: r.id, count: s.count, last_ms: s.last_ms, waiting: s.due.is_some() }).collect()
    }

    /// 횟수·마지막 시각 지우기
    pub fn reset_counts(&mut self) {
        for s in &mut self.state {
            s.count = 0;
            s.last_ms = None;
        }
    }

    /// 예약을 모두 버리고 조건을 처음부터 본다(STOP → RUN 등)
    pub fn rearm(&mut self) {
        for s in &mut self.state {
            s.prev = None;
            s.due = None;
        }
    }

    /// 조건을 보고 예약하고, 때가 된 규칙을 실행한다. `wall_ms` = 마지막 실행 시각으로 적을 벽시계
    pub fn eval(&mut self, m: &mut Memory, now: Instant, wall_ms: u64, rng: &mut Rng) -> Vec<Fired> {
        let mut out = Vec::new();
        for _ in 0..MAX_PASSES {
            let mut fired_any = false;
            for (r, s) in self.rules.iter().zip(self.state.iter_mut()) {
                if !r.enabled {
                    s.prev = None;
                    s.due = None;
                    continue;
                }
                let cur = r.cond.level(m);
                if r.cond == Cond::Always {
                    if s.due.is_none() {
                        s.due = Some(now + r.pick_delay(rng));
                    }
                } else if r.cond.edge() {
                    // 처음 보는 값은 기준으로만(헛에지 없음)
                    if s.prev == Some(false) && cur && s.due.is_none() {
                        s.due = Some(now + r.pick_delay(rng));
                    }
                } else if cur && s.prev != Some(true) {
                    s.due = Some(now + r.pick_delay(rng));
                } else if !cur {
                    s.due = None;
                }
                s.prev = Some(cur);
                if s.due.is_some_and(|d| d <= now) {
                    let done: Vec<String> = r.actions.iter().filter_map(|a| a.apply(m)).collect();
                    s.count += 1;
                    s.last_ms = Some(wall_ms);
                    s.due = if r.cond == Cond::Always { Some(now + r.pick_delay(rng).max(Duration::from_millis(MIN_PERIOD_MS))) } else { None };
                    let name = if r.name.trim().is_empty() { String::new() } else { format!("{}: ", r.name.trim()) };
                    out.push(Fired { id: r.id, text: format!("{name}{}", if done.is_empty() { crate::tr!("(범위 밖 — 바꾼 값 없음)", "(out of range — nothing changed)").to_string() } else { done.join(", ") }) });
                    fired_any = true;
                }
            }
            if !fired_any {
                break;
            }
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn a(dev: Dev, no: u32) -> Addr {
        Addr { dev, no, bit: None }
    }
    fn ab(dev: Dev, no: u32, bit: u8) -> Addr {
        Addr { dev, no, bit: Some(bit) }
    }
    fn rule(id: u32, cond: Cond, delay: u64, actions: Vec<Action>) -> Rule {
        Rule { id, name: String::new(), enabled: true, cond, delay_ms: delay, delay_max_ms: 0, actions }
    }
    fn act(at: Addr, op: ActOp, value: i32) -> Action {
        Action { at, op, value }
    }
    fn bit(m: &Memory, at: Addr) -> u16 {
        at.read(m).unwrap()
    }

    /// 핸드셰이크 예제 — 요청 M100 ON → 300ms → 완료 M101 ON, 요청 OFF → 완료 OFF(지연 0)
    fn handshake() -> Vec<Rule> {
        vec![
            rule(1, Cond::On { at: a(Dev::M, 100) }, 300, vec![act(a(Dev::M, 101), ActOp::On, 0)]),
            rule(2, Cond::Off { at: a(Dev::M, 100) }, 0, vec![act(a(Dev::M, 101), ActOp::Off, 0)]),
        ]
    }

    #[test]
    fn handshake_example() {
        let mut m = Memory::default();
        let mut r = Rules::default();
        r.set(handshake()).unwrap();
        let mut rng = Rng::new(1);
        let t0 = Instant::now();
        // 처음: M100 OFF → 규칙 2 가 한 번(이미 OFF 인 M101 을 OFF)
        let f = r.eval(&mut m, t0, 1, &mut rng);
        assert_eq!(f.iter().map(|x| x.id).collect::<Vec<_>>(), [2]);
        // 클라이언트가 요청 ON
        a(Dev::M, 100).write(&mut m, 1);
        assert!(r.eval(&mut m, t0 + Duration::from_millis(10), 2, &mut rng).is_empty());
        assert_eq!(bit(&m, a(Dev::M, 101)), 0);
        assert!(r.stats()[0].waiting);
        assert!(r.eval(&mut m, t0 + Duration::from_millis(200), 3, &mut rng).is_empty());
        let f = r.eval(&mut m, t0 + Duration::from_millis(320), 4, &mut rng);
        assert_eq!(f.len(), 1);
        assert_eq!(f[0].line(), "RULE #1 M101=ON");
        assert_eq!(bit(&m, a(Dev::M, 101)), 1);
        // 요청을 켜 둔 채로는 다시 실행하지 않는다
        assert!(r.eval(&mut m, t0 + Duration::from_millis(900), 5, &mut rng).is_empty());
        // 요청 OFF → 완료 OFF 바로
        a(Dev::M, 100).write(&mut m, 0);
        let f = r.eval(&mut m, t0 + Duration::from_millis(910), 6, &mut rng);
        assert_eq!(f.iter().map(|x| x.id).collect::<Vec<_>>(), [2]);
        assert_eq!(bit(&m, a(Dev::M, 101)), 0);
        let st = r.stats();
        assert_eq!((st[0].count, st[0].last_ms, st[1].count), (1, Some(4), 2));
    }

    #[test]
    fn level_condition_cancels_when_it_stops_holding() {
        let mut m = Memory::default();
        let mut r = Rules::default();
        r.set(vec![rule(1, Cond::On { at: a(Dev::X, 0x10) }, 500, vec![act(a(Dev::Y, 0x10), ActOp::On, 0)])]).unwrap();
        let mut rng = Rng::new(1);
        let t0 = Instant::now();
        r.eval(&mut m, t0, 0, &mut rng);
        a(Dev::X, 0x10).write(&mut m, 1);
        r.eval(&mut m, t0 + Duration::from_millis(100), 0, &mut rng);
        a(Dev::X, 0x10).write(&mut m, 0);
        r.eval(&mut m, t0 + Duration::from_millis(200), 0, &mut rng);
        assert!(r.eval(&mut m, t0 + Duration::from_millis(700), 0, &mut rng).is_empty(), "조건이 풀려 취소");
        assert_eq!(bit(&m, a(Dev::Y, 0x10)), 0);
    }

    #[test]
    fn edges_word_compare_and_word_bit() {
        let mut m = Memory::default();
        let mut r = Rules::default();
        r.set(vec![
            // D100.3 이 올라가면 D200 에 +5
            rule(1, Cond::Rise { at: ab(Dev::D, 100, 3) }, 0, vec![act(a(Dev::D, 200), ActOp::Add, 5)]),
            // D200 > 9 가 되면 D201 = 77, D10.F 켜기
            rule(2, Cond::Word { at: a(Dev::D, 200), op: CmpOp::Gt, value: 9 }, 0, vec![act(a(Dev::D, 201), ActOp::Set, 77), act(ab(Dev::D, 10, 15), ActOp::On, 0)]),
            // M5 가 내려가면 M6 반전
            rule(3, Cond::Fall { at: a(Dev::M, 5) }, 0, vec![act(a(Dev::M, 6), ActOp::Toggle, 0)]),
        ])
        .unwrap();
        let mut rng = Rng::new(1);
        let t = Instant::now();
        // 켜는 순간 이미 ON 이어도 에지가 아니다
        m.data.get_mut(&Dev::D).unwrap()[100] = 0x0008;
        assert!(r.eval(&mut m, t, 0, &mut rng).is_empty());
        m.data.get_mut(&Dev::D).unwrap()[100] = 0;
        r.eval(&mut m, t, 0, &mut rng);
        for _ in 0..2 {
            m.data.get_mut(&Dev::D).unwrap()[100] = 0x0008;
            r.eval(&mut m, t, 0, &mut rng);
            m.data.get_mut(&Dev::D).unwrap()[100] = 0;
            r.eval(&mut m, t, 0, &mut rng);
        }
        assert_eq!(a(Dev::D, 200).read(&m), Some(10));
        // 같은 평가 안에서 꼬리를 문 규칙 2
        assert_eq!(a(Dev::D, 201).read(&m), Some(77));
        assert_eq!(a(Dev::D, 10).read(&m), Some(0x8000));
        m.data.get_mut(&Dev::M).unwrap()[5] = 1;
        r.eval(&mut m, t, 0, &mut rng);
        m.data.get_mut(&Dev::M).unwrap()[5] = 0;
        let f = r.eval(&mut m, t, 0, &mut rng);
        assert_eq!(f.iter().map(|x| x.id).collect::<Vec<_>>(), [3]);
        assert_eq!(bit(&m, a(Dev::M, 6)), 1);
        // 더하기는 0~65535 를 돈다
        let mut w = Memory::default();
        assert!(act(a(Dev::D, 0), ActOp::Add, -1).apply(&mut w).is_some());
        assert_eq!(a(Dev::D, 0).read(&w), Some(0xFFFF));
    }

    #[test]
    fn periodic_and_random_delay() {
        let mut m = Memory::default();
        let mut r = Rules::default();
        let mut p = rule(1, Cond::Always, 100, vec![act(a(Dev::D, 0), ActOp::Add, 1)]);
        p.delay_max_ms = 200;
        r.set(vec![p]).unwrap();
        let mut rng = Rng::new(7);
        let t0 = Instant::now();
        let mut fired_at = Vec::new();
        for k in 0..200u64 {
            let now = t0 + Duration::from_millis(k * 10);
            if !r.eval(&mut m, now, 0, &mut rng).is_empty() {
                fired_at.push(k * 10);
            }
        }
        assert!(fired_at.len() >= 9 && fired_at.len() <= 20, "{fired_at:?}");
        for w in fired_at.windows(2) {
            assert!((100..=210).contains(&(w[1] - w[0])), "{fired_at:?}");
        }
        assert_eq!(a(Dev::D, 0).read(&m), Some(fired_at.len() as u16));
    }

    #[test]
    fn runaway_rules_stop_after_max_passes() {
        // M0 이 바뀌면 M0 반전 — 지연 0 으로 스스로를 계속 깨운다
        let mut m = Memory::default();
        let mut r = Rules::default();
        r.set(vec![rule(1, Cond::Rise { at: a(Dev::M, 1) }, 0, vec![act(a(Dev::M, 1), ActOp::Off, 0)]), rule(2, Cond::Off { at: a(Dev::M, 1) }, 0, vec![act(a(Dev::M, 1), ActOp::On, 0)])]).unwrap();
        let mut rng = Rng::new(1);
        let f = r.eval(&mut m, Instant::now(), 0, &mut rng);
        assert!(!f.is_empty() && f.len() <= MAX_PASSES * 2);
    }

    #[test]
    fn disabled_out_of_range_and_checks() {
        let mut m = Memory::default();
        m.resize(Dev::D, 10).unwrap();
        let mut r = Rules::default();
        let mut off = rule(1, Cond::On { at: a(Dev::M, 0) }, 0, vec![act(a(Dev::M, 1), ActOp::On, 0)]);
        off.enabled = false;
        r.set(vec![off, rule(2, Cond::Off { at: a(Dev::M, 0) }, 0, vec![act(a(Dev::D, 50), ActOp::Set, 1)])]).unwrap();
        m.data.get_mut(&Dev::M).unwrap()[0] = 1;
        assert!(r.eval(&mut m, Instant::now(), 0, &mut Rng::new(1)).is_empty());
        m.data.get_mut(&Dev::M).unwrap()[0] = 0;
        let f = r.eval(&mut m, Instant::now(), 0, &mut Rng::new(1));
        assert_eq!(f.len(), 1);
        assert!(f[0].text.contains("(")); // 범위 밖 — 바꾼 값 없음
        // 검사
        let bad = |c: Cond, acts: Vec<Action>| Rules::default().set(vec![rule(1, c, 100, acts)]).is_err();
        assert!(bad(Cond::On { at: a(Dev::D, 0) }, vec![act(a(Dev::M, 0), ActOp::On, 0)]), "워드에 ON 조건");
        assert!(bad(Cond::Word { at: a(Dev::M, 0), op: CmpOp::Eq, value: 1 }, vec![act(a(Dev::M, 0), ActOp::On, 0)]), "비트에 값 비교");
        assert!(bad(Cond::On { at: ab(Dev::M, 0, 1) }, vec![act(a(Dev::M, 0), ActOp::On, 0)]), "비트 디바이스에 .비트");
        assert!(bad(Cond::On { at: ab(Dev::D, 0, 16) }, vec![act(a(Dev::M, 0), ActOp::On, 0)]), "비트 16");
        assert!(bad(Cond::On { at: a(Dev::M, 0) }, vec![act(a(Dev::D, 0), ActOp::On, 0)]), "워드에 ON 동작");
        assert!(bad(Cond::On { at: a(Dev::M, 0) }, vec![act(a(Dev::M, 0), ActOp::Set, 1)]), "비트에 값 쓰기");
        assert!(bad(Cond::On { at: a(Dev::M, 0) }, vec![act(a(Dev::D, 0), ActOp::Set, 70000)]), "값 범위");
        assert!(bad(Cond::On { at: a(Dev::M, 0) }, vec![]), "동작 없음");
        assert!(Rules::default().set(vec![rule(1, Cond::Always, 10, vec![act(a(Dev::D, 0), ActOp::Add, 1)])]).is_err(), "주기 너무 짧음");
        assert!(!bad(Cond::Always, vec![act(a(Dev::D, 0), ActOp::Add, 1)]), "주기 100 ms 는 됨");
        let two = vec![rule(1, Cond::Always, 100, vec![act(a(Dev::D, 0), ActOp::Add, 1)]), rule(1, Cond::Always, 100, vec![act(a(Dev::D, 0), ActOp::Add, 1)])];
        assert!(Rules::default().set(two).is_err(), "번호 겹침");
    }

    #[test]
    fn set_keeps_counts_of_same_ids_and_json_shape() {
        let mut m = Memory::default();
        let mut r = Rules::default();
        r.set(handshake()).unwrap();
        r.eval(&mut m, Instant::now(), 9, &mut Rng::new(1));
        assert_eq!(r.stats()[1].count, 1);
        r.set(handshake()).unwrap();
        assert_eq!(r.stats()[1].count, 1);
        r.reset_counts();
        assert_eq!(r.stats()[1].count, 0);
        let j = r#"[{"id":1,"name":"완료","cond":{"kind":"word","at":{"dev":"D","no":100,"bit":null},"op":"ne","value":0},"delayMs":10,"delayMaxMs":20,"actions":[{"at":{"dev":"D","no":3,"bit":2},"op":"toggle"},{"at":{"dev":"D","no":4},"op":"add","value":-2}]},{"id":2,"enabled":false,"cond":{"kind":"always"},"delayMs":100,"actions":[{"at":{"dev":"Y","no":31},"op":"on"}]}]"#;
        let v: Vec<Rule> = serde_json::from_str(j).unwrap();
        assert_eq!(v[0].cond, Cond::Word { at: a(Dev::D, 100), op: CmpOp::Ne, value: 0 });
        assert_eq!(v[0].actions[0].at, ab(Dev::D, 3, 2));
        assert!(v[0].enabled && !v[1].enabled);
        assert_eq!(v[1].summary(), format!("{} → 100 ms → Y1F ON", Cond::Always.text()));
        Rules::default().set(v).unwrap();
    }
}
