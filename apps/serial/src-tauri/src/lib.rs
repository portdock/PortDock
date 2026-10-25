//! PortDock Serial — 시리얼(COM) 테스터. 통신·해석 로직은 portdock-core.

use portdock_core::tr;
use portdock_core::checksum::ChecksumKind;
use portdock_core::codec::{Pace, SendText};
use portdock_core::event::LogOptions;
use portdock_core::framer::FrameMode;
use portdock_core::registry::{Registry, auto_remove_sink};
use portdock_core::serial::{SerialConfig, Session, SessionEvent};
use portdock_core::autoreply::{self, AutoReply, RulePreview, RuleSpec, RulesResult};
use portdock_core::{modbus, ports};
use std::collections::BTreeMap;
use std::sync::Arc;
use tauri::State;
use tauri::ipc::Channel;

/// 열린 포트들(포트 이름 → 세션). 스스로 닫힌 세션은 알아서 빠진다.
/// .1 = 자동응답(화면의 «켜기» 로, 처음엔 꺼짐) — 여는 세션마다 응답기를 꽂는다
struct Sessions(Arc<Registry<Session>>, AutoReply);

impl Default for Sessions {
    fn default() -> Self {
        Self(Arc::default(), AutoReply::new(false))
    }
}

#[tauri::command(async)]
fn list_ports() -> Vec<ports::PortInfo> {
    ports::list()
}

/// «연결 점검…» — 포트 하나의 장치·드라이버·설정·절전 읽기(Port Inspector 와 같은 코어, 읽기만)
#[tauri::command(async)]
fn pi_report(id: String) -> Result<portdock_core::portinfo::PortReport, String> {
    portdock_core::portinfo::report(&id)
}

/// «연결 점검…» 연결 시험(루프백·에코) — 하나만 돈다. 포트를 따로 열므로 연결 중인 포트는 화면이 막는다
#[tauri::command(async)]
fn loop_start(test: State<LoopTest>, config: portdock_core::loopback::LoopConfig, on_event: Channel<portdock_core::loopback::LoopEvent>) -> Result<(), String> {
    use std::sync::atomic::{AtomicBool, Ordering};
    let cancel = {
        let mut g = test.0.lock().unwrap_or_else(|e| e.into_inner());
        if g.as_ref().is_some_and(|c| !c.load(Ordering::SeqCst)) {
            return Err(tr!("이미 시험 중입니다", "A test is already running").into());
        }
        let c = Arc::new(AtomicBool::new(false));
        *g = Some(c.clone());
        c
    };
    std::thread::spawn(move || {
        portdock_core::loopback::run(&config, &cancel, &mut |e| {
            let _ = on_event.send(e);
        });
        cancel.store(true, Ordering::SeqCst);
    });
    Ok(())
}

#[tauri::command]
fn loop_cancel(test: State<LoopTest>) {
    if let Some(c) = test.0.lock().unwrap_or_else(|e| e.into_inner()).as_ref() {
        c.store(true, std::sync::atomic::Ordering::SeqCst);
    }
}

/// 돌고 있는 연결 시험의 취소 표시
#[derive(Default)]
struct LoopTest(std::sync::Mutex<Option<Arc<std::sync::atomic::AtomicBool>>>);

/// 여는 동안(블루투스 COM 은 수 초) 다른 명령을 막지 않는다
#[tauri::command(async)]
fn open_session(
    sessions: State<Sessions>,
    config: SerialConfig,
    framing: FrameMode,
    rx_check: Option<ChecksumKind>,
    on_event: Channel<SessionEvent>,
) -> Result<(), String> {
    let reg = sessions.0.clone();
    let opening = reg.begin(&config.port)?;
    let sink = auto_remove_sink(reg.clone(), config.port.clone(), opening.generation, move |e| {
        let _ = on_event.send(e);
    });
    sessions.1.set_terminator(framing.terminator());
    let s = Session::start(config, framing, rx_check, Some(sessions.1.responder()), sink)?;
    opening.finish(s);
    Ok(())
}

#[tauri::command(async)]
fn close_session(sessions: State<Sessions>, id: String) {
    if let Some(s) = sessions.0.take(&id) {
        s.stop();
    }
}

