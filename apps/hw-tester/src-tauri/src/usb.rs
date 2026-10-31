//! (0.10.0) USB 연결 기록기 — 사용자가 «기록 시작» 을 누른 동안 USB 장치 도착·제거를 시각과 함께 보낸다.
//! 알림(CM_Register_Notification)을 받고, 놓친 것이 없게 POLL 마다 목록을 한 번 더 견준다(알림 등록에 실패하면 목록 견주기만).
//! «띠링–또롱» 이 되풀이될 때 어느 장치인지 찾는 용도 — 같은 장치가 짧은 시간에 여러 번 끊기면 «반복 끊김 의심» 을 붙인다.
//! 장치는 처음 본 순서대로 «장치 N» 번호를 붙인다. 인스턴스 ID(장치 일련번호가 들 수 있다)는 이 모듈 밖으로 내보내지 않는다.
//! 읽기만 — 장치를 끄거나 다시 시작하지 않는다.

use portdock_core::portinfo::{self, UsbConfigEvent, UsbDevice, UsbNotice, UsbPast};
use serde::Serialize;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::time::{Duration, Instant};

/// 알림을 받을 때 목록을 다시 견주는 간격 · 알림 없이 목록만 볼 때의 간격
const POLL_WITH_NOTIFY: Duration = Duration::from_secs(3);
const POLL_ONLY: Duration = Duration::from_secs(1);
/// 한 번 기록의 길이 상한(24시간)
pub const MAX_DURATION: Duration = Duration::from_secs(24 * 3600);
/// «반복 끊김 의심» — FLAP_WINDOW 안에 끊김 FLAP_DROPS 번 이상
pub const FLAP_WINDOW_MS: u64 = 10 * 60_000;
pub const FLAP_DROPS: usize = 3;

/// 화면으로 가는 장치 — 인스턴스 ID 없음
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsbDev {
    /// 장치 N
    pub n: u32,
    pub name: String,
    pub vid: Option<u16>,
    pub pid: Option<u16>,
    pub hub: bool,
    /// 루트 허브부터의 포트 번호
    pub ports: Vec<u32>,
    pub speed: Option<&'static str>,
    pub below_capable: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum UsbEvent {
    /// 시작할 때 지금 연결된 장치. `notify` = 도착·제거 알림을 받는지(false 면 1초마다 목록만 견준다)
    Snapshot { ts: u64, devices: Vec<UsbDev>, notify: bool },
    /// 도착(arrived) 또는 제거. `drops` = 이번 기록에서 이 장치가 끊긴 수, `flap` = 반복 끊김 의심
    Change { ts: u64, dev: UsbDev, arrived: bool, drops: u32, flap: bool },
    Stopped { ts: u64, reason: &'static str },
}

pub type Sink = Arc<dyn Fn(UsbEvent) + Send + Sync>;

/// 끊김 시각들 → 반복 끊김 의심인지(지금 기준 FLAP_WINDOW_MS 안에 FLAP_DROPS 번 이상)
pub fn flapping(removals: &[u64], now: u64) -> bool {
    removals.iter().filter(|&&t| t <= now && now - t <= FLAP_WINDOW_MS).count() >= FLAP_DROPS
}

struct Known {
    id: String,
    dev: UsbDev,
    present: bool,
    removals: Vec<u64>,
}

/// 번호 매기기·바뀐 것 찾기 — 순수 로직(시험)
#[derive(Default)]
pub struct Tracker {
    known: Vec<Known>,
}

fn dev_of(n: u32, d: &UsbDevice) -> UsbDev {
    UsbDev { n, name: d.name.clone(), vid: d.vid, pid: d.pid, hub: d.hub, ports: d.ports.clone(), speed: d.speed, below_capable: d.below_capable }
}

impl Tracker {
    fn index(&mut self, d: &UsbDevice) -> usize {
        match self.known.iter().position(|k| k.id.eq_ignore_ascii_case(&d.id)) {
            Some(i) => i,
            None => {
                let n = self.known.len() as u32 + 1;
                self.known.push(Known { id: d.id.clone(), dev: dev_of(n, d), present: false, removals: Vec::new() });
                self.known.len() - 1
            }
        }
    }

    /// 첫 목록 — 허브 포트 순(같으면 이름순)으로 번호를 붙인다
    pub fn first(&mut self, mut list: Vec<UsbDevice>) -> Vec<UsbDev> {
        list.sort_by(|a, b| a.ports.cmp(&b.ports).then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase())));
        list.iter()
            .map(|d| {
                let i = self.index(d);
                self.known[i].present = true;
                self.known[i].dev.clone()
            })
            .collect()
    }

    /// 도착 — 이미 있다고 알던 장치면 None(알림·목록이 겹침)
    pub fn arrive(&mut self, d: &UsbDevice, ts: u64) -> Option<Change> {
        let i = self.index(d);
        let k = &mut self.known[i];
        if k.present {
            return None;
        }
        k.present = true;
        k.dev = dev_of(k.dev.n, d);
        Some((k.dev.clone(), true, k.removals.len() as u32, flapping(&k.removals, ts)))
    }

    /// 제거 — 있다고 알던 장치만(모르는 장치는 None)
    pub fn remove(&mut self, id: &str, ts: u64) -> Option<Change> {
        let k = self.known.iter_mut().find(|k| k.present && k.id.eq_ignore_ascii_case(id))?;
        k.present = false;
        k.removals.push(ts);
        Some((k.dev.clone(), false, k.removals.len() as u32, flapping(&k.removals, ts)))
    }

    /// 목록 견주기 — 사라진 것은 제거, 새로 보인 것은 도착
    pub fn reconcile(&mut self, list: &[UsbDevice], ts: u64) -> Vec<Change> {
        let gone: Vec<String> = self.known.iter().filter(|k| k.present && !list.iter().any(|d| d.id.eq_ignore_ascii_case(&k.id))).map(|k| k.id.clone()).collect();
        let mut out: Vec<_> = gone.iter().filter_map(|id| self.remove(id, ts)).collect();
        out.extend(list.iter().filter_map(|d| self.arrive(d, ts)));
        out
    }

    /// 도착 알림 뒤 장치를 다시 읽지 못했을 때(이미 빠짐) — 아는 장치면 그 값으로
    fn known_device(&self, id: &str) -> Option<UsbDevice> {
        let k = self.known.iter().find(|k| k.id.eq_ignore_ascii_case(id))?;
        Some(UsbDevice { id: k.id.clone(), name: k.dev.name.clone(), vid: k.dev.vid, pid: k.dev.pid, hub: k.dev.hub, ports: k.dev.ports.clone(), speed: k.dev.speed, below_capable: k.dev.below_capable })
    }
}

