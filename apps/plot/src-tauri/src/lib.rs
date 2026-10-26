//! PortDock Plot — 시리얼·TCP(클라이언트)·UDP 로 들어오는 숫자를 실시간 그래프로.
//! 받기·재연결은 portdock_core 의 세션(serial·tcp·udp), 숫자 꺼내기는 portdock_core::plot 이 한다.
//! 여기서는 받은 바이트를 해석기에 넣고, 값 묶음을 0.05초마다 화면으로 보내며, 켜져 있으면 CSV 로 바로 기록한다.
//! (화면에는 숫자·최근 원시 줄만 넘긴다 — 초당 수천 줄이어도 화면이 바이트를 다시 해석하지 않게)

use portdock_core::event::{EventSink, SessionEvent};
use portdock_core::framer::FrameMode;
use portdock_core::plot::{Format, Out, Parser, Raw, Row};
use portdock_core::ports;
use portdock_core::serial::{SerialConfig, Session};
use portdock_core::tcp::{TcpConfig, TcpMode, TcpSession};
use portdock_core::tr;
use portdock_core::udp::{UdpConfig, UdpSession};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::io::{BufWriter, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};
use tauri::State;
use tauri::ipc::Channel;

/// 화면으로 보내는 간격
const FLUSH: Duration = Duration::from_millis(50);
/// 한 묶음에 실어 보낼 원시 줄 수(최근 것)
const RAW_KEEP: usize = 40;
/// 화면이 따라오지 못할 때 묶음에 쌓아 둘 최대 줄 수(넘으면 오래된 것부터 버리고 알린다)
const PENDING_MAX: usize = 200_000;

fn lock<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

/// 받을 곳 (화면 JSON: {"kind":"serial","config":{…}} · {"kind":"tcp","host":"…","port":5000} · {"kind":"udp","host":"0.0.0.0","port":5000,"group":""})
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase", rename_all_fields = "camelCase")]
enum Source {
    Serial {
        config: SerialConfig,
    },
    Tcp {
        host: String,
        port: u16,
    },
    Udp {
        #[serde(default = "any")]
        host: String,
        port: u16,
        #[serde(default)]
        group: String,
    },
}

fn any() -> String {
    "0.0.0.0".into()
}

/// 화면으로 가는 사건
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase", rename_all_fields = "camelCase")]
enum PlotEvent {
    /// 값 묶음 — t[i] 시각(ms)의 값 rows[i](NaN 은 null = 빈 값)
    Data {
        t: Vec<u64>,
        rows: Vec<Vec<f64>>,
        /// 채널 이름이 바뀌었으면(머리글·«이름:값»)
        #[serde(skip_serializing_if = "Option::is_none")]
        names: Option<Vec<String>>,
        raw: Vec<Raw>,
        /// 이 묶음의 실패 줄 수
        bad: u64,
        /// 이 묶음에 받은 바이트 수
        bytes: u64,
        /// 화면이 늦어 버린 줄 수
        dropped: u64,
        /// CSV 기록 중이면 지금까지 쓴 줄 수
        #[serde(skip_serializing_if = "Option::is_none")]
        rec_rows: Option<u64>,
    },
    /// 세션 상태 — connected · listening · disconnected · reconnecting · closed
    Status { state: String, port: String, message: Option<String> },
    Error { message: String },
    /// CSV 기록이 쓰기 실패로 멈춤
    RecordStopped { message: String },
}

#[derive(Default)]
struct Pending {
    rows: Vec<Row>,
    raw: VecDeque<Raw>,
    bad: u64,
    bytes: u64,
    dropped: u64,
}

/// CSV 기록 — 받는 쪽 스레드가 바로 쓴다(화면을 거치지 않는다)
struct Recorder {
    path: String,
    w: BufWriter<std::fs::File>,
    rows: u64,
    t0: Option<u64>,
    last_flush: Instant,
}

