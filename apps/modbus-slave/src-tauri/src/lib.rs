//! PortDock Modbus Slave — PC 가 Modbus 장비인 척 답한다. 시리얼(RTU), TCP 서버(Modbus TCP·RTU over TCP).
//! 레지스터 표는 연결과 따로 살아 있어서, 연결 전에 값을 넣어 둘 수 있다.

use portdock_core::checksum::ChecksumKind;
use portdock_core::event::SessionEvent;
use portdock_core::framer::FrameMode;
use portdock_core::modbus::{AddrStyle, Summarizer, Wire};
use portdock_core::modbus_slave::{DeviceId, Faults, Outcome, Slave, SlaveOptions, TABLE_SIZE, Table};
use portdock_core::ports;
use portdock_core::regmap::SimSpec;
use portdock_core::registry::{Registry, auto_remove_sink};
use portdock_core::serial::{Reply, Responder, SerialConfig, Session};
use portdock_core::tcp::{TcpConfig, TcpMode, TcpSession};
use portdock_core::tr;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::State;
use tauri::ipc::Channel;

/// 통계 — 화면이 0.3초마다 읽는다
#[derive(Default, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Stats {
    /// 흉내 내는 국번으로 온 요청(브로드캐스트 포함)
    requests: u64,
    ok: u64,
    exceptions: u64,
    /// 목록에 없는 국번(유닛 ID)
    other_id: u64,
    /// CRC(RTU)·MBAP 머리(TCP)가 틀린 프레임
    bad_frames: u64,
    /// 지연 응답을 보내기 전에 와서 무시한 요청(시리얼)
    busy: u64,
    no_response: u64,
    broadcasts: u64,
    /// 마스터가 표를 바꿀 때마다 오른다 — 화면이 다시 읽을 때를 안다
    writes: u64,
    /// 함수 코드별 요청 수(«03» → 12)
    per_fc: BTreeMap<String, u64>,
    /// 예전 화면 호환 — 답하지 않은 것(다른 국번 + 틀린 프레임 + BUSY)
    ignored: u64,
}

/// 열린 연결 — 시리얼 또는 TCP 서버
enum Link {
    Serial(Session),
    Tcp(TcpSession),
}

impl Link {
    fn stop(self) {
        match self {
            Self::Serial(s) => s.stop(),
            Self::Tcp(s) => s.stop(),
        }
    }

    fn set_log(&self, path: Option<String>) -> Result<(), String> {
        match self {
            Self::Serial(s) => s.set_log(path),
            Self::Tcp(s) => s.set_log(path),
        }
    }
}

#[derive(Default)]
struct App {
    slave: Arc<Mutex<Slave>>,
    stats: Arc<Mutex<Stats>>,
    /// 연결은 하나 — 보관함 이름 "main". 스스로 닫히면 알아서 빠진다
    sess: Arc<Registry<Link>>,
    /// 통신 기록 요약(«id1 FC03 HR 0..9 (10)») — 주소 표기는 화면 설정을 따른다
    summ: Arc<Mutex<Summarizer>>,
}

const MAIN: &str = "main";

fn fc_name(f: u8) -> String {
    format!("{:02X}", f & 0x7F)
}

#[tauri::command(async)]
fn list_ports() -> Vec<ports::PortInfo> {
    ports::list()
}

