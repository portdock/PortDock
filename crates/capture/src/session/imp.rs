//! pktmonapi.dll 호출부(Windows). 구조체 배치는 `pktmon_types`, 레코드 해석은 `frame` 에 있다.

use super::*;
use crate::frame::parse_record;
use crate::pktmon_types::{build_constraint, parse_data_source_list};
use std::collections::{HashMap, HashSet, VecDeque};
use std::ffi::c_void;
use std::ptr::{null, null_mut};
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};
use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, HMODULE};
use windows_sys::Win32::Security::{GetTokenInformation, TOKEN_ELEVATION, TOKEN_QUERY, TokenElevation};
use windows_sys::Win32::System::LibraryLoader::{GetProcAddress, LOAD_LIBRARY_SEARCH_SYSTEM32, LoadLibraryExW};
use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

const _: () = assert!(std::mem::size_of::<usize>() == 8, "x64 Windows 만 지원");

const API_VERSION_1_0: u32 = 0x0001_0000;
const HR_INSUFFICIENT_BUFFER: u32 = 0x8007_007A;

type Handle = *mut c_void;

/// PACKETMONITOR_STREAM_DATA_DESCRIPTOR (Microsoft Learn 의 선언 순서)
#[repr(C)]
struct Descriptor {
    data: *const u8,
    data_size: u32,
    metadata_offset: u32,
    packet_offset: u32,
    packet_length: u32,
    missed_write: u32,
    missed_read: u32,
}

type DataCallback = unsafe extern "system" fn(*mut c_void, *const Descriptor);

/// PACKETMONITOR_REALTIME_STREAM_CONFIGURATION
#[repr(C)]
struct StreamConfig {
    user_context: *mut c_void,
    event_callback: *const c_void,
    data_callback: Option<DataCallback>,
    buffer_size_multiplier: u16,
    truncation_size: u16,
}

#[derive(Clone, Copy)]
struct Api {
    initialize: unsafe extern "system" fn(u32, *mut c_void, *mut Handle) -> i32,
    uninitialize: unsafe extern "system" fn(Handle),
    enum_sources: unsafe extern "system" fn(Handle, u32, u8, usize, *mut usize, *mut c_void) -> i32,
    create_session: unsafe extern "system" fn(Handle, *const u16, *mut Handle) -> i32,
    close_session: unsafe extern "system" fn(Handle),
    add_source: unsafe extern "system" fn(Handle, *const c_void) -> i32,
    create_stream: unsafe extern "system" fn(Handle, *const StreamConfig, *mut Handle) -> i32,
    attach_output: unsafe extern "system" fn(Handle, Handle) -> i32,
    close_stream: unsafe extern "system" fn(Handle),
    add_constraint: unsafe extern "system" fn(Handle, *const crate::pktmon_types::ProtocolConstraint) -> i32,
    set_active: unsafe extern "system" fn(Handle, u8) -> i32,
}

unsafe fn sym<T: Copy>(m: HMODULE, name: &'static [u8]) -> Result<T, CaptureError> {
    debug_assert!(name.ends_with(&[0]));
    // SAFETY: name 은 0 으로 끝나는 ASCII. 반환 함수 포인터를 선언한 시그니처로 본다(문서화된 시그니처)
    match unsafe { GetProcAddress(m, name.as_ptr()) } {
        Some(p) => Ok(unsafe { std::mem::transmute_copy::<_, T>(&p) }),
        None => Err(CaptureError::Unsupported(format!("pktmonapi.dll 에 {} 이(가) 없습니다", String::from_utf8_lossy(&name[..name.len() - 1])))),
    }
}

impl Api {
    fn load() -> Result<Api, CaptureError> {
        let name: Vec<u16> = "pktmonapi.dll".encode_utf16().chain(Some(0)).collect();
        // SAFETY: System32 에서만 찾는다(DLL 심기 방지)
        let m = unsafe { LoadLibraryExW(name.as_ptr(), null_mut(), LOAD_LIBRARY_SEARCH_SYSTEM32) };
        if m.is_null() {
            let code = std::io::Error::last_os_error();
            return Err(CaptureError::Unsupported(format!("pktmonapi.dll 을 불러오지 못했습니다({code})")));
        }
        // SAFETY: 아래 이름들은 PktMonApi.dll 이 내보내는 문서화된 함수(이 PC 의 내보내기 표로 확인)
        unsafe {
            Ok(Api {
                initialize: sym(m, b"PacketMonitorInitialize\0")?,
                uninitialize: sym(m, b"PacketMonitorUninitialize\0")?,
                enum_sources: sym(m, b"PacketMonitorEnumDataSources\0")?,
                create_session: sym(m, b"PacketMonitorCreateLiveSession\0")?,
                close_session: sym(m, b"PacketMonitorCloseSessionHandle\0")?,
                add_source: sym(m, b"PacketMonitorAddSingleDataSourceToSession\0")?,
                create_stream: sym(m, b"PacketMonitorCreateRealtimeStream\0")?,
                attach_output: sym(m, b"PacketMonitorAttachOutputToSession\0")?,
                close_stream: sym(m, b"PacketMonitorCloseRealtimeStream\0")?,
                add_constraint: sym(m, b"PacketMonitorAddCaptureConstraint\0")?,
                set_active: sym(m, b"PacketMonitorSetSessionActive\0")?,
            })
        }
    }
}

