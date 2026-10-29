//! PortDock PLC Simulator — PC 가 PLC 의 이더넷 포트처럼 MC 프로토콜(SLMP 3E·4E, 이진·ASCII) 요청에 답한다.
//! TCP 서버(여러 클라이언트) 또는 UDP. 디바이스 표는 연결과 따로 살아 있어서, 시작 전에 값을 넣어 둘 수 있다.
//! 처리기는 crates/core/src/mc.rs — 공개 매뉴얼 기준 구현, 실제 PLC 와 동작이 다를 수 있다.

use portdock_core::event::SessionEvent;
use portdock_core::mc::{self, Dev, Faults, Format, Options, Outcome, Server};
use portdock_core::regmap::SimSpec;
use portdock_core::registry::{Registry, auto_remove_sink};
use portdock_core::serial::{Reply, Responder};
use portdock_core::tcp::{TcpConfig, TcpMode, TcpSession};
use portdock_core::tr;
use portdock_core::udp::{UdpConfig, UdpSession};
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
    /// 받은 요청(머리를 읽은 것)
    requests: u64,
    ok: u64,
    /// 종료 코드가 0 이 아닌 응답
    errors: u64,
    /// 이 형식(3E/4E·이진/ASCII)이 아니라 답하지 않은 프레임
    ignored: u64,
    no_response: u64,
    /// 클라이언트가 디바이스를 바꿀 때마다 오른다 — 화면이 다시 읽을 때를 안다
    writes: u64,
    /// 명령별 요청 수(«0401» → 12)
    per_cmd: BTreeMap<String, u64>,
    /// 종료 코드별 오류 수(«C056» → 2)
    per_end: BTreeMap<String, u64>,
}

/// 열린 서버 — TCP 또는 UDP
enum Link {
    Tcp(TcpSession),
    Udp(UdpSession),
}

impl Link {
    fn stop(self) {
        match self {
            Self::Tcp(s) => s.stop(),
            Self::Udp(s) => s.stop(),
        }
    }

    fn set_log(&self, path: Option<String>) -> Result<(), String> {
        match self {
            Self::Tcp(s) => s.set_log(path),
            Self::Udp(s) => s.set_log(path),
        }
    }
}

#[derive(Default)]
struct App {
    server: Arc<Mutex<Server>>,
    stats: Arc<Mutex<Stats>>,
    /// 서버는 하나 — 보관함 이름 "main". 스스로 닫히면 알아서 빠진다
    sess: Arc<Registry<Link>>,
}

const MAIN: &str = "main";

/// 요청 하나의 결과를 통계에 넣고, 사건 줄 문구를 돌려준다
fn record(st: &mut Stats, o: &Outcome) -> Option<String> {
    if o.written {
        st.writes += 1;
    }
    if o.result == "ignored" {
        st.ignored += 1;
        return Some(tr!("IGNORED 이 형식(3E/4E·이진/ASCII)의 요청이 아님", "IGNORED not a request in this format (3E/4E, binary/ASCII)").into());
    }
    st.requests += 1;
    *st.per_cmd.entry(format!("{:04X}", o.command)).or_default() += 1;
    match o.result {
        "ok" => {
            st.ok += 1;
            None
        }
        "no-response" => {
            st.no_response += 1;
            Some(format!("NO-RESPONSE (fault) {:04X}", o.command))
        }
        _ => {
            st.errors += 1;
            let code = o.end_code.unwrap_or(0);
            *st.per_end.entry(format!("{code:04X}")).or_default() += 1;
            Some(format!("END {code:04X} {} — {:04X}{}", mc::end_code_text(code), o.command, if o.faulted { " (fault)" } else { "" }))
        }
    }
}

/// 응답기 — TCP 는 연결마다 따로 기다리므로 지연 중에도 다음 요청을 받는다
fn responder(server: Arc<Mutex<Server>>, stats: Arc<Mutex<Stats>>) -> Responder {
    Box::new(move |frame: &[u8]| {
        let (bytes, o, jitter) = {
            let mut sv = server.lock().unwrap();
            let (b, o) = sv.handle(frame);
            (b, o, sv.faults.delay_max_ms > sv.faults.delay_ms)
        };
        let mut note = record(&mut stats.lock().unwrap(), &o);
        if jitter && o.delay_ms > 0 && bytes.is_some() {
            let d = format!("DELAY {} ms (fault)", o.delay_ms);
            note = Some(note.map_or(d.clone(), |n| format!("{n} · {d}")));
        }
        Reply { bytes, delay_ms: o.delay_ms, note }
    })
}

