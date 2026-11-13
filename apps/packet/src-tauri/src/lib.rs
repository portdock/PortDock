//! PortDock Packet — pcap/pcapng 파일을 열어 세 칸 화면으로 보여 주는 앱(M2).
//! 읽기만 한다 — 패킷을 만들어 보내지 않는다. 엔진은 crates/packet. 무거운 명령은 전부 `command(async)`(스레드)에서.

mod dto;
mod live;

use dto::*;
use portdock_packet::analysis::{PairStatus, ann};
use portdock_packet::capture::NO_TS;
use portdock_packet::devmap::{DeviceMap, RegisterNamer};
use portdock_packet::dissect::{Dissection, Opts, Prefs, Severity};
use portdock_packet::expert;
use portdock_packet::fields;
use portdock_packet::filter::Filter;
use portdock_packet::industrial::App as Proto;
use portdock_packet::session::Session;
use portdock_packet::stats::{self, ConvKind};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock, RwLock};
use std::time::Instant;
use tauri::{AppHandle, Emitter, State};

struct View {
    idx: Option<Vec<u32>>,
}

impl View {
    fn len(&self, total: usize) -> usize {
        self.idx.as_ref().map_or(total, |v| v.len())
    }
    fn at(&self, pos: usize) -> usize {
        self.idx.as_ref().map_or(pos, |v| v[pos] as usize)
    }
    fn pos_of(&self, i: usize) -> Option<usize> {
        match &self.idx {
            None => Some(i),
            Some(v) => v.binary_search(&(i as u32)).ok(),
        }
    }
    fn which(&self) -> Option<&[u32]> {
        self.idx.as_deref()
    }
}

struct Prepared {
    summary: Summary,
    experts: Vec<ExpertRaw>,
}

struct Loaded {
    sess: Session,
    path: String,
    name: String,
    size: u64,
    sid: u64,
    view: RwLock<Arc<View>>,
    filter_seq: AtomicU64,
    analysis_ready: AtomicBool,
    prepared: OnceLock<Prepared>,
    namer: RwLock<Option<Arc<DeviceMap>>>,
}

impl Loaded {
    fn view(&self) -> Arc<View> {
        self.view.read().unwrap_or_else(|e| e.into_inner()).clone()
    }
}

#[derive(Default)]
struct AppState {
    cur: Mutex<Option<Arc<Loaded>>>,
    sid: AtomicU64,
    live: Mutex<Option<live::Live>>,
}

