//! PortDock Simulator — 규칙(받으면 → 답하기)으로 아무 장비나 흉내. 시리얼·TCP·UDP 공통.

use portdock_core::tr;
use portdock_core::autoreply::{self, AutoReply, Fill, Rng, RulePreview, RuleSpec, RulesResult, Template};
use portdock_core::checksum::ChecksumKind;
use portdock_core::codec::SendSpec;
use portdock_core::event::{EventSink, SessionEvent};
use portdock_core::framer::FrameMode;
use portdock_core::ports;
use portdock_core::registry::{Opening, Registry, auto_remove_sink};
use portdock_core::serial::{SerialConfig, Session};
use portdock_core::tcp::{TcpConfig, TcpSession};
use portdock_core::udp::{UdpConfig, UdpSession};
use std::collections::BTreeMap;
use std::sync::Arc;
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
    /// 규칙·응답 횟수·맞춰 보기 옵션(끝 문자는 시작·set_framing 때 갱신) — Simulator 는 늘 켜짐
    ar: AutoReply,
    /// 보관함 이름 "main". 시작 연타는 «여는 중» 으로 막히고, 스스로 닫히면 알아서 빠진다
    sess: Arc<Registry<Sess>>,
    /// «장비가 먼저 보내기» 의 템플릿 채움 — {counter} 는 보낸 횟수(시작마다 0부터), {rand} 는 이 난수
    push: std::sync::Mutex<(u64, Option<Rng>)>,
}

/// «장비가 먼저 보내기» 바이트 — 응답 규칙과 같은 템플릿({counter}·{rand}·{time}·{unix}·{crc …}, {req} 는 요청이 없어 쓸 수 없음)
fn build_push(app: &App, spec: &SendSpec, count: bool) -> Result<Vec<u8>, String> {
    let t = Template::parse(spec)?;
    let mut g = app.push.lock().unwrap_or_else(|e| e.into_inner());
    let counter = g.0;
    let rng = g.1.get_or_insert_with(Rng::from_time);
    let out = t.render(&mut Fill { request: &[], counter, rng })?;
    if count {
        g.0 += 1;
    }
    Ok(out)
}

const MAIN: &str = "main";

fn begin(app: &App) -> Result<Opening<'_, Sess>, String> {
    let o = app.sess.begin(MAIN).map_err(|_| tr!("이미 시작돼 있거나 시작하는 중입니다", "Already running or starting").to_string())?;
    // 시작마다 «장비가 먼저 보내기» 의 {counter} 를 0 부터
    app.push.lock().unwrap_or_else(|e| e.into_inner()).0 = 0;
    Ok(o)
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
    app.ar.set_terminator(framing.map(|f| f.terminator()).unwrap_or_default());
    app.ar.responder()
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
        app.ar.set_terminator(framing.terminator());
    }
    let _ = app.sess.with(MAIN, |s| match s {
        Sess::Serial(s) => s.set_framing(framing, None::<ChecksumKind>),
        Sess::Tcp(s) => s.set_framing(framing, None),
        Sess::Udp(_) => {}
    });
}

/// 규칙 교체(꺼진 규칙은 빠짐). 규칙마다 따로 검사해 잘못된 것만 빼고 나머지는 바로 적용한다(실행 중에도).
#[tauri::command]
fn set_rules(app: State<App>, rules: Vec<RuleSpec>) -> RulesResult {
    app.ar.set_rules(&rules)
}

/// 규칙 하나를 예시 요청(규칙의 패턴 방식으로 적은 것)으로 미리 본다 — 맞는지·응답 바이트(템플릿 채움)
#[tauri::command]
fn preview_rule(app: State<App>, rule: RuleSpec, sample: String) -> Result<RulePreview, String> {
    let opts = app.ar.opts.lock().unwrap().clone();
    autoreply::preview(&rule, &sample, &opts)
}

/// 맞춰 보기 옵션. strip_terminator: 끝 문자(프레임 구분 설정)와 끝 CR·LF 를 떼고 맞춰 본다.
/// log_no_match: 어느 규칙에도 안 맞으면 사건 줄 «NO MATCH». 기본은 둘 다 켬. 실행 중에도 바로 적용
#[tauri::command]
fn set_match_options(app: State<App>, strip_terminator: bool, log_no_match: bool) {
    app.ar.set_match_options(strip_terminator, log_no_match);
}

#[tauri::command]
fn get_hits(app: State<App>) -> BTreeMap<String, u64> {
    app.ar.hits()
}

/// 응답 횟수(와 템플릿 {counter}·«차례로» 응답)를 처음부터
#[tauri::command]
fn reset_hits(app: State<App>) {
    app.ar.reset_hits();
}

/// 장비가 먼저 보내는 것(상태 보고·하트비트 등)
#[tauri::command(async)]
fn send(app: State<App>, spec: SendSpec) -> Result<(), String> {
    let bytes = build_push(&app, &spec, true)?;
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
fn preview(app: State<App>, spec: SendSpec) -> Result<Vec<u8>, String> {
    build_push(&app, &spec, false)
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
#[tauri::command(async)]
fn write_text(path: String, text: String) -> Result<(), String> {
    std::fs::write(&path, text).map_err(|e| format!("{path}: {e}"))
}

#[tauri::command(async)]
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
        // 창 크기·위치·최대화를 기억한다. 보임·장식·전체 화면은 되살리지 않는다(숨은 창으로 뜨지 않게).
        // 위치는 저장된 자리가 지금 있는 모니터에 걸칠 때만 되살린다 — 아니면 OS 가 정한다(플러그인 동작)
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
            // WebView2 화면 프로세스가 죽으면(흰 화면) 기록하고 다시 연다
            #[cfg(windows)]
            if let Some(w) = tauri::Manager::get_webview_window(app, "main") {
                let _ = w.with_webview(|wv| portdock_core::report::watch_webview2(&wv.controller()));
            }
            // 켤 때 흰 화면 없이(0.3.0) — 창은 숨긴 채 만들고(tauri.conf.json visible false) 화면이 첫 그림 뒤 보인다(shared/windowShow.ts).
            // 화면이 끝내 부르지 못하면(스크립트 오류 등) 4초 뒤 여기서 보인다 — 창이 안 뜨는 일이 없게
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
            report_read_dump,
            list_ports,
            start_serial,
            start_tcp,
            start_udp,
            stop,
            set_framing,
            set_rules,
            preview_rule,
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
