//! TCP 세션 — 클라이언트(자동 재연결), 서버(여러 접속), 중계(모니터). 연결마다 읽기 스레드와
//! 프레임 구분기를 따로 두고, 50ms 마다 한 번에 화면·로그로 내보낸다.
//!
//! 중계: 이 PC 포트로 들어온 접속(A, 예: HMI)마다 위쪽 장비(B, 예: PLC)로 새로 접속해 양쪽을 그대로 잇는다.
//! A→B 는 «rx», B→A 는 «tx» 방향으로 기록하고(상대 칸 = A 주소), 방향마다 프레임 구분기를 따로 둔다.
//! 한쪽이 끊으면 다른 쪽도 닫는다(다시 잇지 않음). 끼워 넣기: A 쪽(`send`) · B 쪽(`send_upstream`).
//! (0.8.0) 중계 기록에 요청/응답 짝·응답 시간·무응답(`reqpair`), «pcap 저장»(`set_pcap`, 합성 TCP/IP 머리 — `pcap`).

use crate::checksum::ChecksumKind;
use crate::event::{EventSink, Frame, LogWriter, Peer, SessionEvent, closed_reason, waiting_reason};
use crate::framer::{FrameMode, Framer};
use crate::pcap::PcapWriter;
use crate::reqpair::{PairMark, Pairer, miss_note};
use crate::delay::Delayer;
use crate::replyguard::{ECHO_MARGIN, ReplyGuard, Verdict, flood_note};
use crate::serial::Responder;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::io::{ErrorKind, Read, Write};
use std::net::{Shutdown, SocketAddr, TcpListener, TcpStream, ToSocketAddrs};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TcpMode {
    Client,
    Server,
    /// 중계(모니터) — 들어온 접속마다 위쪽 장비(`RelayTarget`)로 이어 준다. `TcpSession::start_relay` 로 연다
    Relay,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TcpConfig {
    pub mode: TcpMode,
    /// 클라이언트: 연결할 주소. 서버: 묶을 주소(0.0.0.0 = 모든 랜카드)
    pub host: String,
    pub port: u16,
    #[serde(default = "yes")]
    pub no_delay: bool,
    #[serde(default = "yes")]
    pub auto_reconnect: bool,
    #[serde(default = "default_reconnect")]
    pub reconnect_ms: u64,
    /// 서버: 받은 것을 그대로 돌려보냄
    #[serde(default)]
    pub echo: bool,
}

/// 중계가 이어 줄 위쪽 장비(B)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelayTarget {
    pub host: String,
    pub port: u16,
}

fn yes() -> bool {
    true
}
fn default_reconnect() -> u64 {
    2_000
}

struct Conn {
    addr: String,
    writer: Mutex<TcpStream>,
    framer: Mutex<Framer>,
    /// 송신 실패로 우리가 닫았으면 그 이유 — CLOSE 줄에 «상대가 끊음» 대신 남긴다
    send_failed: Mutex<Option<String>>,
    /// 중계: 이 접속을 이어 준 위쪽(B) 연결
    up: Option<Upstream>,
    /// 이 연결에 응답기가 보낸 것 — 그대로 되돌아오면 다시 답하지 않는다(연결마다 따로)
    last_reply: Mutex<ReplyGuard>,
    /// 이 연결의 지연 응답 예약 — 한 연결의 송신이 막혀도(최대 2초) 다른 연결의 지연 응답은 늦지 않게 연결마다
    delayed: Delayer,
    /// 상대 주소(pcap 의 A 쪽)
    peer: Option<SocketAddr>,
    /// 중계: 요청(A→B)·응답(B→A) 짝
    pairer: Mutex<Pairer>,
}

/// 중계의 위쪽(B) 연결 — 쓰기 핸들과 B→A 방향 프레임 구분기
struct Upstream {
    addr: String,
    writer: Mutex<TcpStream>,
    framer: Mutex<Framer>,
    /// 장비(B) 주소(pcap 의 B 쪽)
    peer: Option<SocketAddr>,
}

struct Shared {
    events: EventSink,
    conns: Mutex<BTreeMap<u64, Arc<Conn>>>,
    next_id: AtomicU64,
    mode: Mutex<FrameMode>,
    rx_check: Mutex<Option<ChecksumKind>>,
    pending: Mutex<Vec<Frame>>,
    log: Mutex<Option<LogWriter>>,
    /// 묶음 전송을 한 번에 하나씩 — 꺼낸 줄을 화면에 보내기 전에 상태 사건이 앞질러 가지 않게
    flushing: Mutex<()>,
    responder: Mutex<Option<Responder>>,
    echo: AtomicBool,
    /// 에코는 서버에서만 — 클라이언트가 에코하면 상대 서버와 핑퐁이 되기 쉽다
    server: bool,
    /// 중계(모니터) — `send` 는 A 쪽 끼워 넣기(사건 줄 «INJECT → A»)
    relay: bool,
    /// 에코 횟수(1초 창) — 상대도 에코하면 끝없이 주고받으므로 상한을 넘으면 끈다
    echo_rate: Mutex<(Instant, u32)>,
    /// 되돌아온 응답(에코)으로 볼 시간 창 — None 이면 창 없이 초당 상한만(`set_echo_guard`)
    echo_window: Mutex<Option<Duration>>,
    /// 서버의 연결별 읽기 스레드 — 멈출 때 끝까지 기다려 마지막 기록을 남긴다
    conn_threads: Mutex<Vec<JoinHandle<()>>>,
    stop: AtomicBool,
    /// 중계: pcapng 저장(0.8.0)
    pcap: Mutex<Option<PcapWriter>>,
    /// 중계: 요청 번호 계수기(세션 안에서 1부터)
    pair_seq: Mutex<u64>,
}

/// 서버가 받는 최대 연결 수 — 넘으면 거절하고 기록
pub const MAX_CONNS: usize = 64;
/// 초당 에코 상한
const ECHO_LIMIT: u32 = 200;

pub struct TcpSession {
    shared: Arc<Shared>,
    threads: Vec<JoinHandle<()>>,
    local: Option<SocketAddr>,
}

const BATCH: Duration = Duration::from_millis(50);

/// 이름 → 주소들. IPv4 를 앞에 둔다 — 윈도우에서 localhost 는 ::1 이 먼저 나오는데
/// 장비·서버는 대개 IPv4 에만 묶여 있다
pub(crate) fn resolve_all(host: &str, port: u16) -> Result<Vec<SocketAddr>, String> {
    let mut v: Vec<SocketAddr> = (host, port).to_socket_addrs().map_err(|e| format!("{host}:{port}: {}", crate::oserr::resolve(&e)))?.collect();
    v.sort_by_key(|a| a.is_ipv6()); // 안정 정렬 — 같은 종류 안의 순서는 그대로
    if v.is_empty() {
        return Err(format!("{host}:{port}: {}", crate::oserr::resolve_text()));
    }
    Ok(v)
}

pub(crate) fn resolve(host: &str, port: u16) -> Result<SocketAddr, String> {
    Ok(resolve_all(host, port)?[0])
}

/// 죽은 상대(케이블 뽑힘·전원 꺼짐)를 몇 초 안에 알아채도록 keepalive 를 짧게
const KEEPALIVE_TIME: Duration = Duration::from_secs(5);
const KEEPALIVE_INTERVAL: Duration = Duration::from_secs(1);

fn keepalive(stream: &TcpStream) -> std::io::Result<()> {
    let ka = socket2::TcpKeepalive::new().with_time(KEEPALIVE_TIME).with_interval(KEEPALIVE_INTERVAL);
    socket2::SockRef::from(stream).set_tcp_keepalive(&ka)
}

/// 주소를 차례로 시도해 처음 붙는 것. 모두 실패하면 마지막 오류
fn connect_any(addrs: &[SocketAddr], target: &str) -> Result<TcpStream, String> {
    let mut last = String::new();
    for a in addrs {
        match TcpStream::connect_timeout(a, Duration::from_secs(3)) {
            Ok(s) => return Ok(s),
            Err(e) => last = format!("{target}: {}", crate::oserr::net(&e)),
        }
    }
    Err(last)
}

impl Shared {
    fn note(&self, text: String) {
        self.pending.lock().unwrap().push(Frame::event(text));
    }

    fn status(&self, state: &'static str, port: &str, message: Option<String>) {
        self.events.send(SessionEvent::Status { state, port: port.to_string(), message });
    }

    fn peers(&self) {
        let peers = self.conns.lock().unwrap().iter().map(|(id, c)| Peer { id: *id, addr: c.addr.clone() }).collect();
        self.events.send(SessionEvent::Peers { peers });
    }

    fn flush(&self) {
        let _one = self.flushing.lock().unwrap();
        // pcap: 버퍼를 비우고, 다음 파일로 넘어갔으면 사건 줄로
        let mut rotated = Vec::new();
        self.pcap_put(|w| {
            rotated = w.take_rotated();
            w.flush()
        });
        for p in rotated {
            self.note(format!("PCAP NEXT {p}"));
        }
        let frames = std::mem::take(&mut *self.pending.lock().unwrap());
        crate::event::flush_frames(frames, &self.log, &self.events);
    }

    /// 공통 설정(지연 끄기·쓰기 2초·keepalive) 뒤 읽기용 복제
    fn prepare(&self, stream: &TcpStream, no_delay: bool) -> Option<TcpStream> {
        let _ = stream.set_nodelay(no_delay);
        let _ = stream.set_write_timeout(Some(Duration::from_secs(2)));
        if let Err(e) = keepalive(stream) {
            self.note(format!("KEEPALIVE {e}"));
        }
        let reader = stream.try_clone().ok()?;
        let _ = reader.set_read_timeout(Some(Duration::from_millis(20)));
        Some(reader)
    }

    fn add(&self, stream: TcpStream, no_delay: bool) -> Option<(u64, Arc<Conn>, TcpStream)> {
        self.add_with(stream, no_delay, None)
    }

    fn add_with(&self, stream: TcpStream, no_delay: bool, up: Option<Upstream>) -> Option<(u64, Arc<Conn>, TcpStream)> {
        let addr = stream.peer_addr().map(|a| a.to_string()).unwrap_or_else(|_| "?".into());
        let peer = stream.peer_addr().ok();
        let reader = self.prepare(&stream, no_delay)?;
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let conn = Arc::new(Conn {
            addr,
            writer: Mutex::new(stream),
            framer: Mutex::new(Framer::new(self.mode.lock().unwrap().clone())),
            send_failed: Mutex::new(None),
            up,
            last_reply: Mutex::new(ReplyGuard::new()),
            delayed: Delayer::new(),
            peer,
            pairer: Mutex::new(Pairer::default()),
        });
        self.conns.lock().unwrap().insert(id, conn.clone());
        self.peers();
        Some((id, conn, reader))
    }