#[tauri::command(async)]
fn set_framing(sessions: State<Sessions>, id: String, framing: FrameMode, rx_check: Option<ChecksumKind>) -> Result<(), String> {
    sessions.1.set_terminator(framing.terminator());
    sessions.0.with(&id, |s| s.set_framing(framing, rx_check))
}

// ---- 자동응답(Simulator 와 같은 규칙) — 세션은 늘 응답기를 꽂고, «켜기» 가 꺼져 있으면 지나간다

#[tauri::command]
fn set_rules(sessions: State<Sessions>, rules: Vec<RuleSpec>) -> RulesResult {
    sessions.1.set_rules(&rules)
}

#[tauri::command]
fn set_auto_reply(sessions: State<Sessions>, on: bool) {
    sessions.1.set_enabled(on);
}

#[tauri::command]
fn set_match_options(sessions: State<Sessions>, strip_terminator: bool, log_no_match: bool) {
    sessions.1.set_match_options(strip_terminator, log_no_match);
}

#[tauri::command]
fn get_hits(sessions: State<Sessions>) -> BTreeMap<String, u64> {
    sessions.1.hits()
}

#[tauri::command]
fn reset_hits(sessions: State<Sessions>) {
    sessions.1.reset_hits();
}

#[tauri::command]
fn preview_rule(sessions: State<Sessions>, rule: RuleSpec, sample: String) -> Result<RulePreview, String> {
    let opts = sessions.1.opts.lock().unwrap().clone();
    autoreply::preview(&rule, &sample, &opts)
}

/// 연결 중 설정 변경(속도·패리티·DTR/RTS 등). 포트 이름은 바꾸지 않는다.
#[tauri::command(async)]
fn reconfigure(sessions: State<Sessions>, id: String, config: SerialConfig) -> Result<(), String> {
    sessions.0.with(&id, |s| s.reconfigure(config))?
}

#[tauri::command(async)]
fn set_log(sessions: State<Sessions>, id: String, path: Option<String>) -> Result<(), String> {
    sessions.0.with(&id, |s| s.set_log(path))?
}

/// `pace` 에 문자 간 지연이 있으면 천천히 보내기(취소·진행 사건)로, 아니면 보통 송신
#[tauri::command(async)]
fn send(sessions: State<Sessions>, id: String, spec: SendText, pace: Option<Pace>) -> Result<Vec<u8>, String> {
    let bytes = spec.build()?;
    if bytes.is_empty() {
        return Err(tr!("보낼 바이트가 없습니다", "Nothing to send").into());
    }
    match pace.filter(|p| p.char_delay_ms > 0) {
        Some(p) => {
            p.validate()?;
            sessions.0.with(&id, |s| s.send_paced(bytes.clone(), Pace { by_line: false, chunk: 0, ..p }))??;
        }
        None => sessions.0.with(&id, |s| s.send(bytes.clone()))??,
    }
    Ok(bytes)
}

/// 입력하는 동안 «실제로 나갈 바이트» 를 미리 보여 주기 위해
#[tauri::command]
fn preview(spec: SendText) -> Result<Vec<u8>, String> {
    spec.build()
}

/// 파일 보내기에 받는 최대 크기 — 천천히 보내면 몇 시간이 걸릴 수 있어 넉넉하되 끝이 있게
const FILE_MAX: u64 = 32 * 1024 * 1024;

#[derive(serde::Serialize)]
struct FileJob {
    id: u64,
    total: u64,
}

/// 파일 그대로(바이트) 보내기 — 화면은 열기 대화상자에서 고른 경로만 넘긴다(D7 와 같은 약속)
#[tauri::command(async)]
fn send_file(sessions: State<Sessions>, id: String, path: String, pace: Pace) -> Result<FileJob, String> {
    pace.validate()?;
    let bytes = read_file_for_send(&path)?;
    let total = bytes.len() as u64;
    let job = sessions.0.with(&id, |s| s.send_paced(bytes, pace))??;
    Ok(FileJob { id: job, total })
}