/// 요청 하나의 결과를 통계에 넣고, 사건 줄 문구를 돌려준다
fn record(st: &mut Stats, o: &Outcome, wire: Wire) -> Option<String> {
    if o.written.is_some() {
        st.writes += 1;
    }
    let counted = !matches!(o.result, "ignored-crc" | "ignored-mbap" | "ignored-id");
    if counted {
        st.requests += 1;
        *st.per_fc.entry(fc_name(o.function)).or_default() += 1;
    }
    match o.result {
        "ok" => {
            st.ok += 1;
            None
        }
        "exception" => {
            st.exceptions += 1;
            Some(format!("EXCEPTION {:02X} → id {} fc {}", o.exception.unwrap_or(0), o.slave, fc_name(o.function)))
        }
        "broadcast" => {
            st.broadcasts += 1;
            Some(format!("BROADCAST fc {} (no reply)", fc_name(o.function)))
        }
        "no-response" => {
            st.no_response += 1;
            Some(format!("NO-RESPONSE (fault) id {} fc {}", o.slave, fc_name(o.function)))
        }
        "ignored-crc" => {
            st.bad_frames += 1;
            st.ignored += 1;
            Some("IGNORED bad CRC".into())
        }
        "ignored-mbap" => {
            st.bad_frames += 1;
            st.ignored += 1;
            Some(tr!("IGNORED MBAP 머리가 틀림(프로토콜 ID·길이)", "IGNORED bad MBAP header (protocol ID/length)").into())
        }
        _ => {
            st.other_id += 1;
            st.ignored += 1;
            Some(match wire {
                Wire::Tcp => format!("IGNORED unit {} (not simulated)", o.slave),
                Wire::Rtu => format!("IGNORED id {} (not simulated)", o.slave),
            })
        }
    }
}

/// 응답기. `serial` 이면 지연 응답을 보내기 전에 온 요청을 한 번에 하나만 처리하는 실제 장비처럼 무시한다(BUSY).
/// TCP 는 연결마다 따로 기다리므로 막지 않는다.
fn responder(slave: Arc<Mutex<Slave>>, stats: Arc<Mutex<Stats>>, wire: Wire, serial: bool) -> Responder {
    let mut busy_until: Option<Instant> = None;
    Box::new(move |frame: &[u8]| {
        if serial && busy_until.is_some_and(|t| Instant::now() < t) {
            let mut st = stats.lock().unwrap();
            st.busy += 1;
            st.ignored += 1;
            return Reply { bytes: None, delay_ms: 0, note: Some(tr!("BUSY — 지연 응답을 보내기 전에 온 요청은 무시", "BUSY — request ignored while a delayed reply is pending").into()) };
        }
        let (bytes, o, jitter) = {
            let mut sl = slave.lock().unwrap();
            let (b, o) = if wire == Wire::Tcp { sl.handle_tcp(frame) } else { sl.handle(frame) };
            (b, o, sl.faults.delay_max_ms > sl.faults.delay_ms)
        };
        if bytes.is_some() && o.delay_ms > 0 {
            busy_until = Some(Instant::now() + Duration::from_millis(o.delay_ms));
        }
        let mut note = record(&mut stats.lock().unwrap(), &o, wire);
        // 지연 범위(흔들림)면 이번에 고른 값을 남긴다
        if jitter && o.delay_ms > 0 && bytes.is_some() {
            let d = format!("DELAY {} ms (fault)", o.delay_ms);
            note = Some(note.map_or(d.clone(), |n| format!("{n} · {d}")));
        }
        Reply { bytes, delay_ms: o.delay_ms, note }
    })
}

/// 화면으로 보내는 통로 — 데이터 줄마다 Modbus 한 줄 요약(«sum»)을 붙인다
fn forward(summ: Arc<Mutex<Summarizer>>, ch: Channel<Value>) -> impl Fn(SessionEvent) + Send + Sync + 'static {
    move |e: SessionEvent| {
        let mut v = serde_json::to_value(&e).unwrap_or(Value::Null);
        if let SessionEvent::Frames { frames } = &e
            && let Some(arr) = v.get_mut("frames").and_then(|f| f.as_array_mut())
        {
            let mut sm = summ.lock().unwrap();
            for (f, j) in frames.iter().zip(arr.iter_mut()) {
                if let Some(s) = sm.line(f.dir, &f.bytes, f.peer.as_deref()) {
                    j["sum"] = Value::String(s);
                }
            }
        }
        let _ = ch.send(v);
    }
}