    fn push_rx(self: &Arc<Self>, conn: &Arc<Conn>, frames: Vec<crate::framer::Cut>) {
        if frames.is_empty() {
            return;
        }
        let check = *self.rx_check.lock().unwrap();
        let term = conn.framer.lock().unwrap().terminator().to_vec();
        // 시각은 첫 바이트를 받은 순간 — 끊은 순간(무응답 시간 뒤)이 아니다. 시리얼과 같은 기준
        let (now_i, now_w) = (Instant::now(), crate::event::now_ms());
        for (at, bytes) in frames {
            let ts = crate::event::wall_ms(at, now_i, now_w);
            let c = check.and_then(|k| k.verify_before(&bytes, &term));
            // 방금 이 연결에 보낸 응답이 그대로 돌아온 것이면(상대가 에코) 다시 답하지 않는다.
            // 연결마다 따로 본다 — 다른 연결이 같은 요청을 보내도 막지 않게
            let window = *self.echo_window.lock().unwrap();
            let looped = match conn.last_reply.lock().unwrap().check(&bytes, at, window) {
                Verdict::Answer => false,
                Verdict::Echo => true,
                Verdict::Flood { first } => {
                    if first {
                        self.note(format!("{} ({})", flood_note(), conn.addr));
                    }
                    true
                }
            };
            let mut reply: Option<(Vec<u8>, u64, Option<String>)> = None;
            if !looped && let Some(r) = self.responder.lock().unwrap().as_mut() {
                let out = r(&bytes);
                reply = Some((out.bytes.unwrap_or_default(), out.delay_ms, out.note));
            }
            self.pending.lock().unwrap().push(Frame { ts, ..Frame::data("rx", bytes.clone(), c, Some(conn.addr.clone())) });
            if self.server && self.echo.load(Ordering::SeqCst) && self.echo_allowed() {
                self.write_to(conn, &bytes);
            }
            if let Some((b, delay, note)) = reply {
                if let Some(n) = note {
                    self.note(n);
                }
                if !b.is_empty() {
                    conn.last_reply.lock().unwrap().sent(&b, Instant::now() + Duration::from_millis(delay), Duration::ZERO);
                    if delay == 0 {
                        self.write_to(conn, &b);
                    } else {
                        // 지연 응답은 예약 스레드로 — 읽기 스레드는 바로 다음 수신으로 돌아간다
                        let (s, c) = (self.clone(), conn.clone());
                        if let Err(e) = conn.delayed.schedule(Duration::from_millis(delay), move || {
                            if !s.stop.load(Ordering::SeqCst) {
                                s.write_to(&c, &b);
                            }
                        }) {
                            self.note(e.note());
                        }
                    }
                }
            }
        }
    }

    /// 1초에 ECHO_LIMIT 번을 넘으면 에코를 끈다(상대도 에코하는 핑퐁 방지)
    fn echo_allowed(&self) -> bool {
        let mut r = self.echo_rate.lock().unwrap();
        if r.0.elapsed() >= Duration::from_secs(1) {
            *r = (Instant::now(), 0);
        }
        r.1 += 1;
        if r.1 > ECHO_LIMIT {
            drop(r);
            self.echo.store(false, Ordering::SeqCst);
            self.note(crate::tr!(format!("ECHO OFF — 1초에 {ECHO_LIMIT}번을 넘었습니다(상대도 에코 중인지 확인)"), format!("ECHO OFF — more than {ECHO_LIMIT} per second (is the peer echoing too?)")));
            self.events.send(SessionEvent::Error { message: crate::tr!(format!("에코를 껐습니다: 1초에 {ECHO_LIMIT}번 초과"), format!("Echo turned off: over {ECHO_LIMIT} per second")) });
            return false;
        }
        true
    }

    /// 쓰기에 실패하면(2초 시간 초과 포함) 그 연결은 상태를 믿을 수 없으므로 닫는다
    fn write_to(&self, conn: &Conn, bytes: &[u8]) -> bool {
        let res = conn.writer.lock().unwrap().write_all(bytes);
        match res {
            Ok(()) => {
                self.pending.lock().unwrap().push(Frame::data("tx", bytes.to_vec(), None, Some(conn.addr.clone())));
                true
            }
            Err(e) => {
                self.note(crate::tr!(format!("SEND FAIL {} ({e}) — 연결을 닫습니다", conn.addr), format!("SEND FAIL {} ({e}) — closing the connection", conn.addr)));
                conn.send_failed.lock().unwrap().get_or_insert_with(|| crate::tr!(format!("송신 실패로 닫음: {e}"), format!("closed after send failure: {e}")));
                let _ = conn.writer.lock().unwrap().shutdown(Shutdown::Both);
                false
            }
        }
    }

    /// 연결 하나를 끝까지 읽는다. 끝난 이유를 돌려준다.
    fn read_conn(self: &Arc<Self>, id: u64, conn: Arc<Conn>, mut reader: TcpStream) -> String {
        let mut buf = [0u8; 8192];
        let reason = loop {
            if self.stop.load(Ordering::SeqCst) {
                break crate::tr!("닫음", "closed").to_string();
            }
            let user_closed = || !self.conns.lock().unwrap().contains_key(&id);
            match reader.read(&mut buf) {
                // 사용자가 «끊기» 를 눌러 우리가 닫은 것인지 먼저 본다
                Ok(0) if user_closed() => break crate::tr!("사용자가 끊음", "disconnected by user").to_string(),
                Ok(0) => break crate::tr!("상대가 끊음", "closed by peer").to_string(),
                Err(_) if user_closed() => break crate::tr!("사용자가 끊음", "disconnected by user").to_string(),
                Ok(n) => {
                    let frames = conn.framer.lock().unwrap().feed(&buf[..n], Instant::now());
                    self.push_rx(&conn, frames);
                }
                Err(e) if matches!(e.kind(), ErrorKind::TimedOut | ErrorKind::WouldBlock | ErrorKind::Interrupted) => {}
                Err(e) => break crate::oserr::net(&e),
            }
            let tail = conn.framer.lock().unwrap().poll(Instant::now());
            if let Some(f) = tail {
                self.push_rx(&conn, vec![f]);
            }
            // 이 연결이 목록에서 빠졌으면(사용자가 끊음) 그만
            if !self.conns.lock().unwrap().contains_key(&id) {
                break crate::tr!("사용자가 끊음", "disconnected by user").to_string();
            }
        };
        // 우리가 송신 실패로 닫은 것이면 읽기 쪽이 본 «상대가 끊음»·소켓 오류가 아니라 그 이유를 남긴다
        let reason = conn.send_failed.lock().unwrap().take().unwrap_or(reason);
        let rest = conn.framer.lock().unwrap().flush();
        if let Some(f) = rest {
            self.push_rx(&conn, vec![f]);
        }
        self.conns.lock().unwrap().remove(&id);
        // 끊긴 연결에 남은 지연 응답은 버린다(닫힌 소켓에 쓰지 않게)
        conn.delayed.close();
        let _ = reader.shutdown(Shutdown::Both);
        self.note(format!("CLOSE {} ({reason})", conn.addr));
        self.peers();
        reason
    }
}

impl Shared {
    /// 중계 한 방향의 프레임을 기록에 — A→B 는 rx, B→A 는 tx. 상대 칸은 A 주소
    fn push_relay(&self, conn: &Conn, dir: &'static str, framer: &Mutex<Framer>, frames: Vec<crate::framer::Cut>) {
        if frames.is_empty() {
            return;
        }
        let check = *self.rx_check.lock().unwrap();
        let term = framer.lock().unwrap().terminator().to_vec();
        let (now_i, now_w) = (Instant::now(), crate::event::now_ms());
        let mut out = Vec::with_capacity(frames.len());
        for (at, bytes) in frames {
            let ts = crate::event::wall_ms(at, now_i, now_w);
            let c = check.and_then(|k| k.verify_before(&bytes, &term));
            let mut f = Frame { ts, ..Frame::data(dir, bytes, c, Some(conn.addr.clone())) };
            self.mark_pair(conn, &mut f, at, &mut out);
            out.push(f);
        }
        self.pending.lock().unwrap().extend(out);
    }

    /// 중계 줄에 짝 표시 — A→B(rx)는 요청, B→A(tx)는 응답. 이 요청 때문에 무응답이 된 앞 요청은 사건 줄로 먼저
    fn mark_pair(&self, conn: &Conn, f: &mut Frame, at: Instant, out: &mut Vec<Frame>) {
        let mut p = conn.pairer.lock().unwrap();
        if f.dir == "rx" {
            let mut n = self.pair_seq.lock().unwrap();
            if let Some((mark, missed)) = p.request(&f.bytes, at, &mut n) {
                out.extend(missed.into_iter().map(|m| miss_frame(conn, m, false)));
                f.pair = Some(mark);
            }
        } else {
            f.pair = p.response(&f.bytes, at);
        }
    }

    /// pcap 에 쓴다. 실패하면(디스크 가득 등) 저장을 멈추고 한 번 알린다
    fn pcap_put(&self, write: impl FnOnce(&mut PcapWriter) -> std::io::Result<()>) {
        let mut slot = self.pcap.lock().unwrap();
        let Some(w) = slot.as_mut() else { return };
        if let Err(e) = write(w) {
            let path = w.path().to_string();
            *slot = None;
            drop(slot);
            let msg = crate::tr!(format!("pcap 쓰기 실패 — 저장을 멈췄습니다: {path} ({e})"), format!("pcap write failed — saving stopped: {path} ({e})"));
            self.note(msg.clone());
            self.events.send(SessionEvent::Error { message: msg });
        }
    }

    /// 중계 쌍의 한 방향 바이트를 pcap 에(주소를 모르면 건너뜀)
    fn pcap_data(&self, id: u64, conn: &Conn, from_b: bool, bytes: &[u8], comment: Option<&str>) {
        let (Some(a), Some(b)) = (conn.peer, conn.up.as_ref().and_then(|u| u.peer)) else { return };
        let ts = crate::pcap::now_us();
        self.pcap_put(|w| w.data(id, a, b, from_b, bytes, ts, comment));
    }

