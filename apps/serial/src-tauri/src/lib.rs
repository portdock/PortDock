//! PortDock Serial — 시리얼(COM) 테스터. 통신·해석 로직은 portdock-core.

use portdock_core::tr;
use portdock_core::checksum::ChecksumKind;
use portdock_core::codec::{SendSpec, build};
use portdock_core::framer::FrameMode;
use portdock_core::registry::{Registry, auto_remove_sink};
use portdock_core::serial::{SerialConfig, Session, SessionEvent};
use portdock_core::{modbus, ports};
use std::sync::Arc;
use tauri::State;
use tauri::ipc::Channel;

/// 열린 포트들(포트 이름 → 세션). 스스로 닫힌 세션은 알아서 빠진다
#[derive(Default)]
struct Sessions(Arc<Registry<Session>>);

#[tauri::command(async)]
fn list_ports() -> Vec<ports::PortInfo> {
    ports::list()
}

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
    let s = Session::start(config, framing, rx_check, None, sink)?;
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
    sessions.0.with(&id, |s| s.set_framing(framing, rx_check))
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

#[tauri::command(async)]
fn send(sessions: State<Sessions>, id: String, spec: SendSpec) -> Result<Vec<u8>, String> {
    let bytes = build(&spec)?;
    if bytes.is_empty() {
        return Err(tr!("보낼 바이트가 없습니다", "Nothing to send").into());
    }
    sessions.0.with(&id, |s| s.send(bytes.clone()))??;
    Ok(bytes)
}

/// 입력하는 동안 «실제로 나갈 바이트» 를 미리 보여 주기 위해
#[tauri::command]
fn preview(spec: SendSpec) -> Result<Vec<u8>, String> {
    build(&spec)
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
#[tauri::command]
fn write_text(path: String, text: String) -> Result<(), String> {
    std::fs::write(&path, text).map_err(|e| format!("{path}: {e}"))
}

/// 설정 가져오기 — 사용자가 열기 대화상자에서 고른 경로만
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // WebView2 가 없으면 화면이 뜨지 않는다 — 문제 보고 대신 설치 안내를 띄우고 끝낸다
    if let Err(e) = tauri::webview_version() {
        portdock_core::report::webview_missing(&e.to_string());
    }
    portdock_core::report::install("serial", env!("CARGO_PKG_VERSION"));
    portdock_core::report::test_crash_if_asked();
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Sessions::default())
        .invoke_handler(tauri::generate_handler![
            set_lang,
            report_pending,
            report_dismiss,
            report_env,
            list_ports,
            open_session,
            close_session,
            set_framing,
            reconfigure,
            set_log,
            send,
            preview,
            decode_modbus,
            verify_checksum,
            write_text, read_text
        ])
        .run(tauri::generate_context!());
    if let Err(e) = result {
        portdock_core::report::run_failed(&e.to_string());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use portdock_core::codec::TextMode;

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
