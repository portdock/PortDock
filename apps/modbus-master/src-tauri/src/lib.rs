//! PortDock Modbus Master — Modbus 장비에 묻는 쪽(PLC·HMI 대신). 시리얼(RTU), TCP 클라이언트(Modbus TCP·RTU over TCP).
//! 요청·응답 맞추기, 폴링 일정, 찾기는 portdock_core::modbus_master 의 일꾼(Engine)이 한다. 여기는 연결과 명령만.

use portdock_core::event::SessionEvent;
use portdock_core::framer::FrameMode;
use portdock_core::modbus::{AddrStyle, Wire};
use portdock_core::modbus_master::{ChannelLink, Engine, MasterEvent, PollSpec, ScanAddrs, ScanIds, Stats, Timing, forwarding_responder, frame, write_pdu};
use portdock_core::ports;
use portdock_core::registry::{Registry, auto_remove_sink};
use portdock_core::serial::{SerialConfig, Session};
use portdock_core::tcp::{TcpConfig, TcpSession};
use portdock_core::tr;
use serde::Deserialize;
use serde_json::Value;
use std::sync::{Arc, Mutex};
use tauri::State;
use tauri::ipc::Channel;

/// 열린 연결 — 시리얼 또는 TCP 클라이언트
enum Conn {
    Serial(Session),
    Tcp(TcpSession),
}

impl Conn {
    fn send(&self, bytes: &[u8]) -> Result<(), String> {
        match self {
            Self::Serial(s) => s.send(bytes.to_vec()),
            Self::Tcp(s) => s.send(None, bytes).map(|_| ()),
        }
    }

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
    /// 연결은 하나 — 보관함 이름 "main". 스스로 닫히면 알아서 빠진다
    conn: Arc<Registry<Conn>>,
    /// 연결마다 새로 만드는 일꾼
    engine: Arc<Mutex<Option<Engine>>>,
}

const MAIN: &str = "main";

fn lock<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

/// 연결할 때 화면이 함께 넘기는 것 — 기다림·재시도, 표 목록, 주소 표기
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Setup {
    timing: Timing,
    #[serde(default)]
    tables: Vec<PollSpec>,
    #[serde(default)]
    style: AddrStyle,
    #[serde(default)]
    paused: bool,
}

fn not_connected() -> String {
    tr!("연결돼 있지 않습니다", "Not connected").into()
}

/// 세션 사건 → 화면. 통신 기록은 일꾼이 요청·응답을 짝지어 따로 보내므로 세션의 프레임 줄은 넘기지 않는다.
/// 세션이 닫히면 일꾼에게 멈추라고만 알린다(여기서 기다리면 세션 스레드가 막힌다)
fn forward(engine: Arc<Mutex<Option<Engine>>>, ch: Channel<Value>) -> impl Fn(SessionEvent) + Send + Sync + 'static {
    move |e: SessionEvent| {
        match &e {
            SessionEvent::Frames { .. } | SessionEvent::Lines { .. } | SessionEvent::Peers { .. } | SessionEvent::Progress(_) => return,
            SessionEvent::Status { state: "closed", .. } => {
                if let Some(en) = lock(&engine).as_ref() {
                    en.signal_stop();
                }
            }
            _ => {}
        }
        let _ = ch.send(serde_json::to_value(&e).unwrap_or(Value::Null));
    }
}

/// 일꾼을 세운다 — 보내기는 보관함의 연결로, 받기는 세션 응답기가 넘겨준 조각으로
fn start_engine(app: &App, rx: std::sync::mpsc::Receiver<Vec<u8>>, wire: Wire, setup: Setup, ch: Channel<Value>) -> Result<(), String> {
    setup.timing.check()?;
    let reg = app.conn.clone();
    let link = ChannelLink::new(move |b: &[u8]| reg.with(MAIN, |c| c.send(b)).map_err(|_| not_connected())?, rx);
    let sink = Arc::new(move |e: MasterEvent| {
        let _ = ch.send(serde_json::to_value(&e).unwrap_or(Value::Null));
    });
    let en = Engine::start(Box::new(link), wire, setup.timing, setup.style, setup.tables, sink);
    en.set_paused(setup.paused);
    if let Some(old) = lock(&app.engine).replace(en) {
        old.signal_stop();
    }
    Ok(())
}

