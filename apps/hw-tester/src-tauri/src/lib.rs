//! PortDock Hardware Tester — Wi-Fi·인터넷 끊김·지연 기록(rec.rs), Wi-Fi 신호·채널(portdock_core::wlan — 누를 때만, 위치 권한),
//! 블루투스 연결 기록(bt.rs), 블루투스 오디오 모드(portdock_core::portinfo::bt_audio — Port Inspector 무선 탭과 같은 읽기).
//! 읽기 전용 — 설정·드라이버·연결을 바꾸는 명령은 없다. 핑·DNS 는 사용자가 «기록 시작» 을 누른 동안만, 정한 대상에만.

mod bt;
mod rec;

use portdock_core::portinfo::{self, BtAudio};
use portdock_core::tr;
use portdock_core::wlan::{self, WifiSignal};
use serde::Serialize;
use std::sync::{Arc, Mutex};
use tauri::State;
use tauri::ipc::Channel;

#[derive(Default)]
struct App {
    rec: Mutex<Option<rec::Recorder>>,
    bt: Mutex<Option<bt::BtRecorder>>,
}

fn lock<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

/// 끊김·지연 기록 시작 — 사건은 on_event 로. 하나만 돈다
#[tauri::command(async)]
fn rec_start(app: State<App>, config: rec::RecConfig, on_event: Channel<rec::RecEvent>) -> Result<(), String> {
    let mut g = lock(&app.rec);
    if g.as_ref().is_some_and(|r| r.running()) {
        return Err(tr!("이미 기록 중입니다", "Already recording").into());
    }
    let r = rec::start(
        config,
        Arc::new(move |e| {
            let _ = on_event.send(e);
        }),
    )?;
    *g = Some(r);
    Ok(())
}

#[tauri::command(async)]
fn rec_stop(app: State<App>) {
    // 멈추는 동안(마지막 핑이 끝날 때까지 최대 2초) 잠금을 쥐지 않게 꺼내서 멈춘다
    let r = lock(&app.rec).take();
    if let Some(mut r) = r {
        r.stop();
    }
}

#[tauri::command(async)]
fn bt_start(app: State<App>, on_event: Channel<bt::BtEvent>) -> Result<(), String> {
    let mut g = lock(&app.bt);
    if g.as_ref().is_some_and(|r| r.running()) {
        return Err(tr!("이미 기록 중입니다", "Already recording").into());
    }
    *g = Some(bt::start(Arc::new(move |e| {
        let _ = on_event.send(e);
    }))?);
    Ok(())
}

#[tauri::command(async)]
fn bt_stop(app: State<App>) {
    let r = lock(&app.bt).take();
    if let Some(mut r) = r {
        r.stop();
    }
}

/// Wi-Fi 신호·채널 — 화면이 «신호 보기» 를 켠 동안만 부른다(위치 권한이 필요할 수 있다)
#[tauri::command(async)]
fn wifi_signal() -> WifiSignal {
    wlan::signal()
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BtAudioState {
    audio: Vec<BtAudio>,
    errors: Vec<String>,
}

/// 블루투스 오디오 끝점(스테레오/핸즈프리)과 기본 장치 여부
#[tauri::command(async)]
fn bt_audio() -> BtAudioState {
    let (audio, errors) = portinfo::bt_audio();
    BtAudioState { audio, errors }
}

/// 기록하는 동안 PC 가 대기(절전)로 들어가지 않게(화면은 꺼져도 됨) — 멈추거나 창을 닫으면 푼다. 전원 설정은 바꾸지 않는다
#[tauri::command]
fn keep_awake(on: bool) -> bool {
    portdock_core::power::keep_awake(on)
}

/// 저장 — 사용자가 저장 대화상자에서 고른 경로만
#[tauri::command(async)]
fn write_text(path: String, text: String) -> Result<(), String> {
    std::fs::write(&path, text).map_err(|e| format!("{path}: {e}"))
}

#[tauri::command(async)]
fn read_text(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("{path}: {e}"))
}