fn lock<T>(m: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

fn current(st: &State<AppState>) -> Result<Arc<Loaded>, String> {
    lock(&st.cur).clone().ok_or_else(|| portdock_core::tr!("열린 파일이 없습니다", "No file is open").to_string())
}

const COLS: Opts = Opts::COLUMNS;
const SCAN: Opts = Opts { depth: portdock_packet::dissect::Depth::App, tree: false, columns: false, apps: portdock_packet::dissect::APP_ALL };

// ---------------------------------------------------------------- 파일

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct FileInfo {
    sid: u64,
    name: String,
    path: String,
    size: u64,
    packets: usize,
    format: &'static str,
    truncated: bool,
    first_sec: i64,
    duration_ns: i64,
    open_ms: u64,
}

fn ts_range(s: &Session) -> (i64, i64) {
    let mut f = None;
    let mut l = None;
    for p in s.cap.packets.iter().filter(|p| p.has_ts()) {
        f.get_or_insert(p.ts_ns);
        l = Some(p.ts_ns);
    }
    match (f, l) {
        (Some(a), Some(b)) => (a.div_euclid(1_000_000_000), b - a),
        _ => (0, 0),
    }
}

fn info_of(l: &Loaded, open_ms: u64) -> FileInfo {
    let (first_sec, duration_ns) = ts_range(&l.sess);
    FileInfo {
        sid: l.sid,
        name: l.name.clone(),
        path: l.path.clone(),
        size: l.size,
        packets: l.sess.cap.len(),
        format: match l.sess.cap.info.format {
            portdock_packet::capture::Format::Pcap => "pcap",
            portdock_packet::capture::Format::Pcapng => "pcapng",
        },
        truncated: l.sess.cap.info.truncated_file,
        first_sec,
        duration_ns,
        open_ms,
    }
}

fn prepare(l: &Loaded) -> Prepared {
    let a = l.sess.analysis();
    let (first_sec, duration_ns) = ts_range(&l.sess);
    let mut apps = Vec::new();
    for (key, app, filter) in [("modbus", Proto::Modbus, "mbtcp"), ("modbus", Proto::ModbusRtu, "modbus"), ("mc", Proto::Mc, "mc"), ("xgt", Proto::Xgt, "xgt")] {
        let rt = stats::response_summary(a, Some(app));
        if rt.pairs + rt.no_response + rt.pending + rt.orphans > 0 {
            apps.push(AppSum { key, name: app.name(), filter, rt: rt.into() });
        }
    }
    let summary = Summary {
        packets: l.sess.cap.len(),
        first_sec,
        duration_ns,
        flows: a.flows.len(),
        overall: stats::response_summary(a, None).into(),
        apps,
    };
    let mut experts = Vec::new();
    let mut d = Dissection::default();
    for i in 0..l.sess.cap.len() {
        l.sess.dissect_into(&mut d, i, SCAN, true, None);
        for e in &d.experts {
            if experts.len() < 200_000 {
                experts.push(ExpertRaw { frame: i as u32 + 1, severity: sev_name(e.severity), key: e.key, code: e.code, text: e.text.clone() });
            }
        }
    }
    Prepared { summary, experts }
}

#[tauri::command(async)]
fn open_file(app: AppHandle, st: State<AppState>, path: String) -> Result<FileInfo, String> {
    load_path(&app, &st, path, None)
}

fn load_path(app: &AppHandle, st: &State<AppState>, path: String, name_override: Option<String>) -> Result<FileInfo, String> {
    let app = app.clone();
    let t = Instant::now();
    let sess = Session::open(&path, Prefs::default()).map_err(|e| format!("{path}: {e}"))?;
    let size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
    let name = name_override.unwrap_or_else(|| std::path::Path::new(&path).file_name().map(|s| s.to_string_lossy().into_owned()).unwrap_or_else(|| path.clone()));
    let sid = st.sid.fetch_add(1, Ordering::SeqCst) + 1;
    let l = Arc::new(Loaded {
        sess,
        path,
        name,
        size,
        sid,
        view: RwLock::new(Arc::new(View { idx: None })),
        filter_seq: AtomicU64::new(0),
        analysis_ready: AtomicBool::new(false),
        prepared: OnceLock::new(),
        namer: RwLock::new(None),
    });
    let info = info_of(&l, t.elapsed().as_millis() as u64);
    *lock(&st.cur) = Some(l.clone());
    std::thread::spawn(move || {
        l.sess.analysis();
        l.analysis_ready.store(true, Ordering::SeqCst);
        let _ = app.emit("pk-analysis", l.sid);
        let _ = l.prepared.set(prepare(&l));
        let _ = app.emit("pk-ready", l.sid);
    });
    Ok(info)
}

// ---------------------------------------------------------------- 실시간 캡처(M3)

#[tauri::command(async)]
fn capture_env() -> live::CapEnv {
    live::env()
}

#[tauri::command(async)]
fn capture_start(st: State<AppState>, opts: live::StartDto) -> Result<(), String> {
    let mut g = lock(&st.live);
    if g.as_ref().is_some_and(|l| l.stats().running) {
        return Err(portdock_core::tr!("이미 캡처 중입니다", "A capture is already running").to_string());
    }
    *g = Some(live::start(&opts)?);
    Ok(())
}

#[tauri::command]
fn capture_state(st: State<AppState>) -> live::LiveStats {
    lock(&st.live).as_ref().map(|l| l.stats()).unwrap_or_default()
}

/// 지금까지 받은 것을 파일로 내려 쓰고 다시 연다 — 화면이 주기적으로 부른다
#[tauri::command(async)]
fn capture_refresh(app: AppHandle, st: State<AppState>) -> Result<Option<FileInfo>, String> {
    let path = {
        let g = lock(&st.live);
        let Some(l) = g.as_ref() else { return Ok(None) };
        l.flush();
        l.path.to_string_lossy().into_owned()
    };
    let name = portdock_core::tr!("캡처", "Capture").to_string();
    load_path(&app, &st, path, Some(name)).map(Some)
}

#[tauri::command(async)]
fn capture_stop(app: AppHandle, st: State<AppState>) -> Result<Option<FileInfo>, String> {
    let path = {
        let mut g = lock(&st.live);
        let Some(l) = g.as_mut() else { return Ok(None) };
        l.stop();
        l.path.to_string_lossy().into_owned()
    };
    let name = portdock_core::tr!("캡처", "Capture").to_string();
    load_path(&app, &st, path, Some(name)).map(Some)
}

/// 관리자 권한으로 이 프로그램을 다시 띄운다(Windows 허용 창 한 번)
#[tauri::command]
fn relaunch_admin(app: AppHandle) -> Result<(), String> {
    #[cfg(windows)]
    {
        let exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let ps = format!("Start-Process -FilePath '{}' -Verb RunAs", exe.to_string_lossy().replace('\'', "''"));
        std::process::Command::new("powershell").args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps]).spawn().map_err(|e| e.to_string())?;
        app.exit(0);
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = app;
        Err("Windows only".into())
    }
}