#[tauri::command(async)]
fn list_ports() -> Vec<ports::PortInfo> {
    ports::list()
}

/// 시리얼(RTU)로 연다. 응답 길이는 일꾼이 요청으로 계산해 조각을 이어 붙이므로 프레임 구분은 3.5 문자 시간으로 충분하다
#[tauri::command(async)]
fn open(app: State<App>, config: SerialConfig, setup: Setup, on_event: Channel<Value>) -> Result<(), String> {
    setup.timing.check()?;
    let reg = app.conn.clone();
    let opening = reg.begin(MAIN).map_err(|_| tr!("이미 연결돼 있거나 여는 중입니다", "Already connected or connecting").to_string())?;
    let sink = auto_remove_sink(reg.clone(), MAIN.into(), opening.generation, forward(app.engine.clone(), on_event.clone()));
    let (responder, rx) = forwarding_responder();
    let mode = FrameMode::ModbusRtu { baud: config.baud };
    let s = Session::start(config, mode, None, Some(responder), sink)?;
    opening.finish(Conn::Serial(s));
    start_engine(&app, rx, Wire::Rtu, setup, on_event)
}

/// TCP 클라이언트 설정
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NetConfig {
    host: String,
    port: u16,
    /// "tcp"(Modbus TCP, MBAP) | "rtu"(RTU over TCP — 시리얼과 같은 프레임, CRC 포함)
    wire: Wire,
    #[serde(default = "yes")]
    auto_reconnect: bool,
}

fn yes() -> bool {
    true
}

/// TCP 클라이언트로 연다 — 끊기면 2초마다 다시 붙는다(설정에 따라)
#[tauri::command(async)]
fn open_tcp(app: State<App>, config: NetConfig, setup: Setup, on_event: Channel<Value>) -> Result<(), String> {
    setup.timing.check()?;
    let reg = app.conn.clone();
    let opening = reg.begin(MAIN).map_err(|_| tr!("이미 연결돼 있거나 여는 중입니다", "Already connected or connecting").to_string())?;
    let sink = auto_remove_sink(reg.clone(), MAIN.into(), opening.generation, forward(app.engine.clone(), on_event.clone()));
    let (responder, rx) = forwarding_responder();
    let mode = match config.wire {
        Wire::Tcp => FrameMode::modbus_tcp(),
        Wire::Rtu => FrameMode::ModbusRtu { baud: 115_200 },
    };
    // 설정은 JSON 으로 만든다 — TcpConfig 에 칸이 늘어도(기본값이 있으면) 그대로
    let cfg: TcpConfig = serde_json::from_value(serde_json::json!({
        "mode": "client",
        "host": config.host.trim(),
        "port": config.port,
        "noDelay": true,
        "autoReconnect": config.auto_reconnect,
        "reconnectMs": 2000,
    }))
    .map_err(|e| e.to_string())?;
    let s = TcpSession::start(cfg, mode, None, Some(responder), sink)?;
    opening.finish(Conn::Tcp(s));
    start_engine(&app, rx, config.wire, setup, on_event)
}

#[tauri::command(async)]
fn close(app: State<App>) {
    // 일꾼 먼저(보내던 요청을 마치게), 그다음 연결
    let en = lock(&app.engine).take();
    if let Some(en) = en {
        en.stop();
    }
    if let Some(c) = app.conn.take(MAIN) {
        c.stop();
    }
}

