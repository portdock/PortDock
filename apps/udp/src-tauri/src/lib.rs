//! PortDock UDP — 송수신·브로드캐스트·멀티캐스트·에코. 로직은 portdock-core.

use portdock_core::tr;
use portdock_core::checksum::ChecksumKind;
use portdock_core::codec::SendText;
use portdock_core::event::LogOptions;
use portdock_core::event::SessionEvent;
use portdock_core::registry::{Registry, auto_remove_sink};
use portdock_core::autoreply::{self, AutoReply, RulePreview, RuleSpec, RulesResult};
use portdock_core::udp::{UdpConfig, UdpSession};
use std::collections::BTreeMap;
use std::sync::Arc;
use tauri::State;
use tauri::ipc::Channel;

/// .1 = 자동응답(화면의 «켜기» 로, 처음엔 꺼짐). UDP 는 데이터그램 하나가 프레임 — 끝 문자 없이 끝 CR·LF 만 뗀다
struct App(Arc<Registry<UdpSession>>, AutoReply);

impl Default for App {
    fn default() -> Self {
        Self(Arc::default(), AutoReply::new(false))
    }
}

const MAIN: &str = "main";

#[tauri::command(async)]
fn start(app: State<App>, config: UdpConfig, rx_check: Option<ChecksumKind>, on_event: Channel<SessionEvent>) -> Result<String, String> {
    let reg = app.0.clone();
    let opening = reg.begin(MAIN).map_err(|_| tr!("이미 시작돼 있거나 시작하는 중입니다", "Already running or starting").to_string())?;
    let sink = auto_remove_sink(reg.clone(), MAIN.into(), opening.generation, move |e| {
        let _ = on_event.send(e);
    });
    let s = UdpSession::start(config, rx_check, Some(app.1.responder()), sink)?;
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
fn send(app: State<App>, to: Option<String>, spec: SendText) -> Result<String, String> {
    let bytes = spec.build()?;
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
fn preview(spec: SendText) -> Result<Vec<u8>, String> {
    spec.build()
}

/// 파일 로그 형식·글자 인코딩·나누기 — 다음에 여는 로그 파일부터
#[tauri::command]
fn set_log_options(options: LogOptions) {
    portdock_core::event::set_log_options(options);
}

#[tauri::command(async)]
fn set_log(app: State<App>, path: Option<String>) -> Result<(), String> {
    app.0.with(MAIN, |s| s.set_log(path))?
}

// ---- 자동응답(Simulator 와 같은 규칙) — 응답은 보낸 쪽으로

#[tauri::command]
fn set_rules(app: State<App>, rules: Vec<RuleSpec>) -> RulesResult {
    app.1.set_rules(&rules)
}

#[tauri::command]
fn set_auto_reply(app: State<App>, on: bool) {
    app.1.set_enabled(on);
}

#[tauri::command]
fn set_match_options(app: State<App>, strip_terminator: bool, log_no_match: bool) {
    app.1.set_match_options(strip_terminator, log_no_match);
}

#[tauri::command]
fn get_hits(app: State<App>) -> BTreeMap<String, u64> {
    app.1.hits()
}

#[tauri::command]
fn reset_hits(app: State<App>) {
    app.1.reset_hits();
}

#[tauri::command]
fn preview_rule(app: State<App>, rule: RuleSpec, sample: String) -> Result<RulePreview, String> {
    let opts = app.1.opts.lock().unwrap().clone();
    autoreply::preview(&rule, &sample, &opts)
}

/// 이 PC 의 랜카드 IPv4 목록(받을 주소·멀티캐스트 랜카드 고르기)
#[tauri::command(async)]
fn interfaces() -> Vec<portdock_core::net::Interface> {
    portdock_core::net::interfaces()
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
    portdock_core::report::install("udp", env!("CARGO_PKG_VERSION"));
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
            report_read_dump, start, stop, set_remote, set_rx_check, set_echo, send, rejoin, preview, set_log_options, set_log, write_text, read_text,
            set_rules, set_auto_reply, set_match_options, get_hits, reset_hits, preview_rule, interfaces
        ])
        .run(tauri::generate_context!());
    if let Err(e) = result {
        portdock_core::report::run_failed(&e.to_string());
    }
}