pub struct UsbRecorder {
    stop: Arc<AtomicBool>,
    thread: Option<std::thread::JoinHandle<()>>,
}

impl UsbRecorder {
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

impl Drop for UsbRecorder {
    fn drop(&mut self) {
        self.stop();
    }
}

/// 장치 하나 다시 읽기
pub type ReadOne = Box<dyn Fn(&str) -> Option<UsbDevice> + Send>;
/// 알림이 살아 있는 동안 쥐는 것(놓으면 끊김)
pub type WatchGuard = Box<dyn Send>;
/// 알림 등록 — 받은 것을 보낼 곳을 받는다. 실패하면 Err(목록 견주기만)
pub type StartWatch = Box<dyn FnOnce(mpsc::Sender<UsbNotice>) -> Result<WatchGuard, String> + Send>;

/// 읽기 함수들(실제로는 portinfo — 시험은 가짜)
pub struct Source {
    pub list: Box<dyn Fn() -> Vec<UsbDevice> + Send>,
    pub one: ReadOne,
    pub watch: StartWatch,
}

/// (장치, 도착인지, 이번 기록의 끊김 수, 반복 끊김 의심)
pub type Change = (UsbDev, bool, u32, bool);

/// 알림 하나 → 바뀐 것. 도착이면 장치를 다시 읽는다(벌써 빠졌으면 아는 값으로)
fn apply(t: &mut Tracker, one: &dyn Fn(&str) -> Option<UsbDevice>, n: &UsbNotice) -> Option<Change> {
    if n.arrived {
        let d = one(&n.id).or_else(|| t.known_device(&n.id))?;
        t.arrive(&d, n.time)
    } else {
        t.remove(&n.id, n.time)
    }
}

pub fn start_with(src: Source, poll_notify: Duration, poll_only: Duration, sink: Sink) -> Result<UsbRecorder, String> {
    let stop = Arc::new(AtomicBool::new(false));
    let st = stop.clone();
    let thread = std::thread::Builder::new()
        .name("hw-usb".into())
        .spawn(move || {
            let started = Instant::now();
            let (tx, rx) = mpsc::channel();
            let guard = (src.watch)(tx);
            let notify = guard.is_ok();
            let poll = if notify { poll_notify } else { poll_only };
            let mut t = Tracker::default();
            sink(UsbEvent::Snapshot { ts: portdock_core::event::now_ms(), devices: t.first((src.list)()), notify });
            let send = |(dev, arrived, drops, flap): Change, ts: u64| sink(UsbEvent::Change { ts, dev, arrived, drops, flap });
            let mut reason = "user";
            let mut next = Instant::now() + poll;
            while !st.load(Ordering::SeqCst) {
                if started.elapsed() >= MAX_DURATION {
                    reason = "limit";
                    break;
                }
                match rx.recv_timeout(Duration::from_millis(100)) {
                    Ok(n) => {
                        if let Some(c) = apply(&mut t, &*src.one, &n) {
                            send(c, n.time);
                        }
                    }
                    Err(mpsc::RecvTimeoutError::Timeout) => {}
                    Err(mpsc::RecvTimeoutError::Disconnected) => {}
                }
                if Instant::now() >= next {
                    next = Instant::now() + poll;
                    // 알림이 아직 줄에 있으면 그것부터(같은 변화를 견주기로 먼저 잡지 않게)
                    let mut pending = Vec::new();
                    while let Ok(n) = rx.try_recv() {
                        pending.push(n);
                    }
                    for n in pending {
                        if let Some(c) = apply(&mut t, &*src.one, &n) {
                            send(c, n.time);
                        }
                    }
                    let ts = portdock_core::event::now_ms();
                    for c in t.reconcile(&(src.list)(), ts) {
                        send(c, ts);
                    }
                }
            }
            drop(guard);
            sink(UsbEvent::Stopped { ts: portdock_core::event::now_ms(), reason });
        })
        .map_err(|e| e.to_string())?;
    Ok(UsbRecorder { stop, thread: Some(thread) })
}

pub fn start(sink: Sink) -> Result<UsbRecorder, String> {
    let src = Source {
        list: Box::new(portinfo::usb_devices),
        one: Box::new(portinfo::usb_device),
        watch: Box::new(|tx: mpsc::Sender<UsbNotice>| {
            portinfo::usb_watch(move |n| {
                let _ = tx.send(n);
            })
            .map(|w| Box::new(w) as WatchGuard)
        }),
    };
    start_with(src, POLL_WITH_NOTIFY, POLL_ONLY, sink)
}

// ---------------------------------------------------------------- 지난 기록(앱을 켜기 전)

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PastDev {
    pub name: String,
    pub vid: Option<u16>,
    pub pid: Option<u16>,
    pub present: bool,
    pub last_arrival: Option<u64>,
    pub last_removal: Option<u64>,
    pub first_install: Option<u64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PastEvent {
    pub time: u64,
    pub id: u32,
    pub kind: &'static str,
    pub name: String,
    pub vid: Option<u16>,
    pub pid: Option<u16>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UsbHistory {
    pub days: u32,
    /// 마지막 연결·분리가 최근인 것부터
    pub devices: Vec<PastDev>,
    pub events: Vec<PastEvent>,
    pub errors: Vec<String>,
}

/// core 가 읽은 것 → 화면 모양(인스턴스 ID 를 뺀다). 이벤트의 장치 이름은 장치 목록에서 찾는다(없으면 VID:PID 만)
pub fn history_out(days: u32, past: Vec<UsbPast>, events: Vec<UsbConfigEvent>, errors: Vec<String>) -> UsbHistory {
    let events = events
        .into_iter()
        .map(|e| {
            let d = past.iter().find(|p| p.id.eq_ignore_ascii_case(&e.device));
            let (vid, pid) = d.map(|d| (d.vid, d.pid)).unwrap_or_else(|| portinfo::pchealth::usb_vid_pid(&e.device));
            PastEvent { time: e.time, id: e.id, kind: e.kind, name: d.map(|d| d.name.clone()).unwrap_or_default(), vid, pid }
        })
        .collect();
    let mut devices: Vec<PastDev> = past
        .into_iter()
        .map(|p| PastDev { name: p.name, vid: p.vid, pid: p.pid, present: p.present, last_arrival: p.last_arrival, last_removal: p.last_removal, first_install: p.first_install })
        .collect();
    devices.sort_by_key(|d| std::cmp::Reverse(d.last_arrival.max(d.last_removal).unwrap_or(0)));
    UsbHistory { days, devices, events, errors }
}

pub fn history(days: u32) -> UsbHistory {
    let (past, events, errors) = portinfo::usb_history(days);
    history_out(days.clamp(1, 365), past, events, errors)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    /// 가짜 장치(예시 값 — 실제 장치 아님)
    fn usb(id: &str, name: &str, ports: &[u32]) -> UsbDevice {
        let (vid, pid) = portinfo::pchealth::usb_vid_pid(id);
        UsbDevice { id: id.into(), name: name.into(), vid, pid, hub: false, ports: ports.to_vec(), speed: Some("high"), below_capable: false }
    }

    #[test]
    fn flap_rule() {
        let m = 60_000;
        assert!(!flapping(&[], 0));
        assert!(!flapping(&[m, 2 * m], 3 * m));
        assert!(flapping(&[m, 2 * m, 3 * m], 3 * m));
        // 10분 넘게 지난 끊김은 세지 않는다
        assert!(!flapping(&[0, 2 * m, 3 * m], 11 * m));
        assert!(flapping(&[2 * m, 3 * m, 4 * m, 5 * m], 11 * m));
    }

    #[test]
    fn numbers_changes_and_flap() {
        let kb = usb(r"USB\VID_1234&PID_0001\SER0001", "Example Keyboard", &[1]);
        let hub = usb(r"USB\VID_1234&PID_0002\5&1&0&2", "Example Hub", &[2]);
        let mouse = usb(r"USB\VID_1234&PID_0003\6&1&0&1", "Example Mouse", &[2, 1]);
        let mut t = Tracker::default();
        let first = t.first(vec![mouse.clone(), hub.clone(), kb.clone()]);
        assert_eq!(first.iter().map(|d| (d.n, d.name.as_str())).collect::<Vec<_>>(), [(1, "Example Keyboard"), (2, "Example Hub"), (3, "Example Mouse")]);
        // 이미 있는 장치의 도착 알림은 무시
        assert!(t.arrive(&mouse, 10).is_none());
        // 마우스가 세 번 끊김 → 세 번째에 반복 끊김 의심
        for (i, ts) in [100u64, 200, 300].into_iter().enumerate() {
            let (d, arrived, drops, flap) = t.remove(&mouse.id.to_lowercase(), ts).unwrap();
            assert_eq!((d.n, arrived, drops, flap), (3, false, i as u32 + 1, i == 2));
            let (_, arrived, _, _) = t.arrive(&mouse, ts + 50).unwrap();
            assert!(arrived);
        }
        // 모르는 장치의 제거는 무시
        assert!(t.remove(r"USB\VID_FFFF&PID_FFFF\X", 400).is_none());
        // 목록 견주기 — 키보드 사라짐, 새 장치 등장
        let pad = usb(r"USB\VID_1234&PID_0004\7&1", "Example Pad", &[3]);
        let c = t.reconcile(&[hub.clone(), mouse.clone(), pad.clone()], 500);
        assert_eq!(c.iter().map(|x| (x.0.n, x.1)).collect::<Vec<_>>(), [(1, false), (4, true)]);
        assert!(t.reconcile(&[hub, mouse, pad], 600).is_empty());
        // 다시 꽂힌 키보드는 같은 번호
        assert_eq!(t.arrive(&kb, 700).unwrap().0.n, 1);
    }

    /// 화면으로 가는 모양에 인스턴스 ID·일련번호가 없다
    #[test]
    fn no_instance_id_leaves() {
        let mut t = Tracker::default();
        let devs = t.first(vec![usb(r"USB\VID_1234&PID_0001\SER0001", "Example Keyboard", &[1, 4])]);
        let s = serde_json::to_string(&UsbEvent::Snapshot { ts: 1, devices: devs, notify: true }).unwrap();
        assert!(!s.contains("SER0001") && !s.contains("VID_") && s.contains("\"belowCapable\":false") && s.contains("\"ports\":[1,4]"));
        let past = vec![UsbPast {
            id: r"USB\VID_1234&PID_0001\SER0001".into(),
            name: "Example Keyboard".into(),
            vid: Some(0x1234),
            pid: Some(1),
            present: false,
            last_arrival: Some(10),
            last_removal: Some(20),
            first_install: Some(1),
        }];
        let ev = vec![
            UsbConfigEvent { time: 5, id: 410, kind: "start", device: r"usb\vid_1234&pid_0001\ser0001".into() },
            UsbConfigEvent { time: 4, id: 420, kind: "delete", device: r"USB\VID_ABCD&PID_0009\SER0002".into() },
        ];
        let h = history_out(30, past, ev, Vec::new());
        assert_eq!((h.events[0].name.as_str(), h.events[1].vid, h.events[1].name.as_str()), ("Example Keyboard", Some(0xabcd), ""));
        let s = serde_json::to_string(&h).unwrap();
        assert!(!s.contains("SER000") && !s.to_ascii_uppercase().contains("VID_"));
    }

    #[test]
    fn recorder_notices_and_polls() {
        let a = usb(r"USB\VID_1234&PID_0001\A", "Example A", &[1]);
        let b = usb(r"USB\VID_1234&PID_0002\B", "Example B", &[2]);
        let present = Arc::new(Mutex::new(vec![a.clone(), b.clone()]));
        let tx_slot: Arc<Mutex<Option<mpsc::Sender<UsbNotice>>>> = Arc::new(Mutex::new(None));
        let (p1, p2, slot) = (present.clone(), present.clone(), tx_slot.clone());
        let src = Source {
            list: Box::new(move || p1.lock().unwrap().clone()),
            one: Box::new(move |id| p2.lock().unwrap().iter().find(|d| d.id == id).cloned()),
            watch: Box::new(move |tx| {
                *slot.lock().unwrap() = Some(tx);
                Ok(Box::new(()) as WatchGuard)
            }),
        };
        let got: Arc<Mutex<Vec<UsbEvent>>> = Arc::new(Mutex::new(Vec::new()));
        let g = got.clone();
        let mut r = start_with(src, Duration::from_millis(150), Duration::from_millis(50), Arc::new(move |e| g.lock().unwrap().push(e))).unwrap();
        std::thread::sleep(Duration::from_millis(60));
        // 알림으로 B 제거
        present.lock().unwrap().retain(|d| d.id != b.id);
        tx_slot.lock().unwrap().as_ref().unwrap().send(UsbNotice { arrived: false, id: b.id.clone(), time: 1_000 }).unwrap();
        std::thread::sleep(Duration::from_millis(60));
        // 알림 없이 A 제거 — 목록 견주기가 잡는다
        present.lock().unwrap().clear();
        std::thread::sleep(Duration::from_millis(300));
        assert!(r.running());
        r.stop();
        let ev = got.lock().unwrap().clone();
        assert!(matches!(&ev[0], UsbEvent::Snapshot { devices, notify: true, .. } if devices.len() == 2));
        let changes: Vec<(u32, bool, u64)> = ev.iter().filter_map(|e| if let UsbEvent::Change { dev, arrived, ts, .. } = e { Some((dev.n, *arrived, *ts)) } else { None }).collect();
        assert_eq!(changes.len(), 2, "{changes:?}");
        assert_eq!((changes[0].0, changes[0].1, changes[0].2), (2, false, 1_000));
        assert_eq!((changes[1].0, changes[1].1), (1, false));
        assert!(matches!(ev.last(), Some(UsbEvent::Stopped { reason: "user", .. })));
    }

    /// 이 PC 에서 실제로(관리자 없이) — 개수만 본다
    #[test]
    #[ignore = "이 PC 의 실제 USB 장치를 읽는다 — cargo test -- --ignored 로"]
    fn reads_this_pc() {
        let h = history(30);
        assert!(h.errors.is_empty(), "{} errors", h.errors.len());
        let mut t = Tracker::default();
        let devs = t.first(portinfo::usb_devices());
        println!("USB {} · 예전 {} · 30일 이벤트 {}", devs.len(), h.devices.len(), h.events.len());
    }
}