fn check(call: &'static str, r: i32) -> Result<(), CaptureError> {
    if r >= 0 { Ok(()) } else { Err(CaptureError::from_hresult(call, r as u32)) }
}

/// 현재 프로세스가 관리자 권한(상승된 토큰)인가
pub fn is_elevated() -> bool {
    let mut token: HANDLE = null_mut();
    // SAFETY: 현재 프로세스 토큰을 읽기로 열고, 결과를 읽은 뒤 닫는다
    unsafe {
        if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
            return false;
        }
        let mut e = TOKEN_ELEVATION { TokenIsElevated: 0 };
        let mut n = 0u32;
        let ok = GetTokenInformation(token, TokenElevation, &mut e as *mut _ as *mut c_void, std::mem::size_of::<TOKEN_ELEVATION>() as u32, &mut n);
        CloseHandle(token);
        ok != 0 && e.TokenIsElevated != 0
    }
}

struct SourceBuf {
    buf: Vec<u64>,
    items: Vec<(DataSource, usize)>,
}

fn enum_sources(api: &Api, h: Handle, kind: u32, hidden: bool) -> Result<SourceBuf, CaptureError> {
    let mut needed = 0usize;
    // SAFETY: 크기만 묻는 호출(버퍼 없음)
    let r = unsafe { (api.enum_sources)(h, kind, u8::from(hidden), 0, &mut needed, null_mut()) };
    if r < 0 && r as u32 != HR_INSUFFICIENT_BUFFER {
        return Err(CaptureError::from_hresult("PacketMonitorEnumDataSources", r as u32));
    }
    if needed == 0 {
        return Ok(SourceBuf { buf: Vec::new(), items: Vec::new() });
    }
    let mut buf = vec![0u64; needed.div_ceil(8)];
    let mut got = needed;
    // SAFETY: buf 는 needed 바이트 이상, 8바이트 정렬
    check("PacketMonitorEnumDataSources", unsafe { (api.enum_sources)(h, kind, u8::from(hidden), needed, &mut got, buf.as_mut_ptr() as *mut c_void) })?;
    // SAFETY: buf 전체를 바이트로 본다(needed 이상 크기)
    let bytes = unsafe { std::slice::from_raw_parts(buf.as_ptr() as *const u8, buf.len() * 8) };
    let items = parse_data_source_list(bytes, buf.as_ptr() as usize);
    Ok(SourceBuf { buf, items })
}

/// 이 PC 의 PktMon 구성 요소 목록(`pktmon list` 와 같은 것). show_hidden 이면 중복 ID 까지
pub fn list_data_sources(show_hidden: bool) -> Result<Vec<DataSource>, CaptureError> {
    let api = Api::load()?;
    let mut h: Handle = null_mut();
    // SAFETY: 초기화한 핸들은 아래에서 반드시 해제
    check("PacketMonitorInitialize", unsafe { (api.initialize)(API_VERSION_1_0, null_mut(), &mut h) })?;
    let r = enum_sources(&api, h, 0, show_hidden).map(|s| s.items.into_iter().map(|(d, _)| d).collect());
    // SAFETY: 위에서 받은 핸들
    unsafe { (api.uninitialize)(h) };
    r
}

/// 최근 본 (PktGroupId, PktNumber) 를 기억해 같은 패킷의 두 번째 이후 나타남을 거른다
struct Dedup {
    seen: HashSet<(u64, u16)>,
    order: VecDeque<(u64, u16)>,
}

impl Dedup {
    const CAP: usize = 1 << 16;
    /// 처음 보면 true
    fn first_time(&mut self, key: (u64, u16)) -> bool {
        if !self.seen.insert(key) {
            return false;
        }
        self.order.push_back(key);
        if self.order.len() > Self::CAP
            && let Some(old) = self.order.pop_front()
        {
            self.seen.remove(&old);
        }
        true
    }
}