/// 화면으로 보내는 통로 — 데이터 줄마다 MC 한 줄 풀이(«sum»)를 붙인다(받은 것 = 요청, 보낸 것 = 응답)
fn forward(fmt: Format, ch: Channel<Value>) -> impl Fn(SessionEvent) + Send + Sync + 'static {
    move |e: SessionEvent| {
        let mut v = serde_json::to_value(&e).unwrap_or(Value::Null);
        if let SessionEvent::Frames { frames } = &e
            && let Some(arr) = v.get_mut("frames").and_then(|f| f.as_array_mut())
        {
            for (f, j) in frames.iter().zip(arr.iter_mut()) {
                let s = match f.dir {
                    "rx" => mc::describe_request(fmt, &f.bytes),
                    "tx" => mc::describe_response(fmt, &f.bytes),
                    _ => None,
                };
                if let Some(s) = s {
                    j["sum"] = Value::String(s);
                }
            }
        }
        let _ = ch.send(v);
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
enum Transport {
    Tcp,
    Udp,
}

/// 서버 설정
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StartConfig {
    transport: Transport,
    /// 묶을 주소 — 기본 127.0.0.1(이 PC 안에서만). 0.0.0.0 = 모든 랜카드
    host: String,
    port: u16,
    format: Format,
}

/// 서버를 연다. 실제로 묶인 주소를 돌려준다(포트 0 이면 운영체제가 고른 포트)
#[tauri::command(async)]
fn start(app: State<App>, config: StartConfig, on_event: Channel<Value>) -> Result<String, String> {
    let reg = app.sess.clone();
    let opening = reg.begin(MAIN).map_err(|_| tr!("이미 시작했거나 여는 중입니다", "Already started or starting").to_string())?;
    app.server.lock().unwrap().format = config.format;
    let sink = auto_remove_sink(reg.clone(), MAIN.into(), opening.generation, forward(config.format, on_event));
    let r = responder(app.server.clone(), app.stats.clone());
    let host = config.host.trim().to_string();
    let (link, local) = match config.transport {
        Transport::Tcp => {
            let cfg = TcpConfig { mode: TcpMode::Server, host, port: config.port, no_delay: true, auto_reconnect: false, reconnect_ms: 2_000, echo: false };
            let s = TcpSession::start(cfg, config.format.frame_mode(), None, Some(r), sink)?;
            // TCP 는 점대점이라 선로 에코가 없다 — 같은 요청을 곧바로 다시 보내도 답하도록 시간 창은 끈다
            s.set_echo_guard(None);
            let local = s.local_addr().map(|a| a.to_string()).unwrap_or_default();
            (Link::Tcp(s), local)
        }
        Transport::Udp => {
            let cfg = UdpConfig {
                bind_host: host,
                bind_port: config.port,
                remote_host: String::new(),
                remote_port: 0,
                broadcast: false,
                multicast_group: String::new(),
                multicast_if: "0.0.0.0".into(),
                multicast_ttl: 1,
                multicast_loop: true,
                echo: false,
            };
            let s = UdpSession::start(cfg, None, Some(r), sink)?;
            let local = s.local_addr().to_string();
            (Link::Udp(s), local)
        }
    };
    opening.finish(link);
    Ok(local)
}

#[tauri::command(async)]
fn stop(app: State<App>) {
    if let Some(s) = app.sess.take(MAIN) {
        s.stop();
    }
}

/// TCP 클라이언트 하나 끊기
#[tauri::command]
fn kick(app: State<App>, id: u64) -> Result<(), String> {
    app.sess.with(MAIN, |s| {
        if let Link::Tcp(t) = s {
            t.kick(id);
        }
    })
}

#[tauri::command(async)]
fn set_log(app: State<App>, path: Option<String>) -> Result<(), String> {
    app.sess.with(MAIN, |s| s.set_log(path))?
}

#[tauri::command]
fn set_faults(app: State<App>, faults: Faults) -> Result<(), String> {
    if faults.target.probability > 100 {
        return Err(tr!("확률은 0~100% 입니다", "Probability is 0–100%").into());
    }
    app.server.lock().unwrap().set_faults(faults);
    Ok(())
}

/// 연결 중에도 바꿀 수 있는 선택(자기 국 요청만)
#[tauri::command]
fn set_options(app: State<App>, options: Options) {
    app.server.lock().unwrap().options = options;
}

/// 디바이스 하나의 자동 변화 목록을 통째로 바꾼다
#[tauri::command]
fn set_sims(app: State<App>, dev: Dev, sims: Vec<SimSpec>) -> Result<(), String> {
    app.server.lock().unwrap().set_sims(dev, sims)
}

/// 디바이스 크기(점 수). 넘는 번호를 요청하면 C056
#[tauri::command]
fn set_size(app: State<App>, dev: Dev, size: u32) -> Result<(), String> {
    app.server.lock().unwrap().mem.resize(dev, size)
}

/// 디바이스 표(이름·코드·비트·16진·지금 크기)
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DevRow {
    dev: Dev,
    code: u8,
    bits: bool,
    hex: bool,
    default_size: u32,
    size: u32,
}

#[tauri::command]
fn devices(app: State<App>) -> Vec<DevRow> {
    let sv = app.server.lock().unwrap();
    mc::DEVICES.iter().map(|d| DevRow { dev: d.dev, code: d.code, bits: d.bits, hex: d.hex, default_size: d.default_size, size: sv.mem.size(d.dev) }).collect()
}

#[tauri::command]
fn get_values(app: State<App>, dev: Dev, start: u32, count: u32) -> Result<Vec<u16>, String> {
    app.server.lock().unwrap().mem.get(dev, start, count)
}

#[tauri::command]
fn set_values(app: State<App>, dev: Dev, start: u32, values: Vec<u16>) -> Result<(), String> {
    app.server.lock().unwrap().mem.set(dev, start, &values)
}

#[tauri::command]
fn get_stats(app: State<App>) -> Stats {
    app.stats.lock().unwrap().clone()
}

#[tauri::command]
fn reset_stats(app: State<App>) {
    *app.stats.lock().unwrap() = Stats::default();
}

/// 화면 내용·디바이스 저장 — 사용자가 저장 대화상자에서 고른 경로만
#[tauri::command(async)]
fn write_text(path: String, text: String) -> Result<(), String> {
    std::fs::write(&path, text).map_err(|e| format!("{path}: {e}"))
}

#[tauri::command(async)]
fn read_text(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("{path}: {e}"))
}

