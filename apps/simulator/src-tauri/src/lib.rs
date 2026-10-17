//! PortDock Simulator — 규칙(받으면 → 답하기)으로 아무 장비나 흉내. 시리얼·TCP·UDP 공통.

use portdock_core::tr;
use portdock_core::autoreply::{self, MatchOptions, Rule, RuleError, RuleSpec};
use portdock_core::checksum::ChecksumKind;
use portdock_core::codec::{SendSpec, build};
use portdock_core::event::{EventSink, SessionEvent};
use portdock_core::framer::FrameMode;
use portdock_core::ports;
use portdock_core::registry::{Opening, Registry, auto_remove_sink};
use portdock_core::serial::{SerialConfig, Session};
use portdock_core::tcp::{TcpConfig, TcpSession};
use portdock_core::udp::{UdpConfig, UdpSession};
use serde::Serialize;
use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};
use tauri::State;
use tauri::ipc::Channel;

/// 지금 흉내 내는 연결 하나. 버려지면 안의 세션이 멈춘다(각 세션의 Drop)
enum Sess {
    Serial(Session),
    Tcp(TcpSession),
    Udp(UdpSession),
}

#[derive(Default)]
struct App {
    rules: Arc<Mutex<Vec<Rule>>>,
    hits: Arc<Mutex<BTreeMap<String, u64>>>,
    /// 맞춰 보기 옵션 + 지금 프레임 구분의 끝 문자(시작·set_framing 때 갱신)
    opts: Arc<Mutex<MatchOptions>>,
    /// 보관함 이름 "main". 시작 연타는 «여는 중» 으로 막히고, 스스로 닫히면 알아서 빠진다
    sess: Arc<Registry<Sess>>,
}

const MAIN: &str = "main";

fn begin(app: &App) -> Result<Opening<'_, Sess>, String> {
    app.sess.begin(MAIN).map_err(|_| tr!("이미 시작돼 있거나 시작하는 중입니다", "Already running or starting").to_string())
}

fn sink(app: &App, generation: u64, ch: Channel<SessionEvent>) -> EventSink {
    auto_remove_sink(app.sess.clone(), MAIN.into(), generation, move |e| {
        let _ = ch.send(e);
    })
}

#[tauri::command(async)]
fn list_ports() -> Vec<ports::PortInfo> {
    ports::list()
}

fn responder(app: &App, framing: Option<&FrameMode>) -> portdock_core::serial::Responder {
    app.opts.lock().unwrap().terminator = framing.map(|f| f.terminator().to_vec()).unwrap_or_default();
    autoreply::responder_with(app.rules.clone(), app.hits.clone(), app.opts.clone())
}

#[tauri::command(async)]
fn start_serial(app: State<App>, config: SerialConfig, framing: FrameMode, on_event: Channel<SessionEvent>) -> Result<(), String> {
    let opening = begin(&app)?;
    let r = responder(&app, Some(&framing));
    let s = Session::start(config, framing, None, Some(r), sink(&app, opening.generation, on_event))?;
    opening.finish(Sess::Serial(s));
    Ok(())
}

#[tauri::command(async)]
fn start_tcp(app: State<App>, config: TcpConfig, framing: FrameMode, on_event: Channel<SessionEvent>) -> Result<Option<String>, String> {
    let opening = begin(&app)?;
    let r = responder(&app, Some(&framing));
    let s = TcpSession::start(config, framing, None, Some(r), sink(&app, opening.generation, on_event))?;
    let local = s.local_addr().map(|a| a.to_string());
    opening.finish(Sess::Tcp(s));
    Ok(local)
}

#[tauri::command(async)]
fn start_udp(app: State<App>, config: UdpConfig, on_event: Channel<SessionEvent>) -> Result<String, String> {
    let opening = begin(&app)?;
    // UDP 는 데이터그램 하나가 프레임 — 끝 문자는 없고, 남은 CR·LF 만 뗀다
    let r = responder(&app, None);
    let s = UdpSession::start(config, None, Some(r), sink(&app, opening.generation, on_event))?;
    let local = s.local_addr().to_string();
    opening.finish(Sess::Udp(s));
    Ok(local)
}

#[tauri::command(async)]
fn stop(app: State<App>) {
    match app.sess.take(MAIN) {
        Some(Sess::Serial(s)) => s.stop(),
        Some(Sess::Tcp(s)) => s.stop(),
        Some(Sess::Udp(s)) => s.stop(),
        None => {}
    }
}