struct Ctx {
    cb: Box<dyn Fn(Frame) + Send + Sync>,
    names: HashMap<u16, String>,
    dedup: Option<Mutex<Dedup>>,
    records: AtomicU64,
    parse_errors: AtomicU64,
    dedup_skipped: AtomicU64,
    missed_write: AtomicU64,
    missed_read: AtomicU64,
}

unsafe extern "system" fn on_data(user: *mut c_void, d: *const Descriptor) {
    if user.is_null() || d.is_null() {
        return;
    }
    // 콜백이 FFI 경계를 넘어 패닉하면 안 된다
    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        // SAFETY: user 는 start() 가 넘긴 Ctx 이고 stop() 이 스트림을 닫은 뒤에야 해제한다. d 는 이 호출 동안 유효
        let (ctx, d) = unsafe { (&*(user as *const Ctx), &*d) };
        ctx.records.fetch_add(1, Ordering::Relaxed);
        ctx.missed_write.fetch_max(u64::from(d.missed_write), Ordering::Relaxed);
        ctx.missed_read.fetch_max(u64::from(d.missed_read), Ordering::Relaxed);
        if d.data.is_null() {
            return;
        }
        // SAFETY: Data 부터 DataSize 바이트가 유효(문서)
        let bytes = unsafe { std::slice::from_raw_parts(d.data, d.data_size as usize) };
        match parse_record(bytes, d.metadata_offset, d.packet_offset, d.packet_length) {
            Ok(mut f) => {
                if let Some(dd) = &ctx.dedup
                    && f.drop_reason == 0
                    && !dd.lock().map(|mut g| g.first_time((f.pkt_group_id, f.pkt_number))).unwrap_or(true)
                {
                    ctx.dedup_skipped.fetch_add(1, Ordering::Relaxed);
                    return;
                }
                if let Some(n) = ctx.names.get(&f.component_id) {
                    f.interface.clone_from(n);
                }
                (ctx.cb)(f);
            }
            Err(_) => {
                ctx.parse_errors.fetch_add(1, Ordering::Relaxed);
            }
        }
    }));
}

/// 실행 중인 캡처. `stop()` 하거나 버리면 멈춘다
pub struct CaptureSession {
    api: Api,
    handle: Handle,
    session: Handle,
    stream: Handle,
    ctx: *mut Ctx,
    active: bool,
    sources: Vec<DataSource>,
}

// SAFETY: 핸들·Ctx 는 pktmonapi 가 스레드와 무관하게 쓰도록 만든 것이고, Ctx 안은 Send+Sync 만 담는다
unsafe impl Send for CaptureSession {}

impl CaptureSession {
    /// 붙인 구성 요소들
    pub fn data_sources(&self) -> &[DataSource] {
        &self.sources
    }

    /// 캡처를 멈추고 자원을 풀어 준다. 두 번 불러도 된다
    pub fn stop(&mut self) -> StopStats {
        let mut stats = StopStats::default();
        // SAFETY: 각 핸들은 start() 가 받은 것이고 null 이 아닐 때만, 만든 순서의 반대로 닫는다
        unsafe {
            if self.active {
                (self.api.set_active)(self.session, 0);
                self.active = false;
            }
            if !self.stream.is_null() {
                (self.api.close_stream)(self.stream);
                self.stream = null_mut();
            }
            if !self.session.is_null() {
                (self.api.close_session)(self.session);
                self.session = null_mut();
            }
            if !self.handle.is_null() {
                (self.api.uninitialize)(self.handle);
                self.handle = null_mut();
            }
            if !self.ctx.is_null() {
                // 스트림을 닫은 뒤라 더 이상 콜백이 오지 않는다
                let c = Box::from_raw(self.ctx);
                self.ctx = null_mut();
                stats = StopStats {
                    records: c.records.load(Ordering::Relaxed),
                    parse_errors: c.parse_errors.load(Ordering::Relaxed),
                    dedup_skipped: c.dedup_skipped.load(Ordering::Relaxed),
                    missed_write: c.missed_write.load(Ordering::Relaxed),
                    missed_read: c.missed_read.load(Ordering::Relaxed),
                };
            }
        }
        stats
    }
}

impl Drop for CaptureSession {
    fn drop(&mut self) {
        self.stop();
    }
}