#[tauri::command]
fn file_info(st: State<AppState>) -> Option<FileInfo> {
    lock(&st.cur).as_ref().map(|l| info_of(l, 0))
}

/// 명령줄로 받은 파일(있으면)
#[tauri::command]
fn initial_file() -> Option<String> {
    std::env::args().skip(1).find(|a| !a.starts_with('-') && std::path::Path::new(a).is_file())
}

/// 화면이 이벤트를 놓쳤을 때 — (분석 끝, 요약·Expert 끝)
#[tauri::command]
fn ready_state(st: State<AppState>) -> (bool, bool) {
    match lock(&st.cur).as_ref() {
        Some(l) => (l.analysis_ready.load(Ordering::SeqCst), l.prepared.get().is_some()),
        None => (false, false),
    }
}

#[tauri::command]
fn summary(st: State<AppState>) -> Option<Summary> {
    lock(&st.cur).as_ref()?.prepared.get().map(|p| p.summary.clone())
}

// ---------------------------------------------------------------- 필터

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FilterFail {
    message: String,
    /// 입력 글 안 위치(UTF-16 단위 — 화면 글자 위치)
    pos: usize,
    len: usize,
    suggestions: Vec<&'static str>,
}

fn utf16_at(src: &str, byte: usize) -> usize {
    let b = byte.min(src.len());
    let b = (0..=b).rev().find(|&i| src.is_char_boundary(i)).unwrap_or(0);
    src[..b].encode_utf16().count()
}

