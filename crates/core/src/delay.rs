//! 지연 응답 예약 — 응답마다 스레드를 만들지 않고, 예약 스레드 하나가 시간 순(힙)으로 보낸다.
//! 스레드는 처음 예약할 때 만들고, 1초 동안 할 일이 없으면 스스로 끝난다(다음 예약 때 다시 만든다).
//! 한꺼번에 쌓일 수 있는 예약은 `MAX_PENDING` 개 — 넘으면 거절하고 부른 쪽이 사건 줄을 남긴다.

use std::cmp::Reverse;
use std::collections::{BinaryHeap, HashMap};
use std::sync::{Arc, Condvar, Mutex};
use std::time::{Duration, Instant};

/// 동시에 기다릴 수 있는 지연 응답 수
pub const MAX_PENDING: usize = 256;
const IDLE: Duration = Duration::from_secs(1);

type Job = Box<dyn FnOnce() + Send>;

#[derive(Debug, PartialEq, Eq)]
pub enum Refused {
    /// 예약이 `MAX_PENDING` 개 차 있음
    Full,
    /// 예약 스레드를 만들지 못함(운영체제 자원 부족)
    Spawn(String),
}

impl Refused {
    /// 사건 줄 «AUTO …» 에 붙일 말
    pub fn note(&self) -> String {
        match self {
            Refused::Full => crate::tr!(
                format!("AUTO 지연 응답 버림 — 기다리는 지연 응답이 {MAX_PENDING}개로 가득 참"),
                format!("AUTO delayed reply dropped — {MAX_PENDING} delayed replies already waiting")
            ),
            Refused::Spawn(e) => crate::tr!(format!("AUTO 지연 응답 버림 — 예약 스레드를 만들지 못함: {e}"), format!("AUTO delayed reply dropped — could not start the timer thread: {e}")),
        }
    }
}

#[derive(Default)]
struct State {
    heap: BinaryHeap<Reverse<(Instant, u64)>>,
    jobs: HashMap<u64, Job>,
    seq: u64,
    running: bool,
    closed: bool,
}

#[derive(Default)]
pub struct Delayer {
    inner: Arc<(Mutex<State>, Condvar)>,
}

impl Delayer {
    pub fn new() -> Self {
        Self::default()
    }

    /// `delay` 뒤에 `job` 을 부른다. 같은 시각이면 먼저 예약한 것부터
    pub fn schedule(&self, delay: Duration, job: impl FnOnce() + Send + 'static) -> Result<(), Refused> {
        let (m, cv) = &*self.inner;
        let mut g = m.lock().unwrap_or_else(|e| e.into_inner());
        if g.closed {
            return Ok(());
        }
        if g.jobs.len() >= MAX_PENDING {
            return Err(Refused::Full);
        }
        let id = g.seq;
        g.seq += 1;
        g.heap.push(Reverse((Instant::now() + delay, id)));
        g.jobs.insert(id, Box::new(job));
        if g.running {
            cv.notify_one();
            return Ok(());
        }
        let inner = self.inner.clone();
        match std::thread::Builder::new().name("delayed-reply".into()).spawn(move || run(inner)) {
            Ok(_) => {
                g.running = true;
                Ok(())
            }
            Err(e) => {
                // 힙에 남은 번호는 일감이 없으니 나중에 건너뛴다
                g.jobs.remove(&id);
                Err(Refused::Spawn(e.to_string()))
            }
        }
    }

    /// 남은 예약을 버리고 더 받지 않는다(세션을 멈출 때)
    pub fn close(&self) {
        let (m, cv) = &*self.inner;
        let mut g = m.lock().unwrap_or_else(|e| e.into_inner());
        g.closed = true;
        g.heap.clear();
        g.jobs.clear();
        cv.notify_all();
    }

    #[cfg(test)]
    fn pending(&self) -> usize {
        self.inner.0.lock().unwrap().jobs.len()
    }
}

