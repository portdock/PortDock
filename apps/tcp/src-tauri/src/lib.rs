//! PortDock TCP — 클라이언트(자동 재접속) · 서버(여러 접속, 에코). 로직은 portdock-core.

use portdock_core::tr;
use portdock_core::checksum::ChecksumKind;
use portdock_core::codec::{Pace, SendText};
use portdock_core::event::LogOptions;
use portdock_core::event::SessionEvent;
use portdock_core::framer::FrameMode;
use portdock_core::registry::{Registry, auto_remove_sink};
use portdock_core::autoreply::{self, AutoReply, RulePreview, RuleSpec, RulesResult};
use portdock_core::tcp::{MbapInfo, RelayTarget, TcpConfig, TcpMode, TcpSession};
use serde::Serialize;
use std::collections::BTreeMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicU16, AtomicU64, Ordering};
use std::time::{Duration, Instant};
use tauri::State;
use tauri::ipc::Channel;

/// 세션은 하나 — 보관함 이름 "main". 스스로 닫히면(접속 실패·자동 재접속 꺼짐) 알아서 빠진다.
/// .2 = 자동응답(화면의 «켜기» 로, 처음엔 꺼짐) · .3 = Modbus TCP 트랜잭션 ID(보낼 때마다 1씩)
struct App(Arc<Registry<TcpSession>>, Arc<Cancel>, AutoReply, AtomicU16);

impl Default for App {
    fn default() -> Self {
        Self(Arc::default(), Arc::default(), AutoReply::new(false), AtomicU16::new(1))
    }
}

const MAIN: &str = "main";

#[tauri::command(async)]
fn start(
    app: State<App>,
    config: TcpConfig,
    framing: FrameMode,
    rx_check: Option<ChecksumKind>,
    upstream: Option<RelayTarget>,
    on_event: Channel<SessionEvent>,
) -> Result<Option<String>, String> {
    let reg = app.0.clone();
    let opening = reg.begin(MAIN).map_err(|_| tr!("이미 시작돼 있거나 시작하는 중입니다", "Already running or starting").to_string())?;
    let sink = auto_remove_sink(reg.clone(), MAIN.into(), opening.generation, move |e| {
        let _ = on_event.send(e);
    });
    // 중계(모드 relay + upstream)는 자동응답 없이 그대로 잇는다
    let s = if config.mode == TcpMode::Relay {
        let up = upstream.ok_or_else(|| tr!("이어 줄 장비(B)의 주소와 포트를 넣어 주세요", "Enter the device (B) host and port").to_string())?;
        TcpSession::start_relay(config, up, framing, rx_check, sink)?
    } else {
        app.2.set_terminator(framing.terminator());
        TcpSession::start(config, framing, rx_check, Some(app.2.responder()), sink)?
    };
    let local = s.local_addr().map(|a| a.to_string());
    opening.finish(s);
    Ok(local)
}

/// 명령줄 인자(0.3.0) — 처음 한 번만 준다. 뜻 풀이·검사는 화면(src/launch.ts)이 하고, 주소·포트만 채운다(접속은 사용자가)
#[tauri::command]
fn launch_args() -> Vec<String> {
    portdock_core::launch::take_args()
}

/// 다른 PortDock 프로그램으로 열기(0.3.0, 502 알림줄의 «Modbus Master 로 열기») — 못 찾으면 false
#[tauri::command(async)]
fn open_app(target: portdock_core::launch::Target) -> Result<bool, String> {
    portdock_core::launch::open(&target)
}

/// 연결·기록 중 절전 막기(0.3.0) — 화면이 켤 때 true, 끊거나 창을 닫을 때 false. 같은 값이면 아무 일 없음
#[tauri::command]
fn keep_awake(on: bool) -> bool {
    portdock_core::power::keep_awake(on)
}

#[tauri::command(async)]
fn stop(app: State<App>) {
    if let Some(s) = app.0.take(MAIN) {
        s.stop();
    }
}

#[tauri::command(async)]
fn set_framing(app: State<App>, framing: FrameMode, rx_check: Option<ChecksumKind>) -> Result<(), String> {
    app.2.set_terminator(framing.terminator());
    app.0.with(MAIN, |s| s.set_framing(framing, rx_check))
}

