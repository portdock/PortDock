//! 블루투스 연결 기록기 — 사용자가 «기록 시작» 을 누른 동안 POLL 마다 짝지은 장치들의 «연결됨» 속성(PnP)을 읽어
//! 바뀐 것만 보낸다. 주변 장치 검색·연결·끊기는 하지 않는다(읽기만).
//! 장치는 처음 본 순서대로 «장치 N» 번호를 붙인다. 인스턴스 ID(장치 주소가 든다)는 이 모듈 밖으로 내보내지 않고,
//! 이름은 화면 표시용으로만 보낸다 — 저장·복사는 화면 쪽이 번호로만 쓴다.

use portdock_core::portinfo::{self, BtLink};
use serde::Serialize;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

const POLL: Duration = Duration::from_secs(2);
/// 한 번 기록의 길이 상한(24시간)
pub const MAX_DURATION: Duration = Duration::from_secs(24 * 3600);

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BtDev {
    /// 장치 N
    pub n: u32,
    /// 화면에만
    pub name: String,
    pub connected: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum BtEvent {
    /// 시작할 때 지금 상태
    Snapshot { ts: u64, devices: Vec<BtDev> },
    /// 연결 상태가 바뀜 · 새로 짝지은 장치(added) · 짝 해제 등으로 사라짐(removed)
    Change { ts: u64, dev: BtDev, added: bool, removed: bool },
    Stopped { ts: u64, reason: &'static str },
}

pub type Sink = Arc<dyn Fn(BtEvent) + Send + Sync>;

/// 번호 매기기와 바뀐 것 찾기 — 순수 로직(시험)
#[derive(Default)]
pub struct Tracker {
    /// (인스턴스 ID, 번호, 마지막 상태, 지금 있음)
    known: Vec<(String, u32, Option<bool>, bool)>,
}

impl Tracker {
    fn number(&mut self, id: &str) -> (usize, bool) {
        match self.known.iter().position(|k| k.0.eq_ignore_ascii_case(id)) {
            Some(i) => (i, false),
            None => {
                let n = self.known.len() as u32 + 1;
                self.known.push((id.to_string(), n, None, false));
                (self.known.len() - 1, true)
            }
        }
    }

    /// 첫 읽기 — 모두 번호를 붙여 돌려준다(이름순으로 번호가 정해지게 미리 정렬)
    pub fn first(&mut self, mut links: Vec<BtLink>) -> Vec<BtDev> {
        links.sort_by_key(|l| l.name.to_lowercase());
        links
            .into_iter()
            .map(|l| {
                let (i, _) = self.number(&l.id);
                self.known[i].2 = l.connected;
                self.known[i].3 = true;
                BtDev { n: self.known[i].1, name: l.name, connected: l.connected }
            })
            .collect()
    }

    /// 다음 읽기 — 바뀐 것만 (장치, 새로 생김, 사라짐)
    pub fn diff(&mut self, links: Vec<BtLink>) -> Vec<(BtDev, bool, bool)> {
        let mut out = Vec::new();
        for k in self.known.iter_mut() {
            if k.3 && !links.iter().any(|l| l.id.eq_ignore_ascii_case(&k.0)) {
                k.3 = false;
                out.push((BtDev { n: k.1, name: String::new(), connected: None }, false, true));
            }
        }
        for l in links {
            let (i, added) = self.number(&l.id);
            let k = &mut self.known[i];
            let came_back = !k.3;
            k.3 = true;
            if added || came_back || k.2 != l.connected {
                k.2 = l.connected;
                out.push((BtDev { n: k.1, name: l.name, connected: l.connected }, added || came_back, false));
            }
        }
        out
    }
}

pub struct BtRecorder {
    stop: Arc<AtomicBool>,
    thread: Option<std::thread::JoinHandle<()>>,
}

impl BtRecorder {
    pub fn running(&self) -> bool {
        self.thread.as_ref().is_some_and(|t| !t.is_finished())
    }
    pub fn stop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(t) = self.thread.take() {
            let _ = t.join();
        }
    }
}

impl Drop for BtRecorder {
    fn drop(&mut self) {
        self.stop();
    }
}

/// `read` = 장치 읽기(실제로는 portinfo::bt_links — 시험은 가짜)
pub fn start_with(read: impl Fn() -> Vec<BtLink> + Send + 'static, poll: Duration, sink: Sink) -> Result<BtRecorder, String> {
    let stop = Arc::new(AtomicBool::new(false));
    let st = stop.clone();
    let thread = std::thread::Builder::new()
        .name("hw-bt".into())
        .spawn(move || {
            let started = Instant::now();
            let mut t = Tracker::default();
            sink(BtEvent::Snapshot { ts: portdock_core::event::now_ms(), devices: t.first(read()) });
            let mut reason = "user";
            let mut next = Instant::now() + poll;
            while !st.load(Ordering::SeqCst) {
                if Instant::now() < next {
                    std::thread::sleep(Duration::from_millis(50));
                    continue;
                }
                if started.elapsed() >= MAX_DURATION {
                    reason = "limit";
                    break;
                }
                next = Instant::now() + poll;
                let ts = portdock_core::event::now_ms();
                for (dev, added, removed) in t.diff(read()) {
                    sink(BtEvent::Change { ts, dev, added, removed });
                }
            }
            sink(BtEvent::Stopped { ts: portdock_core::event::now_ms(), reason });
        })
        .map_err(|e| e.to_string())?;
    Ok(BtRecorder { stop, thread: Some(thread) })
}

pub fn start(sink: Sink) -> Result<BtRecorder, String> {
    start_with(portinfo::bt_links, POLL, sink)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    /// 가짜 장치(예시 값 — 실제 장치 아님)
    fn link(id: &str, name: &str, c: Option<bool>) -> BtLink {
        BtLink { id: id.into(), name: name.into(), connected: c }
    }

    #[test]
    fn numbers_and_changes() {
        let mut t = Tracker::default();
        let first = t.first(vec![link("BTHLE\\DEV_B", "Mouse", Some(false)), link("BTHENUM\\DEV_A", "Headset", Some(true))]);
        assert_eq!(first.iter().map(|d| (d.n, d.name.as_str())).collect::<Vec<_>>(), [(1, "Headset"), (2, "Mouse")]);
        // 바뀐 것 없음
        assert!(t.diff(vec![link("BTHENUM\\DEV_A", "Headset", Some(true)), link("BTHLE\\DEV_B", "Mouse", Some(false))]).is_empty());
        // 헤드셋 끊김 + 새 장치
        let d = t.diff(vec![link("bthenum\\dev_a", "Headset", Some(false)), link("BTHLE\\DEV_B", "Mouse", Some(false)), link("BTHLE\\DEV_C", "Keyboard", Some(true))]);
        assert_eq!(d.len(), 2);
        assert_eq!((d[0].0.n, d[0].0.connected, d[0].1, d[0].2), (1, Some(false), false, false));
        assert_eq!((d[1].0.n, d[1].0.connected, d[1].1), (3, Some(true), true));
        // 마우스 사라짐(짝 해제) → removed, 다시 생기면 같은 번호로 added
        let d = t.diff(vec![link("BTHENUM\\DEV_A", "Headset", Some(false)), link("BTHLE\\DEV_C", "Keyboard", Some(true))]);
        assert_eq!((d.len(), d[0].0.n, d[0].2, d[0].0.name.as_str()), (1, 2, true, ""));
        let d = t.diff(vec![link("BTHENUM\\DEV_A", "Headset", Some(false)), link("BTHLE\\DEV_B", "Mouse", Some(false)), link("BTHLE\\DEV_C", "Keyboard", Some(true))]);
        assert_eq!((d.len(), d[0].0.n, d[0].1), (1, 2, true));
    }

    /// 화면으로 가는 모양에 인스턴스 ID 가 없다
    #[test]
    fn no_instance_id_leaves() {
        let mut t = Tracker::default();
        let devs = t.first(vec![link("BTHENUM\\DEV_020000000001\\7&1", "Example headset", Some(true))]);
        let s = serde_json::to_string(&BtEvent::Snapshot { ts: 1, devices: devs }).unwrap();
        assert!(!s.contains("DEV_") && !s.contains("020000000001") && s.contains("\"n\":1"));
    }

    #[test]
    fn recorder_polls_and_stops() {
        let state = Arc::new(Mutex::new(Some(true)));
        let s2 = state.clone();
        let got: Arc<Mutex<Vec<BtEvent>>> = Arc::new(Mutex::new(Vec::new()));
        let g = got.clone();
        let mut r = start_with(move || vec![link("BTHENUM\\DEV_A", "Headset", *s2.lock().unwrap())], Duration::from_millis(60), Arc::new(move |e| g.lock().unwrap().push(e))).unwrap();
        std::thread::sleep(Duration::from_millis(150));
        *state.lock().unwrap() = Some(false);
        std::thread::sleep(Duration::from_millis(250));
        assert!(r.running());
        r.stop();
        let ev = got.lock().unwrap().clone();
        assert!(matches!(&ev[0], BtEvent::Snapshot { devices, .. } if devices.len() == 1 && devices[0].connected == Some(true)));
        assert_eq!(ev.iter().filter(|e| matches!(e, BtEvent::Change { dev, .. } if dev.connected == Some(false))).count(), 1);
        assert!(matches!(ev.last(), Some(BtEvent::Stopped { reason: "user", .. })));
    }

    /// 이 PC 에서 실제로 읽기(관리자 없이) — 장치가 없어도(서버) 빈 목록일 뿐 오류가 아니다
    #[test]
    fn reads_this_pc() {
        let l = portinfo::bt_links();
        assert!(l.iter().all(|x| !x.id.is_empty() && !x.name.is_empty()));
    }
}
