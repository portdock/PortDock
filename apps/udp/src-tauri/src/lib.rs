//! PortDock UDP — 송수신·브로드캐스트·멀티캐스트·에코. 로직은 portdock-core.

use portdock_core::checksum::ChecksumKind;
use portdock_core::codec::{SendSpec, build};
use portdock_core::event::{EventSink, SessionEvent};
use portdock_core::udp::{UdpConfig, UdpSession};
use std::sync::Mutex;
use tauri::State;
use tauri::ipc::Channel;

#[derive(Default)]
struct App(Mutex<Option<UdpSession>>);

fn with<T>(app: &State<App>, f: impl FnOnce(&UdpSession) -> Result<T, String>) -> Result<T, String> {
    let slot = app.0.lock().unwrap();
    f(slot.as_ref().ok_or("시작돼 있지 않습니다")?)
}

#[tauri::command(async)]
fn start(app: State<App>, config: UdpConfig, rx_check: Option<ChecksumKind>, on_event: Channel<SessionEvent>) -> Result<String, String> {
    let mut slot = app.0.lock().unwrap();
    if slot.is_some() {
        return Err("이미 시작돼 있습니다".into());
    }
    let sink = EventSink::new(move |e| {
        let _ = on_event.send(e);
    });
    let s = UdpSession::start(config, rx_check, sink)?;
    let local = s.local_addr().to_string();
    *slot = Some(s);
    Ok(local)
}

#[tauri::command(async)]
fn stop(app: State<App>) {
    let s = app.0.lock().unwrap().take();
    if let Some(s) = s {
        s.stop();
    }
}

#[tauri::command]
fn set_remote(app: State<App>, host: String, port: u16) -> Result<(), String> {
    with(&app, |s| s.set_remote(&host, port))
}

#[tauri::command]
fn set_rx_check(app: State<App>, rx_check: Option<ChecksumKind>) -> Result<(), String> {
    with(&app, |s| {
        s.set_rx_check(rx_check);
        Ok(())
    })
}

#[tauri::command]
fn set_echo(app: State<App>, on: bool) -> Result<(), String> {
    with(&app, |s| {
        s.set_echo(on);
        Ok(())
    })
}

/// to: 없음 = 기본 대상, "last" = 마지막으로 보내온 쪽, 그 밖엔 «ip:port»
#[tauri::command(async)]
fn send(app: State<App>, to: Option<String>, spec: SendSpec) -> Result<String, String> {
    let bytes = build(&spec)?;
    with(&app, |s| s.send(to.as_deref(), &bytes).map(|a| a.to_string()))
}

#[tauri::command]
fn rejoin(app: State<App>) -> Result<(), String> {
    with(&app, |s| s.rejoin())
}

#[tauri::command]
fn preview(spec: SendSpec) -> Result<Vec<u8>, String> {
    build(&spec)
}

#[tauri::command(async)]
fn set_log(app: State<App>, path: Option<String>) -> Result<(), String> {
    with(&app, |s| s.set_log(path))
}

/// 화면 내용 저장 — 사용자가 저장 대화상자에서 고른 경로만
#[tauri::command]
fn write_text(path: String, text: String) -> Result<(), String> {
    std::fs::write(&path, text).map_err(|e| format!("{path}: {e}"))
}

/// 설정 가져오기 — 사용자가 열기 대화상자에서 고른 경로만
#[tauri::command]
fn read_text(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("{path}: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(App::default())
        .invoke_handler(tauri::generate_handler![start, stop, set_remote, set_rx_check, set_echo, send, rejoin, preview, set_log, write_text, read_text])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