/// USB 어댑터 지연(보통 16ms)으로 요청이 쪼개져 와도 이어 붙도록 USB 포트는 무응답 시간을 넉넉히
const USB_MIN_GAP_MS: u64 = 20;

/// 요청 길이를 아는 함수 코드는 다 모이는 즉시, 모르면 무응답 시간(3.5 문자, USB 는 20ms 이상)으로 끊는다
fn framing(port: &str, baud: u32) -> FrameMode {
    let usb = ports::list().iter().any(|p| p.name.eq_ignore_ascii_case(port) && p.kind == "usb");
    FrameMode::ModbusRtuRequest { baud, min_gap_ms: if usb { USB_MIN_GAP_MS } else { 0 } }
}

fn reset_summary(app: &App, wire: Wire) {
    let mut s = app.summ.lock().unwrap();
    let style = s.style;
    *s = Summarizer::new(wire, style);
}

/// 시리얼(RTU)로 연다. 여는 동안 다른 명령을 막지 않고, 응답기는 첫 바이트 전에 꽂는다
#[tauri::command(async)]
fn open(app: State<App>, config: SerialConfig, on_event: Channel<Value>) -> Result<(), String> {
    let reg = app.sess.clone();
    let opening = reg.begin(MAIN).map_err(|_| tr!("이미 연결돼 있거나 여는 중입니다", "Already connected or connecting").to_string())?;
    reset_summary(&app, Wire::Rtu);
    // 유닛 ID 무시는 TCP 에서만
    app.slave.lock().unwrap().options.ignore_unit_id = false;
    let sink = auto_remove_sink(reg.clone(), MAIN.into(), opening.generation, forward(app.summ.clone(), on_event));
    let r = responder(app.slave.clone(), app.stats.clone(), Wire::Rtu, true);
    let mode = framing(&config.port, config.baud);
    let s = Session::start(config, mode, Some(ChecksumKind::Crc16Modbus), Some(r), sink)?;
    opening.finish(Link::Serial(s));
    Ok(())
}

/// TCP 서버 설정
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TcpSlaveConfig {
    /// 묶을 주소(0.0.0.0 = 모든 랜카드)
    host: String,
    port: u16,
    /// "tcp"(Modbus TCP, MBAP) | "rtu"(RTU over TCP — RTU 프레임 그대로, CRC 포함)
    wire: Wire,
    #[serde(default)]
    ignore_unit_id: bool,
}

/// TCP 서버로 연다. 실제로 묶인 주소를 돌려준다(포트 0 이면 운영체제가 고른 포트)
#[tauri::command(async)]
fn open_tcp(app: State<App>, config: TcpSlaveConfig, on_event: Channel<Value>) -> Result<String, String> {
    let reg = app.sess.clone();
    let opening = reg.begin(MAIN).map_err(|_| tr!("이미 연결돼 있거나 여는 중입니다", "Already connected or connecting").to_string())?;
    reset_summary(&app, config.wire);
    app.slave.lock().unwrap().options.ignore_unit_id = config.ignore_unit_id;
    let sink = auto_remove_sink(reg.clone(), MAIN.into(), opening.generation, forward(app.summ.clone(), on_event));
    let r = responder(app.slave.clone(), app.stats.clone(), config.wire, false);
    let (mode, check) = match config.wire {
        Wire::Tcp => (FrameMode::modbus_tcp(), None),
        // TCP 조각이 나뉘어 와도 이어 붙게 무응답 시간을 넉넉히(길이를 아는 함수는 다 모이면 바로)
        Wire::Rtu => (FrameMode::ModbusRtuRequest { baud: 115_200, min_gap_ms: USB_MIN_GAP_MS }, Some(ChecksumKind::Crc16Modbus)),
    };
    let cfg = TcpConfig { mode: TcpMode::Server, host: config.host.trim().to_string(), port: config.port, no_delay: true, auto_reconnect: false, reconnect_ms: 2_000, echo: false };
    let s = TcpSession::start(cfg, mode, check, Some(r), sink)?;
    // TCP 는 점대점이라 선로 에코가 없다 — 요청 = 응답인 05·06 을 마스터가 곧바로 다시 보내도 답하도록
    // 시간 창은 끄고, 되돌려 보내는 상대와의 핑퐁은 초당 상한으로만 끊는다
    s.set_echo_guard(None);
    let local = s.local_addr().map(|a| a.to_string()).unwrap_or_default();
    opening.finish(Link::Tcp(s));
    Ok(local)
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
    app.sess.with(MAIN, |s| match s {
        Link::Serial(s) => {
            s.reconfigure(config)?;
            s.set_framing(mode, Some(ChecksumKind::Crc16Modbus));
            Ok(())
        }
        Link::Tcp(_) => Ok(()),
    })?
}