#[tauri::command(async)]
fn set_echo(app: State<App>, on: bool) -> Result<(), String> {
    app.0.with(MAIN, |s| s.set_echo(on))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SendResult {
    /// 실제로 보낸 연결 수
    sent: usize,
    /// 보내려 한 연결 수(대상 하나면 1, 모두면 붙어 있던 수)
    total: usize,
}

/// 한 번 보내기 — 중계면 `upstream` 이 B 쪽(아니면 A 쪽)
fn send_once(s: &TcpSession, target: Option<u64>, upstream: bool, bytes: &[u8]) -> Result<(usize, usize), String> {
    if upstream && s.is_relay() { s.send_upstream(target, bytes) } else { s.send(target, bytes) }
}

/// target 이 없으면 붙어 있는 모두에게. 실패한 연결은 «SEND FAIL» 사건 줄을 남기고 닫힌다.
/// `pace` 에 문자 간 지연이 있으면 한 바이트씩 따로 보낸다(그동안 이 명령은 돌아오지 않는다 — 화면은 끝까지 기다림).
/// `side`: 중계에서 "b" 면 위쪽 장비(B)로 끼워 넣기, 아니면 A 쪽. `mbap_tid`: 보낼 바이트가 MBAP 이면
/// 트랜잭션 ID 를 1씩 늘려 넣는다(Modbus TCP 요청을 반복해도 응답과 짝이 맞게)
#[tauri::command(async)]
fn send(app: State<App>, target: Option<u64>, spec: SendText, pace: Option<Pace>, side: Option<String>, mbap_tid: Option<bool>) -> Result<SendResult, String> {
    let mut bytes = spec.build()?;
    if bytes.is_empty() {
        return Err(tr!("보낼 바이트가 없습니다", "Nothing to send").into());
    }
    if mbap_tid == Some(true) {
        let tid = app.3.fetch_add(1, Ordering::SeqCst);
        portdock_core::tcp::mbap_set_tid(&mut bytes, tid);
    }
    let up = side.as_deref() == Some("b");
    let Some(p) = pace.filter(|p| p.char_delay_ms > 0) else {
        let (sent, total) = app.0.with(MAIN, |s| send_once(s, target, up, &bytes))??;
        return Ok(SendResult { sent, total });
    };
    p.validate()?;
    let cancel = app.1.clone();
    let job = cancel.begin();
    let mut last = (0, 0);
    for (i, b) in bytes.iter().enumerate() {
        if i > 0 && nap(p.char_delay_ms, &cancel, job) {
            break;
        }
        last = app.0.with(MAIN, |s| send_once(s, target, up, std::slice::from_ref(b)))??;
        if last.0 == 0 {
            break;
        }
    }
    Ok(SendResult { sent: last.0, total: last.1 })
}

/// 천천히 보내기 취소 — 번호(begin 이 준 것) 이하를 모두 멈춘다
#[derive(Default)]
struct Cancel {
    next: AtomicU64,
    upto: AtomicU64,
}

impl Cancel {
    fn begin(&self) -> u64 {
        self.next.fetch_add(1, Ordering::SeqCst) + 1
    }
    fn cancelled(&self, id: u64) -> bool {
        self.upto.load(Ordering::SeqCst) >= id
    }
    fn cancel_all(&self) {
        let last = self.next.load(Ordering::SeqCst);
        self.upto.fetch_max(last, Ordering::SeqCst);
    }
}

/// 파일 보내기 진행 — Serial 의 SessionEvent::Progress 와 같은 모양
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct FileProgress {
    id: u64,
    sent: u64,
    total: u64,
    done: bool,
    cancelled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Serialize)]
struct FileJob {
    id: u64,
    total: u64,
}

/// 파일 보내기에 받는 최대 크기
const FILE_MAX: u64 = 32 * 1024 * 1024;