    /// 중계 한 방향 — 읽는 즉시 반대쪽에 그대로 쓰고(기다리지 않음), 기록은 프레임으로 끊어서.
    /// `from_up` = B→A. 끝난 이유와 «이쪽이 먼저 끝났는지(상대가 끊음·오류)» 를 돌려준다
    fn pump(&self, id: u64, conn: &Conn, mut reader: TcpStream, from_up: bool) -> (String, bool) {
        let up = conn.up.as_ref().expect("relay");
        let (dir, framer, dest, src, dst) = if from_up { ("tx", &up.framer, &conn.writer, "B", "A") } else { ("rx", &conn.framer, &up.writer, "A", "B") };
        let mut buf = [0u8; 8192];
        let gone = || !self.conns.lock().unwrap().contains_key(&id);
        let user = || (crate::tr!("사용자가 끊음", "disconnected by user").to_string(), false);
        let result = loop {
            if self.stop.load(Ordering::SeqCst) {
                break (crate::tr!("닫음", "closed").to_string(), false);
            }
            match reader.read(&mut buf) {
                Ok(0) if gone() => break user(),
                Ok(0) => break (crate::tr!(format!("{src} 쪽이 끊음"), format!("{src} side closed")), true),
                Ok(n) => {
                    let sent = dest.lock().unwrap().write_all(&buf[..n]);
                    if sent.is_ok() {
                        self.pcap_data(id, conn, from_up, &buf[..n], None);
                    }
                    let frames = framer.lock().unwrap().feed(&buf[..n], Instant::now());
                    self.push_relay(conn, dir, framer, frames);
                    if let Err(e) = sent {
                        break (crate::tr!(format!("{dst} 쪽으로 넘기지 못함: {e}"), format!("could not forward to {dst}: {e}")), true);
                    }
                }
                Err(_) if gone() => break user(),
                Err(e) if matches!(e.kind(), ErrorKind::TimedOut | ErrorKind::WouldBlock | ErrorKind::Interrupted) => {}
                Err(e) => break (format!("{src}: {}", crate::oserr::net(&e)), true),
            }
            let tail = framer.lock().unwrap().poll(Instant::now());
            if let Some(f) = tail {
                self.push_relay(conn, dir, framer, vec![f]);
            }
            // 기다린 시간이 넘은 요청 → 무응답(A→B 쪽 스레드만 본다)
            if !from_up {
                let missed = conn.pairer.lock().unwrap().expire(Instant::now());
                if !missed.is_empty() {
                    self.pending.lock().unwrap().extend(missed.into_iter().map(|m| miss_frame(conn, m, false)));
                }
            }
            if gone() {
                break user();
            }
        };
        let rest = framer.lock().unwrap().flush();
        if let Some(f) = rest {
            self.push_relay(conn, dir, framer, vec![f]);
        }
        result
    }

    /// 중계 접속 하나: 위쪽(B)에 접속 → 양방향 복사 → 한쪽이 끝나면 둘 다 닫기(다시 잇지 않음)
    fn relay_conn(self: &Arc<Self>, client: TcpStream, no_delay: bool, b: &RelayTarget) {
        let from = client.peer_addr().map(|a| a.to_string()).unwrap_or_else(|_| "?".into());
        let target = format!("{}:{}", b.host, b.port);
        let Some(attempt) = connect_stoppable(self, &b.host, b.port, &target) else {
            let _ = client.shutdown(Shutdown::Both);
            return;
        };
        let upstream = match attempt {
            Ok(s) => s,
            Err(e) => {
                self.note(crate::tr!(format!("RELAY FAIL {from} → {e} — A 쪽 연결을 닫습니다"), format!("RELAY FAIL {from} → {e} — closing the A side")));
                let _ = client.shutdown(Shutdown::Both);
                return;
            }
        };
        let Some(up_reader) = self.prepare(&upstream, no_delay) else {
            let _ = client.shutdown(Shutdown::Both);
            return;
        };
        let up_addr = upstream.peer_addr().map(|a| a.to_string()).unwrap_or(target);
        let up_peer = upstream.peer_addr().ok();
        let up = Upstream { addr: up_addr.clone(), writer: Mutex::new(upstream), framer: Mutex::new(Framer::new(self.mode.lock().unwrap().clone())), peer: up_peer };
        let Some((id, conn, reader)) = self.add_with(client, no_delay, Some(up)) else { return };
        self.note(format!("RELAY {} ⇄ {up_addr}", conn.addr));
        // 먼저 끝난 쪽(상대가 끊음·오류)의 이유 — 그 뒤 우리가 닫아서 끝난 반대쪽 이유로 덮지 않는다
        let first: Arc<Mutex<Option<String>>> = Arc::default();
        let (s2, c2, f2) = (self.clone(), conn.clone(), first.clone());
        let back = std::thread::spawn(move || {
            let (why, real) = s2.pump(id, &c2, up_reader, true);
            if real {
                f2.lock().unwrap().get_or_insert(why.clone());
            }
            // B 가 먼저 끝났으면 A 쪽도 닫는다 — A 읽기가 바로 끝난다
            let _ = c2.writer.lock().unwrap().shutdown(Shutdown::Both);
            why
        });
        let (a_reason, a_real) = self.pump(id, &conn, reader, false);
        if a_real {
            first.lock().unwrap().get_or_insert(a_reason.clone());
        }
        if let Some(u) = &conn.up {
            let _ = u.writer.lock().unwrap().shutdown(Shutdown::Both);
        }
        let _ = conn.writer.lock().unwrap().shutdown(Shutdown::Both);
        let _ = back.join();
        let reason = first.lock().unwrap().take().unwrap_or(a_reason);
        self.conns.lock().unwrap().remove(&id);
        // 끝까지 응답이 없던 요청은 무응답으로, pcap 에는 FIN
        let missed = conn.pairer.lock().unwrap().close(Instant::now());
        if !missed.is_empty() {
            self.pending.lock().unwrap().extend(missed.into_iter().map(|m| miss_frame(&conn, m, true)));
        }
        let ts = crate::pcap::now_us();
        self.pcap_put(|w| w.close(id, ts));
        self.note(format!("CLOSE {} ⇄ {up_addr} ({reason})", conn.addr));
        self.peers();
    }
}

/// 무응답 사건 줄(상대 칸 = A 주소)
fn miss_frame(conn: &Conn, m: PairMark, closed: bool) -> Frame {
    let note = miss_note(&m, closed);
    Frame { peer: Some(conn.addr.clone()), pair: Some(m), ..Frame::event(note) }
}

/// 버려지기만 해도 스레드가 멈추게(보관함에서 지워진 세션 등). `stop` 은 끝까지 기다린다.
impl Drop for TcpSession {
    fn drop(&mut self) {
        self.shared.stop.store(true, Ordering::SeqCst);
    }
}

impl TcpSession {
    /// 클라이언트·서버. 중계(`TcpMode::Relay`)는 `start_relay`
    pub fn start(
        cfg: TcpConfig,
        mode: FrameMode,
        rx_check: Option<ChecksumKind>,
        responder: Option<Responder>,
        events: EventSink,
    ) -> Result<Self, String> {
        Self::start_inner(cfg, None, mode, rx_check, responder, events)
    }

    /// 중계(모니터): `cfg.host:cfg.port` 에서 듣고, 들어온 접속마다 `upstream` 으로 이어 준다(자동응답·에코 없음)
    pub fn start_relay(cfg: TcpConfig, upstream: RelayTarget, mode: FrameMode, rx_check: Option<ChecksumKind>, events: EventSink) -> Result<Self, String> {
        let upstream = RelayTarget { host: upstream.host.trim().to_string(), port: upstream.port };
        if upstream.host.is_empty() || upstream.port == 0 {
            return Err(crate::tr!("이어 줄 장비(B)의 주소와 포트(1~65535)를 넣어 주세요", "Enter the device (B) host and port (1–65535) to relay to").into());
        }
        Self::start_inner(TcpConfig { mode: TcpMode::Relay, echo: false, ..cfg }, Some(upstream), mode, rx_check, None, events)
    }

    fn start_inner(
        cfg: TcpConfig,
        upstream: Option<RelayTarget>,
        mode: FrameMode,
        rx_check: Option<ChecksumKind>,
        responder: Option<Responder>,
        events: EventSink,
    ) -> Result<Self, String> {
        if cfg.mode == TcpMode::Client && (cfg.host.trim().is_empty() || cfg.port == 0) {
            return Err(crate::tr!("연결할 주소와 포트(1~65535)를 넣어 주세요", "Enter the host and port (1–65535) to connect to").into());
        }
        let upstream = match (cfg.mode, upstream) {
            (TcpMode::Relay, Some(u)) => Some(u),
            (TcpMode::Relay, None) => {
                return Err(crate::tr!("이어 줄 장비(B)의 주소와 포트(1~65535)를 넣어 주세요", "Enter the device (B) host and port (1–65535) to relay to").into());
            }
            _ => None,
        };
        let shared = Arc::new(Shared {
            events,
            conns: Mutex::new(BTreeMap::new()),
            next_id: AtomicU64::new(1),
            mode: Mutex::new(mode),
            rx_check: Mutex::new(rx_check),
            pending: Mutex::new(Vec::new()),
            log: Mutex::new(None),
            flushing: Mutex::new(()),
            responder: Mutex::new(responder),
            echo: AtomicBool::new(cfg.echo && cfg.mode == TcpMode::Server),
            server: cfg.mode == TcpMode::Server,
            relay: cfg.mode == TcpMode::Relay,
            echo_rate: Mutex::new((Instant::now(), 0)),
            echo_window: Mutex::new(Some(ECHO_MARGIN)),
            conn_threads: Mutex::new(Vec::new()),
            stop: AtomicBool::new(false),
            pcap: Mutex::new(None),
            pair_seq: Mutex::new(0),
        });
        let mut threads = Vec::new();

        // 묶음 전송
        let s = shared.clone();
        threads.push(std::thread::spawn(move || {
            while !s.stop.load(Ordering::SeqCst) {
                std::thread::sleep(BATCH);
                s.flush();
            }
            s.flush();
        }));

        let mut local = None;
        match cfg.mode {
            TcpMode::Server | TcpMode::Relay => {
                let addr = resolve(&cfg.host, cfg.port)?;
                let listener = TcpListener::bind(addr).map_err(|e| crate::net::bind_error(&e, addr, false))?;
                listener.set_nonblocking(true).map_err(|e| e.to_string())?;
                let bound = listener.local_addr().map_err(|e| e.to_string())?;
                local = Some(bound);
                if let Some(u) = &upstream {
                    shared.note(format!("RELAY LISTEN {bound} → {}:{}", u.host, u.port));
                } else {
                    shared.note(format!("LISTEN {bound}"));
                }
                shared.status("listening", &bound.to_string(), None);
                let s = shared.clone();
                let no_delay = cfg.no_delay;
                let target = upstream.clone();
                threads.push(std::thread::spawn(move || {
                    while !s.stop.load(Ordering::SeqCst) {
                        match listener.accept() {
                            Ok((stream, from)) => {
                                if s.conns.lock().unwrap().len() >= MAX_CONNS {
                                    s.note(crate::tr!(format!("REJECT {from} — 최대 연결 수 {MAX_CONNS}"), format!("REJECT {from} — max {MAX_CONNS} connections")));
                                    let _ = stream.shutdown(Shutdown::Both);
                                    continue;
                                }
                                let _ = stream.set_nonblocking(false);
                                if let Some(t) = &target {
                                    // 위쪽 접속(주소마다 최대 3초)은 따로 — 받기는 바로 다음 접속으로
                                    let (s2, t) = (s.clone(), t.clone());
                                    let h = std::thread::spawn(move || s2.relay_conn(stream, no_delay, &t));
                                    let mut ts = s.conn_threads.lock().unwrap();
                                    ts.retain(|h| !h.is_finished());
                                    ts.push(h);
                                    continue;
                                }
                                if let Some((id, conn, reader)) = s.add(stream, no_delay) {
                                    s.note(format!("ACCEPT {}", conn.addr));
                                    let s2 = s.clone();
                                    let h = std::thread::spawn(move || {
                                        s2.read_conn(id, conn, reader);
                                    });
                                    let mut ts = s.conn_threads.lock().unwrap();
                                    ts.retain(|h| !h.is_finished());
                                    ts.push(h);
                                }
                            }
                            Err(e) if e.kind() == ErrorKind::WouldBlock => std::thread::sleep(Duration::from_millis(20)),
                            Err(e) => {
                                s.note(format!("ACCEPT ERROR {e}"));
                                std::thread::sleep(Duration::from_millis(200));
                            }
                        }
                    }
                    // 연결별 스레드가 CLOSE 를 남길 때까지 기다리고, 남은 줄을 다 보낸 뒤에 «닫힘»
                    let conns = std::mem::take(&mut *s.conn_threads.lock().unwrap());
                    for t in conns {
                        let _ = t.join();
                    }
                    s.note("STOP LISTEN".into());
                    s.flush();
                    s.status("closed", "", None);
                }));
            }
            TcpMode::Client => {
                let target = format!("{}:{}", cfg.host, cfg.port);
                let s = shared.clone();
                let c = cfg.clone();
                threads.push(std::thread::spawn(move || client_loop(s, c, target)));
            }
        }
        Ok(Self { shared, threads, local })
    }