#[tauri::command(async)]
fn set_log(app: State<App>, path: Option<String>) -> Result<(), String> {
    app.sess.with(MAIN, |s| s.set_log(path))?
}

#[tauri::command]
fn set_faults(app: State<App>, faults: Faults) -> Result<(), String> {
    let t = &faults.target;
    if t.probability > 100 {
        return Err(tr!("확률은 0~100% 입니다", "Probability is 0–100%").into());
    }
    if let (Some(a), Some(b)) = (t.addr_from, t.addr_to)
        && a > b
    {
        return Err(tr!("주소 범위의 시작이 끝보다 큽니다", "The address range starts after it ends").into());
    }
    app.slave.lock().unwrap().set_faults(faults);
    Ok(())
}

/// 연결 중에도 바꿀 수 있는 선택(유닛 ID 무시)
#[tauri::command]
fn set_options(app: State<App>, options: SlaveOptions) {
    app.slave.lock().unwrap().options = options;
}

#[tauri::command]
fn set_device_id(app: State<App>, device: DeviceId) -> Result<(), String> {
    app.slave.lock().unwrap().set_device(device)
}

/// 표 하나의 자동 변화 목록을 통째로 바꾼다
#[tauri::command]
fn set_sims(app: State<App>, id: u8, table: Table, sims: Vec<SimSpec>) -> Result<(), String> {
    app.slave.lock().unwrap().set_sims(id, table, sims)
}

/// 통신 기록 요약의 주소 표기(0·1 기준, PLC 표기)
#[tauri::command]
fn set_addr_style(app: State<App>, style: AddrStyle) {
    app.summ.lock().unwrap().style = style;
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
    let bits = table.is_bits();
    let mut sl = app.slave.lock().unwrap();
    let t = sl.models.get_mut(&id).ok_or(tr!("없는 슬레이브", "Unknown slave ID"))?.table_mut(table);
    for (i, v) in values.into_iter().enumerate() {
        t[start as usize + i] = if bits { (v != 0) as u16 } else { v };
    }
    Ok(())
}