/// 파일 그대로(바이트) 보내기 — 화면은 열기 대화상자에서 고른 경로만 넘긴다(D7 와 같은 약속).
/// 조각(줄·덩어리)마다 TcpSession::send 로 보내고, 진행은 `on_progress` 로. 보내는 동안 상대가 끊기면 멈춘다
/// `side`: 중계에서 "b" 면 장비(B) 쪽으로
#[tauri::command(async)]
fn send_file(app: State<App>, target: Option<u64>, path: String, pace: Pace, side: Option<String>, on_progress: Channel<FileProgress>) -> Result<FileJob, String> {
    pace.validate()?;
    let meta = std::fs::metadata(&path).map_err(|e| format!("{path}: {e}"))?;
    if !meta.is_file() {
        return Err(tr!(format!("{path}: 파일이 아닙니다"), format!("{path}: not a file")));
    }
    if meta.len() == 0 {
        return Err(tr!(format!("{path}: 빈 파일입니다"), format!("{path}: the file is empty")));
    }
    if meta.len() > FILE_MAX {
        return Err(tr!(format!("{path}: 32MB 보다 큰 파일은 보낼 수 없습니다"), format!("{path}: files larger than 32 MB cannot be sent")));
    }
    let bytes = std::fs::read(&path).map_err(|e| format!("{path}: {e}"))?;
    // 세션이 있는지 먼저 본다
    app.0.with(MAIN, |_| ())?;
    let (reg, cancel) = (app.0.clone(), app.1.clone());
    let id = cancel.begin();
    let total = bytes.len() as u64;
    std::thread::spawn(move || {
        let report = |sent: u64, done: bool, cancelled: bool, error: Option<String>| {
            let _ = on_progress.send(FileProgress { id, sent, total, done, cancelled, error });
        };
        report(0, false, false, None);
        let up = side.as_deref() == Some("b");
        let (sent, cancelled, error) = send_pieces(&bytes, pace, &cancel, id, |part| match reg.with(MAIN, |s| send_once(s, target, up, part)) {
            Ok(Ok((n, _))) if n > 0 => Ok(()),
            Ok(Ok(_)) => Err(tr!("보낼 상대가 없습니다", "No peer to send to").to_string()),
            Ok(Err(e)) | Err(e) => Err(e),
        }, &|sent| report(sent, false, false, None));
        report(sent, true, cancelled, error);
    });
    Ok(FileJob { id, total })
}

/// 조각마다(문자 간 지연이면 한 바이트씩) `send` — 돌려주는 값: (보낸 바이트, 취소됐는지, 오류)
fn send_pieces(
    bytes: &[u8],
    pace: Pace,
    cancel: &Cancel,
    id: u64,
    mut send: impl FnMut(&[u8]) -> Result<(), String>,
    progress: &dyn Fn(u64),
) -> (u64, bool, Option<String>) {
    let mut sent = 0u64;
    let mut last_report = Instant::now();
    for (i, r) in pace.pieces(bytes).into_iter().enumerate() {
        if i > 0 && pace.line_delay_ms > 0 && nap(pace.line_delay_ms, cancel, id) {
            return (sent, true, None);
        }
        let piece = &bytes[r];
        let step = if pace.char_delay_ms > 0 { 1 } else { piece.len() };
        for (j, part) in piece.chunks(step).enumerate() {
            if cancel.cancelled(id) || (j > 0 && pace.char_delay_ms > 0 && nap(pace.char_delay_ms, cancel, id)) {
                return (sent, true, None);
            }
            if let Err(e) = send(part) {
                return (sent, false, Some(e));
            }
            sent += part.len() as u64;
            if last_report.elapsed() >= Duration::from_millis(100) {
                last_report = Instant::now();
                progress(sent);
            }
        }
    }
    (sent, false, None)
}

/// 파일 크기 — 파일 보내기 창이 크기·예상 시간을 보이려고(열기 대화상자에서 고른 경로만)
#[tauri::command(async)]
fn file_size(path: String) -> Result<u64, String> {
    std::fs::metadata(&path).map(|m| m.len()).map_err(|e| format!("{path}: {e}"))
}

/// 쉬는 동안 취소되면 true
fn nap(ms: u32, cancel: &Cancel, id: u64) -> bool {
    let until = Instant::now() + Duration::from_millis(ms as u64);
    while Instant::now() < until {
        if cancel.cancelled(id) {
            return true;
        }
        std::thread::sleep((until - Instant::now()).min(Duration::from_millis(10)));
    }
    false
}

/// 파일 보내기·문자 간 지연 송신을 모두 멈춘다
#[tauri::command]
fn cancel_send(app: State<App>) {
    app.1.cancel_all();
}

