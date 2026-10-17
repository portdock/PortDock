//! PortDock Serial — 시리얼(COM) 테스터. 통신·해석 로직은 portdock-core.

use portdock_core::checksum::ChecksumKind;
use portdock_core::codec::{SendSpec, build};
use portdock_core::framer::FrameMode;
use portdock_core::serial::{EventSink, SerialConfig, Session, SessionEvent};
use portdock_core::{modbus, ports};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::ipc::Channel;
use tauri::State;

#[derive(Default)]
struct Sessions(Mutex<HashMap<String, Session>>);


#[tauri::command(async)]
fn list_ports() -> Vec<ports::PortInfo> {
    ports::list()
}

#[tauri::command(async)]
fn open_session(
    sessions: State<Sessions>,
    config: SerialConfig,
    framing: FrameMode,
    rx_check: Option<ChecksumKind>,
    on_event: Channel<SessionEvent>,
) -> Result<(), String> {
    let mut map = sessions.0.lock().unwrap();
    if map.contains_key(&config.port) {
        return Err(format!("{} 는 이미 열려 있습니다", config.port));
    }
    let id = config.port.clone();
    let sink = EventSink::new(move |e| {
        let _ = on_event.send(e);
    });
    let s = Session::start(config, framing, rx_check, sink)?;
    map.insert(id, s);
    Ok(())
}

#[tauri::command(async)]
fn close_session(sessions: State<Sessions>, id: String) {
    let s = sessions.0.lock().unwrap().remove(&id);
    if let Some(s) = s {
        s.stop();
    }
}

#[tauri::command]
fn set_framing(
    sessions: State<Sessions>,
    id: String,
    framing: FrameMode,
    rx_check: Option<ChecksumKind>,
) -> Result<(), String> {
    let map = sessions.0.lock().unwrap();
    map.get(&id).ok_or("세션이 없습니다")?.set_framing(framing, rx_check);
    Ok(())
}

/// 연결 중 설정 변경(속도·패리티·DTR/RTS 등). 포트 이름은 바꾸지 않는다.
#[tauri::command(async)]
fn reconfigure(sessions: State<Sessions>, id: String, config: SerialConfig) -> Result<(), String> {
    let map = sessions.0.lock().unwrap();
    map.get(&id).ok_or("세션이 없습니다")?.reconfigure(config)
}

#[tauri::command(async)]
fn set_log(sessions: State<Sessions>, id: String, path: Option<String>) -> Result<(), String> {
    let map = sessions.0.lock().unwrap();
    map.get(&id).ok_or("세션이 없습니다")?.set_log(path)
}

#[tauri::command(async)]
fn send(sessions: State<Sessions>, id: String, spec: SendSpec) -> Result<Vec<u8>, String> {
    let bytes = build(&spec)?;
    let map = sessions.0.lock().unwrap();
    map.get(&id).ok_or("세션이 없습니다")?.send(bytes.clone())?;
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Sessions::default())
        .invoke_handler(tauri::generate_handler![
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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
