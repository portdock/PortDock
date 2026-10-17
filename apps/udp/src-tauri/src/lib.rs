//! PortDock UDP — 송수신·브로드캐스트·멀티캐스트·에코. 로직은 portdock-core.

use portdock_core::tr;
use portdock_core::checksum::ChecksumKind;
use portdock_core::codec::{SendSpec, build};
use portdock_core::event::SessionEvent;
use portdock_core::registry::{Registry, auto_remove_sink};
use portdock_core::udp::{UdpConfig, UdpSession};
use std::sync::Arc;
use tauri::State;
use tauri::ipc::Channel;

#[derive(Default)]
struct App(Arc<Registry<UdpSession>>);

const MAIN: &str = "main";

#[tauri::command(async)]
fn start(app: State<App>, config: UdpConfig, rx_check: Option<ChecksumKind>, on_event: Channel<SessionEvent>) -> Result<String, String> {
    let reg = app.0.clone();
    let opening = reg.begin(MAIN).map_err(|_| tr!("이미 시작돼 있거나 시작하는 중입니다", "Already running or starting").to_string())?;
    let sink = auto_remove_sink(reg.clone(), MAIN.into(), opening.generation, move |e| {
        let _ = on_event.send(e);
    });
    let s = UdpSession::start(config, rx_check, None, sink)?;
    let local = s.local_addr().to_string();
    opening.finish(s);
    Ok(local)
}

#[tauri::command(async)]
fn stop(app: State<App>) {
    if let Some(s) = app.0.take(MAIN) {
        s.stop();
    }
}

/// 이름 조회(DNS)가 걸릴 수 있어 화면 스레드 밖에서
#[tauri::command(async)]
fn set_remote(app: State<App>, host: String, port: u16) -> Result<(), String> {
    app.0.with(MAIN, |s| s.set_remote(&host, port))?
}

#[tauri::command(async)]
fn set_rx_check(app: State<App>, rx_check: Option<ChecksumKind>) -> Result<(), String> {
    app.0.with(MAIN, |s| s.set_rx_check(rx_check))
}

#[tauri::command(async)]
fn set_echo(app: State<App>, on: bool) -> Result<(), String> {
    app.0.with(MAIN, |s| s.set_echo(on))
}

/// to: 없음 = 기본 대상, "last" = 마지막으로 보내온 쪽, 그 밖엔 «ip:port»
#[tauri::command(async)]
fn send(app: State<App>, to: Option<String>, spec: SendSpec) -> Result<String, String> {
    let bytes = build(&spec)?;
    if bytes.is_empty() {
        return Err(tr!("보낼 바이트가 없습니다", "Nothing to send").into());
    }
    app.0.with(MAIN, |s| s.send(to.as_deref(), &bytes).map(|a| a.to_string()))?
}

#[tauri::command(async)]
fn rejoin(app: State<App>) -> Result<(), String> {
    app.0.with(MAIN, |s| s.rejoin())?
}

#[tauri::command]
fn preview(spec: SendSpec) -> Result<Vec<u8>, String> {
    build(&spec)
}

#[tauri::command(async)]
fn set_log(app: State<App>, path: Option<String>) -> Result<(), String> {
    app.0.with(MAIN, |s| s.set_log(path))?
}

/// 화면 내용 저장 — 화면은 저장 대화상자에서 고른 경로만 넘긴다
#[tauri::command(async)]
fn write_text(path: String, text: String) -> Result<(), String> {
    std::fs::write(&path, text).map_err(|e| format!("{path}: {e}"))
}

/// 설정 가져오기 — 화면은 열기 대화상자에서 고른 경로만 넘긴다
#[tauri::command(async)]
fn read_text(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("{path}: {e}"))
}

/// 화면 언어를 백엔드 문구(오류·사건 줄)에도 적용
#[tauri::command]
fn set_lang(lang: String) {
    portdock_core::i18n::set_lang(&lang);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(App::default())
        .invoke_handler(tauri::generate_handler![
            set_lang, start, stop, set_remote, set_rx_check, set_echo, send, rejoin, preview, set_log, write_text, read_text])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