fn run(inner: Arc<(Mutex<State>, Condvar)>) {
    let (m, cv) = &*inner;
    let mut g = m.lock().unwrap_or_else(|e| e.into_inner());
    loop {
        if g.closed {
            g.running = false;
            return;
        }
        let Some(&Reverse((due, id))) = g.heap.peek() else {
            let (ng, to) = cv.wait_timeout(g, IDLE).unwrap_or_else(|e| e.into_inner());
            g = ng;
            if to.timed_out() && g.heap.is_empty() {
                g.running = false;
                return;
            }
            continue;
        };
        let now = Instant::now();
        if due > now {
            g = cv.wait_timeout(g, due - now).unwrap_or_else(|e| e.into_inner()).0;
            continue;
        }
        g.heap.pop();
        if let Some(job) = g.jobs.remove(&id) {
            // 일감은 잠금 밖에서 — 일감이 다시 예약해도 막히지 않게.
            // 일감이 패닉해도 스레드는 살아 다음 일감을 부른다 — 그냥 죽으면 running 이 true 로 남아
            // 새 스레드를 만들지 않으니 뒤의 예약이 영영 불리지 않는다.
            // (릴리스 빌드는 panic = "abort" 라 패닉이 곧 프로세스 종료다 — 이 보호는 디버그·테스트 빌드용)
            drop(g);
            let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(job));
            g = m.lock().unwrap_or_else(|e| e.into_inner());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;

    #[test]
    fn runs_in_time_order() {
        let d = Delayer::new();
        let (tx, rx) = mpsc::channel();
        for (ms, tag) in [(60u64, 'c'), (20, 'a'), (40, 'b'), (40, 'B')] {
            let tx = tx.clone();
            d.schedule(Duration::from_millis(ms), move || tx.send(tag).unwrap()).unwrap();
        }
        let got: Vec<char> = (0..4).map(|_| rx.recv_timeout(Duration::from_secs(2)).unwrap()).collect();
        assert_eq!(got, vec!['a', 'b', 'B', 'c']);
    }

    #[test]
    fn refuses_past_the_cap() {
        let d = Delayer::new();
        for _ in 0..MAX_PENDING {
            d.schedule(Duration::from_secs(60), || {}).unwrap();
        }
        assert_eq!(d.schedule(Duration::from_secs(60), || {}), Err(Refused::Full));
        assert_eq!(d.pending(), MAX_PENDING);
        d.close();
        assert_eq!(d.pending(), 0);
        // 닫힌 뒤 예약은 조용히 버린다
        assert_eq!(d.schedule(Duration::ZERO, || panic!("closed")), Ok(()));
    }

    /// 일감 하나가 패닉해도 예약 스레드가 살아 다음 일감을 부른다
    #[test]
    fn survives_a_panicking_job() {
        let d = Delayer::new();
        let (tx, rx) = mpsc::channel();
        d.schedule(Duration::ZERO, || panic!("일감 패닉(시험)")).unwrap();
        d.schedule(Duration::from_millis(20), move || tx.send(1).unwrap()).unwrap();
        assert_eq!(rx.recv_timeout(Duration::from_secs(2)).unwrap(), 1);
        assert!(d.inner.0.lock().unwrap().running);
    }

    /// 놀던 스레드가 끝난 뒤에도 다시 예약하면 돈다
    #[test]
    fn restarts_after_idle() {
        let d = Delayer::new();
        let (tx, rx) = mpsc::channel();
        let t = tx.clone();
        d.schedule(Duration::ZERO, move || t.send(1).unwrap()).unwrap();
        assert_eq!(rx.recv_timeout(Duration::from_secs(2)).unwrap(), 1);
        std::thread::sleep(IDLE + Duration::from_millis(300));
        assert!(!d.inner.0.lock().unwrap().running);
        d.schedule(Duration::ZERO, move || tx.send(2).unwrap()).unwrap();
        assert_eq!(rx.recv_timeout(Duration::from_secs(2)).unwrap(), 2);
    }
}