/// 시각 글자(로컬 «2026-10-19 12:00:00.123»)
fn csv_time(ts: u64) -> String {
    use chrono::TimeZone;
    match chrono::Local.timestamp_millis_opt(ts as i64) {
        chrono::LocalResult::Single(t) | chrono::LocalResult::Ambiguous(t, _) => t.format("%Y-%m-%d %H:%M:%S%.3f").to_string(),
        chrono::LocalResult::None => ts.to_string(),
    }
}

impl Recorder {
    fn open(path: &str, names: &[String]) -> Result<Self, String> {
        let f = std::fs::File::create(path).map_err(|e| format!("{path}: {e}"))?;
        let mut w = BufWriter::with_capacity(256 * 1024, f);
        // 엑셀에서 한글 이름이 깨지지 않게 BOM
        let head: Vec<String> = names.iter().map(|n| csv_cell(n)).collect();
        write!(w, "\u{feff}time,elapsed_s{}{}\r\n", if head.is_empty() { "" } else { "," }, head.join(",")).map_err(|e| format!("{path}: {e}"))?;
        Ok(Self { path: path.into(), w, rows: 0, t0: None, last_flush: Instant::now() })
    }

    fn write(&mut self, rows: &[Row]) -> std::io::Result<()> {
        for r in rows {
            let t0 = *self.t0.get_or_insert(r.ts);
            write!(self.w, "{},{:.3}", csv_time(r.ts), (r.ts.saturating_sub(t0)) as f64 / 1000.0)?;
            for v in &r.values {
                if v.is_nan() {
                    self.w.write_all(b",")?;
                } else {
                    write!(self.w, ",{v}")?;
                }
            }
            self.w.write_all(b"\r\n")?;
            self.rows += 1;
        }
        if self.last_flush.elapsed() >= Duration::from_secs(1) {
            self.last_flush = Instant::now();
            self.w.flush()?;
        }
        Ok(())
    }
}

fn csv_cell(s: &str) -> String {
    if s.contains([',', '"', '\n', '\r']) { format!("\"{}\"", s.replace('"', "\"\"")) } else { s.to_string() }
}

/// 받는 쪽(세션 스레드)과 보내는 쪽(묶음 스레드)이 함께 쓰는 것
struct Shared {
    parser: Mutex<Parser>,
    pending: Mutex<Pending>,
    names: Mutex<Option<Vec<String>>>,
    rec: Mutex<Option<Recorder>>,
    ch: Channel<PlotEvent>,
    /// 묶음·상태를 한 번에 하나씩(상태 사건이 앞선 값 묶음을 앞지르지 않게)
    sending: Mutex<()>,
    udp: bool,
}

impl Shared {
    fn on_event(&self, e: SessionEvent) {
        match e {
            SessionEvent::Frames { frames } => {
                let mut out = Out::new(RAW_KEEP);
                let mut bytes = 0u64;
                {
                    let mut p = lock(&self.parser);
                    for f in &frames {
                        match f.dir {
                            "rx" => {
                                bytes += f.bytes.len() as u64;
                                p.feed(f.ts, &f.bytes, self.udp, &mut out);
                            }
                            "ev" => out.push_raw(Raw { ts: f.ts, text: f.note.clone().unwrap_or_default(), ok: true, why: None, ev: true }),
                            _ => {}
                        }
                    }
                    if let Some(n) = p.take_names() {
                        *lock(&self.names) = Some(n);
                    }
                }
                self.record(&out.rows);
                let mut pd = lock(&self.pending);
                pd.bytes += bytes;
                pd.bad += out.bad;
                pd.rows.extend(out.rows);
                if pd.rows.len() > PENDING_MAX {
                    let cut = pd.rows.len() - PENDING_MAX;
                    pd.rows.drain(..cut);
                    pd.dropped += cut as u64;
                }
                for r in out.raw {
                    if pd.raw.len() >= RAW_KEEP {
                        pd.raw.pop_front();
                    }
                    pd.raw.push_back(r);
                }
            }
            SessionEvent::Status { state, port, message } => {
                self.flush();
                let _g = lock(&self.sending);
                let _ = self.ch.send(PlotEvent::Status { state: state.into(), port, message });
            }
            SessionEvent::Error { message } => {
                let _g = lock(&self.sending);
                let _ = self.ch.send(PlotEvent::Error { message });
            }
            _ => {}
        }
    }

