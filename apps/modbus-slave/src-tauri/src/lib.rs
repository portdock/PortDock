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

/// USB 어댑터 지연(보통 16ms)으로 요청이 쪼개져 와도 이어 붙도록 USB 포트는 무응답 시간을 넉넉히
const USB_MIN_GAP_MS: u64 = 20;

/// 요청 길이를 아는 함수 코드는 다 모이는 즉시, 모르면 무응답 시간(3.5 문자, USB 는 20ms 이상)으로 끊는다
fn framing(port: &str, baud: u32) -> FrameMode {
    let usb = ports::list().iter().any(|p| p.name.eq_ignore_ascii_case(port) && p.kind == "usb");
    FrameMode::ModbusRtuRequest { baud, min_gap_ms: if usb { USB_MIN_GAP_MS } else { 0 } }
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
    let mode = framing(&config.port, baud);
    let s = Session::start(config, mode, Some(ChecksumKind::Crc16Modbus), Some(r), sink)?;
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
    let mode = framing(&config.port, config.baud);
    app.sess.with(MAIN, |s| {
        s.reconfigure(config)?;
        s.set_framing(mode, Some(ChecksumKind::Crc16Modbus));
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
    portdock_core::report::install("modbus-slave", env!("CARGO_PKG_VERSION"));
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
            report_read_dump,
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
        .run(tauri::generate_context!());
    if let Err(e) = result {
        portdock_core::report::run_failed(&e.to_string());
    }
}