/// 연결 중 속도·패리티 바꾸기(시리얼)
#[tauri::command(async)]
fn reconfigure(app: State<App>, config: SerialConfig) -> Result<(), String> {
    let mode = FrameMode::ModbusRtu { baud: config.baud };
    app.conn.with(MAIN, |c| match c {
        Conn::Serial(s) => {
            s.reconfigure(config)?;
            s.set_framing(mode, None);
            Ok(())
        }
        Conn::Tcp(_) => Ok(()),
    })?
}

fn with_engine<R>(app: &App, f: impl FnOnce(&Engine) -> R) -> Result<R, String> {
    lock(&app.engine).as_ref().map(f).ok_or_else(not_connected)
}

/// 표 목록을 통째로 바꾼다(연결 전이면 할 일 없음 — 연결할 때 함께 넘긴다)
#[tauri::command]
fn set_tables(app: State<App>, tables: Vec<PollSpec>) {
    let _ = with_engine(&app, |e| e.set_tables(tables));
}

#[tauri::command]
fn set_timing(app: State<App>, timing: Timing) -> Result<(), String> {
    timing.check()?;
    let _ = with_engine(&app, |e| e.set_timing(timing));
    Ok(())
}

/// 통신 기록 풀이의 주소 표기(0·1 기준, PLC 표기)
#[tauri::command]
fn set_addr_style(app: State<App>, style: AddrStyle) {
    let _ = with_engine(&app, |e| e.set_style(style));
}

/// 모든 표의 자동 폴링 멈춤·다시
#[tauri::command]
fn set_paused(app: State<App>, paused: bool) {
    let _ = with_engine(&app, |e| e.set_paused(paused));
}

#[tauri::command]
fn read_once(app: State<App>, table: u32) -> Result<(), String> {
    with_engine(&app, |e| e.read_once(table))
}

/// 쓰기 요청 — 화면의 칸 값(레지스터·비트) 그대로
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WriteReq {
    unit: u8,
    /// 코일이면 true(05·0F), 보유 레지스터면 false(06·10)
    bits: bool,
    start: u16,
    values: Vec<u16>,
    /// 한 칸이어도 0F·10 으로
    #[serde(default)]
    force_multi: bool,
}

/// 쓰기 — 결과는 사건(«write», 같은 token)으로 온다
#[tauri::command]
fn write(app: State<App>, token: u64, table: u32, req: WriteReq) -> Result<(), String> {
    let pdu = write_pdu(req.bits, req.start, &req.values, req.force_multi)?;
    with_engine(&app, |e| e.write(token, table, req.unit, pdu))
}

/// 쓰기 창의 미리보기 — 보낼 바이트(RTU: CRC 포함, TCP: MBAP 의 트랜잭션 번호는 0 으로)
#[tauri::command]
fn preview_write(req: WriteReq, wire: Wire) -> Result<Vec<u8>, String> {
    let pdu = write_pdu(req.bits, req.start, &req.values, req.force_multi)?;
    Ok(frame(wire, 0, req.unit, &pdu))
}

#[tauri::command]
fn scan_ids(app: State<App>, config: ScanIds) -> Result<(), String> {
    with_engine(&app, |e| {
        // Modbus TCP 는 0 부터(유닛 0 도 보통 장비), RTU 는 1 부터(0 은 브로드캐스트)
        config.check_on(e.wire())?;
        if e.scanning() {
            return Err(tr!("이미 찾는 중입니다", "A scan is already running").to_string());
        }
        e.scan_ids(config);
        Ok(())
    })?
}

#[tauri::command]
fn scan_addrs(app: State<App>, config: ScanAddrs) -> Result<(), String> {
    with_engine(&app, |e| {
        config.check_on(e.wire())?;
        if e.scanning() {
            return Err(tr!("이미 찾는 중입니다", "A scan is already running").to_string());
        }
        e.scan_addrs(config);
        Ok(())
    })?
}

#[tauri::command]
fn scan_cancel(app: State<App>) {
    let _ = with_engine(&app, |e| e.cancel_scan());
}

#[tauri::command]
fn get_stats(app: State<App>) -> Stats {
    with_engine(&app, |e| e.stats()).unwrap_or_default()
}

