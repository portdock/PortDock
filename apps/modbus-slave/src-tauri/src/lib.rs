//! PortDock Modbus Slave — PC 가 Modbus RTU 장비인 척 답한다.
//! 레지스터 표는 연결과 따로 살아 있어서, 연결 전에 값을 넣어 둘 수 있다.

use portdock_core::tr;
use portdock_core::checksum::ChecksumKind;
use portdock_core::framer::FrameMode;
use portdock_core::modbus_slave::{Faults, Slave, TABLE_SIZE, Table};
use portdock_core::ports;
use portdock_core::registry::{Registry, auto_remove_sink};
use portdock_core::serial::{Reply, Responder, SerialConfig, Session, SessionEvent};
use serde::Serialize;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::State;
use tauri::ipc::Channel;

#[derive(Default, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
struct Stats {
    requests: u64,
    ok: u64,
    exceptions: u64,
    ignored: u64,
    /// 마스터가 표를 바꿀 때마다 오른다 — 화면이 다시 읽을 때를 안다
    writes: u64,
}

#[derive(Default)]
struct App {
    slave: Arc<Mutex<Slave>>,
    stats: Arc<Mutex<Stats>>,
    /// 연결은 하나 — 보관함 이름 "main". 스스로 닫히면 알아서 빠진다
    sess: Arc<Registry<Session>>,
}

const MAIN: &str = "main";

fn func_name(f: u8) -> String {
    format!("{:02X}", f & 0x7F)
}

#[tauri::command(async)]
fn list_ports() -> Vec<ports::PortInfo> {
    ports::list()
}

fn responder(slave: Arc<Mutex<Slave>>, stats: Arc<Mutex<Stats>>) -> Responder {
    // 지연 응답을 보내기 전에 다음 요청이 오면, 한 번에 하나만 처리하는 실제 장비처럼 무시한다
    let mut busy_until: Option<Instant> = None;
    Box::new(move |frame: &[u8]| {
        let mut sl = slave.lock().unwrap();
        let delay_ms = sl.faults.delay_ms;
        if busy_until.is_some_and(|t| Instant::now() < t) {
            stats.lock().unwrap().ignored += 1;
            return Reply { bytes: None, delay_ms: 0, note: Some(tr!("BUSY — 지연 응답을 보내기 전에 온 요청은 무시", "BUSY — request ignored while a delayed reply is pending").into()) };
        }
        let (bytes, o) = sl.handle(frame);
        if bytes.is_some() && delay_ms > 0 {
            busy_until = Some(Instant::now() + Duration::from_millis(delay_ms));
        }
        let mut st = stats.lock().unwrap();
        st.requests += 1;
        if o.written.is_some() {
            st.writes += 1;
        }
        let note = match o.result {
            "ok" => {
                st.ok += 1;
                None
            }
            "exception" => {
                st.exceptions += 1;
                Some(format!("EXCEPTION {:02X} → id {} fc {}", o.exception.unwrap_or(0), o.slave, func_name(o.function)))
            }
            "broadcast" => Some(format!("BROADCAST fc {} (no reply)", func_name(o.function))),
            "no-response" => Some(format!("NO-RESPONSE (fault) id {} fc {}", o.slave, func_name(o.function))),
            "ignored-crc" => {
                st.ignored += 1;
                Some("IGNORED bad CRC".into())
            }
            _ => {
                st.ignored += 1;
                Some(format!("IGNORED id {} (not simulated)", o.slave))
            }
        };
        Reply { bytes, delay_ms, note }
    })
}

/// 여는 동안 다른 명령을 막지 않고, 응답기는 첫 바이트 전에 꽂는다
#[tauri::command(async)]
fn open(app: State<App>, config: SerialConfig, on_event: Channel<SessionEvent>) -> Result<(), String> {
    let reg = app.sess.clone();
    let opening = reg.begin(MAIN).map_err(|_| tr!("이미 연결돼 있거나 여는 중입니다", "Already connected or connecting").to_string())?;
    let baud = config.baud;
    let sink = auto_remove_sink(reg.clone(), MAIN.into(), opening.generation, move |e| {
        let _ = on_event.send(e);
    });
    let r = responder(app.slave.clone(), app.stats.clone());
    let s = Session::start(config, FrameMode::ModbusRtu { baud }, Some(ChecksumKind::Crc16Modbus), Some(r), sink)?;
    opening.finish(s);
    Ok(())
}

