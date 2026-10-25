//! 자동 응답이 되돌아와 다시 답하는 것(에코·핑퐁) 막기 — 시리얼·TCP·UDP 공통.
//!
//! 두 겹으로 본다.
//! 1. 에코 창(시간 창): 들어온 프레임이 방금 보낸 응답과 바이트까지 똑같고, 그 첫 바이트가
//!    «송신 시작(지연 응답이면 예약 시각) − 5ms ~ 송신 시작 + 송신 시간 + `ECHO_MARGIN`(50ms)» 안에 왔으면
//!    에코로 보고 답하지 않는다. 송신 시간은 시리얼이면 `serial_tx_time`(문자당 11비트), 망이면 0.
//!    - 왜 생기나: RS-485 2선식은 송신과 수신이 같은 선이라 우리가 보낸 바이트가 그대로 수신에 보인다
//!      (변환기에 따라 다름). 첫 바이트는 송신 시작 직후에 들어온다.
//!    - 왜 좁게 두나: 정상 마스터는 응답을 다 받은 뒤에야 다음 요청을 보낸다. Modbus 05·06 쓰기는
//!      응답이 요청과 바이트까지 같아서, 창이 넓으면 같은 쓰기를 곧바로 다시 보낸 정상 요청까지 에코로 먹는다
//!      (예전엔 300~500ms 를 통째로 막았다). 창을 «송신 시간 + 여유» 로 두면 그 요청은 창 밖이라 답한다.
//!    - 한 번 걸러 내면 기억을 비운다 — 에코 하나를 막은 뒤의 같은 요청은 창 안이어도 답한다.
//!    - TCP 는 점대점이라 선로 에코가 없다 — Modbus Slave TCP 처럼 요청 = 응답이 흔한 곳은 창을 끈다(`None`).
//! 2. 초당 상한: 창 밖이라도 «방금 보낸 응답과 똑같은 것» 이 1초에 `LOOP_LIMIT`(100)번을 넘으면 그 1초의 나머지는
//!    답하지 않고, 처음 넘을 때 사건 줄 «AUTO 멈춤 …»(`flood_note`)을 한 번 남긴다. 1초가 지나면 다시 센다.
//!    상대가 받은 것을 되돌려 보내는 핑퐁은 한 번만 끊기면 멈추므로, 창을 끈 곳·창보다 늦게 돌아오는 에코
//!    (느린 변환기·망)도 끝없이 돌지 않는다. 정상 마스터가 같은 쓰기를 초당 100번 넘게 보내는 일은 드물고,
//!    그래도 넘친 것만 빠진다(마스터 쪽 재시도로 이어진다).

use std::time::{Duration, Instant};

/// 방금 보낸 응답과 같은 것이 1초에 이만큼을 넘으면 핑퐁으로 본다
pub const LOOP_LIMIT: u32 = 100;
/// 에코 창의 여유 — 송신 시간에 더한다. 되돌아온 에코가 «프레임» 으로 잡혀 들어오기까지의 늦음을 덮는다:
/// USB 변환기의 수신 지연(흔히 16ms 안팎) + 송신 시작이 예약보다 늦어지는 몫 + 시계 해상도.
/// 정상 마스터가 응답을 받고 다음 요청을 보내기까지(보통 수십 ms 이상)보다 짧게 잡아, 창을 넓혀 정상 요청을 먹지 않게 한다.
/// 판정은 프레임의 첫 바이트 시각으로 하므로 프레임 구분 무응답 시간은 여기에 더하지 않아도 된다
pub const ECHO_MARGIN: Duration = Duration::from_millis(50);
/// 예약 시각보다 조금 앞서 찍힌 수신(시계 해상도)도 에코로 본다
const SLACK: Duration = Duration::from_millis(5);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Verdict {
    Answer,
    /// 시간 창 안에서 그대로 되돌아옴 — 조용히 넘긴다
    Echo,
    /// 초당 상한을 넘음 — `first` 면 사건 줄을 한 번 남긴다
    Flood { first: bool },
}

#[derive(Debug, Default)]
pub struct ReplyGuard {
    /// 보낸 응답, 송신 시작(예약) 시각, 송신에 걸리는 시간
    last: Option<(Vec<u8>, Instant, Duration)>,
    /// (1초 창 시작, 그 안에서 같은 것이 온 횟수, 상한을 넘겨 알렸는지)
    rate: Option<(Instant, u32, bool)>,
}

impl ReplyGuard {
    pub fn new() -> Self {
        Self::default()
    }

