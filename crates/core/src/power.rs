//! 연결·기록 중 절전 막기(0.3.0, 설정 «연결·기록 중 절전 막기» — 기본 끔).
//!
//! `SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)` — PC 가 절전(대기)에 들어가지 않게만 한다. 화면은 꺼져도 된다
//! (`ES_DISPLAY_REQUIRED` 는 쓰지 않는다). 이 값은 부른 스레드에 붙으므로 전용 스레드 하나가 켜고 끈다(Tauri 명령은 스레드가 바뀐다).
//! 끊기·창 닫기 때 화면이 끄고, 프로세스가 끝나면 Windows 가 저절로 푼다. 전원 설정은 바꾸지 않는다.

use std::sync::mpsc::{Sender, channel};
use std::sync::{Mutex, OnceLock};

/// 지금 상태와 바라는 상태 → 할 일(Some(true)=켜기, Some(false)=풀기, None=그대로). 같은 값을 여러 번 보내도 한 번만
pub fn transition(now: bool, want: bool) -> Option<bool> {
    (now != want).then_some(want)
}

struct Worker {
    tx: Sender<bool>,
}

static WORKER: OnceLock<Mutex<Option<Worker>>> = OnceLock::new();
static STATE: Mutex<bool> = Mutex::new(false);

fn worker() -> Option<Sender<bool>> {
    let cell = WORKER.get_or_init(|| Mutex::new(None));
    let mut g = cell.lock().unwrap_or_else(|e| e.into_inner());
    if g.is_none() {
        let (tx, rx) = channel::<bool>();
        let ok = std::thread::Builder::new()
            .name("portdock-keep-awake".into())
            .spawn(move || {
                while let Ok(on) = rx.recv() {
                    apply(on);
                }
                // 화면 쪽이 모두 사라지면(보낼 곳 없음) 풀고 끝낸다
                apply(false);
            })
            .is_ok();
        if !ok {
            return None;
        }
        *g = Some(Worker { tx });
    }
    g.as_ref().map(|w| w.tx.clone())
}

/// 절전 막기 켜기·풀기 — 같은 값이면 아무것도 하지 않는다. 지금 막고 있는지 돌려준다
pub fn keep_awake(want: bool) -> bool {
    let mut now = STATE.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(on) = transition(*now, want)
        && let Some(tx) = worker()
        && tx.send(on).is_ok()
    {
        *now = on;
    }
    *now
}

#[cfg(windows)]
fn apply(on: bool) {
    use windows_sys::Win32::System::Power::{ES_CONTINUOUS, ES_SYSTEM_REQUIRED, SetThreadExecutionState};
    let flags = if on { ES_CONTINUOUS | ES_SYSTEM_REQUIRED } else { ES_CONTINUOUS };
    // SAFETY: 이 스레드의 실행 상태 표시만 바꾼다(전원 설정은 그대로)
    unsafe { SetThreadExecutionState(flags) };
}

#[cfg(not(windows))]
fn apply(_on: bool) {}

#[cfg(test)]
mod tests {
    use super::*;

    // 실제 SetThreadExecutionState 는 부르지 않는다(이 PC 설정에 손대지 않게) — 바뀔 때만 보내는 규칙만 본다
    #[test]
    fn only_on_change() {
        assert_eq!(transition(false, true), Some(true));
        assert_eq!(transition(true, true), None);
        assert_eq!(transition(true, false), Some(false));
        assert_eq!(transition(false, false), None);
    }
}
