//! PortDock TCP — 클라이언트(자동 재접속) · 서버(여러 접속, 에코). 로직은 portdock-core.

use portdock_core::checksum::ChecksumKind;
use portdock_core::codec::{SendSpec, build};
use portdock_core::event::{EventSink, SessionEvent};
use portdock_core::framer::FrameMode;
use portdock_core::tcp::{TcpConfig, TcpSession};
use std::sync::Mutex;
use tauri::State;
use tauri::ipc::Channel;

#[derive(Default)]
struct App(Mutex<Option<TcpSession>>);

#[tauri::command(async)]
fn start(
    app: State<App>,
    config: TcpConfig,
    framing: FrameMode,
    rx_check: Option<ChecksumKind>,
    on_event: Channel<SessionEvent>,
) -> Result<Option<String>, String> {
    let mut slot = app.0.lock().unwrap();
    if slot.is_some() {
        return Err("이미 시작돼 있습니다".into());
    }
    let sink = EventSink::new(move |e| {
        let _ = on_event.send(e);
    });
    let s = TcpSession::start(config, framing, rx_check, sink)?;
    let local = s.local_addr().map(|a| a.to_string());
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
fn set_framing(app: State<App>, framing: FrameMode, rx_check: Option<ChecksumKind>) -> Result<(), String> {
    let slot = app.0.lock().unwrap();
    slot.as_ref().ok_or("시작돼 있지 않습니다")?.set_framing(framing, rx_check);
    Ok(())
}

#[tauri::command]
fn set_echo(app: State<App>, on: bool) -> Result<(), String> {
    let slot = app.0.lock().unwrap();
    slot.as_ref().ok_or("시작돼 있지 않습니다")?.set_echo(on);
    Ok(())
}

/// target 이 없으면 붙어 있는 모두에게
#[tauri::command(async)]
fn send(app: State<App>, target: Option<u64>, spec: SendSpec) -> Result<usize, String> {
    let bytes = build(&spec)?;
    let slot = app.0.lock().unwrap();
    slot.as_ref().ok_or("시작돼 있지 않습니다")?.send(target, &bytes)
}

#[tauri::command]
fn kick(app: State<App>, id: u64) -> Result<(), String> {
    let slot = app.0.lock().unwrap();
    slot.as_ref().ok_or("시작돼 있지 않습니다")?.kick(id);
    Ok(())
}

#[tauri::command]
fn preview(spec: SendSpec) -> Result<Vec<u8>, String> {
    build(&spec)
}

#[tauri::command(async)]
fn set_log(app: State<App>, path: Option<String>) -> Result<(), String> {
    let slot = app.0.lock().unwrap();
    slot.as_ref().ok_or("시작돼 있지 않습니다")?.set_log(path)
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
        .invoke_handler(tauri::generate_handler![start, stop, set_framing, set_echo, send, kick, preview, set_log, write_text, read_text])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