#[tauri::command(async)]
fn close(app: State<App>) {
    if let Some(s) = app.sess.take(MAIN) {
        s.stop();
    }
}

#[tauri::command(async)]
fn reconfigure(app: State<App>, config: SerialConfig) -> Result<(), String> {
    let baud = config.baud;
    app.sess.with(MAIN, |s| {
        s.reconfigure(config)?;
        s.set_framing(FrameMode::ModbusRtu { baud }, Some(ChecksumKind::Crc16Modbus));
        Ok(())
    })?
}

#[tauri::command(async)]
fn set_log(app: State<App>, path: Option<String>) -> Result<(), String> {
    app.sess.with(MAIN, |s| s.set_log(path))?
}

#[tauri::command]
fn set_faults(app: State<App>, faults: Faults) {
    app.slave.lock().unwrap().faults = faults;
}

/// 흉내 낼 슬레이브 주소 목록. 빠진 주소의 표는 지우고, 새 주소는 빈 표로 만든다.
#[tauri::command]
fn set_slave_ids(app: State<App>, ids: Vec<u8>) -> Result<(), String> {
    if ids.is_empty() {
        return Err(tr!("슬레이브 주소가 하나는 있어야 합니다", "At least one slave ID is required").into());
    }
    if ids.iter().any(|&i| i == 0 || i > 247) {
        return Err(tr!("슬레이브 주소는 1~247 입니다", "Slave IDs must be 1–247").into());
    }
    let mut sl = app.slave.lock().unwrap();
    sl.models.retain(|k, _| ids.contains(k));
    for id in ids {
        sl.models.entry(id).or_default();
    }
    Ok(())
}

fn check_span(start: u32, count: u32) -> Result<(), String> {
    if count == 0 || start as usize + count as usize > TABLE_SIZE {
        return Err(tr!(format!("주소 범위가 0~{} 를 벗어납니다", TABLE_SIZE - 1), format!("Address range is outside 0–{}", TABLE_SIZE - 1)));
    }
    Ok(())
}

/// 응답할 주소 범위. 밖이면 마스터에게 예외 02(Illegal Data Address).
#[tauri::command]
fn set_range(app: State<App>, id: u8, table: Table, start: u16, count: u32) -> Result<(), String> {
    check_span(start as u32, count)?;
    let mut sl = app.slave.lock().unwrap();
    sl.models.get_mut(&id).ok_or(tr!("없는 슬레이브", "Unknown slave ID"))?.ranges.insert(table, (start, count));
    Ok(())
}

#[tauri::command]
fn get_values(app: State<App>, id: u8, table: Table, start: u32, count: u32) -> Result<Vec<u16>, String> {
    check_span(start, count)?;
    let sl = app.slave.lock().unwrap();
    let m = sl.models.get(&id).ok_or(tr!("없는 슬레이브", "Unknown slave ID"))?;
    Ok(m.table(table)[start as usize..(start + count) as usize].to_vec())
}

#[tauri::command]
fn set_values(app: State<App>, id: u8, table: Table, start: u32, values: Vec<u16>) -> Result<(), String> {
    if values.is_empty() {
        return Ok(());
    }
    check_span(start, values.len() as u32)?;
    let bits = matches!(table, Table::Coils | Table::DiscreteInputs);
    let mut sl = app.slave.lock().unwrap();
    let t = sl.models.get_mut(&id).ok_or(tr!("없는 슬레이브", "Unknown slave ID"))?.table_mut(table);
    for (i, v) in values.into_iter().enumerate() {
        t[start as usize + i] = if bits { (v != 0) as u16 } else { v };
    }
    Ok(())
}

#[tauri::command]
fn get_stats(app: State<App>) -> Stats {
    *app.stats.lock().unwrap()
}

#[tauri::command]
fn reset_stats(app: State<App>) {
    *app.stats.lock().unwrap() = Stats::default();
}

/// 화면 내용·표 내보내기 — 사용자가 저장 대화상자에서 고른 경로만
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(App::default())
        .invoke_handler(tauri::generate_handler![
            set_lang,
            list_ports,
            open,
            close,
            reconfigure,
            set_log,
            set_faults,
            set_slave_ids,
            set_range,
            get_values,
            set_values,
            get_stats,
            reset_stats,
            write_text,
            read_text
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