    /// 서버가 실제로 묶인 주소(포트 0 으로 열었을 때 확인용)
    pub fn local_addr(&self) -> Option<SocketAddr> {
        self.local
    }

    pub fn set_framing(&self, mode: FrameMode, rx_check: Option<ChecksumKind>) {
        *self.shared.mode.lock().unwrap() = mode.clone();
        for c in self.shared.conns.lock().unwrap().values() {
            c.framer.lock().unwrap().set_mode(mode.clone());
            if let Some(u) = &c.up {
                u.framer.lock().unwrap().set_mode(mode.clone());
            }
        }
        *self.shared.rx_check.lock().unwrap() = rx_check;
    }

    pub fn set_echo(&self, on: bool) {
        let on = on && self.shared.server;
        if self.shared.echo.swap(on, Ordering::SeqCst) != on {
            self.shared.note(format!("ECHO {}", if on { "ON" } else { "OFF" }));
        }
    }

    /// 응답이 되돌아온 것(에코)으로 볼 시간 창. 기본은 응답 직후 50ms.
    /// None 이면 창으로 거르지 않고 초당 상한(`replyguard::LOOP_LIMIT`)만 본다 — TCP 는 점대점이라 선로 에코가 없고,
    /// Modbus TCP 처럼 요청 = 응답(05·06)이 흔한 곳에서 같은 쓰기를 곧바로 다시 보내도 답하게
    pub fn set_echo_guard(&self, window: Option<Duration>) {
        *self.shared.echo_window.lock().unwrap() = window;
    }

    pub fn set_responder(&self, r: Option<Responder>) {
        *self.shared.responder.lock().unwrap() = r;
    }

    /// target 이 None 이면 붙어 있는 모두에게. (보낸 연결 수, 대상 연결 수) — 실패한 연결은
    /// `write_to` 가 «SEND FAIL» 을 한 번 남기고 닫는다
    pub fn send(&self, target: Option<u64>, bytes: &[u8]) -> Result<(usize, usize), String> {
        let conns: Vec<Arc<Conn>> = {
            let map = self.shared.conns.lock().unwrap();
            match target {
                Some(id) => map.get(&id).cloned().into_iter().collect(),
                None => map.values().cloned().collect(),
            }
        };
        if conns.is_empty() {
            return Err(crate::tr!("연결된 상대가 없습니다", "No peer is connected").into());
        }
        let total = conns.len();
        if self.shared.relay {
            let n = bytes.len();
            self.shared.note(crate::tr!(format!("INJECT → A ({n}바이트)"), format!("INJECT → A ({n} bytes)")));
        }
        let sent = conns.iter().filter(|c| self.shared.write_to(c, bytes)).count();
        if self.shared.relay {
            let ids: Vec<(u64, Arc<Conn>)> = self.shared.conns.lock().unwrap().iter().filter(|(_, c)| conns.iter().any(|x| Arc::ptr_eq(x, c))).map(|(i, c)| (*i, c.clone())).collect();
            for (id, c) in ids {
                self.shared.pcap_data(id, &c, true, bytes, Some("PortDock INJECT -> A"));
            }
        }
        Ok((sent, total))
    }

    /// 중계: 위쪽(B)에 끼워 넣기. target 이 None 이면 모든 쌍의 B 쪽으로. 기록은 A→B 방향(rx) + 사건 줄 «INJECT»
    pub fn send_upstream(&self, target: Option<u64>, bytes: &[u8]) -> Result<(usize, usize), String> {
        let conns: Vec<Arc<Conn>> = {
            let map = self.shared.conns.lock().unwrap();
            match target {
                Some(id) => map.get(&id).cloned().into_iter().collect(),
                None => map.values().cloned().collect(),
            }
        };
        let ids: BTreeMap<*const Conn, u64> = self.shared.conns.lock().unwrap().iter().map(|(i, c)| (Arc::as_ptr(c), *i)).collect();
        let pairs: Vec<&Arc<Conn>> = conns.iter().filter(|c| c.up.is_some()).collect();
        if pairs.is_empty() {
            return Err(crate::tr!("이어진 중계 쌍이 없습니다", "No relayed pair is connected").into());
        }
        let mut sent = 0;
        for c in &pairs {
            let u = c.up.as_ref().expect("relay");
            // 쓰는 동안 쥐고 있어 B 로 가는 복사와 섞이지 않게
            let mut w = u.writer.lock().unwrap();
            match w.write_all(bytes) {
                Ok(()) => {
                    sent += 1;
                    drop(w);
                    if let Some(&id) = ids.get(&Arc::as_ptr(c)) {
                        self.shared.pcap_data(id, c, false, bytes, Some("PortDock INJECT -> B"));
                    }
                    // 끼워 넣은 요청도 짝을 기다린다 — B 의 응답에 응답 시간이 붙게
                    let mut f = Frame::data("rx", bytes.to_vec(), None, Some(c.addr.clone()));
                    let mut out = vec![Frame::event(crate::tr!(format!("INJECT → B {} ({}바이트)", u.addr, bytes.len()), format!("INJECT → B {} ({} bytes)", u.addr, bytes.len())))];
                    self.shared.mark_pair(c, &mut f, Instant::now(), &mut out);
                    out.push(f);
                    self.shared.pending.lock().unwrap().extend(out);
                }
                Err(e) => {
                    self.shared.note(crate::tr!(format!("SEND FAIL B {} ({e}) — 쌍을 닫습니다", u.addr), format!("SEND FAIL B {} ({e}) — closing the pair", u.addr)));
                    let _ = w.shutdown(Shutdown::Both);
                }
            }
        }
        Ok((sent, pairs.len()))
    }

    /// 서버: 특정 상대 끊기(중계면 위쪽 연결도)
    pub fn kick(&self, id: u64) {
        let c = self.shared.conns.lock().unwrap().remove(&id);
        if let Some(c) = c {
            let _ = c.writer.lock().unwrap().shutdown(Shutdown::Both);
            if let Some(u) = &c.up {
                let _ = u.writer.lock().unwrap().shutdown(Shutdown::Both);
            }
        }
    }

    /// 중계인지(끼워 넣기 쪽을 고를 수 있는지)
    pub fn is_relay(&self) -> bool {
        self.shared.relay
    }

    pub fn set_log(&self, path: Option<String>) -> Result<(), String> {
        *self.shared.log.lock().unwrap() = path.as_deref().map(LogWriter::open).transpose()?;
        Ok(())
    }

    /// (0.8.0) 중계: pcapng 저장 시작(경로)·멈춤(None). 파일 하나는 파일 로그의 «크기로 나누기(MB)» 에서
    /// 다음 파일로(설정이 0 이면 100MB). `app` 은 파일 머리의 만든 프로그램 이름
    pub fn set_pcap(&self, path: Option<String>, app: &str) -> Result<(), String> {
        if !self.shared.relay {
            return Err(crate::tr!("pcap 저장은 중계(모니터)에서만 됩니다", "Saving pcap works in relay (monitor) mode only").into());
        }
        let next = match path.as_deref() {
            Some(p) => {
                let mb = crate::event::log_options().split_mb as u64;
                Some(PcapWriter::create(p, app, if mb > 0 { mb * 1_048_576 } else { crate::pcap::DEFAULT_LIMIT })?)
            }
            None => None,
        };
        let started = next.as_ref().map(|w| w.path().to_string());
        let old = std::mem::replace(&mut *self.shared.pcap.lock().unwrap(), next);
        if let Some(mut w) = old {
            let _ = w.flush();
            self.shared.note(format!("PCAP STOP {} ({} packets)", w.path(), w.packets()));
        }
        if let Some(p) = started {
            self.shared.note(format!("PCAP START {p}"));
        }
        Ok(())
    }