fn read_file_for_send(path: &str) -> Result<Vec<u8>, String> {
    let meta = std::fs::metadata(path).map_err(|e| format!("{path}: {e}"))?;
    if !meta.is_file() {
        return Err(tr!(format!("{path}: 파일이 아닙니다"), format!("{path}: not a file")));
    }
    if meta.len() == 0 {
        return Err(tr!(format!("{path}: 빈 파일입니다"), format!("{path}: the file is empty")));
    }
    if meta.len() > FILE_MAX {
        return Err(tr!(format!("{path}: 32MB 보다 큰 파일은 보낼 수 없습니다"), format!("{path}: files larger than 32 MB cannot be sent")));
    }
    std::fs::read(path).map_err(|e| format!("{path}: {e}"))
}

/// 파일 크기 — 파일 보내기 창이 크기·예상 시간을 보이려고(열기 대화상자에서 고른 경로만)
#[tauri::command(async)]
fn file_size(path: String) -> Result<u64, String> {
    std::fs::metadata(&path).map(|m| m.len()).map_err(|e| format!("{path}: {e}"))
}

/// 천천히 보내기(파일·문자 간 지연)를 모두 멈춘다
#[tauri::command(async)]
fn cancel_send(sessions: State<Sessions>, id: String) -> Result<(), String> {
    sessions.0.with(&id, |s| s.cancel_send())
}

/// Break 신호(ms)
#[tauri::command(async)]
fn send_break(sessions: State<Sessions>, id: String, ms: u32) -> Result<(), String> {
    sessions.0.with(&id, |s| s.send_break(ms))?
}

/// 파일 로그 형식·글자 인코딩·나누기 — 다음에 여는 로그 파일부터
#[tauri::command]
fn set_log_options(options: LogOptions) {
    portdock_core::event::set_log_options(options);
}

#[tauri::command]
fn decode_modbus(bytes: Vec<u8>) -> Option<modbus::ModbusInfo> {
    modbus::decode(&bytes)
}

#[tauri::command]
fn verify_checksum(kind: ChecksumKind, bytes: Vec<u8>) -> Option<bool> {
    kind.verify(&bytes)
}

/// 화면 내용 저장 — 사용자가 저장 대화상자에서 고른 경로만 받는다
#[tauri::command(async)]
fn write_text(path: String, text: String) -> Result<(), String> {
    std::fs::write(&path, text).map_err(|e| format!("{path}: {e}"))
}

/// 설정 가져오기 — 사용자가 열기 대화상자에서 고른 경로만
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
    portdock_core::report::install("serial", env!("CARGO_PKG_VERSION"));
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
        .manage(Sessions::default())
        .manage(LoopTest::default())
        .invoke_handler(tauri::generate_handler![
            pi_report,
            loop_start,
            loop_cancel,
            set_lang,
            report_pending,
            report_dismiss,
            report_env,
            report_read_dump,
            list_ports,
            open_session,
            close_session,
            set_framing,
            reconfigure,
            set_log,
            send,
            send_file,
            file_size,
            cancel_send,
            send_break,
            set_log_options,
            preview,
            decode_modbus,
            verify_checksum,
            write_text, read_text,
            set_rules, set_auto_reply, set_match_options, get_hits, reset_hits, preview_rule
        ])
        .run(tauri::generate_context!());
    if let Err(e) = result {
        portdock_core::report::run_failed(&e.to_string());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use portdock_core::codec::{SendSpec, TextMode, build};

    #[test]
    fn build_appends_checksum_then_suffix() {
        let spec = SendSpec {
            text: "01 03 00 00 00 0A".into(),
            mode: TextMode::Hex,
            checksum: Some(ChecksumKind::Crc16Modbus),
            suffix: String::new(),
        };
        assert_eq!(build(&spec).unwrap(), vec![0x01, 0x03, 0x00, 0x00, 0x00, 0x0A, 0xC5, 0xCD]);
        let spec = SendSpec { text: "AT".into(), mode: TextMode::Ascii, checksum: None, suffix: "\\r\\n".into() };
        assert_eq!(build(&spec).unwrap(), b"AT\r\n".to_vec());
    }
}