/// 캡처를 시작한다. 프레임마다 `on_frame` 이 PktMon 의 스레드에서 불린다(오래 걸리면 누락이 생기니 가볍게)
pub fn start(o: &StartOptions, on_frame: impl Fn(Frame) + Send + Sync + 'static) -> Result<CaptureSession, CaptureError> {
    if !(1..=9000).contains(&o.truncation) {
        return Err(CaptureError::BadOption("패킷 자르기 크기는 1~9000 바이트입니다".into()));
    }
    if !(1..=10).contains(&o.buffer_multiplier) {
        return Err(CaptureError::BadOption("버퍼 배율은 1~10 입니다".into()));
    }
    let constraints = o
        .filters
        .iter()
        .filter(|f| !f.is_empty())
        .enumerate()
        .map(|(i, f)| build_constraint(&format!("PortDock-{i}"), f))
        .collect::<Result<Vec<_>, _>>()
        .map_err(CaptureError::BadOption)?;
    if !o.skip_admin_check && !is_elevated() {
        return Err(CaptureError::NeedAdmin);
    }
    let api = Api::load()?;
    let mut s = CaptureSession { api, handle: null_mut(), session: null_mut(), stream: null_mut(), ctx: null_mut(), active: false, sources: Vec::new() };
    // 이후 어느 단계에서 실패해도 s 가 버려지며 만든 것들을 되돌린다(Drop → stop)

    // SAFETY: 아래 호출들은 문서화된 시그니처. 핸들·버퍼 수명은 이 함수 안에서 지킨다
    unsafe {
        check("PacketMonitorInitialize", (api.initialize)(API_VERSION_1_0, null_mut(), &mut s.handle))?;
        let name: Vec<u16> = format!("PortDockPacket-{}", std::process::id()).encode_utf16().chain(Some(0)).collect();
        check("PacketMonitorCreateLiveSession", (api.create_session)(s.handle, name.as_ptr(), &mut s.session))?;
    }

    // 붙일 구성 요소
    let kind = if o.scope == SourceScope::All { 0 } else { 1 };
    let list = enum_sources(&api, s.handle, kind, false)?;
    let needles: Vec<String> = o.name_contains.iter().map(|n| n.to_lowercase()).collect();
    let mut attached = 0usize;
    for (ds, off) in &list.items {
        if !needles.is_empty() {
            let hay = format!("{} {}", ds.name, ds.description).to_lowercase();
            if !needles.iter().any(|n| hay.contains(n.as_str())) {
                continue;
            }
        }
        // SAFETY: off 는 list.buf 안에서 항목이 시작하는 위치(범위 확인됨)
        let p = unsafe { (list.buf.as_ptr() as *const u8).add(*off) } as *const c_void;
        check("PacketMonitorAddSingleDataSourceToSession", unsafe { (api.add_source)(s.session, p) })?;
        s.sources.push(ds.clone());
        attached += 1;
    }
    if attached == 0 {
        return Err(CaptureError::BadOption("조건에 맞는 네트워크 구성 요소가 없습니다".into()));
    }
    for c in &constraints {
        // SAFETY: c 는 이 호출 동안 유효
        check("PacketMonitorAddCaptureConstraint", unsafe { (api.add_constraint)(s.session, c) })?;
    }

    // 프레임 이름 풀이용: 중복 ID 까지 포함한 전체 목록(실패해도 이름만 비는 것)
    let mut names = HashMap::new();
    if let Ok(all) = enum_sources(&api, s.handle, 0, true) {
        for (d, _) in &all.items {
            for id in [d.id, d.secondary_id] {
                if let Ok(id) = u16::try_from(id)
                    && id != 0
                {
                    names.entry(id).or_insert_with(|| d.name.clone());
                }
            }
        }
    }
    let ctx = Box::new(Ctx {
        cb: Box::new(on_frame),
        names,
        dedup: o.dedup_appearances.then(|| Mutex::new(Dedup { seen: HashSet::new(), order: VecDeque::new() })),
        records: AtomicU64::new(0),
        parse_errors: AtomicU64::new(0),
        dedup_skipped: AtomicU64::new(0),
        missed_write: AtomicU64::new(0),
        missed_read: AtomicU64::new(0),
    });
    s.ctx = Box::into_raw(ctx);

    let cfg = StreamConfig { user_context: s.ctx as *mut c_void, event_callback: null(), data_callback: Some(on_data), buffer_size_multiplier: o.buffer_multiplier, truncation_size: o.truncation };
    // SAFETY: cfg 는 호출 동안 유효, ctx 는 stop() 까지 산다
    unsafe {
        check("PacketMonitorCreateRealtimeStream", (api.create_stream)(s.handle, &cfg, &mut s.stream))?;
        check("PacketMonitorAttachOutputToSession", (api.attach_output)(s.session, s.stream))?;
        check("PacketMonitorSetSessionActive", (api.set_active)(s.session, 1))?;
    }
    s.active = true;
    Ok(s)
}