fn fail(src: &str, e: portdock_packet::filter::FilterError) -> FilterFail {
    let a = utf16_at(src, e.pos);
    let b = utf16_at(src, e.pos + e.len);
    FilterFail { message: e.message, pos: a, len: (b - a).max(1), suggestions: e.suggestions }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FilterCheck {
    ok: bool,
    empty: bool,
    error: Option<FilterFail>,
}

#[tauri::command]
fn check_filter(text: String) -> FilterCheck {
    match Filter::parse(&text) {
        Ok(f) => FilterCheck { ok: true, empty: f.is_all(), error: None },
        Err(e) => FilterCheck { ok: false, empty: false, error: Some(fail(&text, e)) },
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FilterOutcome {
    shown: usize,
    total: usize,
    ms: u64,
    /// 이 결과가 최신인가(그 사이 새 필터가 걸렸으면 거짓)
    current: bool,
}

#[tauri::command(async)]
fn set_filter(st: State<AppState>, text: String) -> Result<FilterOutcome, FilterFail> {
    let f = Filter::parse(&text).map_err(|e| fail(&text, e))?;
    let l = current(&st).map_err(|m| FilterFail { message: m, pos: 0, len: 0, suggestions: vec![] })?;
    let seq = l.filter_seq.fetch_add(1, Ordering::SeqCst) + 1;
    let t = Instant::now();
    let idx = if f.is_all() { None } else { Some(l.sess.apply(&f)) };
    let ms = t.elapsed().as_millis() as u64;
    let total = l.sess.cap.len();
    let current = l.filter_seq.load(Ordering::SeqCst) == seq;
    let shown = idx.as_ref().map_or(total, |v| v.len());
    if current {
        *l.view.write().unwrap_or_else(|e| e.into_inner()) = Arc::new(View { idx });
    }
    Ok(FilterOutcome { shown, total, ms, current })
}

#[derive(Serialize)]
struct Field {
    name: &'static str,
    #[serde(rename = "type")]
    ty: &'static str,
    desc: &'static str,
}

#[tauri::command]
fn complete(prefix: String, limit: Option<usize>) -> Vec<Field> {
    fields::complete(&prefix).into_iter().take(limit.unwrap_or(30)).map(|d| Field { name: d.name, ty: d.ftype.name(), desc: d.desc }).collect()
}

// ---------------------------------------------------------------- 목록

fn proto_color(layers: &[&str]) -> &'static str {
    let has = |n: &str| layers.contains(&n);
    if has("mbtcp") || has("modbus") {
        "modbus"
    } else if has("mc") {
        "mc"
    } else if has("xgt") {
        "xgt"
    } else if has("dns") || has("dhcp") {
        "dns"
    } else if has("arp") {
        "arp"
    } else if has("icmp") || has("icmpv6") {
        "icmp"
    } else if has("tcp") {
        "tcp"
    } else if has("udp") {
        "udp"
    } else {
        ""
    }
}

fn make_row(l: &Loaded, v: &View, pos: usize, i: usize, first_ts: i64, d: &mut Dissection, ready: bool) -> Row {
    l.sess.dissect_into(d, i, COLS, ready, None);
    let p = &l.sess.cap.packets[i];
    let meta = l.sess.meta(i);
    let (mut color, mut rt_ns, mut pair) = ("", -1, None);
    let mut flags = 0;
    if ready {
        let a = l.sess.analysis();
        flags = a.ann[i].flags;
        if let Some((pr, rt, rec)) = pair_of(a, i as u32 + 1) {
            rt_ns = rt;
            if matches!(rec.status, PairStatus::Timeout | PairStatus::Closed | PairStatus::Exception) {
                color = "err";
            }
            pair = Some(pr);
        }
    }
    if color.is_empty() && d.experts.iter().any(|e| e.severity == Severity::Error) {
        color = "err";
    }
    if color.is_empty() && (flags & (ann::RETRANSMISSION | ann::FAST_RETRANSMISSION | ann::RESET) != 0 || d.experts.iter().any(|e| e.severity == Severity::Warn)) {
        color = "warn";
    }
    if color.is_empty() {
        color = proto_color(&d.layers);
    }
    let has_ts = p.ts_ns != NO_TS && p.has_ts();
    let delta_view = if pos > 0 && has_ts {
        let q = &l.sess.cap.packets[v.at(pos - 1)];
        if q.has_ts() { p.ts_ns - q.ts_ns } else { -1 }
    } else {
        -1
    };
    Row {
        no: meta.number,
        has_ts,
        sec: if has_ts { p.sec() } else { 0 },
        nsec: if has_ts { p.nsec() } else { 0 },
        rel_ns: if has_ts { p.ts_ns - first_ts } else { 0 },
        delta_ns: meta.prev_ts_ns.filter(|_| has_ts).map_or(-1, |q| p.ts_ns - q),
        delta_view_ns: delta_view,
        src: std::mem::take(&mut d.cols.src),
        dst: std::mem::take(&mut d.cols.dst),
        proto: std::mem::take(&mut d.cols.protocol),
        len: p.origlen,
        info: std::mem::take(&mut d.cols.info),
        color,
        rt_ns,
        pair,
    }
}

#[tauri::command(async)]
fn rows(st: State<AppState>, start: usize, count: usize) -> Result<RowsReply, String> {
    let l = current(&st)?;
    let v = l.view();
    let total = v.len(l.sess.cap.len());
    let ready = l.analysis_ready.load(Ordering::SeqCst);
    let end = (start + count.min(1000)).min(total);
    let first = l.sess.meta(0).first_ts_ns.unwrap_or(0);
    let mut d = Dissection::default();
    let rows = (start.min(end)..end).map(|pos| make_row(&l, &v, pos, v.at(pos), first, &mut d, ready)).collect();
    Ok(RowsReply { total, pending: !ready, start, rows })
}

/// 패킷 번호(1 기준) → 목록 위치. 필터 밖이면 None
#[tauri::command]
fn locate(st: State<AppState>, no: u32) -> Option<usize> {
    let l = lock(&st.cur).clone()?;
    if no == 0 || no as usize > l.sess.cap.len() { None } else { l.view().pos_of(no as usize - 1) }
}

#[tauri::command]
fn view_no(st: State<AppState>, pos: usize) -> Option<u32> {
    let l = lock(&st.cur).clone()?;
    let v = l.view();
    (pos < v.len(l.sess.cap.len())).then(|| v.at(pos) as u32 + 1)
}

// ---------------------------------------------------------------- 트리·바이트

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FieldRef {
    name: &'static str,
    start: u32,
    len: u32,
    filter: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExpertDto {
    severity: &'static str,
    key: &'static str,
    code: u32,
    text: String,
    start: u32,
    len: u32,
    explain: Option<ExplainDto>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ExplainDto {
    title: String,
    meaning: String,
    next: String,
    code_name: Option<String>,
    code_cause: Option<String>,
    code_check: Option<String>,
    topic: &'static str,
}

fn lang_of(s: &str) -> expert::Lang {
    if s == "ko" { expert::Lang::Ko } else { expert::Lang::En }
}

fn explain_dto(key: &'static str, code: u32, lang: &str) -> Option<ExplainDto> {
    let info = portdock_packet::dissect::ExpertInfo { severity: Severity::Note, key, code, text: String::new(), start: 0, len: 0 };
    expert::describe(&info, lang_of(lang)).map(|x| ExplainDto { title: x.title, meaning: x.meaning, next: x.next, code_name: x.code_name, code_cause: x.code_cause, code_check: x.code_check, topic: x.topic })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Detail {
    no: u32,
    tree: Vec<TNode>,
    bytes: String,
    caplen: u32,
    origlen: u32,
    fields: Vec<FieldRef>,
    experts: Vec<ExpertDto>,
    layers: String,
}

#[tauri::command(async)]
fn dissect_packet(st: State<AppState>, no: u32, lang: String) -> Result<Detail, String> {
    let l = current(&st)?;
    if no == 0 || no as usize > l.sess.cap.len() {
        return Err("range".into());
    }
    let i = no as usize - 1;
    let namer = l.namer.read().unwrap_or_else(|e| e.into_inner()).clone();
    let mut d = Dissection::default();
    let nm: Option<&dyn RegisterNamer> = namer.as_deref().map(|m| m as &dyn RegisterNamer);
    l.sess.dissect_into(&mut d, i, Opts::FULL, true, nm);
    let p = &l.sess.cap.packets[i];
    Ok(Detail {
        no,
        tree: d.tree.iter().map(tnode).collect(),
        bytes: b64(l.sess.cap.data(p)),
        caplen: p.caplen,
        origlen: p.origlen,
        fields: d.fields.iter().map(|f| FieldRef { name: f.name, start: f.start, len: f.len, filter: filter_of(f.name, &f.value) }).collect(),
        experts: d.experts.iter().map(|e| ExpertDto { severity: sev_name(e.severity), key: e.key, code: e.code, text: e.text.clone(), start: e.start, len: e.len, explain: explain_dto(e.key, e.code, &lang) }).collect(),
        layers: d.protocols(),
    })
}

// ---------------------------------------------------------------- 흐름 따라가기

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Chunk {
    from_client: bool,
    first: u32,
    last: u32,
    len: usize,
    data: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Follow {
    flow: u32,
    client: String,
    server: String,
    transport: &'static str,
    chunks: Vec<Chunk>,
    client_bytes: usize,
    server_bytes: usize,
    truncated: bool,
}

fn endpoint(a: &[u8; 16], v6: bool, port: u16) -> String {
    if v6 { format!("[{}]:{port}", portdock_packet::dissect::ip6_str(a)) } else { format!("{}:{port}", portdock_packet::dissect::ip4_str(&a[..4])) }
}

#[tauri::command(async)]
fn follow(st: State<AppState>, no: u32) -> Result<Follow, String> {
    let l = current(&st)?;
    let a = l.sess.analysis();
    let ann = a.ann.get((no as usize).wrapping_sub(1)).ok_or("range")?;
    if ann.flow == u32::MAX {
        return Err(portdock_core::tr!("이 패킷은 TCP·UDP 흐름이 아닙니다", "This packet is not part of a TCP/UDP flow").into());
    }
    let fi = &a.flows[ann.flow as usize];
    const CAP: usize = 2_000_000;
    let (mut cb, mut sb, mut used) = (0, 0, 0);
    let mut truncated = false;
    let mut chunks = Vec::new();
    for c in a.follow(&l.sess.cap, ann.flow) {
        if c.from_client {
            cb += c.data.len()
        } else {
            sb += c.data.len()
        }
        if used >= CAP {
            truncated = true;
            continue;
        }
        let take = c.data.len().min(CAP - used);
        if take < c.data.len() {
            truncated = true;
        }
        used += take;
        chunks.push(Chunk { from_client: c.from_client, first: c.first_frame, last: c.last_frame, len: c.data.len(), data: b64(&c.data[..take]) });
    }
    Ok(Follow {
        flow: ann.flow,
        client: endpoint(&fi.client.0, fi.v6, fi.client.1),
        server: endpoint(&fi.server.0, fi.v6, fi.server.1),
        transport: if matches!(fi.transport, portdock_packet::analysis::Transport::Tcp) { "tcp" } else { "udp" },
        chunks,
        client_bytes: cb,
        server_bytes: sb,
        truncated,
    })
}

// ---------------------------------------------------------------- 통계

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConvDto {
    a: String,
    b: String,
    port_a: Option<u16>,
    port_b: Option<u16>,
    packets: u64,
    bytes: u64,
    a_to_b_packets: u64,
    a_to_b_bytes: u64,
    b_to_a_packets: u64,
    b_to_a_bytes: u64,
    start_ns: i64,
    duration_s: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EndpointDto {
    addr: String,
    port: Option<u16>,
    packets: u64,
    bytes: u64,
    tx_packets: u64,
    tx_bytes: u64,
    rx_packets: u64,
    rx_bytes: u64,
}

fn kind_of(s: &str) -> ConvKind {
    match s {
        "eth" => ConvKind::Ethernet,
        "ipv6" => ConvKind::Ipv6,
        "tcp" => ConvKind::Tcp,
        "udp" => ConvKind::Udp,
        _ => ConvKind::Ipv4,
    }
}

#[derive(Serialize)]
struct ConvReply {
    conversations: Vec<ConvDto>,
    endpoints: Vec<EndpointDto>,
}

#[tauri::command(async)]
fn conversations(st: State<AppState>, kind: String, view_only: bool) -> Result<ConvReply, String> {
    let l = current(&st)?;
    let v = view_only.then(|| l.view());
    let which = v.as_ref().and_then(|v| v.which());
    let k = kind_of(&kind);
    let conversations = stats::conversations(&l.sess.cap, which, k)
        .into_iter()
        .map(|c| ConvDto { duration_s: c.duration_s(), a: c.a, b: c.b, port_a: c.port_a, port_b: c.port_b, packets: c.packets, bytes: c.bytes, a_to_b_packets: c.a_to_b_packets, a_to_b_bytes: c.a_to_b_bytes, b_to_a_packets: c.b_to_a_packets, b_to_a_bytes: c.b_to_a_bytes, start_ns: c.start_ns })
        .collect();
    let endpoints = stats::endpoints(&l.sess.cap, which, k)
        .into_iter()
        .map(|e| EndpointDto { addr: e.addr, port: e.port, packets: e.packets, bytes: e.bytes, tx_packets: e.tx_packets, tx_bytes: e.tx_bytes, rx_packets: e.rx_packets, rx_bytes: e.rx_bytes })
        .collect();
    Ok(ConvReply { conversations, endpoints })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Bucket {
    lo_ns: i64,
    hi_ns: i64,
    count: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RtDist {
    key: String,
    name: &'static str,
    buckets: Vec<Bucket>,
    rt: Rt,
}

/// 응답 시간 분포 구간(µs) — 0.1ms 부터 1·2·5 단계
const EDGES_US: [i64; 14] = [0, 100, 200, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000];

#[tauri::command(async)]
fn rt_distribution(st: State<AppState>) -> Result<Vec<RtDist>, String> {
    let l = current(&st)?;
    let a = l.sess.analysis();
    let mut out = Vec::new();
    for app in [Proto::Modbus, Proto::ModbusRtu, Proto::Mc, Proto::Xgt] {
        let rt = stats::response_summary(a, Some(app));
        if rt.pairs == 0 {
            continue;
        }
        let mut buckets: Vec<Bucket> = EDGES_US.iter().enumerate().map(|(k, &lo)| Bucket { lo_ns: lo * 1000, hi_ns: EDGES_US.get(k + 1).map_or(i64::MAX, |h| h * 1000), count: 0 }).collect();
        for p in a.pdus.iter().filter(|p| p.app == app && p.is_req && p.resp_ns >= 0 && matches!(p.status, PairStatus::Ok | PairStatus::Exception)) {
            if let Some(b) = buckets.iter_mut().rev().find(|b| p.resp_ns >= b.lo_ns) {
                b.count += 1;
            }
        }
        out.push(RtDist { key: app.proto().into(), name: app.name(), buckets, rt: rt.into() });
    }
    Ok(out)
}

// ---------------------------------------------------------------- Expert

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExpertGroup {
    key: &'static str,
    severity: &'static str,
    count: u64,
    first_frame: u32,
    explain: Option<ExplainDto>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ExpertReply {
    ready: bool,
    groups: Vec<ExpertGroup>,
    rows: Vec<ExpertRaw>,
    total: usize,
}

#[tauri::command(async)]
fn experts(st: State<AppState>, lang: String) -> Result<ExpertReply, String> {
    let l = current(&st)?;
    let Some(p) = l.prepared.get() else {
        return Ok(ExpertReply { ready: false, groups: vec![], rows: vec![], total: 0 });
    };
    let mut g: Vec<ExpertGroup> = Vec::new();
    for e in &p.experts {
        match g.iter_mut().find(|x| x.key == e.key) {
            Some(x) => x.count += 1,
            None => g.push(ExpertGroup { key: e.key, severity: e.severity, count: 1, first_frame: e.frame, explain: explain_dto(e.key, 0, &lang) }),
        }
    }
    let rank = |s: &str| match s {
        "error" => 0,
        "warn" => 1,
        "note" => 2,
        _ => 3,
    };
    g.sort_by(|a, b| rank(a.severity).cmp(&rank(b.severity)).then(b.count.cmp(&a.count)));
    Ok(ExpertReply { ready: true, groups: g, total: p.experts.len(), rows: p.experts.iter().take(20_000).cloned().collect() })
}

#[tauri::command]
fn explain_expert(key: String, code: u32, lang: String) -> Option<ExplainDto> {
    let key = expert::explain(&key)?.key;
    explain_dto(key, code, &lang)
}

// ---------------------------------------------------------------- 찾기·저장·장비 맵

fn parse_hex(s: &str) -> Option<Vec<u8>> {
    let c: Vec<char> = s.chars().filter(|c| !c.is_whitespace() && *c != ':').collect();
    if c.is_empty() || !c.len().is_multiple_of(2) {
        return None;
    }
    c.chunks(2).map(|p| u8::from_str_radix(&p.iter().collect::<String>(), 16).ok()).collect()
}

fn contains(h: &[u8], n: &[u8], nocase: bool) -> bool {
    if n.is_empty() || h.len() < n.len() {
        return false;
    }
    h.windows(n.len()).any(|w| if nocase { w.eq_ignore_ascii_case(n) } else { w == n })
}

enum Matcher {
    Bytes(Vec<u8>, bool),
    Filter(Filter),
}

/// kind: "text" | "hex" | "filter". from: 목록 위치(그 다음부터). 못 찾으면 None, 입력 오류는 Err
#[tauri::command(async)]
fn find(st: State<AppState>, kind: String, text: String, from: Option<usize>, forward: bool) -> Result<Option<usize>, String> {
    let l = current(&st)?;
    let v = l.view();
    let n = v.len(l.sess.cap.len());
    if n == 0 {
        return Ok(None);
    }
    let m = match kind.as_str() {
        "hex" => Matcher::Bytes(parse_hex(&text).ok_or_else(|| portdock_core::tr!("HEX 형식이 아닙니다(예: 00 01 ff)", "Not valid HEX (e.g. 00 01 ff)").to_string())?, false),
        "filter" => Matcher::Filter(Filter::parse(&text).map_err(|e| e.to_string())?),
        _ => Matcher::Bytes(text.into_bytes(), true),
    };
    if matches!(&m, Matcher::Filter(f) if f.needs_analysis()) {
        l.sess.analysis();
    }
    let mut d = Dissection::default();
    for step in 1..=n {
        let pos = match (from, forward) {
            (Some(f), true) => (f + step) % n,
            (Some(f), false) => (f + n - (step % n)) % n,
            (None, true) => step - 1,
            (None, false) => n - step,
        };
        let i = v.at(pos);
        let p = &l.sess.cap.packets[i];
        let hit = match &m {
            Matcher::Bytes(b, nc) => contains(l.sess.cap.data(p), b, *nc),
            Matcher::Filter(f) => {
                let o = Opts { depth: f.depth(), tree: false, columns: false, apps: f.apps() };
                l.sess.dissect_into(&mut d, i, o, f.needs_analysis(), None);
                f.matches(&d, l.sess.cap.data(p))
            }
        };
        if hit {
            return Ok(Some(pos));
        }
    }
    Ok(None)
}

/// scope: "all" | "view" | "selected"(selected = 패킷 번호, 1 기준)
#[tauri::command(async)]
fn save_pcapng(st: State<AppState>, path: String, scope: String, selected: Vec<u32>) -> Result<usize, String> {
    let l = current(&st)?;
    let v = l.view();
    let total = l.sess.cap.len();
    let which: Vec<usize> = match scope.as_str() {
        "selected" => selected.iter().filter(|&&n| n >= 1 && (n as usize) <= total).map(|&n| n as usize - 1).collect(),
        "view" => (0..v.len(total)).map(|p| v.at(p)).collect(),
        _ => (0..total).collect(),
    };
    let f = std::fs::File::create(&path).map_err(|e| format!("{path}: {e}"))?;
    l.sess.cap.write_pcapng(std::io::BufWriter::new(f), &which).map_err(|e| format!("{path}: {e}"))?;
    Ok(which.len())
}

#[derive(Serialize)]
struct DevMapInfo {
    id: String,
    model: String,
    entries: usize,
}

/// 장비 맵 고르기 — 화면이 86종 중 고른 JSON 을 그대로 넘긴다. None 이면 끈다
#[tauri::command]
fn set_device_map(st: State<AppState>, json: Option<String>) -> Result<Option<DevMapInfo>, String> {
    let l = current(&st)?;
    let m = match json {
        Some(j) => Some(Arc::new(DeviceMap::from_json(&j)?)),
        None => None,
    };
    let info = m.as_ref().map(|m| DevMapInfo { id: m.id.clone(), model: m.model.clone(), entries: m.len() });
    *l.namer.write().unwrap_or_else(|e| e.into_inner()) = m;
    Ok(info)
}

// ---------------------------------------------------------------- 공용 틀(다른 앱과 같다)

#[tauri::command(async)]
fn write_text(path: String, text: String) -> Result<(), String> {
    std::fs::write(&path, text).map_err(|e| format!("{path}: {e}"))
}

#[tauri::command(async)]
fn read_text(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("{path}: {e}"))
}

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

#[tauri::command]
fn consent_get() -> portdock_core::consent::Consent {
    portdock_core::consent::read()
}

#[tauri::command]
fn consent_set(usage_stats: bool) -> Result<(), String> {
    portdock_core::consent::write(usage_stats)
}

#[tauri::command(async)]
fn report_read_dump(name: String) -> Result<tauri::ipc::Response, String> {
    portdock_core::report::read_dump(&name).map(tauri::ipc::Response::new)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    if let Err(e) = tauri::webview_version() {
        portdock_core::report::webview_missing(&e.to_string());
    }
    portdock_core::report::install("packet", env!("CARGO_PKG_VERSION"));
    portdock_core::report::crash_monitor_or_attach();
    portdock_core::report::test_crash_if_asked();
    let result = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(tauri_plugin_window_state::StateFlags::SIZE | tauri_plugin_window_state::StateFlags::POSITION | tauri_plugin_window_state::StateFlags::MAXIMIZED)
                .build(),
        )
        .setup(|app| {
            #[cfg(windows)]
            if let Some(w) = tauri::Manager::get_webview_window(app, "main") {
                let _ = w.with_webview(|wv| portdock_core::report::watch_webview2(&wv.controller()));
            }
            // 화면이 끝내 부르지 못하면 4초 뒤 여기서 보인다 — 창이 안 뜨는 일이 없게
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
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            set_lang,
            report_pending,
            report_dismiss,
            report_env,
            consent_get,
            consent_set,
            report_read_dump,
            write_text,
            read_text,
            open_file,
            capture_env,
            capture_start,
            capture_state,
            capture_refresh,
            capture_stop,
            relaunch_admin,
            file_info,
            initial_file,
            ready_state,
            summary,
            check_filter,
            set_filter,
            complete,
            rows,
            locate,
            view_no,
            dissect_packet,
            follow,
            conversations,
            rt_distribution,
            experts,
            explain_expert,
            find,
            save_pcapng,
            set_device_map
        ])
        .run(tauri::generate_context!());
    if let Err(e) = result {
        portdock_core::report::run_failed(&e.to_string());
    }
}