    fn record(&self, rows: &[Row]) {
        if rows.is_empty() {
            return;
        }
        let mut g = lock(&self.rec);
        let Some(r) = g.as_mut() else { return };
        if let Err(e) = r.write(rows) {
            let message = tr!(format!("CSV 기록 실패 — 기록을 멈췄습니다: {} ({e})", r.path), format!("CSV recording failed — stopped: {} ({e})", r.path));
            *g = None;
            // rec 를 놓고 나서 sending — flush 는 sending → rec 순으로 쥔다(거꾸로 쥐면 교착)
            drop(g);
            let _s = lock(&self.sending);
            let _ = self.ch.send(PlotEvent::RecordStopped { message });
        }
    }

    /// 쌓인 값을 화면으로
    fn flush(&self) {
        let _g = lock(&self.sending);
        let pd = std::mem::take(&mut *lock(&self.pending));
        let names = lock(&self.names).take();
        let rec_rows = {
            let mut r = lock(&self.rec);
            if let Some(r) = r.as_mut()
                && r.last_flush.elapsed() >= Duration::from_secs(1)
            {
                r.last_flush = Instant::now();
                let _ = r.w.flush();
            }
            r.as_ref().map(|r| r.rows)
        };
        if pd.rows.is_empty() && pd.raw.is_empty() && names.is_none() && pd.bad == 0 && pd.bytes == 0 && pd.dropped == 0 {
            return;
        }
        let (t, rows) = pd.rows.into_iter().map(|r| (r.ts, r.values)).unzip();
        let _ = self.ch.send(PlotEvent::Data { t, rows, names, raw: pd.raw.into(), bad: pd.bad, bytes: pd.bytes, dropped: pd.dropped, rec_rows });
    }
}

enum Sess {
    Serial(Session),
    Tcp(TcpSession),
    Udp(UdpSession),
}

impl Sess {
    fn stop(self) {
        match self {
            Self::Serial(s) => s.stop(),
            Self::Tcp(s) => s.stop(),
            Self::Udp(s) => s.stop(),
        }
    }

    fn set_framing(&self, mode: FrameMode) {
        match self {
            Self::Serial(s) => s.set_framing(mode, None),
            Self::Tcp(s) => s.set_framing(mode, None),
            Self::Udp(_) => {}
        }
    }
}

struct Run {
    sess: Sess,
    shared: Arc<Shared>,
    stop: Arc<AtomicBool>,
    flusher: JoinHandle<()>,
}

#[derive(Default)]
struct App {
    run: Mutex<Option<Run>>,
    /// 시작 연타 막기
    starting: AtomicBool,
}

/// 해석 방식에 맞는 세션의 끊기 — 글자는 줄마다(LF, CR 만 오는 장비는 0.05초 조용하면), 바이너리는 프레임 길이마다
fn framing(f: &Format) -> FrameMode {
    match f.frame_len() {
        None => FrameMode::Terminator { bytes: vec![b'\n'], gap_ms: 50 },
        Some(n) => FrameMode::Fixed { len: n.max(1), gap_ms: 20 },
    }
}

/// 명령줄 인자(0.3.0) — 처음 한 번만 준다. 뜻 풀이·검사는 화면(src/launch.ts)이 하고, 칸만 채운다(받기 시작은 사용자가)
#[tauri::command]
fn launch_args() -> Vec<String> {
    portdock_core::launch::take_args()
}

#[tauri::command(async)]
fn list_ports() -> Vec<ports::PortInfo> {
    ports::list()
}

/// 받기 시작 — 돌려주는 글은 사건 줄용 설명
#[tauri::command(async)]
fn plot_start(app: State<App>, source: Source, format: Format, on_event: Channel<PlotEvent>) -> Result<String, String> {
    format.validate()?;
    if lock(&app.run).is_some() || app.starting.swap(true, Ordering::SeqCst) {
        return Err(tr!("이미 받는 중입니다", "Already receiving").into());
    }
    let r = start(&app, source, format, on_event);
    app.starting.store(false, Ordering::SeqCst);
    r
}

