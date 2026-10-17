//! PortDock Simulator — 규칙(받으면 → 답하기)으로 아무 장비나 흉내. 시리얼·TCP·UDP 공통.

use portdock_core::autoreply::{self, Rule, RuleSpec};
use portdock_core::checksum::ChecksumKind;
use portdock_core::codec::{SendSpec, build};
use portdock_core::event::{EventSink, SessionEvent};
use portdock_core::framer::FrameMode;
use portdock_core::ports;
use portdock_core::serial::{SerialConfig, Session};
use portdock_core::tcp::{TcpConfig, TcpSession};
use portdock_core::udp::{UdpConfig, UdpSession};
use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};
use tauri::State;
use tauri::ipc::Channel;

enum Sess {
    Serial(Session),
    Tcp(TcpSession),
    Udp(UdpSession),
}

#[derive(Default)]
struct App {
    rules: Arc<Mutex<Vec<Rule>>>,
    hits: Arc<Mutex<BTreeMap<String, u64>>>,
    sess: Mutex<Option<Sess>>,
}

fn sink(ch: Channel<SessionEvent>) -> EventSink {
    EventSink::new(move |e| {
        let _ = ch.send(e);
    })
}

fn put(app: &App, s: Sess) -> Result<(), String> {
    let mut slot = app.sess.lock().unwrap();
    if slot.is_some() {
        return Err("이미 시작돼 있습니다".into());
    }
    *slot = Some(s);
    Ok(())
}

#[tauri::command(async)]
fn list_ports() -> Vec<ports::PortInfo> {
    ports::list()
}

#[tauri::command(async)]
fn start_serial(app: State<App>, config: SerialConfig, framing: FrameMode, on_event: Channel<SessionEvent>) -> Result<(), String> {
    if app.sess.lock().unwrap().is_some() {
        return Err("이미 시작돼 있습니다".into());
    }
    let s = Session::start(config, framing, None, sink(on_event))?;
    s.set_responder(Some(autoreply::responder(app.rules.clone(), app.hits.clone())));
    put(&app, Sess::Serial(s))
}

#[tauri::command(async)]
fn start_tcp(app: State<App>, config: TcpConfig, framing: FrameMode, on_event: Channel<SessionEvent>) -> Result<Option<String>, String> {
    if app.sess.lock().unwrap().is_some() {
        return Err("이미 시작돼 있습니다".into());
    }
    let s = TcpSession::start(config, framing, None, sink(on_event))?;
    s.set_responder(Some(autoreply::responder(app.rules.clone(), app.hits.clone())));
    let local = s.local_addr().map(|a| a.to_string());
    put(&app, Sess::Tcp(s))?;
    Ok(local)
}

#[tauri::command(async)]
fn start_udp(app: State<App>, config: UdpConfig, on_event: Channel<SessionEvent>) -> Result<String, String> {
    if app.sess.lock().unwrap().is_some() {
        return Err("이미 시작돼 있습니다".into());
    }
    let s = UdpSession::start(config, None, sink(on_event))?;
    s.set_responder(Some(autoreply::responder(app.rules.clone(), app.hits.clone())));
    let local = s.local_addr().to_string();
    put(&app, Sess::Udp(s))?;
    Ok(local)
}

#[tauri::command(async)]
fn stop(app: State<App>) {
    let s = app.sess.lock().unwrap().take();
    match s {
        Some(Sess::Serial(s)) => s.stop(),
        Some(Sess::Tcp(s)) => s.stop(),
        Some(Sess::Udp(s)) => s.stop(),
        None => {}
    }
}

#[tauri::command]
fn set_framing(app: State<App>, framing: FrameMode) {
    match app.sess.lock().unwrap().as_ref() {
        Some(Sess::Serial(s)) => s.set_framing(framing, None::<ChecksumKind>),
        Some(Sess::Tcp(s)) => s.set_framing(framing, None),
        _ => {}
    }
}

/// 규칙 교체(꺼진 규칙은 빠짐). 잘못된 규칙이 있으면 이름과 함께 오류. 실행 중에도 바로 적용된다.
#[tauri::command]
fn set_rules(app: State<App>, rules: Vec<RuleSpec>) -> Result<usize, String> {
    let compiled = autoreply::compile_all(&rules)?;
    let n = compiled.len();
    *app.rules.lock().unwrap() = compiled;
    Ok(n)
}

#[tauri::command]
fn get_hits(app: State<App>) -> BTreeMap<String, u64> {
    app.hits.lock().unwrap().clone()
}

#[tauri::command]
fn reset_hits(app: State<App>) {
    app.hits.lock().unwrap().clear();
}

/// 장비가 먼저 보내는 것(상태 보고·하트비트 등)
#[tauri::command(async)]
fn send(app: State<App>, spec: SendSpec) -> Result<(), String> {
    let bytes = build(&spec)?;
    match app.sess.lock().unwrap().as_ref() {
        Some(Sess::Serial(s)) => s.send(bytes),
        Some(Sess::Tcp(s)) => s.send(None, &bytes).map(|_| ()),
        Some(Sess::Udp(s)) => s.send(Some("last"), &bytes).or_else(|_| s.send(None, &bytes)).map(|_| ()),
        None => Err("시작돼 있지 않습니다".into()),
    }
}

#[tauri::command]
fn preview(spec: SendSpec) -> Result<Vec<u8>, String> {
    build(&spec)
}

#[tauri::command(async)]
fn set_log(app: State<App>, path: Option<String>) -> Result<(), String> {
    match app.sess.lock().unwrap().as_ref() {
        Some(Sess::Serial(s)) => s.set_log(path),
        Some(Sess::Tcp(s)) => s.set_log(path),
        Some(Sess::Udp(s)) => s.set_log(path),
        None => Err("시작돼 있지 않습니다".into()),
    }
}

/// 규칙 묶음 저장·불러오기 — 사용자가 대화상자에서 고른 경로만
#[tauri::command]
fn write_text(path: String, text: String) -> Result<(), String> {
    std::fs::write(&path, text).map_err(|e| format!("{path}: {e}"))
}

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
        .invoke_handler(tauri::generate_handler![
            list_ports,
            start_serial,
            start_tcp,
            start_udp,
            stop,
            set_framing,
            set_rules,
            get_hits,
            reset_hits,
            send,
            preview,
            set_log,
            write_text,
            read_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