/// 명령줄 인자 — 처음 한 번만 준다. 뜻 풀이는 화면(src/launch.ts — «--auto» 만)
#[tauri::command]
fn launch_args() -> Vec<String> {
    portdock_core::launch::take_args()
}

/// 서버·기록 중 절전 막기 — 화면 설정이 켜져 있고 시작했을 때 true
#[tauri::command]
fn keep_awake(on: bool) -> bool {
    portdock_core::power::keep_awake(on)
}

/// 화면 언어를 백엔드 문구(오류·사건 줄·풀이)에도 적용
#[tauri::command]
fn set_lang(lang: String) {
    portdock_core::i18n::set_lang(&lang);
}

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

#[tauri::command(async)]
fn report_read_dump(name: String) -> Result<tauri::ipc::Response, String> {
    portdock_core::report::read_dump(&name).map(tauri::ipc::Response::new)
}

/// 값 자동 변화 — 화면이 숨어 있어도 돌도록 백엔드에서 100ms 마다
fn start_ticker(server: Arc<Mutex<Server>>) {
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_millis(100));
            let mut sv = server.lock().unwrap_or_else(|e| e.into_inner());
            if sv.has_sims() {
                sv.tick(Instant::now());
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(e) = tauri::webview_version() {
        portdock_core::report::webview_missing(&e.to_string());
    }
    portdock_core::report::install("plc-simulator", env!("CARGO_PKG_VERSION"));
    portdock_core::report::crash_monitor_or_attach();
    portdock_core::report::test_crash_if_asked();
    let app = App::default();
    start_ticker(app.server.clone());
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
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
            #[cfg(windows)]
            if let Some(w) = tauri::Manager::get_webview_window(app, "main") {
                let _ = w.with_webview(|wv| portdock_core::report::watch_webview2(&wv.controller()));
            }
            // 창은 숨긴 채 만들고 화면이 첫 그림 뒤 보인다 — 끝내 부르지 못하면 4초 뒤 여기서
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
            start,
            stop,
            kick,
            set_log,
            set_faults,
            set_options,
            set_sims,
            set_size,
            devices,
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
    use portdock_core::event::EventSink;
    use std::io::{Read, Write};
    use std::net::{TcpStream, UdpSocket};

    /// 3E 이진 루프백 요청(«ABC») — 길이 = 타이머 2 + 명령 2 + 서브 2 + 개수 2 + 데이터 3 = 0B
    fn loop_req() -> Vec<u8> {
        vec![0x50, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00, 0x0B, 0x00, 0x10, 0x00, 0x19, 0x06, 0x00, 0x00, 0x03, 0x00, 0x41, 0x42, 0x43]
    }

    #[test]
    fn responder_counts() {
        let server = Arc::new(Mutex::new(Server::with_seed(1)));
        let stats = Arc::new(Mutex::new(Stats::default()));
        let mut r = responder(server.clone(), stats.clone());
        assert!(r(&loop_req()).bytes.is_some());
        // 모르는 명령 → END C059
        let bad = [0x50, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00, 0x06, 0x00, 0x10, 0x00, 0x01, 0x01, 0x00, 0x00];
        assert!(r(&bad).note.unwrap().starts_with("END C059"));
        // 4E 는 이 서버(3E)의 형식이 아님
        assert!(r(&[0x54, 0x00, 0x01, 0x00, 0x00, 0x00]).note.unwrap().starts_with("IGNORED"));
        // 쓰기 수
        let wr = [0x50, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00, 0x0E, 0x00, 0x10, 0x00, 0x01, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0xA8, 0x01, 0x00, 0x05, 0x00];
        assert!(r(&wr).note.is_none());
        let st = stats.lock().unwrap().clone();
        assert_eq!((st.requests, st.ok, st.errors, st.ignored, st.writes), (3, 2, 1, 1, 1));
        assert_eq!(st.per_cmd.get("0619"), Some(&1));
        assert_eq!(st.per_end.get("C059"), Some(&1));
        assert_eq!(server.lock().unwrap().mem.get(Dev::D, 0, 1).unwrap(), [5]);
    }

    #[test]
    fn config_shape() {
        let c: StartConfig = serde_json::from_str(r#"{"transport":"udp","host":"127.0.0.1","port":5000,"format":{"frame":"4e","code":"ascii"}}"#).unwrap();
        assert_eq!((c.transport, c.port, c.format.frame), (Transport::Udp, 5000, mc::FrameKind::E4));
    }

    /// 실제 소켓(127.0.0.1)으로 — TCP 요청이 쪼개져 오거나 둘이 붙어 와도 하나씩 답한다
    #[test]
    fn tcp_server_on_loopback() {
        let server = Arc::new(Mutex::new(Server::with_seed(1)));
        let stats = Arc::new(Mutex::new(Stats::default()));
        let cfg = TcpConfig { mode: TcpMode::Server, host: "127.0.0.1".into(), port: 0, no_delay: true, auto_reconnect: false, reconnect_ms: 2_000, echo: false };
        let fmt = Format::default();
        let s = TcpSession::start(cfg, fmt.frame_mode(), None, Some(responder(server, stats.clone())), EventSink::new(|_| {})).unwrap();
        s.set_echo_guard(None);
        let addr = s.local_addr().unwrap();
        let mut c = TcpStream::connect(addr).unwrap();
        c.set_read_timeout(Some(Duration::from_secs(3))).unwrap();
        let req = loop_req();
        c.write_all(&req[..5]).unwrap();
        std::thread::sleep(Duration::from_millis(30));
        c.write_all(&req[5..]).unwrap();
        c.write_all(&[req.clone(), req.clone()].concat()).unwrap();
        let want = [0xD0, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00, 0x07, 0x00, 0x00, 0x00, 0x03, 0x00, 0x41, 0x42, 0x43];
        let mut got = vec![0u8; want.len() * 3];
        c.read_exact(&mut got).unwrap();
        assert_eq!(got, [want, want, want].concat());
        s.stop();
        assert_eq!(stats.lock().unwrap().ok, 3);
    }

    #[test]
    fn udp_server_on_loopback() {
        let server = Arc::new(Mutex::new(Server::with_seed(1)));
        server.lock().unwrap().format = Format { frame: mc::FrameKind::E3, code: mc::DataCode::Ascii };
        let stats = Arc::new(Mutex::new(Stats::default()));
        let cfg = UdpConfig {
            bind_host: "127.0.0.1".into(),
            bind_port: 0,
            remote_host: String::new(),
            remote_port: 0,
            broadcast: false,
            multicast_group: String::new(),
            multicast_if: "0.0.0.0".into(),
            multicast_ttl: 1,
            multicast_loop: true,
            echo: false,
        };
        let s = UdpSession::start(cfg, None, Some(responder(server, stats)), EventSink::new(|_| {})).unwrap();
        let c = UdpSocket::bind("127.0.0.1:0").unwrap();
        c.set_read_timeout(Some(Duration::from_secs(3))).unwrap();
        c.send_to(b"500000FF03FF0000130010061900000003ABC", s.local_addr()).unwrap();
        let mut buf = [0u8; 256];
        let n = c.recv(&mut buf).unwrap();
        assert_eq!(&buf[..n], b"D00000FF03FF00000B00000003ABC");
        s.stop();
    }

    /// 교차 시험용(수동, 127.0.0.1 만): TCP 15000 3E 이진 · 15002 3E ASCII · 15003 4E 이진 · 15004 4E ASCII, UDP 15001 3E 이진을
    /// PD_CROSS_SECS 초(기본 60) 연다. `cargo test -p portdock-plc-simulator --lib cross_server -- --ignored --nocapture` 후
    /// 다른 프로그램(독립 클라이언트)으로 붙는다
    #[test]
    #[ignore]
    fn cross_server() {
        use mc::{DataCode, FrameKind};
        let stats = Arc::new(Mutex::new(Stats::default()));
        let srv = |fmt: Format| {
            let s = Arc::new(Mutex::new(Server::with_seed(1)));
            s.lock().unwrap().format = fmt;
            s
        };
        let mut tcps = Vec::new();
        for (port, frame, code) in [(15000, FrameKind::E3, DataCode::Binary), (15002, FrameKind::E3, DataCode::Ascii), (15003, FrameKind::E4, DataCode::Binary), (15004, FrameKind::E4, DataCode::Ascii)] {
            let fmt = Format { frame, code };
            let cfg = TcpConfig { mode: TcpMode::Server, host: "127.0.0.1".into(), port, no_delay: true, auto_reconnect: false, reconnect_ms: 2_000, echo: false };
            let s = TcpSession::start(cfg, fmt.frame_mode(), None, Some(responder(srv(fmt), stats.clone())), EventSink::new(|_| {})).unwrap();
            s.set_echo_guard(None);
            tcps.push(s);
        }
        let ucfg = UdpConfig {
            bind_host: "127.0.0.1".into(),
            bind_port: 15001,
            remote_host: String::new(),
            remote_port: 0,
            broadcast: false,
            multicast_group: String::new(),
            multicast_if: "0.0.0.0".into(),
            multicast_ttl: 1,
            multicast_loop: true,
            echo: false,
        };
        let u = UdpSession::start(ucfg, None, Some(responder(srv(Format::default()), stats.clone())), EventSink::new(|_| {})).unwrap();
        println!("READY");
        let secs = std::env::var("PD_CROSS_SECS").ok().and_then(|v| v.parse().ok()).unwrap_or(60);
        std::thread::sleep(Duration::from_secs(secs));
        println!("stats: {}", serde_json::to_string(&*stats.lock().unwrap()).unwrap());
        for s in tcps {
            s.stop();
        }
        u.stop();
    }
}