    pub fn stop(mut self) {
        self.shared.stop.store(true, Ordering::SeqCst);
        let ids: Vec<u64> = self.shared.conns.lock().unwrap().keys().copied().collect();
        for id in ids {
            self.kick(id);
        }
        for t in self.threads.drain(..) {
            let _ = t.join();
        }
        let conn_threads = std::mem::take(&mut *self.shared.conn_threads.lock().unwrap());
        for t in conn_threads {
            let _ = t.join();
        }
        let last = self.shared.pcap.lock().unwrap().take();
        if let Some(mut w) = last {
            let _ = w.flush();
            self.shared.note(format!("PCAP STOP {} ({} packets)", w.path(), w.packets()));
        }
        self.shared.flush();
    }
}

/// 접속 시도를 도우미 스레드에서 하고, 끝나거나 멈출 때까지 50ms 마다 본다. 멈추면 None
/// (도우미는 남은 시도를 마치고 스스로 끝난다 — 그 사이 붙은 연결은 바로 버려진다)
fn connect_stoppable(s: &Shared, host: &str, port: u16, target: &str) -> Option<Result<TcpStream, String>> {
    let (tx, rx) = std::sync::mpsc::channel();
    let (host, target2) = (host.to_string(), target.to_string());
    std::thread::spawn(move || {
        let _ = tx.send(resolve_all(&host, port).and_then(|a| connect_any(&a, &target2)));
    });
    loop {
        match rx.recv_timeout(Duration::from_millis(50)) {
            Ok(r) => return Some(r),
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) if s.stop.load(Ordering::SeqCst) => return None,
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {}
            Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                return Some(Err(format!("{target}: {}", crate::tr!("연결 시도가 중단됐습니다", "connect attempt aborted"))));
            }
        }
    }
}

fn client_loop(s: Arc<Shared>, cfg: TcpConfig, target: String) {
    // 끊긴·실패한 이유 — 다음 상태(재연결 대기·닫힘) 문구에 이어 붙여 덮어쓰지 않는다
    let mut last: Option<String> = None;
    loop {
        if s.stop.load(Ordering::SeqCst) {
            break;
        }
        // 이름 조회·접속(주소마다 최대 3초)은 따로 — 기다리는 동안 «멈춤» 을 누르면 바로 끝낸다
        let Some(attempt) = connect_stoppable(&s, &cfg.host, cfg.port, &target) else { break };
        match attempt {
            Ok(stream) => {
                if let Some((id, conn, reader)) = s.add(stream, cfg.no_delay) {
                    s.note(format!("CONNECT {}", conn.addr));
                    s.status("connected", &conn.addr, None);
                    let reason = s.read_conn(id, conn, reader);
                    s.flush(); // CLOSE 줄이 상태 사건보다 먼저
                    s.status("disconnected", &target, Some(reason.clone()));
                    last = Some(reason);
                }
            }
            Err(e) => {
                s.note(format!("CONNECT FAIL {e}"));
                s.status("disconnected", &target, Some(e.clone()));
                last = Some(e);
            }
        }
        if !cfg.auto_reconnect || s.stop.load(Ordering::SeqCst) {
            break;
        }
        s.status("reconnecting", &target, last.as_deref().map(waiting_reason));
        let until = Instant::now() + Duration::from_millis(cfg.reconnect_ms.max(200));
        while Instant::now() < until && !s.stop.load(Ordering::SeqCst) {
            std::thread::sleep(Duration::from_millis(50));
        }
    }
    // 사용자가 멈춘 것이면 이유를 붙이지 않는다
    let msg = if s.stop.load(Ordering::SeqCst) { None } else { last.as_deref().map(closed_reason) };
    s.flush();
    s.status("closed", &target, msg);
}

// ---------------------------------------------------------------- Modbus TCP(MBAP)

/// MBAP 머리(트랜잭션 2 · 프로토콜 0 · 길이 2 · 유닛 1) 모양이고 길이 칸이 맞는지
pub fn is_mbap(b: &[u8]) -> bool {
    b.len() >= 8 && b[2] == 0 && b[3] == 0 && u16::from_be_bytes([b[4], b[5]]) as usize == b.len() - 6
}

/// MBAP 이면 트랜잭션 ID 를 바꾼다(보낼 때 자동 증가). 바꿨으면 true
pub fn mbap_set_tid(b: &mut [u8], tid: u16) -> bool {
    if !is_mbap(b) {
        return false;
    }
    b[..2].copy_from_slice(&tid.to_be_bytes());
    true
}

/// MBAP + PDU 풀이 — 상세 칸용
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MbapInfo {
    pub transaction: u16,
    pub protocol: u16,
    /// 길이 칸 값(유닛 ID 부터 센 바이트 수)
    pub length: u16,
    pub unit: u8,
    /// 길이 칸이 실제 길이와 맞는지
    pub length_ok: bool,
    /// PDU 풀이(RTU 풀이를 그대로 — CRC 칸은 뜻 없음)
    pub modbus: Option<crate::modbus::ModbusInfo>,
    /// 한 줄 요약 «id1 FC03 HR 0..9 (10)»
    pub summary: String,
}