fn start(app: &App, source: Source, format: Format, ch: Channel<PlotEvent>) -> Result<String, String> {
    let udp = matches!(source, Source::Udp { .. });
    let mode = framing(&format);
    let shared = Arc::new(Shared {
        parser: Mutex::new(Parser::new(format)),
        pending: Mutex::new(Pending::default()),
        names: Mutex::new(None),
        rec: Mutex::new(None),
        ch,
        sending: Mutex::new(()),
        udp,
    });
    let s2 = shared.clone();
    let sink = EventSink::new(move |e| s2.on_event(e));
    let (sess, desc) = match source {
        Source::Serial { config } => {
            let d = portdock_core::serial::describe(&config);
            (Sess::Serial(Session::start(config, mode, None, None, sink)?), d)
        }
        Source::Tcp { host, port } => {
            let host = host.trim().to_string();
            if host.is_empty() || port == 0 {
                return Err(tr!("장비 주소와 포트(1~65535)를 넣어 주세요", "Enter the device address and port (1–65535)").into());
            }
            let d = format!("TCP {host}:{port}");
            let cfg = TcpConfig { mode: TcpMode::Client, host, port, no_delay: true, auto_reconnect: true, reconnect_ms: 2_000, echo: false };
            (Sess::Tcp(TcpSession::start(cfg, mode, None, None, sink)?), d)
        }
        Source::Udp { host, port, group } => {
            let host = if host.trim().is_empty() { any() } else { host.trim().to_string() };
            let d = format!("UDP {host}:{port}{}", if group.trim().is_empty() { String::new() } else { format!(" · {}", group.trim()) });
            let cfg = UdpConfig {
                bind_host: host,
                bind_port: port,
                remote_host: String::new(),
                remote_port: 0,
                broadcast: false,
                multicast_group: group.trim().to_string(),
                multicast_if: any(),
                multicast_ttl: 1,
                multicast_loop: true,
                echo: false,
            };
            (Sess::Udp(UdpSession::start(cfg, None, None, sink)?), d)
        }
    };
    let stop = Arc::new(AtomicBool::new(false));
    let (s3, st) = (shared.clone(), stop.clone());
    let flusher = std::thread::spawn(move || {
        while !st.load(Ordering::SeqCst) {
            std::thread::sleep(FLUSH);
            s3.flush();
        }
        s3.flush();
    });
    *lock(&app.run) = Some(Run { sess, shared, stop, flusher });
    Ok(desc)
}

/// 멈추기 — 세션을 닫고, 남은 값을 보내고, CSV 기록을 닫는다
#[tauri::command(async)]
fn plot_stop(app: State<App>) {
    let Some(run) = lock(&app.run).take() else { return };
    run.sess.stop();
    run.stop.store(true, Ordering::SeqCst);
    let _ = run.flusher.join();
    if let Some(mut r) = lock(&run.shared.rec).take() {
        let _ = r.w.flush();
    }
}

/// 받는 중 해석 방식 바꾸기 — 해석기를 새로(줄 조각·이름은 버린다)
#[tauri::command(async)]
fn plot_set_format(app: State<App>, format: Format) -> Result<(), String> {
    format.validate()?;
    let g = lock(&app.run);
    let Some(run) = g.as_ref() else { return Ok(()) };
    run.sess.set_framing(framing(&format));
    *lock(&run.shared.parser) = Parser::new(format);
    Ok(())
}

/// CSV 기록 시작(path)·멈춤(None). names 는 머리 줄의 채널 이름(화면에서 바꾼 이름 포함)
#[tauri::command(async)]
fn plot_record(app: State<App>, path: Option<String>, names: Vec<String>) -> Result<(), String> {
    let g = lock(&app.run);
    let run = g.as_ref().ok_or_else(|| tr!("받는 중일 때만 기록할 수 있습니다", "Recording works only while receiving").to_string())?;
    let mut rec = lock(&run.shared.rec);
    if let Some(mut old) = rec.take() {
        let _ = old.w.flush();
    }
    if let Some(p) = path {
        *rec = Some(Recorder::open(&p, &names)?);
    }
    Ok(())
}