    /// 응답을 보냈다(또는 `at` 에 보내기로 예약했다). `tx` = 그 바이트를 내보내는 데 걸리는 시간(망은 0)
    pub fn sent(&mut self, bytes: &[u8], at: Instant, tx: Duration) {
        self.last = Some((bytes.to_vec(), at, tx));
    }

    /// `arrived`(첫 바이트 시각)에 받은 `bytes` 에 답해도 되는지. `window` 가 None 이면 시간 창은 보지 않는다
    pub fn check(&mut self, bytes: &[u8], arrived: Instant, window: Option<Duration>) -> Verdict {
        let Some((b, at, tx)) = &self.last else { return Verdict::Answer };
        if b.as_slice() != bytes {
            return Verdict::Answer;
        }
        if let Some(w) = window {
            let lo = at.checked_sub(SLACK).unwrap_or(*at);
            if arrived >= lo && arrived <= *at + *tx + w {
                // 한 번 걸러 내면 비운다 — 다음 정상 요청까지 막지 않게
                self.last = None;
                return Verdict::Echo;
            }
        }
        let r = self.rate.get_or_insert((arrived, 0, false));
        if arrived.saturating_duration_since(r.0) >= Duration::from_secs(1) {
            *r = (arrived, 0, false);
        }
        r.1 += 1;
        if r.1 > LOOP_LIMIT {
            let first = !r.2;
            r.2 = true;
            return Verdict::Flood { first };
        }
        Verdict::Answer
    }
}

/// 시리얼로 `len` 바이트를 보내는 데 걸리는 시간(문자당 11비트로 넉넉히)
pub fn serial_tx_time(len: usize, baud: u32) -> Duration {
    Duration::from_micros(len as u64 * 11_000_000 / baud.max(1) as u64)
}

pub fn flood_note() -> String {
    crate::tr!(
        format!("AUTO 멈춤 — 방금 보낸 응답과 같은 것이 1초에 {LOOP_LIMIT}번을 넘게 들어옴(상대가 되돌려 보내는지 확인)"),
        format!("AUTO paused — the reply just sent came back more than {LOOP_LIMIT} times in a second (is the peer echoing?)")
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    const W: Option<Duration> = Some(ECHO_MARGIN);

    #[test]
    fn echo_inside_window_is_ignored_once() {
        let mut g = ReplyGuard::new();
        let t0 = Instant::now();
        g.sent(b"AB", t0, Duration::from_millis(2));
        assert_eq!(g.check(b"AB", t0 + Duration::from_millis(1), W), Verdict::Echo);
        // 한 번 걸러 내면 비운다
        assert_eq!(g.check(b"AB", t0 + Duration::from_millis(3), W), Verdict::Answer);
    }

    #[test]
    fn repeat_after_window_is_answered() {
        let mut g = ReplyGuard::new();
        let t0 = Instant::now();
        g.sent(b"AB", t0, Duration::from_millis(9));
        assert_eq!(g.check(b"AB", t0 + Duration::from_millis(100), W), Verdict::Answer);
        assert_eq!(g.check(b"XY", t0 + Duration::from_millis(1), W), Verdict::Answer);
    }

    #[test]
    fn request_before_a_delayed_reply_is_not_echo() {
        let mut g = ReplyGuard::new();
        let t0 = Instant::now();
        g.sent(b"AB", t0 + Duration::from_millis(500), Duration::ZERO);
        assert_eq!(g.check(b"AB", t0 + Duration::from_millis(10), W), Verdict::Answer);
    }

    #[test]
    fn no_window_answers_until_the_rate_limit() {
        let mut g = ReplyGuard::new();
        let t0 = Instant::now();
        let mut flood = 0;
        for i in 0..(LOOP_LIMIT + 10) {
            let t = t0 + Duration::from_micros(i as u64 * 100);
            g.sent(b"AB", t, Duration::ZERO);
            match g.check(b"AB", t, None) {
                Verdict::Answer => {}
                Verdict::Flood { first } => {
                    assert_eq!(first, flood == 0);
                    flood += 1;
                }
                Verdict::Echo => panic!("no window"),
            }
        }
        assert_eq!(flood, 10);
        // 1초가 지나면 다시 답한다
        assert_eq!(g.check(b"AB", t0 + Duration::from_millis(1_100), None), Verdict::Answer);
    }

    #[test]
    fn tx_time() {
        assert_eq!(serial_tx_time(8, 9600), Duration::from_micros(9_166));
        assert_eq!(serial_tx_time(8, 0), Duration::from_micros(88_000_000));
    }
}