#[tauri::command]
fn reset_stats(app: State<App>) {
    let _ = with_engine(&app, |e| e.reset_stats());
}

/// 통신 기록 파일(세션이 주고받은 바이트 그대로, 시각·방향 붙여)
#[tauri::command(async)]
fn set_log(app: State<App>, path: Option<String>) -> Result<(), String> {
    app.conn.with(MAIN, |c| c.set_log(path))?
}

/// 화면 내용·표 내보내기 — 사용자가 저장 대화상자에서 고른 경로만
#[tauri::command(async)]
fn write_text(path: String, text: String) -> Result<(), String> {
    std::fs::write(&path, text).map_err(|e| format!("{path}: {e}"))
}

/// 값 기록(CSV) 이어 쓰기 — 화면이 고른 경로만
#[tauri::command(async)]
fn append_text(path: String, text: String) -> Result<(), String> {
    use std::io::Write;
    let mut f = std::fs::OpenOptions::new().create(true).append(true).open(&path).map_err(|e| format!("{path}: {e}"))?;
    f.write_all(text.as_bytes()).map_err(|e| format!("{path}: {e}"))
}

#[tauri::command(async)]
fn read_text(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("{path}: {e}"))
}

/// 명령줄 인자(0.2.0) — 처음 한 번만 준다. 뜻 풀이·검사는 화면(src/launch.ts)이 하고, 설정만 채운다(연결은 사용자가)
#[tauri::command]
fn launch_args() -> Vec<String> {
    portdock_core::launch::take_args()
}

/// 연결·기록 중 절전 막기(0.3.0) — 지금 막고 있는지 돌려준다
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // WebView2 가 없으면 화면이 뜨지 않는다 — 문제 보고 대신 설치 안내를 띄우고 끝낸다
    if let Err(e) = tauri::webview_version() {
        portdock_core::report::webview_missing(&e.to_string());
    }
    portdock_core::report::install("modbus-master", env!("CARGO_PKG_VERSION"));
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
            set_tables,
            set_timing,
            set_addr_style,
            set_paused,
            read_once,
            write,
            preview_write,
            scan_ids,
            scan_addrs,
            scan_cancel,
            get_stats,
            reset_stats,
            set_log,
            write_text,
            append_text,
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

    #[test]
    fn config_shapes() {
        let s: Setup = serde_json::from_str(r#"{"timing":{"timeoutMs":800,"retries":1,"delayMs":20},"tables":[{"id":1,"unit":1,"fc":3,"start":0,"qty":10,"intervalMs":1000,"enabled":true}],"style":{"base":0,"plc":true}}"#).unwrap();
        assert_eq!((s.timing.timeout_ms, s.tables.len(), s.style.plc, s.paused), (800, 1, true, false));
        let n: NetConfig = serde_json::from_str(r#"{"host":"192.168.0.10","port":502,"wire":"rtu"}"#).unwrap();
        assert_eq!((n.wire, n.auto_reconnect), (Wire::Rtu, true));
        let w: WriteReq = serde_json::from_str(r#"{"unit":1,"bits":false,"start":10,"values":[59769,17142]}"#).unwrap();
        assert_eq!(preview_write(w, Wire::Rtu).unwrap()[..7], [1, 0x10, 0, 10, 0, 2, 4]);
        let one: WriteReq = serde_json::from_str(r#"{"unit":2,"bits":true,"start":3,"values":[1]}"#).unwrap();
        assert_eq!(preview_write(one, Wire::Tcp).unwrap(), vec![0, 0, 0, 0, 0, 6, 2, 5, 0, 3, 0xFF, 0]);
        // TCP 설정을 JSON 으로 만들 수 있는지(칸이 늘어도)
        let cfg: Result<TcpConfig, _> = serde_json::from_value(serde_json::json!({ "mode": "client", "host": "h", "port": 502, "noDelay": true, "autoReconnect": true, "reconnectMs": 2000 }));
        assert!(cfg.is_ok());
    }
}