/// 화면 데이터 CSV·설정 내보내기 — 사용자가 저장 대화상자에서 고른 경로만
#[tauri::command(async)]
fn write_text(path: String, text: String) -> Result<(), String> {
    std::fs::write(&path, text).map_err(|e| format!("{path}: {e}"))
}

/// 그래프 PNG 저장 — 사용자가 저장 대화상자에서 고른 경로만
#[tauri::command(async)]
fn write_bytes(path: String, data: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, data).map_err(|e| format!("{path}: {e}"))
}

#[tauri::command(async)]
fn read_text(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("{path}: {e}"))
}

/// 화면 언어를 백엔드 문구(오류)에도 적용
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
    portdock_core::report::install("plot", env!("CARGO_PKG_VERSION"));
    // 네이티브 크래시 감시 — 감시 프로세스로 불렸으면 여기서 끝난다(화면을 만들지 않는다)
    portdock_core::report::crash_monitor_or_attach();
    portdock_core::report::test_crash_if_asked();
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // 창 크기·위치·최대화를 기억한다. 보임·장식·전체 화면은 되살리지 않는다(숨은 창으로 뜨지 않게).
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
            launch_args,
            plot_start,
            plot_stop,
            plot_set_format,
            plot_record,
            write_text,
            write_bytes,
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
    fn source_shapes() {
        let s: Source = serde_json::from_str(r#"{"kind":"serial","config":{"port":"COM3","baud":115200,"dataBits":8,"parity":"none","stopBits":1,"flow":"none","dtr":true}}"#).unwrap();
        assert!(matches!(s, Source::Serial { config } if config.baud == 115200 && config.dtr && config.auto_reconnect));
        let t: Source = serde_json::from_str(r#"{"kind":"tcp","host":"127.0.0.1","port":5000}"#).unwrap();
        assert!(matches!(t, Source::Tcp { port: 5000, .. }));
        let u: Source = serde_json::from_str(r#"{"kind":"udp","port":5005}"#).unwrap();
        assert!(matches!(u, Source::Udp { host, port: 5005, group } if host == "0.0.0.0" && group.is_empty()));
    }

    #[test]
    fn data_event_shape() {
        // NaN 은 null(빈 값)로 간다
        let e = PlotEvent::Data { t: vec![1], rows: vec![vec![1.5, f64::NAN]], names: None, raw: vec![], bad: 0, bytes: 4, dropped: 0, rec_rows: Some(3) };
        let v = serde_json::to_value(&e).unwrap();
        assert_eq!(v, serde_json::json!({ "type": "data", "t": [1], "rows": [[1.5, null]], "raw": [], "bad": 0, "bytes": 4, "dropped": 0, "recRows": 3 }));
        let s = serde_json::to_value(PlotEvent::RecordStopped { message: "x".into() }).unwrap();
        assert_eq!(s, serde_json::json!({ "type": "recordStopped", "message": "x" }));
    }

    #[test]
    fn framing_follows_format() {
        assert_eq!(framing(&Format::default()), FrameMode::Terminator { bytes: vec![b'\n'], gap_ms: 50 });
        let f: Format = serde_json::from_str(r#"{"kind":"binary","sync":[170],"channels":2,"num":"u16"}"#).unwrap();
        assert_eq!(framing(&f), FrameMode::Fixed { len: 5, gap_ms: 20 });
    }

    #[test]
    fn csv_recorder_writes_rows() {
        let dir = std::env::temp_dir().join(format!("pd-plot-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("rec.csv");
        let p = path.to_string_lossy().to_string();
        let mut r = Recorder::open(&p, &["a,b".into(), "c".into()]).unwrap();
        r.write(&[Row { ts: 1_000, values: vec![1.0, f64::NAN] }, Row { ts: 1_250, values: vec![2.5, 3.0] }]).unwrap();
        r.w.flush().unwrap();
        let text = std::fs::read_to_string(&path).unwrap();
        let lines: Vec<&str> = text.split("\r\n").collect();
        assert_eq!(lines[0], "\u{feff}time,elapsed_s,\"a,b\",c");
        assert!(lines[1].ends_with(",0.000,1,"), "{}", lines[1]);
        assert!(lines[2].ends_with(",0.250,2.5,3"), "{}", lines[2]);
        assert_eq!(r.rows, 2);
        let _ = std::fs::remove_dir_all(&dir);
    }

    /// CSV 쓰기 실패(디스크 가득 등)를 알리는 동안 묶음 스레드(flush: sending → rec 순)와 엇갈려 멈추지 않는다
    #[test]
    fn record_failure_does_not_deadlock_with_flush() {
        let dir = std::env::temp_dir().join(format!("pd-plot-dl-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("ro.csv");
        std::fs::write(&path, "").unwrap();
        // 읽기 전용으로 연 파일 — 쓰면 실패한다
        let f = std::fs::File::open(&path).unwrap();
        let rec = Recorder { path: "ro.csv".into(), w: BufWriter::new(f), rows: 0, t0: None, last_flush: Instant::now() - Duration::from_secs(5) };
        let shared = Arc::new(Shared {
            parser: Mutex::new(Parser::new(Format::default())),
            pending: Mutex::new(Pending::default()),
            names: Mutex::new(None),
            rec: Mutex::new(Some(rec)),
            ch: Channel::new(|_| Ok(())),
            sending: Mutex::new(()),
            udp: false,
        });
        // 묶음 스레드 흉내: sending 을 쥔 채 rec 를 기다린다
        let g = lock(&shared.sending);
        let s2 = shared.clone();
        let t = std::thread::spawn(move || s2.record(&[Row { ts: 1, values: vec![1.0] }]));
        std::thread::sleep(Duration::from_millis(200));
        let t0 = Instant::now();
        let mut got = false;
        while t0.elapsed() < Duration::from_secs(2) {
            if shared.rec.try_lock().is_ok() {
                got = true;
                break;
            }
            std::thread::sleep(Duration::from_millis(10));
        }
        drop(g);
        t.join().unwrap();
        let _ = std::fs::remove_dir_all(&dir);
        assert!(got, "record 가 rec 를 쥔 채 sending 을 기다린다 — flush 와 교착");
        assert!(lock(&shared.rec).is_none(), "실패하면 기록을 멈춘다");
    }

    #[test]
    fn end_to_end_over_udp() {
        // 실제 UDP 로 줄을 보내 해석·묶음까지 — 화면 채널 대신 받은 사건을 모은다
        let got: Arc<Mutex<Vec<String>>> = Arc::default();
        let g2 = got.clone();
        let ch: Channel<PlotEvent> = Channel::new(move |body| {
            if let tauri::ipc::InvokeResponseBody::Json(s) = body {
                g2.lock().unwrap().push(s);
            }
            Ok(())
        });
        let app = App::default();
        let port = {
            let s = std::net::UdpSocket::bind("127.0.0.1:0").unwrap();
            s.local_addr().unwrap().port()
        };
        start(&app, Source::Udp { host: "127.0.0.1".into(), port, group: String::new() }, Format::default(), ch).unwrap();
        let tx = std::net::UdpSocket::bind("127.0.0.1:0").unwrap();
        tx.send_to(b"a,b\n1,2\n", ("127.0.0.1", port)).unwrap();
        tx.send_to(b"3,4", ("127.0.0.1", port)).unwrap();
        let t0 = Instant::now();
        while t0.elapsed() < Duration::from_secs(3) && !got.lock().unwrap().iter().any(|s| s.contains("[3.0,4.0]")) {
            std::thread::sleep(Duration::from_millis(20));
        }
        let run = lock(&app.run).take().unwrap();
        run.sess.stop();
        run.stop.store(true, Ordering::SeqCst);
        run.flusher.join().unwrap();
        let all = got.lock().unwrap().join("\n");
        assert!(all.contains("[1.0,2.0]"), "{all}");
        assert!(all.contains("[3.0,4.0]"), "{all}");
        assert!(all.contains(r#""names":["a","b"]"#), "{all}");
    }
}