/// 프레임을 MBAP 으로 풀어 본다. 7바이트보다 짧거나 프로토콜이 0 이 아니면 None
pub fn decode_mbap(b: &[u8]) -> Option<MbapInfo> {
    if b.len() < 8 || b[2] != 0 || b[3] != 0 {
        return None;
    }
    let length = u16::from_be_bytes([b[4], b[5]]);
    let unit = b[6];
    let pdu = &b[7..];
    // RTU 모양(유닛 + PDU + CRC)으로 바꿔 같은 풀이를 쓴다
    let mut rtu = Vec::with_capacity(pdu.len() + 3);
    rtu.push(unit);
    rtu.extend_from_slice(pdu);
    rtu.extend(crate::checksum::crc16_modbus(&rtu).to_le_bytes());
    let modbus = crate::modbus::decode(&rtu);
    let sum = crate::modbus::Summarizer::new(crate::modbus::Wire::Tcp, crate::modbus::AddrStyle::default());
    let response = modbus.as_ref().is_some_and(|m| matches!(m.kind, "response" | "exception"));
    let summary = if response { sum.response(unit, None, pdu) } else { sum.request(unit, pdu) };
    Some(MbapInfo { transaction: u16::from_be_bytes([b[0], b[1]]), protocol: 0, length, unit, length_ok: length as usize == b.len() - 6, modbus, summary })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;

    fn sink() -> (EventSink, mpsc::Receiver<SessionEvent>) {
        let (tx, rx) = mpsc::channel();
        let tx = Mutex::new(tx);
        (EventSink::new(move |e| drop(tx.lock().unwrap().send(e))), rx)
    }

    fn wait_frames(rx: &mpsc::Receiver<SessionEvent>, dir: &str, want: usize) -> Vec<Frame> {
        let mut got = Vec::new();
        let deadline = Instant::now() + Duration::from_secs(5);
        while got.len() < want && Instant::now() < deadline {
            if let Ok(SessionEvent::Frames { frames }) = rx.recv_timeout(Duration::from_millis(100)) {
                got.extend(frames.into_iter().filter(|f| f.dir == dir));
            }
        }
        got
    }

    fn cfg(mode: TcpMode, port: u16) -> TcpConfig {
        TcpConfig { mode, host: "127.0.0.1".into(), port, no_delay: true, auto_reconnect: false, reconnect_ms: 200, echo: false }
    }

    #[test]
    fn client_and_server_talk_with_terminator_framing() {
        let (ssink, srx) = sink();
        let term = FrameMode::Terminator { bytes: b"\r\n".to_vec(), gap_ms: 500 };
        let server = TcpSession::start(cfg(TcpMode::Server, 0), term.clone(), None, None, ssink).unwrap();
        let port = server.local_addr().unwrap().port();

        let (csink, crx) = sink();
        let client = TcpSession::start(cfg(TcpMode::Client, port), term, None, None, csink).unwrap();
        // 접속될 때까지
        let deadline = Instant::now() + Duration::from_secs(5);
        while client.send(None, b"").is_err() && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(20));
        }
        client.send(None, b"HELLO\r\nWOR").unwrap();
        client.send(None, b"LD\r\n").unwrap();
        let got = wait_frames(&srx, "rx", 2);
        assert_eq!(got.iter().map(|f| f.bytes.clone()).collect::<Vec<_>>(), vec![b"HELLO\r\n".to_vec(), b"WORLD\r\n".to_vec()]);
        assert!(got[0].peer.as_deref().unwrap().starts_with("127.0.0.1:"));

        // 서버 → 모든 클라이언트
        assert_eq!(server.send(None, b"OK\r\n").unwrap(), (1, 1));
        let back = wait_frames(&crx, "rx", 1);
        assert_eq!(back[0].bytes, b"OK\r\n".to_vec());
        client.stop();
        server.stop();
    }

    #[test]
    fn server_echo() {
        let (ssink, _srx) = sink();
        let gap = FrameMode::Gap { gap_ms: 20 };
        let server = TcpSession::start(TcpConfig { echo: true, ..cfg(TcpMode::Server, 0) }, gap.clone(), None, None, ssink).unwrap();
        let port = server.local_addr().unwrap().port();
        let mut raw = TcpStream::connect(("127.0.0.1", port)).unwrap();
        raw.set_read_timeout(Some(Duration::from_secs(3))).unwrap();
        raw.write_all(&[1, 2, 3]).unwrap();
        let mut buf = [0u8; 3];
        raw.read_exact(&mut buf).unwrap();
        assert_eq!(buf, [1, 2, 3]);
        server.stop();
    }

    /// 우리가 송신 실패로 닫은 연결은 CLOSE 줄에 «상대가 끊음» 이 아니라 송신 실패로 남는다
    #[test]
    fn close_after_send_failure_says_so() {
        let (ssink, srx) = sink();
        let server = TcpSession::start(cfg(TcpMode::Server, 0), FrameMode::Gap { gap_ms: 20 }, None, None, ssink).unwrap();
        let port = server.local_addr().unwrap().port();
        let _raw = TcpStream::connect(("127.0.0.1", port)).unwrap();
        let deadline = Instant::now() + Duration::from_secs(5);
        while server.shared.conns.lock().unwrap().is_empty() && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(10));
        }
        // 쓰기 쪽만 닫아 두면 다음 송신이 바로 실패한다
        let conn = server.shared.conns.lock().unwrap().values().next().cloned().unwrap();
        conn.writer.lock().unwrap().shutdown(Shutdown::Write).unwrap();
        assert_eq!(server.send(None, b"x").unwrap(), (0, 1));
        let close = loop {
            let ev = wait_frames(&srx, "ev", 1);
            assert!(!ev.is_empty(), "no CLOSE line");
            if let Some(f) = ev.iter().find(|f| f.note.as_deref().is_some_and(|n| n.starts_with("CLOSE "))) {
                break f.note.clone().unwrap();
            }
        };
        assert!(!close.contains(crate::tr!("상대가 끊음", "closed by peer")), "{close}");
        assert!(close.contains(crate::tr!("송신 실패", "send failure")), "{close}");
        server.stop();
    }

    /// 서버를 멈추면 CLOSE·STOP LISTEN 줄이 «closed» 상태보다 먼저 온다
    #[test]
    fn server_stop_lines_arrive_before_closed() {
        let (ssink, srx) = sink();
        let server = TcpSession::start(cfg(TcpMode::Server, 0), FrameMode::Gap { gap_ms: 20 }, None, None, ssink).unwrap();
        let port = server.local_addr().unwrap().port();
        let _raw = TcpStream::connect(("127.0.0.1", port)).unwrap();
        let deadline = Instant::now() + Duration::from_secs(5);
        while server.shared.conns.lock().unwrap().is_empty() && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(10));
        }
        server.stop();
        let mut notes = Vec::new();
        let mut closed_at = None;
        while let Ok(e) = rx_try(&srx) {
            match e {
                SessionEvent::Frames { frames } => notes.extend(frames.into_iter().filter_map(|f| f.note)),
                SessionEvent::Status { state: "closed", .. } => closed_at = Some(notes.len()),
                _ => {}
            }
        }
        let closed_at = closed_at.expect("closed status");
        let before = &notes[..closed_at];
        assert!(before.iter().any(|n| n.starts_with("CLOSE ")), "{notes:?}");
        assert!(before.iter().any(|n| n == "STOP LISTEN"), "{notes:?}");
        assert_eq!(closed_at, notes.len(), "lines after closed: {notes:?}");
    }

    fn rx_try(rx: &mpsc::Receiver<SessionEvent>) -> Result<SessionEvent, mpsc::RecvTimeoutError> {
        rx.recv_timeout(Duration::from_millis(200))
    }

    #[test]
    fn client_requires_host_and_port() {
        let (s, _) = sink();
        assert!(TcpSession::start(cfg(TcpMode::Client, 0), FrameMode::default(), None, None, s).is_err());
    }

    #[test]
    fn client_reports_refused() {
        // 아무도 듣지 않는 포트
        let free = TcpListener::bind("127.0.0.1:0").unwrap().local_addr().unwrap().port();
        let (csink, crx) = sink();
        let client = TcpSession::start(cfg(TcpMode::Client, free), FrameMode::default(), None, None, csink).unwrap();
        let mut saw = false;
        let deadline = Instant::now() + Duration::from_secs(5);
        while !saw && Instant::now() < deadline {
            if let Ok(SessionEvent::Status { state, .. }) = crx.recv_timeout(Duration::from_millis(100)) {
                saw = state == "disconnected";
            }
        }
        assert!(saw);
        client.stop();
    }

    #[test]
    fn reconnecting_keeps_last_failure_reason() {
        let free = TcpListener::bind("127.0.0.1:0").unwrap().local_addr().unwrap().port();
        let (csink, crx) = sink();
        let c = TcpConfig { auto_reconnect: true, ..cfg(TcpMode::Client, free) };
        let client = TcpSession::start(c, FrameMode::default(), None, None, csink).unwrap();
        let mut msg = None;
        let deadline = Instant::now() + Duration::from_secs(8);
        while msg.is_none() && Instant::now() < deadline {
            if let Ok(SessionEvent::Status { state: "reconnecting", message, .. }) = crx.recv_timeout(Duration::from_millis(100)) {
                msg = Some(message);
            }
        }
        let m = msg.expect("reconnecting").expect("message");
        assert!(m.starts_with("재연결 대기 · 마지막 실패:"), "{m}");
        assert!(m.contains("연결 거부") || m.contains("응답 없음"), "{m}");
        client.stop();
    }

    #[test]
    fn localhost_prefers_ipv4() {
        let v = resolve_all("localhost", 80).unwrap();
        if v.iter().any(|a| a.is_ipv4()) {
            assert!(v[0].is_ipv4(), "{v:?}");
        }
    }

    #[test]
    fn client_reaches_ipv4_only_server_by_name() {
        let (ssink, srx) = sink();
        let server = TcpSession::start(cfg(TcpMode::Server, 0), FrameMode::Gap { gap_ms: 20 }, None, None, ssink).unwrap();
        let port = server.local_addr().unwrap().port();
        let (csink, _crx) = sink();
        let client = TcpSession::start(TcpConfig { host: "localhost".into(), ..cfg(TcpMode::Client, port) }, FrameMode::Gap { gap_ms: 20 }, None, None, csink).unwrap();
        let deadline = Instant::now() + Duration::from_secs(8);
        while client.send(None, b"").is_err() && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(20));
        }
        client.send(None, b"hi").unwrap();
        assert_eq!(wait_frames(&srx, "rx", 1)[0].bytes, b"hi".to_vec());
        client.stop();
        server.stop();
    }

    /// RX 시각은 첫 바이트를 받은 순간 — 무응답 시간(여기선 300ms)만큼 늦게 찍히면 응답 시간 측정이 틀린다
    #[test]
    fn rx_timestamp_is_first_byte_not_cut_time() {
        let (ssink, srx) = sink();
        let server = TcpSession::start(cfg(TcpMode::Server, 0), FrameMode::Gap { gap_ms: 300 }, None, None, ssink).unwrap();
        let port = server.local_addr().unwrap().port();
        let mut raw = TcpStream::connect(("127.0.0.1", port)).unwrap();
        std::thread::sleep(Duration::from_millis(100));
        let sent_at = crate::event::now_ms();
        raw.write_all(b"A").unwrap();
        let got = wait_frames(&srx, "rx", 1);
        let lag = got[0].ts.saturating_sub(sent_at);
        assert!(lag < 150, "rx ts {lag}ms after send");
        server.stop();
    }

    /// 접속 중(응답 없는 주소 — 3초 시간 초과)에 멈추면 곧바로 끝난다
    #[test]
    fn stop_while_connecting_is_prompt() {
        let (csink, _crx) = sink();
        let c = TcpConfig { host: "192.0.2.1".into(), ..cfg(TcpMode::Client, 9) };
        let client = TcpSession::start(c, FrameMode::default(), None, None, csink).unwrap();
        std::thread::sleep(Duration::from_millis(200));
        let t = Instant::now();
        client.stop();
        assert!(t.elapsed() < Duration::from_millis(1000), "stop took {:?}", t.elapsed());
    }

    fn rule(pat: &str, reply: &str) -> crate::autoreply::Rule {
        use crate::codec::{SendSpec, TextMode};
        crate::autoreply::Rule::compile(&crate::autoreply::RuleSpec {
            name: pat.into(),
            enabled: true,
            pattern: pat.into(),
            pattern_mode: TextMode::Ascii,
            kind: crate::autoreply::MatchKind::Exact,
            reply: SendSpec { text: reply.into(), mode: TextMode::Ascii, checksum: None, suffix: String::new() },
            delay_ms: 0,
            delay_max_ms: 0,
            drop_every: 0,
            drop_pct: 0.0,
            more_replies: vec![],
            reply_order: crate::autoreply::ReplyOrder::Sequence,
            wild: true,
        })
        .unwrap()
    }

    fn ping_responder() -> Responder {
        let rules = Arc::new(Mutex::new(vec![rule("PING", "PING")]));
        crate::autoreply::responder(rules, Arc::new(Mutex::new(BTreeMap::new())))
    }

    /// 응답 = 요청(PING→PING) 규칙을 가진 둘이 마주 봐도 한 바퀴에서 멈춘다
    #[test]
    fn reply_equal_to_request_does_not_loop() {
        let gap = FrameMode::Gap { gap_ms: 20 };
        let (ssink, srx) = sink();
        let server = TcpSession::start(cfg(TcpMode::Server, 0), gap.clone(), None, Some(ping_responder()), ssink).unwrap();
        let port = server.local_addr().unwrap().port();
        let (csink, crx) = sink();
        let client = TcpSession::start(cfg(TcpMode::Client, port), gap, None, Some(ping_responder()), csink).unwrap();
        let deadline = Instant::now() + Duration::from_secs(5);
        while client.send(None, b"").is_err() && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(20));
        }
        client.send(None, b"PING").unwrap();
        let count = |rx: &mpsc::Receiver<SessionEvent>| {
            rx.try_iter().filter_map(|e| if let SessionEvent::Frames { frames } = e { Some(frames) } else { None }).flatten().filter(|f| f.dir == "rx").count()
        };
        // 보통은 한 바퀴: 서버 PING(보냄) + PING(클라이언트의 답, 되돌아온 것이라 무시) · 클라이언트 서버의 답 하나 = 합 3.
        // 느린 PC(CI)에서는 되돌아온 답이 에코 창(50ms)을 넘겨 한두 바퀴 더 돌 수 있다 — 그래도 초당 상한이 끊으므로
        // «결국 조용해지고, 많아야 상한 안» 을 본다(예전 «합 ≤ 3» 은 CI 에서 «server 2 client 2» 로 가끔 실패)
        let (mut s, mut c) = (0, 0);
        let deadline = Instant::now() + Duration::from_secs(10);
        let mut quiet_since = Instant::now();
        loop {
            std::thread::sleep(Duration::from_millis(100));
            let (ds, dc) = (count(&srx), count(&crx));
            if ds + dc > 0 {
                quiet_since = Instant::now();
            }
            s += ds;
            c += dc;
            if s >= 1 && c >= 1 && quiet_since.elapsed() >= Duration::from_millis(500) {
                break;
            }
            assert!(Instant::now() < deadline, "not quiet: server {s} client {c}");
        }
        assert!(s + c <= 2 * crate::replyguard::LOOP_LIMIT as usize + 2, "server {s} client {c}");
        client.stop();
        server.stop();
    }

    /// 받은 것을 그대로 돌려주는 응답기(Modbus 05·06 정상 응답처럼 요청 = 응답)
    fn mirror() -> Responder {
        Box::new(|b: &[u8]| crate::serial::Reply { bytes: Some(b.to_vec()), delay_ms: 0, note: None })
    }

    fn raw_client(port: u16) -> TcpStream {
        let c = TcpStream::connect(("127.0.0.1", port)).unwrap();
        c.set_read_timeout(Some(Duration::from_millis(500))).unwrap();
        c.set_nodelay(true).unwrap();
        c
    }

    fn read_some(c: &mut TcpStream) -> usize {
        let mut buf = [0u8; 64];
        c.read(&mut buf).unwrap_or(0)
    }

    /// Modbus TCP: 같은 06(같은 트랜잭션 번호)을 100ms 간격으로 두 번 보내도 둘 다 답한다.
    /// 다른 연결이 방금 같은 것을 받았어도 이 연결의 요청은 막히지 않는다
    #[test]
    fn repeated_identical_write_is_answered() {
        let (ssink, _srx) = sink();
        let server = TcpSession::start(cfg(TcpMode::Server, 0), FrameMode::modbus_tcp(), None, Some(mirror()), ssink).unwrap();
        server.set_echo_guard(None);
        let port = server.local_addr().unwrap().port();
        let req = [0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x01, 0x06, 0x00, 0x01, 0x00, 0x03];
        let mut a = raw_client(port);
        a.write_all(&req).unwrap();
        assert_eq!(read_some(&mut a), req.len(), "first answered");
        std::thread::sleep(Duration::from_millis(100));
        a.write_all(&req).unwrap();
        assert_eq!(read_some(&mut a), req.len(), "second identical write answered");
        let mut b = raw_client(port);
        b.write_all(&req).unwrap();
        assert_eq!(read_some(&mut b), req.len(), "other connection answered");
        server.stop();
    }

    /// 일반 TCP: 연결마다 따로 본다 — 한 연결에 보낸 응답과 같은 것을 다른 연결이 보내도 답한다
    #[test]
    fn echo_guard_is_per_connection() {
        let (ssink, _srx) = sink();
        let server = TcpSession::start(cfg(TcpMode::Server, 0), FrameMode::Gap { gap_ms: 10 }, None, Some(mirror()), ssink).unwrap();
        let port = server.local_addr().unwrap().port();
        let mut a = raw_client(port);
        let mut b = raw_client(port);
        std::thread::sleep(Duration::from_millis(100));
        a.write_all(b"PING").unwrap();
        assert_eq!(read_some(&mut a), 4);
        b.write_all(b"PING").unwrap();
        assert_eq!(read_some(&mut b), 4, "other connection answered");
        server.stop();
    }

    /// 지연 응답이 한꺼번에 몰려도 상한까지만 예약하고, 넘친 것은 버리며 사건 줄을 남긴다
    #[test]
    fn delayed_replies_are_capped() {
        let (ssink, srx) = sink();
        let slow: Responder = Box::new(|b: &[u8]| crate::serial::Reply { bytes: Some(b.to_vec()), delay_ms: 60_000, note: None });
        let term = FrameMode::Terminator { bytes: b"\n".to_vec(), gap_ms: 0 };
        let server = TcpSession::start(cfg(TcpMode::Server, 0), term, None, Some(slow), ssink).unwrap();
        let port = server.local_addr().unwrap().port();
        let mut a = raw_client(port);
        for i in 0..(crate::delay::MAX_PENDING + 5) {
            a.write_all(format!("R{i:04}\n").as_bytes()).unwrap();
        }
        let deadline = Instant::now() + Duration::from_secs(5);
        let mut dropped = 0;
        while dropped == 0 && Instant::now() < deadline {
            if let Ok(SessionEvent::Frames { frames }) = srx.recv_timeout(Duration::from_millis(100)) {
                dropped += frames.iter().filter(|f| f.note.as_deref().is_some_and(|n| n.contains("AUTO") && n.contains(&crate::delay::MAX_PENDING.to_string()))).count();
            }
        }
        assert!(dropped >= 1, "overflow noted");
        server.stop();
    }

    // ------------------------------------------------ 중계(모니터)

    /// 위쪽 장비 흉내 — 받은 것 앞에 «B:» 를 붙여 돌려준다. `close_after` 번 답하면 끊는다
    fn upstream(close_after: usize) -> (u16, std::thread::JoinHandle<Vec<u8>>) {
        let l = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = l.local_addr().unwrap().port();
        let h = std::thread::spawn(move || {
            let (mut s, _) = l.accept().unwrap();
            s.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
            let mut got = Vec::new();
            let mut buf = [0u8; 256];
            let mut n_replies = 0;
            while n_replies < close_after {
                match s.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        got.extend_from_slice(&buf[..n]);
                        let mut out = b"B:".to_vec();
                        out.extend_from_slice(&buf[..n]);
                        s.write_all(&out).unwrap();
                        n_replies += 1;
                    }
                }
            }
            got
        });
        (port, h)
    }

    fn start_relay(up_port: u16, events: EventSink) -> Result<TcpSession, String> {
        TcpSession::start_relay(cfg(TcpMode::Server, 0), RelayTarget { host: " 127.0.0.1 ".into(), port: up_port }, FrameMode::Gap { gap_ms: 20 }, None, events)
    }

    fn wait_peers(s: &TcpSession, n: usize) {
        let deadline = Instant::now() + Duration::from_secs(5);
        while s.shared.conns.lock().unwrap().len() != n && Instant::now() < deadline {
            std::thread::sleep(Duration::from_millis(10));
        }
    }

    #[test]
    fn relay_copies_both_ways_and_logs_directions() {
        let (up_port, up) = upstream(1);
        let (sink_, rx) = sink();
        let relay = start_relay(up_port, sink_).unwrap();
        assert!(relay.is_relay());
        let mut a = TcpStream::connect(relay.local_addr().unwrap()).unwrap();
        a.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
        wait_peers(&relay, 1);
        a.write_all(b"PING").unwrap();
        let mut buf = [0u8; 6];
        a.read_exact(&mut buf).unwrap();
        assert_eq!(&buf, b"B:PING");
        // B 가 끊으면 A 도 닫힌다
        assert_eq!(up.join().unwrap(), b"PING".to_vec());
        let mut rest = [0u8; 1];
        assert_eq!(a.read(&mut rest).unwrap_or(0), 0, "A side must be closed after B closes");
        let mut frames = Vec::new();
        let deadline = Instant::now() + Duration::from_secs(5);
        while Instant::now() < deadline && !frames.iter().any(|f: &Frame| f.note.as_deref().is_some_and(|n| n.starts_with("CLOSE "))) {
            if let Ok(SessionEvent::Frames { frames: f }) = rx.recv_timeout(Duration::from_millis(100)) {
                frames.extend(f);
            }
        }
        let ab: Vec<_> = frames.iter().filter(|f| f.dir == "rx").map(|f| f.bytes.clone()).collect();
        let ba: Vec<_> = frames.iter().filter(|f| f.dir == "tx").map(|f| f.bytes.clone()).collect();
        assert_eq!(ab, vec![b"PING".to_vec()]);
        assert_eq!(ba, vec![b"B:PING".to_vec()]);
        let a_addr = a.local_addr().unwrap().to_string();
        assert!(frames.iter().filter(|f| f.dir != "ev").all(|f| f.peer.as_deref() == Some(a_addr.as_str())));
        let notes: Vec<String> = frames.iter().filter_map(|f| f.note.clone()).collect();
        assert!(notes.iter().any(|n| n.starts_with("RELAY ") && n.contains('⇄')), "{notes:?}");
        let close = notes.iter().find(|n| n.starts_with("CLOSE ")).unwrap();
        assert!(close.contains(crate::tr!("B 쪽이 끊음", "B side closed")), "{close}");
        wait_peers(&relay, 0);
        relay.stop();
    }

    #[test]
    fn relay_closes_upstream_when_client_leaves_and_injects() {
        let (up_port, up) = upstream(10);
        let (sink_, rx) = sink();
        let relay = start_relay(up_port, sink_).unwrap();
        let mut a = TcpStream::connect(relay.local_addr().unwrap()).unwrap();
        a.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
        wait_peers(&relay, 1);
        // B 쪽에 끼워 넣기 → B 가 답한 것이 A 로 온다
        assert_eq!(relay.send_upstream(None, b"X").unwrap(), (1, 1));
        let mut buf = [0u8; 3];
        a.read_exact(&mut buf).unwrap();
        assert_eq!(&buf, b"B:X");
        // A 쪽에 끼워 넣기
        assert_eq!(relay.send(None, b"HI").unwrap(), (1, 1));
        let mut hi = [0u8; 2];
        a.read_exact(&mut hi).unwrap();
        assert_eq!(&hi, b"HI");
        // A 가 떠나면 B 쪽 연결도 닫혀 위쪽 흉내가 끝난다
        drop(a);
        assert_eq!(up.join().unwrap(), b"X".to_vec());
        wait_peers(&relay, 0);
        let mut notes = Vec::new();
        while let Ok(e) = rx.recv_timeout(Duration::from_millis(300)) {
            if let SessionEvent::Frames { frames } = e {
                notes.extend(frames.into_iter().filter_map(|f| f.note));
            }
        }
        assert!(notes.iter().any(|n| n.starts_with("INJECT → B")), "{notes:?}");
        assert!(notes.iter().any(|n| n.starts_with("INJECT → A")), "{notes:?}");
        assert!(notes.iter().any(|n| n.starts_with("CLOSE ") && n.contains(crate::tr!("A 쪽이 끊음", "A side closed"))), "{notes:?}");
        relay.stop();
    }

    #[test]
    fn relay_upstream_refused_closes_client() {
        let free = TcpListener::bind("127.0.0.1:0").unwrap().local_addr().unwrap().port();
        let (sink_, rx) = sink();
        let relay = start_relay(free, sink_).unwrap();
        let mut a = TcpStream::connect(relay.local_addr().unwrap()).unwrap();
        a.set_read_timeout(Some(Duration::from_secs(8))).unwrap();
        let mut b = [0u8; 1];
        assert_eq!(a.read(&mut b).unwrap_or(0), 0);
        let mut notes = Vec::new();
        while let Ok(e) = rx.recv_timeout(Duration::from_millis(300)) {
            if let SessionEvent::Frames { frames } = e {
                notes.extend(frames.into_iter().filter_map(|f| f.note));
            }
        }
        assert!(notes.iter().any(|n| n.starts_with("RELAY FAIL")), "{notes:?}");
        assert!(relay.send_upstream(None, b"x").is_err());
        relay.stop();
    }

    #[test]
    fn relay_requires_upstream() {
        let (s, _) = sink();
        assert!(TcpSession::start(cfg(TcpMode::Relay, 0), FrameMode::default(), None, None, s).is_err());
        let (s, _) = sink();
        assert!(TcpSession::start_relay(cfg(TcpMode::Server, 0), RelayTarget { host: " ".into(), port: 502 }, FrameMode::default(), None, s).is_err());
    }

    // ------------------------------------------------ Modbus TCP

    /// MBAP 길이 칸으로 끊기 — 붙어 온 두 요청·쪼개 온 요청이 각각 한 줄
    #[test]
    fn mbap_framing_in_tcp_session() {
        let (ssink, srx) = sink();
        let server = TcpSession::start(cfg(TcpMode::Server, 0), FrameMode::modbus_tcp(), None, None, ssink).unwrap();
        let mut raw = TcpStream::connect(server.local_addr().unwrap()).unwrap();
        let req1 = [0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x01, 0x03, 0x00, 0x00, 0x00, 0x0A];
        let req2 = [0x00, 0x02, 0x00, 0x00, 0x00, 0x06, 0x01, 0x04, 0x00, 0x10, 0x00, 0x02];
        let mut both = req1.to_vec();
        both.extend_from_slice(&req2);
        raw.write_all(&both).unwrap();
        raw.write_all(&req1[..5]).unwrap();
        std::thread::sleep(Duration::from_millis(60));
        raw.write_all(&req1[5..]).unwrap();
        let got = wait_frames(&srx, "rx", 3);
        assert_eq!(got.iter().map(|f| f.bytes.clone()).collect::<Vec<_>>(), vec![req1.to_vec(), req2.to_vec(), req1.to_vec()]);
        server.stop();
    }

    #[test]
    fn mbap_helpers() {
        let mut req = vec![0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x11, 0x03, 0x00, 0x6B, 0x00, 0x03];
        assert!(is_mbap(&req));
        assert!(mbap_set_tid(&mut req, 0x1234));
        assert_eq!(&req[..2], &[0x12, 0x34]);
        assert!(!mbap_set_tid(&mut [0x01, 0x03, 0x00], 1));
        assert!(!is_mbap(&[0, 1, 0, 0, 0, 9, 1, 3]));
        let d = decode_mbap(&req).unwrap();
        assert_eq!((d.transaction, d.length, d.unit, d.length_ok), (0x1234, 6, 0x11, true));
        let m = d.modbus.unwrap();
        assert_eq!((m.function, m.kind), (0x03, "request"));
        assert!(d.summary.contains("FC03"), "{}", d.summary);
        // 응답(값 3개)
        let rsp = [0x12, 0x34, 0x00, 0x00, 0x00, 0x09, 0x11, 0x03, 0x06, 0x02, 0x2B, 0x00, 0x00, 0x00, 0x64];
        let d = decode_mbap(&rsp).unwrap();
        assert_eq!(d.modbus.unwrap().values, vec![0x022B, 0, 0x64]);
        // 예외
        let ex = [0, 1, 0, 0, 0, 3, 1, 0x83, 0x02];
        assert_eq!(decode_mbap(&ex).unwrap().modbus.unwrap().kind, "exception");
        // 길이 칸이 틀려도 풀되 표시
        assert!(!decode_mbap(&[0, 1, 0, 0, 0, 9, 1, 3, 0, 0, 0, 1]).unwrap().length_ok);
        assert!(decode_mbap(&[0, 1, 0, 5, 0, 2, 1, 3]).is_none());
        assert!(decode_mbap(b"HELLO").is_none());
    }

    /// 쓰고 있는 포트에 서버를 열면 쥔 프로그램(이 시험)이 오류에 나온다
    #[test]
    fn bind_in_use_names_owner() {
        let held = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = held.local_addr().unwrap().port();
        let (s, _) = sink();
        let err = TcpSession::start(cfg(TcpMode::Server, port), FrameMode::default(), None, None, s).err().unwrap();
        assert!(err.starts_with(&format!("127.0.0.1:{port}")), "{err}");
        if cfg!(windows) && crate::net::port_owner(port, false).is_some() {
            assert!(err.contains(&std::process::id().to_string()), "{err}");
        }
    }

    /// (0.8.0) 127.0.0.1 실중계: Modbus TCP 장비 흉내(두 번 답하고 세 번째는 무시) ⇄ 중계 ⇄ 클라이언트.
    /// 요청/응답 짝·응답 시간·무응답(연결 끊김)과 pcapng 파일(손잡기·순서번호·바이트 그대로)을 본다
    #[test]
    fn relay_pairs_modbus_and_saves_pcap() {
        let mb = |tid: u16, pdu: &[u8]| {
            let mut v = tid.to_be_bytes().to_vec();
            v.extend([0, 0]);
            v.extend(((pdu.len() + 1) as u16).to_be_bytes());
            v.push(1);
            v.extend(pdu);
            v
        };
        let l = TcpListener::bind("127.0.0.1:0").unwrap();
        let up_port = l.local_addr().unwrap().port();
        let replies = [mb(7, &[3, 4, 0, 1, 0, 2]), mb(8, &[0x83, 2])];
        let dev = std::thread::spawn(move || {
            let (mut s, _) = l.accept().unwrap();
            s.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
            let mut buf = [0u8; 12];
            for r in &replies {
                s.read_exact(&mut buf).unwrap();
                std::thread::sleep(Duration::from_millis(15));
                s.write_all(r).unwrap();
            }
            // 세 번째 요청은 받고 답하지 않는다 — A 가 떠날 때까지
            s.read_exact(&mut buf).unwrap();
            let mut rest = [0u8; 1];
            let _ = s.read(&mut rest);
        });
        let (sink_, rx) = sink();
        let relay = TcpSession::start_relay(cfg(TcpMode::Server, 0), RelayTarget { host: "127.0.0.1".into(), port: up_port }, FrameMode::modbus_tcp(), None, sink_).unwrap();
        let dir = std::env::temp_dir().join(format!("pd-relay-pcap-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("relay.pcapng").to_string_lossy().into_owned();
        relay.set_pcap(Some(path.clone()), "PortDock TCP test").unwrap();
        // 서버·클라이언트 세션은 pcap 을 거절
        let (s2, _r2) = sink();
        let plain = TcpSession::start(cfg(TcpMode::Server, 0), FrameMode::Gap { gap_ms: 20 }, None, None, s2).unwrap();
        assert!(plain.set_pcap(Some(dir.join("x.pcapng").to_string_lossy().into_owned()), "t").is_err());
        plain.stop();

        let mut a = TcpStream::connect(relay.local_addr().unwrap()).unwrap();
        a.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
        wait_peers(&relay, 1);
        let reqs = [mb(7, &[3, 0, 0, 0, 2]), mb(8, &[3, 0x27, 0x10, 0, 1]), mb(9, &[3, 0, 0, 0, 1])];
        let mut got = Vec::new();
        for (i, q) in reqs.iter().enumerate() {
            a.write_all(q).unwrap();
            if i < 2 {
                let mut r = vec![0u8; if i == 0 { 13 } else { 9 }];
                a.read_exact(&mut r).unwrap();
                got.extend(r);
            }
        }
        std::thread::sleep(Duration::from_millis(50));
        let a_port = a.local_addr().unwrap().port();
        drop(a);
        dev.join().unwrap();
        wait_peers(&relay, 0);
        relay.stop();

        let mut frames = Vec::new();
        while let Ok(e) = rx.recv_timeout(Duration::from_millis(200)) {
            if let SessionEvent::Frames { frames: f } = e {
                frames.extend(f);
            }
        }
        let marks: Vec<&PairMark> = frames.iter().filter_map(|f| f.pair.as_ref()).collect();
        let roles: Vec<(u64, &str)> = marks.iter().map(|m| (m.id, m.role)).collect();
        assert_eq!(roles, vec![(1, "req"), (1, "rsp"), (2, "req"), (2, "rsp"), (3, "req"), (3, "miss")], "{frames:?}");
        let rt1 = marks[1].rt_ms.unwrap();
        assert!((10.0..3000.0).contains(&rt1), "response time {rt1}");
        assert_eq!(marks[3].error.as_deref(), Some("EXC 02"));
        let miss = frames.iter().find(|f| f.pair.as_ref().is_some_and(|m| m.role == "miss")).unwrap();
        assert_eq!(miss.dir, "ev");
        assert!(miss.note.as_deref().unwrap().starts_with("NO REPLY #3 FC03"), "{:?}", miss.note);
        let notes: Vec<String> = frames.iter().filter_map(|f| f.note.clone()).collect();
        assert!(notes.iter().any(|n| n.starts_with("PCAP START ")), "{notes:?}");
        assert!(notes.iter().any(|n| n.starts_with("PCAP STOP ") && n.contains("packets")), "{notes:?}");

        // pcapng: SHB·IDB 뒤 EPB 들 — 이더넷/IPv4/TCP, A 포트 ⇄ B 포트, 방향마다 바이트가 그대로 이어진다
        let file = std::fs::read(&path).unwrap();
        let _ = std::fs::remove_dir_all(&dir);
        let le32 = |b: &[u8], i: usize| u32::from_le_bytes(b[i..i + 4].try_into().unwrap());
        let mut i = 0;
        let mut kinds = Vec::new();
        let (mut ab, mut ba, mut flags): (Vec<u8>, Vec<u8>, Vec<u8>) = (Vec::new(), Vec::new(), Vec::new());
        let mut next_seq: [Option<u32>; 2] = [None, None];
        while i < file.len() {
            let (kind, len) = (le32(&file, i), le32(&file, i + 4) as usize);
            kinds.push(kind);
            if kind == 6 {
                let cap = le32(&file, i + 20) as usize;
                let fr = &file[i + 28..i + 28 + cap];
                assert_eq!(&fr[12..14], &[0x08, 0x00]);
                let t = &fr[34..];
                let (sp, dp) = (u16::from_be_bytes([t[0], t[1]]), u16::from_be_bytes([t[2], t[3]]));
                let seq = u32::from_be_bytes(t[4..8].try_into().unwrap());
                let payload = &t[20..];
                let k = usize::from(sp != a_port);
                if sp == a_port {
                    assert_eq!(dp, up_port);
                } else {
                    assert_eq!((sp, dp), (up_port, a_port));
                }
                if !payload.is_empty() {
                    if let Some(want) = next_seq[k] {
                        assert_eq!(seq, want, "sequence numbers continue");
                    }
                    next_seq[k] = Some(seq.wrapping_add(payload.len() as u32));
                    if k == 0 { ab.extend(payload) } else { ba.extend(payload) }
                }
                flags.push(t[13]);
            }
            i += len;
        }
        assert_eq!(&kinds[..2], &[0x0A0D_0D0A, 1]);
        assert!(String::from_utf8_lossy(&file).contains(crate::pcap::IF_NAME));
        assert_eq!(ab, reqs.concat());
        assert_eq!(ba, got);
        assert_eq!(&flags[..3], &[0x02, 0x12, 0x10], "SYN, SYN/ACK, ACK");
        assert_eq!(&flags[flags.len() - 3..], &[0x11, 0x11, 0x10], "FIN/ACK ×2, ACK");
    }
}