/// 파일 로그 형식·글자 인코딩·나누기 — 다음에 여는 로그 파일부터
#[tauri::command]
fn set_log_options(options: LogOptions) {
    portdock_core::event::set_log_options(options);
}

#[tauri::command(async)]
fn kick(app: State<App>, id: u64) -> Result<(), String> {
    app.0.with(MAIN, |s| s.kick(id))
}

#[tauri::command]
fn preview(spec: SendText) -> Result<Vec<u8>, String> {
    spec.build()
}

#[tauri::command(async)]
fn set_log(app: State<App>, path: Option<String>) -> Result<(), String> {
    app.0.with(MAIN, |s| s.set_log(path))?
}

// ---- 자동응답(Simulator 와 같은 규칙) — 세션은 늘 응답기를 꽂고, «켜기» 가 꺼져 있으면 지나간다

#[tauri::command]
fn set_rules(app: State<App>, rules: Vec<RuleSpec>) -> RulesResult {
    app.2.set_rules(&rules)
}

#[tauri::command]
fn set_auto_reply(app: State<App>, on: bool) {
    app.2.set_enabled(on);
}

#[tauri::command]
fn set_match_options(app: State<App>, strip_terminator: bool, log_no_match: bool) {
    app.2.set_match_options(strip_terminator, log_no_match);
}

#[tauri::command]
fn get_hits(app: State<App>) -> BTreeMap<String, u64> {
    app.2.hits()
}

#[tauri::command]
fn reset_hits(app: State<App>) {
    app.2.reset_hits();
}

#[tauri::command]
fn preview_rule(app: State<App>, rule: RuleSpec, sample: String) -> Result<RulePreview, String> {
    let opts = app.2.opts.lock().unwrap().clone();
    autoreply::preview(&rule, &sample, &opts)
}

/// 이 PC 의 랜카드 IPv4 목록(서버 주소 고르기)
#[tauri::command(async)]
fn interfaces() -> Vec<portdock_core::net::Interface> {
    portdock_core::net::interfaces()
}

/// Modbus TCP(MBAP) 풀이 — 상세 칸
#[tauri::command]
fn decode_mbap(bytes: Vec<u8>) -> Option<MbapInfo> {
    portdock_core::tcp::decode_mbap(&bytes)
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
    portdock_core::report::install("tcp", env!("CARGO_PKG_VERSION"));
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
            launch_args,
            open_app,
            keep_awake,
            report_pending,
            report_dismiss,
            report_env,
            report_read_dump, start, stop, set_framing, set_echo, send, send_file, file_size, cancel_send, set_log_options, kick, preview, set_log, write_text, read_text,
            set_rules, set_auto_reply, set_match_options, get_hits, reset_hits, preview_rule, interfaces, decode_mbap])
        .run(tauri::generate_context!());
    if let Err(e) = result {
        portdock_core::report::run_failed(&e.to_string());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 줄 단위 + 문자 간 지연: 줄마다·바이트마다 나눠 보내고, 취소하면 그 자리에서 멈춘다
    #[test]
    fn send_pieces_paces_and_cancels() {
        let cancel = Cancel::default();
        let id = cancel.begin();
        let mut got: Vec<Vec<u8>> = Vec::new();
        let r = send_pieces(b"AB\nC", Pace { char_delay_ms: 1, line_delay_ms: 1, by_line: true, chunk: 0 }, &cancel, id, |p| {
            got.push(p.to_vec());
            Ok(())
        }, &|_| {});
        assert_eq!(r, (4, false, None));
        assert_eq!(got, vec![b"A".to_vec(), b"B".to_vec(), b"\n".to_vec(), b"C".to_vec()]);
        let mut n = 0;
        let r = send_pieces(&[0; 64], Pace { chunk: 8, ..Pace::default() }, &cancel, id, |_| {
            n += 1;
            if n == 3 {
                cancel.cancel_all();
            }
            Ok(())
        }, &|_| {});
        assert_eq!(r, (24, true, None));
        let id2 = cancel.begin();
        let r = send_pieces(&[0; 4], Pace::default(), &cancel, id2, |_| Err("gone".into()), &|_| {});
        assert_eq!(r, (0, false, Some("gone".to_string())));
    }
}