/// 화면 언어를 백엔드 문구(오류)에도 적용
#[tauri::command]
fn set_lang(lang: String) {
    portdock_core::i18n::set_lang(&lang);
}

#[tauri::command]
fn report_pending() -> Vec<portdock_core::report::CrashReport> {
    portdock_core::report::pending()
}

#[tauri::command]
fn report_dismiss(name: String) -> Result<(), String> {
    portdock_core::report::dismiss(&name)
}

#[tauri::command]
fn report_env() -> portdock_core::report::EnvInfo {
    portdock_core::report::env_info()
}

/// 여러 PortDock 앱이 함께 보는 사용 통계 동의(0.6.0) — 아직 묻지 않은 앱은 이 값을 기본으로 쓴다
#[tauri::command]
fn consent_get() -> portdock_core::consent::Consent {
    portdock_core::consent::read()
}

#[tauri::command]
fn consent_set(usage_stats: bool) -> Result<(), String> {
    portdock_core::consent::write(usage_stats)
}

#[tauri::command(async)]
fn report_read_dump(name: String) -> Result<tauri::ipc::Response, String> {
    portdock_core::report::read_dump(&name).map(tauri::ipc::Response::new)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(e) = tauri::webview_version() {
        portdock_core::report::webview_missing(&e.to_string());
    }
    portdock_core::report::install("hw-tester", env!("CARGO_PKG_VERSION"));
    portdock_core::report::crash_monitor_or_attach();
    portdock_core::report::test_crash_if_asked();
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::POSITION
                        | tauri_plugin_window_state::StateFlags::MAXIMIZED,
                )
                .build(),
        )
        .setup(|app| {
            #[cfg(windows)]
            if let Some(w) = tauri::Manager::get_webview_window(app, "main") {
                let _ = w.with_webview(|wv| portdock_core::report::watch_webview2(&wv.controller()));
            }
            if let Some(w) = tauri::Manager::get_webview_window(app, "main") {
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(4));
                    if !w.is_visible().unwrap_or(true) {
                        let _ = w.show();
                    }
                });
            }
            Ok(())
        })
        .manage(App::default())
        .invoke_handler(tauri::generate_handler![
            set_lang,
            report_pending,
            report_dismiss,
            report_env,
            consent_get,
            consent_set,
            report_read_dump,
            rec_start,
            rec_stop,
            bt_start,
            bt_stop,
            wifi_signal,
            bt_audio,
            keep_awake,
            write_text,
            read_text
        ])
        .run(tauri::generate_context!());
    if let Err(e) = result {
        portdock_core::report::run_failed(&e.to_string());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 화면이 보내는 설정 모양(camelCase, 빠진 칸은 기본값)
    #[test]
    fn config_shape() {
        let c: rec::RecConfig = serde_json::from_str(r#"{"target":"1.1.1.1","dnsName":"example.com","intervalMs":2000}"#).unwrap();
        assert_eq!((c.target.as_str(), c.dns_name.as_str(), c.interval_ms), ("1.1.1.1", "example.com", 2000));
        let c: rec::RecConfig = serde_json::from_str(r#"{"target":"8.8.8.8"}"#).unwrap();
        assert_eq!((c.dns_name.as_str(), c.interval_ms), ("", 1000));
    }

    /// 화면이 받는 모양 — camelCase
    #[test]
    fn shapes() {
        let v = serde_json::to_value(bt_audio()).unwrap();
        assert!(v.get("audio").is_some() && v.get("errors").is_some());
        let e = serde_json::to_value(rec::RecEvent::Tick { ts: 1, gw: Some(-1), net: Some(12), dns: None }).unwrap();
        assert_eq!(e, serde_json::json!({ "type": "tick", "ts": 1, "gw": -1, "net": 12, "dns": null }));
        let w = serde_json::to_value(rec::RecEvent::Wifi { ts: 1, connected: false, code: Some(1), reason: Some("x".into()) }).unwrap();
        assert_eq!(w["type"], "wifi");
        let s = serde_json::to_value(WifiSignal { state: "denied", ..Default::default() }).unwrap();
        assert!(s.get("rxMbps").is_some() && s.get("channels").is_some());
    }
}