#[tauri::command]
fn get_stats(app: State<App>) -> Stats {
    app.stats.lock().unwrap().clone()
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

/// 명령줄 인자(0.3.0) — 처음 한 번만 준다. 뜻 풀이는 화면(src/launch.ts — 지금은 --auto 만)
#[tauri::command]
fn launch_args() -> Vec<String> {
    portdock_core::launch::take_args()
}

/// 연결·기록 중 절전 막기(0.3.0) — 화면 설정 «연결·기록 중 절전 막기» 가 켜져 있고 연결 중일 때 true
#[tauri::command]
fn keep_awake(on: bool) -> bool {
    portdock_core::power::keep_awake(on)
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

/// 값 자동 변화 — 화면이 숨어 있어도 돌도록 백엔드에서 100ms 마다
fn start_ticker(slave: Arc<Mutex<Slave>>) {
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_millis(100));
            let mut sl = slave.lock().unwrap_or_else(|e| e.into_inner());
            if sl.has_sims() {
                sl.tick(Instant::now());
            }
        }
    });
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
    let app = App::default();
    start_ticker(app.slave.clone());
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
        .manage(app)
        .invoke_handler(tauri::generate_handler![
            set_lang,
            launch_args,
            keep_awake,
            report_pending,
            report_dismiss,
            report_env,
            report_read_dump,
            list_ports,
            open,
            open_tcp,
            close,
            reconfigure,
            set_log,
            set_faults,
            set_options,
            set_device_id,
            set_sims,
            set_addr_style,
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

#[cfg(test)]
mod tests {
    use super::*;

    fn rtu(b: &[u8]) -> Vec<u8> {
        let mut v = b.to_vec();
        v.extend(ChecksumKind::Crc16Modbus.compute(b));
        v
    }

    #[test]
    fn responder_counts_and_busy() {
        let slave = Arc::new(Mutex::new(Slave::with_seed(1)));
        let stats = Arc::new(Mutex::new(Stats::default()));
        let mut r = responder(slave.clone(), stats.clone(), Wire::Rtu, true);
        assert!(r(&rtu(&[1, 3, 0, 0, 0, 1])).bytes.is_some());
        assert!(r(&rtu(&[2, 3, 0, 0, 0, 1])).note.unwrap().contains("IGNORED id 2"));
        let mut bad = rtu(&[1, 3, 0, 0, 0, 1]);
        bad[6] ^= 1;
        r(&bad);
        assert!(r(&rtu(&[1, 6, 0, 1, 0, 1])).bytes.is_some());
        assert!(r(&rtu(&[1, 3, 0, 200, 0, 1])).note.unwrap().starts_with("EXCEPTION 02"));
        // 지연 중 온 요청은 BUSY
        slave.lock().unwrap().faults.delay_ms = 10_000;
        assert_eq!(r(&rtu(&[1, 3, 0, 0, 0, 1])).delay_ms, 10_000);
        assert!(r(&rtu(&[1, 3, 0, 0, 0, 1])).note.unwrap().starts_with("BUSY"));
        let st = stats.lock().unwrap().clone();
        assert_eq!((st.requests, st.ok, st.exceptions, st.other_id, st.bad_frames, st.busy, st.writes), (4, 3, 1, 1, 1, 1, 1));
        assert_eq!(st.per_fc.get("03"), Some(&3));
        assert_eq!(st.per_fc.get("06"), Some(&1));
        assert_eq!(st.ignored, 3);
    }

    #[test]
    fn tcp_responder_no_busy_and_bad_mbap() {
        let slave = Arc::new(Mutex::new(Slave::with_seed(1)));
        let stats = Arc::new(Mutex::new(Stats::default()));
        let mut r = responder(slave.clone(), stats.clone(), Wire::Tcp, false);
        slave.lock().unwrap().faults.delay_ms = 5_000;
        let req = [0, 1, 0, 0, 0, 6, 1, 3, 0, 0, 0, 1];
        assert!(r(&req).bytes.is_some());
        assert!(r(&req).bytes.is_some(), "TCP 는 지연 중에도 다음 요청을 받는다");
        assert!(r(&[0, 1, 0, 0, 0, 9, 1, 3]).note.unwrap().contains("MBAP"));
        assert!(r(&[0, 1, 0, 0, 0, 6, 9, 3, 0, 0, 0, 1]).note.unwrap().contains("unit 9"));
        assert_eq!(stats.lock().unwrap().bad_frames, 1);
    }

    #[test]
    fn tcp_config_shape() {
        let c: TcpSlaveConfig = serde_json::from_str(r#"{"host":"0.0.0.0","port":502,"wire":"rtu","ignoreUnitId":true}"#).unwrap();
        assert_eq!((c.wire, c.ignore_unit_id, c.port), (Wire::Rtu, true, 502));
    }
}
