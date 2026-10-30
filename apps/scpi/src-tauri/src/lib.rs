//! PortDock SCPI — SCPI 계측기(전원·멀티미터·오실로스코프 …)와 묻고 답하기. LAN raw socket(TCP 5025)·RS-232.
//! 주고받기·블록 데이터·오류 큐는 portdock_core::scpi 가 한다. 여기는 연결 하나를 쥐고 명령을 잇기만.
//! 한 번에 한 질의 — 화면이 기다렸다가 다음을 보낸다(반복 측정도 화면이 주기를 잰다).

use portdock_core::event::now_ms;
use portdock_core::ports;
use portdock_core::scpi::{Body, ErrEntry, Exchange, Instrument, Reply, ScpiError, SerialOpts, Term};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::State;

/// 화면 기록에 넘기는 바이트 상한(블록 수 MB 를 통째로 넘기지 않는다 — 파일 저장은 save_block)
const LOG_CAP: usize = 4096;
/// 블록 HEX 미리보기 크기
const PREVIEW: usize = 1024;

#[derive(Default)]
struct App {
    inst: Mutex<Option<Instrument>>,
    /// 연결의 멈춤 깃발 — 질의가 inst 를 쥐고 있어도 세울 수 있게 따로 둔다
    cancel: Mutex<Option<Arc<AtomicBool>>>,
    /// 마지막으로 받은 블록 데이터(파일로 저장할 때)
    block: Mutex<Option<Vec<u8>>>,
}

fn lock<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

/// 화면이 받는 응답
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReplyOut {
    /// "text" | "block"
    kind: &'static str,
    /// 글 응답(줄 끝 뗀 것). 블록이면 데이터를 글로 읽을 수 있을 때만(앞 4096바이트)
    text: String,
    /// 블록 머리(«#41000»), 글이면 빈칸
    header: String,
    /// 블록 데이터 길이(글이면 글 바이트 수)
    len: usize,
    indefinite: bool,
    /// 블록에 글로 읽을 수 없는 바이트가 있는지
    binary: bool,
    /// 블록 앞부분(HEX 미리보기)
    preview: Vec<u8>,
    /// 받은 그대로(앞 LOG_CAP 바이트)
    raw: Vec<u8>,
    raw_len: usize,
}

fn printable(b: &[u8]) -> bool {
    b.iter().all(|&x| (x >= 0x20 && x != 0x7f) || matches!(x, b'\r' | b'\n' | b'\t'))
}

fn reply_out(r: &Reply) -> ReplyOut {
    let raw = r.raw[..r.raw.len().min(LOG_CAP)].to_vec();
    match &r.body {
        Body::Text(s) => ReplyOut { kind: "text", text: s.clone(), header: String::new(), len: s.len(), indefinite: false, binary: false, preview: vec![], raw, raw_len: r.raw.len() },
        Body::Block { header, data, indefinite } => {
            let binary = !printable(data);
            let text = if binary { String::new() } else { String::from_utf8_lossy(&data[..data.len().min(LOG_CAP)]).into_owned() };
            ReplyOut {
                kind: "block",
                text,
                header: header.clone(),
                len: data.len(),
                indefinite: *indefinite,
                binary,
                preview: data[..data.len().min(PREVIEW)].to_vec(),
                raw,
                raw_len: r.raw.len(),
            }
        }
    }
}

/// 주고받기 한 번 — 화면 기록·응답 칸이 쓴다
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExchangeOut {
    /// 보낸 시각(ms)
    ts: u64,
    /// 받은 시각(ms) — 응답이 없으면 0
    rx_ts: u64,
    sent: Vec<u8>,
    /// 질의 전에 버린 묵은 바이트 수(지난 질의의 늦은 답)
    stale: usize,
    reply: Option<ReplyOut>,
    /// 다 보낸 때부터 응답이 끝난 때까지(ms)
    ms: f64,
}

fn exchange_out(app: &App, x: &Exchange, ts: u64) -> ExchangeOut {
    if let Body::Block { data, .. } = &x.reply.body {
        *lock(&app.block) = Some(data.clone());
    }
    let ms = x.elapsed.as_secs_f64() * 1000.0;
    ExchangeOut { ts, rx_ts: ts + ms as u64, sent: x.sent.clone(), stale: x.stale.len(), reply: Some(reply_out(&x.reply)), ms }
}

/// 연결로 일을 한다. 끊김(장비가 닫음·장치 빠짐)이면 연결을 버린다 — 화면은 오류 kind 로 안다
fn with_inst<R>(app: &App, f: impl FnOnce(&mut Instrument) -> Result<R, ScpiError>) -> Result<R, ScpiError> {
    let mut g = lock(&app.inst);
    let inst = g.as_mut().ok_or_else(ScpiError::not_connected)?;
    let r = f(inst);
    if let Err(e) = &r
        && e.fatal()
    {
        *g = None;
        *lock(&app.cancel) = None;
    }
    r
}