#[tauri::command(async)]
fn set_framing(app: State<App>, framing: FrameMode) {
    let udp = app.sess.with(MAIN, |s| matches!(s, Sess::Udp(_))).unwrap_or(false);
    if !udp {
        app.opts.lock().unwrap().terminator = framing.terminator().to_vec();
    }
    let _ = app.sess.with(MAIN, |s| match s {
        Sess::Serial(s) => s.set_framing(framing, None::<ChecksumKind>),
        Sess::Tcp(s) => s.set_framing(framing, None),
        Sess::Udp(_) => {}
    });
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RulesResult {
    /// 지금 쓰이는 규칙 수
    active: usize,
    /// 건너뛴 규칙들 — index 는 넘겨받은 목록(꺼진 규칙 포함)의 순서(0부터)
    errors: Vec<RuleError>,
}

/// 규칙 교체(꺼진 규칙은 빠짐). 규칙마다 따로 검사해 잘못된 것만 빼고 나머지는 바로 적용한다(실행 중에도).
#[tauri::command]
fn set_rules(app: State<App>, rules: Vec<RuleSpec>) -> RulesResult {
    let (compiled, errors) = autoreply::compile_each(&rules);
    let active = compiled.len();
    *app.rules.lock().unwrap() = compiled;
    RulesResult { active, errors }
}

/// 맞춰 보기 옵션. strip_terminator: 끝 문자(프레임 구분 설정)와 끝 CR·LF 를 떼고 맞춰 본다.
/// log_no_match: 어느 규칙에도 안 맞으면 사건 줄 «NO MATCH». 기본은 둘 다 켬. 실행 중에도 바로 적용
#[tauri::command]
fn set_match_options(app: State<App>, strip_terminator: bool, log_no_match: bool) {
    let mut o = app.opts.lock().unwrap();
    o.strip_terminator = strip_terminator;
    o.log_no_match = log_no_match;
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
    if bytes.is_empty() {
        return Err(tr!("보낼 바이트가 없습니다", "Nothing to send").into());
    }
    app.sess.with(MAIN, |s| match s {
        Sess::Serial(s) => s.send(bytes),
        Sess::Tcp(s) => s.send(None, &bytes).map(|_| ()),
        Sess::Udp(s) => s.send(Some("last"), &bytes).or_else(|_| s.send(None, &bytes)).map(|_| ()),
    })?
}

#[tauri::command]
fn preview(spec: SendSpec) -> Result<Vec<u8>, String> {
    build(&spec)
}

#[tauri::command(async)]
fn set_log(app: State<App>, path: Option<String>) -> Result<(), String> {
    app.sess.with(MAIN, |s| match s {
        Sess::Serial(s) => s.set_log(path),
        Sess::Tcp(s) => s.set_log(path),
        Sess::Udp(s) => s.set_log(path),
    })?
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

/// 화면 언어를 백엔드 문구(오류·사건 줄)에도 적용
#[tauri::command]
fn set_lang(lang: String) {
    portdock_core::i18n::set_lang(&lang);
}

/// 문제 보고 — 지난번에 죽으며 남긴 기록(보낼지는 화면에서 사용자가 정한다)
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

/// 네이티브 크래시의 minidump 내용 — 화면이 Sentry 로 올릴 때(이름은 report_pending 이 준 것만)
#[tauri::command(async)]
fn report_read_dump(name: String) -> Result<tauri::ipc::Response, String> {
    portdock_core::report::read_dump(&name).map(tauri::ipc::Response::new)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // WebView2 가 없으면 화면이 뜨지 않는다 — 문제 보고 대신 설치 안내를 띄우고 끝낸다
    if let Err(e) = tauri::webview_version() {
        portdock_core::report::webview_missing(&e.to_string());
    }
    portdock_core::report::install("simulator", env!("CARGO_PKG_VERSION"));
    // 네이티브 크래시 감시 — 감시 프로세스로 불렸으면 여기서 끝난다(화면을 만들지 않는다)
    portdock_core::report::crash_monitor_or_attach();
    portdock_core::report::test_crash_if_asked();
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // WebView2 화면 프로세스가 죽으면(흰 화면) 기록하고 다시 연다
            #[cfg(windows)]
            if let Some(w) = tauri::Manager::get_webview_window(app, "main") {
                let _ = w.with_webview(|wv| portdock_core::report::watch_webview2(&wv.controller()));
            }
            #[cfg(not(windows))]
            let _ = app;
            Ok(())
        })
        .manage(App::default())
        .invoke_handler(tauri::generate_handler![
            set_lang,
            report_pending,
            report_dismiss,
            report_env,
            report_read_dump,
            list_ports,
            start_serial,
            start_tcp,
            start_udp,
            stop,
            set_framing,
            set_rules,
            set_match_options,
            get_hits,
            reset_hits,
            send,
            preview,
            set_log,
            write_text,
            read_text
        ])
        .run(tauri::generate_context!());
    if let Err(e) = result {
        portdock_core::report::run_failed(&e.to_string());
    }
}