fn timeout(ms: u64) -> Duration {
    Duration::from_millis(ms.clamp(10, 600_000))
}

#[tauri::command(async)]
fn list_ports() -> Vec<ports::PortInfo> {
    ports::list()
}

/// LAN 설정
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NetConfig {
    host: String,
    port: u16,
    #[serde(default)]
    term: Term,
    #[serde(default = "connect_ms")]
    connect_timeout_ms: u64,
}

fn connect_ms() -> u64 {
    3000
}

fn install(app: &App, inst: Instrument) -> Result<(), String> {
    let mut g = lock(&app.inst);
    if g.is_some() {
        return Err(portdock_core::tr!("이미 연결돼 있습니다", "Already connected").into());
    }
    *lock(&app.cancel) = Some(inst.cancel_flag());
    *g = Some(inst);
    Ok(())
}

#[tauri::command(async)]
fn open_tcp(app: State<App>, config: NetConfig) -> Result<(), String> {
    if lock(&app.inst).is_some() {
        return Err(portdock_core::tr!("이미 연결돼 있습니다", "Already connected").into());
    }
    let inst = Instrument::connect_tcp(&config.host, config.port, Duration::from_millis(config.connect_timeout_ms.clamp(200, 30_000)), config.term)?;
    install(&app, inst)
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SerialConfig {
    #[serde(flatten)]
    opts: SerialOpts,
    #[serde(default)]
    term: Term,
}

#[tauri::command(async)]
fn open_serial(app: State<App>, config: SerialConfig) -> Result<(), String> {
    if lock(&app.inst).is_some() {
        return Err(portdock_core::tr!("이미 연결돼 있습니다", "Already connected").into());
    }
    let inst = Instrument::open_serial(&config.opts, config.term)?;
    install(&app, inst)
}

/// 끊기 — 기다리던 질의가 있으면 먼저 멈추게 한다
#[tauri::command(async)]
fn close(app: State<App>) {
    if let Some(c) = lock(&app.cancel).take() {
        c.store(true, Ordering::SeqCst);
    }
    lock(&app.inst).take();
}

/// 기다리는 질의 멈춤(연결은 그대로)
#[tauri::command]
fn cancel(app: State<App>) {
    if let Some(c) = lock(&app.cancel).as_ref() {
        c.store(true, Ordering::SeqCst);
    }
}

/// 연결 중 줄 끝 바꾸기
#[tauri::command(async)]
fn set_term(app: State<App>, term: Term) -> Result<(), ScpiError> {
    with_inst(&app, |i| {
        i.set_term(term);
        Ok(())
    })
}

/// 쓰기 — 답을 기다리지 않는다
#[tauri::command(async)]
fn write_cmd(app: State<App>, cmd: String) -> Result<ExchangeOut, ScpiError> {
    let ts = now_ms();
    let sent = with_inst(&app, |i| i.write(&cmd))?;
    Ok(ExchangeOut { ts, rx_ts: 0, sent, stale: 0, reply: None, ms: 0.0 })
}

/// 읽기 — 보내지 않고 응답 하나만
#[tauri::command(async)]
fn read_reply(app: State<App>, timeout_ms: u64) -> Result<ExchangeOut, ScpiError> {
    let ts = now_ms();
    let t0 = std::time::Instant::now();
    let r = with_inst(&app, |i| i.read(timeout(timeout_ms)))?;
    let x = Exchange { stale: vec![], sent: vec![], reply: r, elapsed: t0.elapsed() };
    Ok(exchange_out(&app, &x, ts))
}

/// 질의 — 보내고 응답 하나(글 또는 블록)
#[tauri::command(async)]
fn query(app: State<App>, cmd: String, timeout_ms: u64) -> Result<ExchangeOut, ScpiError> {
    let ts = now_ms();
    let x = with_inst(&app, |i| i.query(&cmd, timeout(timeout_ms)))?;
    Ok(exchange_out(&app, &x, ts))
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DrainOut {
    errors: Vec<ErrEntry>,
    exchanges: Vec<ExchangeOut>,
    complete: bool,
}

/// 오류 큐 비우기 — `cmd`(기본 SYST:ERR?)를 0 이 나올 때까지(최대 max 번)
#[tauri::command(async)]
fn drain_errors(app: State<App>, cmd: Option<String>, timeout_ms: u64, max: Option<usize>) -> Result<DrainOut, ScpiError> {
    let cmd = cmd.filter(|c| !c.trim().is_empty()).unwrap_or_else(|| "SYST:ERR?".into());
    let ts = now_ms();
    let d = with_inst(&app, |i| i.drain_errors(&cmd, timeout(timeout_ms), max.unwrap_or(50).clamp(1, 1000)))?;
    let mut at = ts;
    let exchanges = d
        .exchanges
        .iter()
        .map(|x| {
            let o = exchange_out(&app, x, at);
            at = o.rx_ts;
            o
        })
        .collect();
    Ok(DrainOut { errors: d.errors, exchanges, complete: d.complete })
}

/// 마지막 블록 데이터를 파일로 — 사용자가 저장 대화상자에서 고른 경로만
#[tauri::command(async)]
fn save_block(app: State<App>, path: String) -> Result<usize, String> {
    let data = lock(&app.block).clone().ok_or_else(|| portdock_core::tr!("받은 블록 데이터가 없습니다", "No block data received yet").to_string())?;
    std::fs::write(&path, &data).map_err(|e| format!("{path}: {e}"))?;
    Ok(data.len())
}

/// 화면 내용·측정 CSV 저장 — 사용자가 저장 대화상자에서 고른 경로만
#[tauri::command(async)]
fn write_text(path: String, text: String) -> Result<(), String> {
    std::fs::write(&path, text).map_err(|e| format!("{path}: {e}"))
}

/// 파일 기록 이어 쓰기 — 화면이 고른 경로만
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

/// 화면 언어를 백엔드 문구(오류)에도 적용
#[tauri::command]
fn set_lang(lang: String) {
    portdock_core::i18n::set_lang(&lang);
}

/// 명령줄 인자(0.3.0) — 처음 한 번만 준다. 뜻 풀이는 화면(src/launch.ts — 지금은 --auto 만)
#[tauri::command]
fn launch_args() -> Vec<String> {
    portdock_core::launch::take_args()
}

/// 연결·기록 중 절전 막기(0.3.0) — 지금 막고 있는지 돌려준다
#[tauri::command]
fn keep_awake(on: bool) -> bool {
    portdock_core::power::keep_awake(on)
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

/// 여러 PortDock 앱이 함께 보는 사용 통계 동의(0.6.0) — 아직 묻지 않은 앱은 이 값을 기본으로 쓴다
#[tauri::command]
fn consent_get() -> portdock_core::consent::Consent {
    portdock_core::consent::read()
}

#[tauri::command]
fn consent_set(usage_stats: bool) -> Result<(), String> {
    portdock_core::consent::write(usage_stats)
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
    portdock_core::report::install("scpi", env!("CARGO_PKG_VERSION"));
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
            consent_get,
            consent_set,
            report_read_dump,
            list_ports,
            open_tcp,
            open_serial,
            close,
            cancel,
            set_term,
            write_cmd,
            read_reply,
            query,
            drain_errors,
            save_block,
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
    use portdock_core::scpi::ErrKind;

    #[test]
    fn config_shapes() {
        let n: NetConfig = serde_json::from_str(r#"{"host":"192.168.0.20","port":5025}"#).unwrap();
        assert_eq!((n.port, n.term, n.connect_timeout_ms), (5025, Term::Lf, 3000));
        let s: SerialConfig = serde_json::from_str(r#"{"port":"COM3","baud":9600,"dataBits":8,"parity":"none","stopBits":2,"flow":"hardware","term":"crlf"}"#).unwrap();
        assert_eq!((s.opts.port.as_str(), s.opts.stop_bits, s.term), ("COM3", 2, Term::Crlf));
        let s: SerialConfig = serde_json::from_str(r#"{"port":"COM3","baud":9600}"#).unwrap();
        assert_eq!((s.opts.data_bits, s.opts.stop_bits, s.term), (8, 1, Term::Lf));
    }

    #[test]
    fn reply_shapes() {
        let t = reply_out(&Reply { raw: b"+1.0E+00\n".to_vec(), body: Body::Text("+1.0E+00".into()) });
        assert_eq!((t.kind, t.text.as_str(), t.raw_len), ("text", "+1.0E+00", 9));
        let b = reply_out(&Reply { raw: b"#14\x00\x01AB\n".to_vec(), body: Body::Block { header: "#14".into(), data: vec![0, 1, b'A', b'B'], indefinite: false } });
        assert_eq!((b.kind, b.binary, b.len, b.preview.len(), b.text.as_str()), ("block", true, 4, 4, ""));
        let a = reply_out(&Reply { raw: b"#13abc\n".to_vec(), body: Body::Block { header: "#13".into(), data: b"abc".to_vec(), indefinite: false } });
        assert_eq!((a.binary, a.text.as_str()), (false, "abc"));
        // 오류 모양 — 화면은 kind 로 끊김을 안다
        let e = serde_json::to_value(ScpiError::new(ErrKind::Timeout, "x")).unwrap();
        assert_eq!(e, serde_json::json!({ "kind": "timeout", "message": "x" }));
    }

    #[test]
    fn not_connected_without_instrument() {
        let app = App::default();
        let e = with_inst(&app, |i| i.write("*IDN?")).unwrap_err();
        assert_eq!(e.kind, ErrKind::NotConnected);
    }
}
