//! TCP 흐름 분석(조립·Expert)과 요청/응답 짝 — 패킷마다 붙는 주석(`PacketAnn`)과 PDU 목록.
//!
//! 한 번 파일 전체를 돌며 만든다(`Analysis::build`). 흐름 식별(4튜플), 상대 순서 번호, 재전송·순서 어긋남·중복 ACK·창 0·
//! 보관 유지(keep-alive)·못 받은 구간 표시, 방향별 바이트 재조립, 재조립한 산업 프로토콜 PDU 와 요청/응답 짝·응답 시간·무응답.

use std::collections::HashMap;

use crate::capture::{Capture, NO_TS};
use crate::dissect::{Prefs, be16, be32};
use crate::industrial::{self, App, FrameLen, Peek};

/// Expert(분석) 표시 비트
pub mod ann {
    pub const RETRANSMISSION: u32 = 1;
    pub const OUT_OF_ORDER: u32 = 2;
    pub const DUP_ACK: u32 = 4;
    pub const ZERO_WINDOW: u32 = 8;
    pub const LOST_SEGMENT: u32 = 16;
    pub const KEEP_ALIVE: u32 = 32;
    pub const ACK_LOST_SEGMENT: u32 = 64;
    pub const WINDOW_UPDATE: u32 = 128;
    pub const FAST_RETRANSMISSION: u32 = 256;
    pub const KEEP_ALIVE_ACK: u32 = 512;
    /// 이 세그먼트는 아직 끝나지 않은 PDU 의 일부
    pub const SEGMENT_OF_PDU: u32 = 1024;
    /// RST 로 끝난 세그먼트
    pub const RESET: u32 = 2048;
    pub const ANY_ANALYSIS: u32 = RETRANSMISSION
        | OUT_OF_ORDER
        | DUP_ACK
        | ZERO_WINDOW
        | LOST_SEGMENT
        | KEEP_ALIVE
        | ACK_LOST_SEGMENT
        | WINDOW_UPDATE
        | FAST_RETRANSMISSION
        | KEEP_ALIVE_ACK;
}

#[derive(Clone, Copy, Debug)]
pub struct PacketAnn {
    /// 흐름 번호(`tcp.stream`). 없으면 `u32::MAX`
    pub flow: u32,
    pub flags: u32,
    pub dup_ack_num: u32,
    pub dup_ack_frame: u32,
    pub rel_seq: u32,
    pub rel_ack: u32,
    /// 창 크기 배율(2^n)의 n. 모르면 255
    pub win_scale: u8,
    /// 이 프레임에서 끝난 PDU 들(`Analysis::pdus` 안의 위치)
    pub pdu_first: u32,
    pub pdu_count: u16,
}

impl Default for PacketAnn {
    fn default() -> Self {
        PacketAnn {
            flow: u32::MAX,
            flags: 0,
            dup_ack_num: 0,
            dup_ack_frame: 0,
            rel_seq: 0,
            rel_ack: 0,
            win_scale: 255,
            pdu_first: 0,
            pdu_count: 0,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Transport {
    Tcp,
    Udp,
}

#[derive(Clone, Debug)]
pub struct FlowInfo {
    pub transport: Transport,
    pub v6: bool,
    /// 클라이언트(연결을 먼저 연 쪽)와 서버
    pub client: ([u8; 16], u16),
    pub server: ([u8; 16], u16),
    pub first_frame: u32,
    pub last_frame: u32,
    pub packets: u32,
    pub bytes: u64,
    /// 이 흐름에서 찾은 산업 프로토콜
    pub app: Option<App>,
    /// 흐름에 속한 프레임(1부터) — 흐름 따라가기용
    pub frames: Vec<u32>,
    pub fin_rst_frame: Option<u32>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PairStatus {
    /// 요청인데 아직 짝이 없음(끝에서 `Timeout`·`Closed`·`CaptureEnd` 로 바뀐다)
    Unpaired,
    Ok,
    /// 짝이 있고 예외·오류 코드가 0 이 아님
    Exception,
    /// 응답이 없음 — 제한 시간이 지났다
    Timeout,
    /// 응답 없이 연결이 닫혔다
    Closed,
    /// 응답을 기다릴 시간이 되기 전에 캡처가 끝났다
    CaptureEnd,
    /// 요청 없는 응답
    Orphan,
}

pub enum PduLoc {
    /// 프레임 안 (절대 오프셋, 길이)
    InFrame(u32, u32),
    /// 여러 세그먼트에 걸친 PDU — 조립한 바이트
    Owned(Box<[u8]>),
}

pub struct PduRec {
    /// PDU 가 끝난 프레임(1부터)
    pub frame: u32,
    pub first_frame: u32,
    pub app: App,
    pub flow: u32,
    pub loc: PduLoc,
    pub ts_ns: i64,
    pub is_req: bool,
    /// 짝 PDU(`Analysis::pdus` 위치). 없으면 `u32::MAX`
    pub pair: u32,
    pub status: PairStatus,
    /// 응답 시간(ns). 요청·응답 양쪽에 같은 값. 없으면 -1
    pub resp_ns: i64,
    pub peek: Peek,
}

#[derive(Default)]
pub struct Analysis {
    pub ann: Vec<PacketAnn>,
    pub flows: Vec<FlowInfo>,
    pub pdus: Vec<PduRec>,
    /// 파일의 마지막 시각(무응답 판정용)
    pub end_ts_ns: i64,
}

// ---------------------------------------------------------------- 위치 찾기(가벼운 해석)

pub(crate) struct L3 {
    pub v6: bool,
    pub src: [u8; 16],
    pub dst: [u8; 16],
    pub proto: u8,
    pub l4: usize,
    pub end: usize,
}

/// 링크 머리를 벗겨 IP 머리 위치와 이더타입을 찾는다. 모르면 None
pub(crate) fn l3_start(link: u16, f: &[u8]) -> Option<(usize, u16)> {
    match link {
        1 => {
            if f.len() < 14 {
                return None;
            }
            let mut at = 12;
            let mut t = be16(f, at);
            while t == 0x8100 || t == 0x88a8 || t == 0x9100 {
                at += 4;
                if f.len() < at + 2 {
                    return None;
                }
                t = be16(f, at);
            }
            Some((at + 2, t))
        }
        0 => {
            if f.len() < 4 {
                return None;
            }
            let fam = if f[0] != 0 { f[0] } else { f[3] };
            Some((4, if fam == 2 { 0x0800 } else { 0x86dd }))
        }
        108 => {
            if f.len() < 4 {
                return None;
            }
            let fam = be32(f, 0);
            Some((4, if fam == 2 { 0x0800 } else { 0x86dd }))
        }
        101 | 12 | 14 | 228 | 229 => match f.first()? >> 4 {
            4 => Some((0, 0x0800)),
            6 => Some((0, 0x86dd)),
            _ => None,
        },
        113 => (f.len() >= 16).then(|| (16, be16(f, 14))),
        276 => (f.len() >= 20).then(|| (20, be16(f, 0))),
        _ => None,
    }
}

pub(crate) fn locate(link: u16, f: &[u8]) -> Option<L3> {
    let (at, t) = l3_start(link, f)?;
    match t {
        0x0800 => {
            if f.len() < at + 20 || f[at] >> 4 != 4 {
                return None;
            }
            let ihl = (f[at] & 15) as usize * 4;
            let total = be16(f, at + 2) as usize;
            if ihl < 20 || total < ihl || f.len() < at + ihl {
                return None;
            }
            let fr = be16(f, at + 6);
            if fr & 0x3fff != 0 {
                return None; // 조각은 흐름 분석에서 뺀다
            }
            let mut src = [0u8; 16];
            let mut dst = [0u8; 16];
            src[..4].copy_from_slice(&f[at + 12..at + 16]);
            dst[..4].copy_from_slice(&f[at + 16..at + 20]);
            Some(L3 {
                v6: false,
                src,
                dst,
                proto: f[at + 9],
                l4: at + ihl,
                end: f.len().min(at + total),
            })
        }
        0x86dd => {
            if f.len() < at + 40 || f[at] >> 4 != 6 {
                return None;
            }
            let plen = be16(f, at + 4) as usize;
            let mut nxt = f[at + 6];
            let mut src = [0u8; 16];
            let mut dst = [0u8; 16];
            src.copy_from_slice(&f[at + 8..at + 24]);
            dst.copy_from_slice(&f[at + 24..at + 40]);
            let end = if plen == 0 {
                f.len()
            } else {
                f.len().min(at + 40 + plen)
            };
            let mut p = at + 40;
            while matches!(nxt, 0 | 43 | 44 | 60) {
                if p + 8 > end {
                    return None;
                }
                let next = f[p];
                if nxt == 44 {
                    if be16(f, p + 2) & 0xfff9 != 0 {
                        return None;
                    }
                    p += 8;
                } else {
                    p += 8 + f[p + 1] as usize * 8;
                }
                nxt = next;
            }
            Some(L3 {
                v6: true,
                src,
                dst,
                proto: nxt,
                l4: p.min(end),
                end,
            })
        }
        _ => None,
    }
}

// ---------------------------------------------------------------- 흐름 상태

#[derive(Default, Clone)]
struct Dir {
    isn: Option<u32>,
    next_seq: Option<u32>,
    last_ack: Option<u32>,
    last_win: u16,
    dup_count: u32,
    first_ack_frame: u32,
    last_dup_ts: i64,
    wscale: Option<u8>,
    syn_seen: bool,
    gaps: Vec<(u32, u32)>,
    /// 이 방향이 마지막으로 보낸 keep-alive 의 다음 순서 번호
    keepalive_pending: bool,
    /// 이 방향의 재조립 버퍼(아직 끝나지 않은 PDU)
    buf: Vec<u8>,
    buf_first_frame: u32,
}

struct FlowState {
    id: u32,
    dir: [Dir; 2],
    /// dir[0] 은 정규 키에서 앞쪽(작은 쪽)
    pending: Vec<u32>,
    app_tried: bool,
}

type Key = ([u8; 16], u16, [u8; 16], u16, u8);

fn seq_lt(a: u32, b: u32) -> bool {
    (a.wrapping_sub(b) as i32) < 0
}

impl Analysis {
    /// 파일 전체를 돌며 분석한다
    pub fn build(cap: &Capture, prefs: &Prefs) -> Analysis {
        let n = cap.len();
        let mut a = Analysis {
            ann: vec![PacketAnn::default(); n],
            flows: Vec::new(),
            pdus: Vec::new(),
            end_ts_ns: NO_TS,
        };
        let mut map: HashMap<Key, usize> = HashMap::new();
        let mut states: Vec<FlowState> = Vec::new();
        let mut last_ts = NO_TS;
        for (i, p) in cap.packets.iter().enumerate() {
            if p.has_ts() {
                last_ts = last_ts.max(p.ts_ns);
            }
            let f = cap.data(p);
            let Some(l3) = locate(p.link, f) else {
                continue;
            };
            let no = (i + 1) as u32;
            let (sp, dp) = match l3.proto {
                6 if l3.end >= l3.l4 + 20 => (be16(f, l3.l4), be16(f, l3.l4 + 2)),
                17 if l3.end >= l3.l4 + 8 => (be16(f, l3.l4), be16(f, l3.l4 + 2)),
                _ => continue,
            };
            let tcp = l3.proto == 6;
            // 정규 키 — 작은 (주소, 포트) 쪽이 앞
            let fwd = (l3.src, sp) <= (l3.dst, dp);
            let key: Key = if fwd {
                (l3.src, sp, l3.dst, dp, l3.proto)
            } else {
                (l3.dst, dp, l3.src, sp, l3.proto)
            };
            let di = usize::from(!fwd);
            let si = *map.entry(key).or_insert_with(|| {
                let id = states.len() as u32;
                states.push(FlowState {
                    id,
                    dir: [Dir::default(), Dir::default()],
                    pending: Vec::new(),
                    app_tried: false,
                });
                // 클라이언트: TCP 는 SYN(ACK 없음)을 보낸 쪽, 아니면 첫 패킷을 보낸 쪽 — 서버 포트가 알려진 포트이면 그쪽이 서버
                let (client, server) = if sp_is_server(prefs, sp, dp) {
                    ((l3.dst, dp), (l3.src, sp))
                } else {
                    ((l3.src, sp), (l3.dst, dp))
                };
                a.flows.push(FlowInfo {
                    transport: if tcp { Transport::Tcp } else { Transport::Udp },
                    v6: l3.v6,
                    client,
                    server,
                    first_frame: no,
                    last_frame: no,
                    packets: 0,
                    bytes: 0,
                    app: None,
                    frames: Vec::new(),
                    fin_rst_frame: None,
                });
                id as usize
            });
            let fl = &mut a.flows[si];
            fl.packets += 1;
            fl.bytes += f.len() as u64;
            fl.last_frame = no;
            fl.frames.push(no);
            let mut pa = PacketAnn {
                flow: si as u32,
                ..Default::default()
            };
            if tcp {
                tcp_segment(
                    &mut a,
                    &mut states[si],
                    f,
                    &l3,
                    di,
                    no,
                    p.ts_ns,
                    prefs,
                    &mut pa,
                );
            } else {
                // UDP — 데이터그램 하나가 PDU 들의 묶음
                let ps = l3.l4 + 8;
                let ulen = (be16(f, l3.l4 + 4) as usize).max(8);
                let pe = l3.end.min(l3.l4 + ulen);
                if pe > ps {
                    feed_datagram(
                        &mut a,
                        &mut states[si],
                        f,
                        l3.l4,
                        ps,
                        pe,
                        no,
                        p.ts_ns,
                        prefs,
                        di,
                        &mut pa,
                    );
                }
            }
            a.ann[i] = pa;
        }
        a.end_ts_ns = last_ts;
        finalize_pairs(&mut a, &mut states, prefs);
        a
    }

    /// 프레임(1부터)에서 끝난 PDU 들
    pub fn pdus_of(&self, frame: u32) -> &[PduRec] {
        match self.ann.get(frame as usize - 1) {
            Some(x) if x.pdu_count > 0 => {
                &self.pdus[x.pdu_first as usize..x.pdu_first as usize + x.pdu_count as usize]
            }
            _ => &[],
        }
    }

    /// 흐름 따라가기 — 방향별 바이트 덩어리(프레임 순서). 재전송·순서 어긋남은 한 번만 센다
    pub fn follow(&self, cap: &Capture, flow: u32) -> Vec<StreamChunk> {
        let fi = &self.flows[flow as usize];
        let mut out: Vec<StreamChunk> = Vec::new();
        let mut next: [Option<u32>; 2] = [None, None];
        for &no in &fi.frames {
            let p = &cap.packets[no as usize - 1];
            let f = cap.data(p);
            let Some(l3) = locate(p.link, f) else {
                continue;
            };
            let from_client = l3.src[..] == fi.client.0[..] && be16(f, l3.l4) == fi.client.1;
            let dir = usize::from(!from_client);
            let (ps, pe) = if fi.transport == Transport::Tcp {
                let hl = (f[l3.l4 + 12] >> 4) as usize * 4;
                (l3.l4 + hl, l3.end)
            } else {
                (
                    l3.l4 + 8,
                    l3.end.min(l3.l4 + (be16(f, l3.l4 + 4) as usize).max(8)),
                )
            };
            if ps >= pe || pe > f.len() {
                continue;
            }
            let mut data = &f[ps..pe];
            if fi.transport == Transport::Tcp {
                let fl = f[l3.l4 + 13];
                let seq = be32(f, l3.l4 + 4);
                let seq = seq.wrapping_add(u32::from(fl & SYN_BIT != 0));
                match next[dir] {
                    Some(nx) if seq_lt(seq, nx) => {
                        let skip = nx.wrapping_sub(seq) as usize;
                        if skip >= data.len() {
                            continue;
                        }
                        data = &data[skip..];
                        next[dir] = Some(nx.wrapping_add(data.len() as u32));
                    }
                    _ => next[dir] = Some(seq.wrapping_add(data.len() as u32)),
                }
            }
            match out.last_mut() {
                Some(c) if c.from_client == from_client => {
                    c.data.extend_from_slice(data);
                    c.last_frame = no;
                }
                _ => out.push(StreamChunk {
                    from_client,
                    first_frame: no,
                    last_frame: no,
                    data: data.to_vec(),
                }),
            }
        }
        out
    }
}

const SYN_BIT: u8 = 2;

/// 흐름 따라가기의 한 덩어리 — 같은 방향으로 이어진 바이트
#[derive(Debug, Clone)]
pub struct StreamChunk {
    pub from_client: bool,
    pub first_frame: u32,
    pub last_frame: u32,
    pub data: Vec<u8>,
}

fn sp_is_server(prefs: &Prefs, sp: u16, dp: u16) -> bool {
    let known = |p: u16| {
        prefs.modbus_ports.contains(&p)
            || prefs.modbus_rtu_ports.contains(&p)
            || prefs.mc_ports.contains(&p)
            || prefs.xgt_ports.contains(&p)
    };
    known(sp) && !known(dp)
}

#[allow(clippy::too_many_arguments)]
fn tcp_segment(
    a: &mut Analysis,
    st: &mut FlowState,
    f: &[u8],
    l3: &L3,
    di: usize,
    no: u32,
    ts: i64,
    prefs: &Prefs,
    pa: &mut PacketAnn,
) {
    let t = l3.l4;
    let hl = (f[t + 12] >> 4) as usize * 4;
    if hl < 20 || l3.end < t + hl {
        return;
    }
    let seq = be32(f, t + 4);
    let ack = be32(f, t + 8);
    let fl = f[t + 13];
    let win = be16(f, t + 14);
    let (syn, fin, rst, hasack) = (fl & 2 != 0, fl & 1 != 0, fl & 4 != 0, fl & 16 != 0);
    let plen = l3.end - t - hl;
    let seglen = plen as u32 + u32::from(syn) + u32::from(fin);
    let (d_idx, o_idx) = (di, 1 - di);
    // SYN 옵션 — 창 배율
    if syn && hl > 20 {
        let mut i = t + 20;
        let to = t + hl;
        while i < to {
            match f[i] {
                0 => break,
                1 => i += 1,
                k => {
                    if i + 1 >= to {
                        break;
                    }
                    let l = f[i + 1] as usize;
                    if l < 2 || i + l > to {
                        break;
                    }
                    if k == 3 && l == 3 {
                        st.dir[d_idx].wscale = Some(f[i + 2]);
                    }
                    i += l;
                }
            }
        }
    }
    if syn {
        st.dir[d_idx].syn_seen = true;
        // 클라이언트 보정 — SYN(ACK 없음)을 보낸 쪽이 클라이언트
        if !hasack {
            let fi = &mut a.flows[st.id as usize];
            let me = (l3.src, be16(f, t));
            if fi.client != me && fi.frames.len() <= 2 {
                std::mem::swap(&mut fi.client, &mut fi.server);
            }
        }
    }
    let mut flags = 0u32;
    // 기준 번호
    if st.dir[d_idx].isn.is_none()
        || (syn && st.dir[d_idx].isn != Some(seq) && st.dir[d_idx].next_seq.is_none())
    {
        st.dir[d_idx].isn = Some(seq);
    }
    pa.rel_seq = seq.wrapping_sub(st.dir[d_idx].isn.unwrap_or(seq));
    pa.rel_ack = if hasack {
        match st.dir[o_idx].isn {
            Some(b) => ack.wrapping_sub(b),
            None => ack,
        }
    } else {
        0
    };
    let both = st.dir[d_idx].syn_seen && st.dir[o_idx].syn_seen;
    pa.win_scale = if syn {
        0
    } else if both {
        match (st.dir[d_idx].wscale, st.dir[o_idx].wscale) {
            (Some(s), Some(_)) => s,
            _ => 0,
        }
    } else {
        255
    };

    let mut new_from: Option<usize> = None; // 새 바이트가 시작하는 페이로드 안 위치
    if rst {
        flags |= ann::RESET;
        let fi = &mut a.flows[st.id as usize];
        fi.fin_rst_frame.get_or_insert(no);
    } else {
        if fin {
            a.flows[st.id as usize].fin_rst_frame.get_or_insert(no);
        }
        // --- 순서 분석
        let exp = st.dir[d_idx].next_seq;
        if seglen > 0 {
            match exp {
                None => {
                    st.dir[d_idx].next_seq = Some(seq.wrapping_add(seglen));
                    new_from = Some(0);
                }
                Some(e) if seq == e => {
                    st.dir[d_idx].next_seq = Some(e.wrapping_add(seglen));
                    new_from = Some(0);
                }
                Some(e) if seq_lt(e, seq) => {
                    flags |= ann::LOST_SEGMENT;
                    st.dir[d_idx].gaps.push((e, seq));
                    st.dir[d_idx].next_seq = Some(seq.wrapping_add(seglen));
                    new_from = Some(0);
                }
                Some(e) => {
                    // seq < next
                    if plen <= 1 && !syn && !fin && seq == e.wrapping_sub(1) {
                        flags |= ann::KEEP_ALIVE;
                        st.dir[d_idx].keepalive_pending = true;
                    } else if let Some(gi) = st.dir[d_idx]
                        .gaps
                        .iter()
                        .position(|&(gs, ge)| !seq_lt(seq, gs) && seq_lt(seq, ge))
                    {
                        flags |= ann::OUT_OF_ORDER;
                        let (gs, ge) = st.dir[d_idx].gaps[gi];
                        let end = seq.wrapping_add(seglen);
                        // 구멍을 줄인다
                        st.dir[d_idx].gaps.remove(gi);
                        if seq_lt(gs, seq) {
                            st.dir[d_idx].gaps.push((gs, seq));
                        }
                        if seq_lt(end, ge) {
                            st.dir[d_idx].gaps.push((end, ge));
                        }
                    } else {
                        flags |= ann::RETRANSMISSION;
                        if st.dir[o_idx].dup_count >= 3
                            && ts != NO_TS
                            && ts - st.dir[o_idx].last_dup_ts < 20_000_000
                        {
                            flags |= ann::FAST_RETRANSMISSION;
                        }
                        let end = seq.wrapping_add(seglen);
                        if seq_lt(e, end) {
                            // 일부는 새 바이트
                            new_from = Some(e.wrapping_sub(seq) as usize);
                            st.dir[d_idx].next_seq = Some(end);
                        }
                    }
                }
            }
        } else if exp.is_none() {
            st.dir[d_idx].next_seq = Some(seq);
        }
        // --- ACK 분석
        if hasack {
            let pure = seglen == 0;
            let last = st.dir[d_idx].last_ack;
            if pure {
                if win == 0 && !syn {
                    flags |= ann::ZERO_WINDOW;
                }
                let outstanding = st.dir[o_idx].next_seq.is_some_and(|nx| ack != nx);
                if last == Some(ack) && win == st.dir[d_idx].last_win && outstanding {
                    st.dir[d_idx].dup_count += 1;
                    st.dir[d_idx].last_dup_ts = ts;
                    flags |= ann::DUP_ACK;
                    pa.dup_ack_num = st.dir[d_idx].dup_count;
                    pa.dup_ack_frame = st.dir[d_idx].first_ack_frame;
                } else {
                    if last == Some(ack) && win != st.dir[d_idx].last_win && win != 0 {
                        flags |= ann::WINDOW_UPDATE;
                    }
                    st.dir[d_idx].dup_count = 0;
                    st.dir[d_idx].first_ack_frame = no;
                }
                if st.dir[o_idx].keepalive_pending {
                    flags |= ann::KEEP_ALIVE_ACK;
                    st.dir[o_idx].keepalive_pending = false;
                }
            } else {
                st.dir[d_idx].dup_count = 0;
                st.dir[d_idx].first_ack_frame = no;
            }
            if let Some(onx) = st.dir[o_idx].next_seq
                && seq_lt(onx, ack)
                && !(syn && !hasack)
            {
                flags |= ann::ACK_LOST_SEGMENT;
            }
            st.dir[d_idx].last_ack = Some(ack);
            st.dir[d_idx].last_win = win;
        }
    }
    pa.flags = flags;
    // 응용 데이터 — 새 바이트만 방향별 버퍼로
    if plen > 0 && !rst {
        if let Some(skip) = new_from {
            let ps = t + hl + skip.min(plen);
            if ps < l3.end {
                feed_stream(a, st, f, t, ps, l3.end, no, ts, prefs, d_idx, pa);
            }
        } else if flags & ann::RETRANSMISSION == 0 {
            // 순서 어긋난 조각 — 조립 불가, 버퍼를 버린다
            st.dir[d_idx].buf.clear();
        }
    }
}

/// 흐름의 응용 프로토콜 정하기 — 포트 목록, 없으면 첫 데이터 모양
fn classify_flow(
    a: &mut Analysis,
    st: &mut FlowState,
    payload: &[u8],
    prefs: &Prefs,
) -> Option<App> {
    let fi = &mut a.flows[st.id as usize];
    if fi.app.is_some() {
        return fi.app;
    }
    if st.app_tried {
        return None;
    }
    let udp = fi.transport == Transport::Udp;
    if let Some(app) = industrial::classify_ports(prefs, fi.client.1, fi.server.1) {
        fi.app = Some(app);
        return fi.app;
    }
    if prefs.auto_detect {
        st.app_tried = true;
        if let Some(app) = industrial::sniff(payload, udp) {
            fi.app = Some(app);
        }
    } else {
        st.app_tried = true;
    }
    fi.app
}

/// 방향이 클라이언트 → 서버인가 (d_idx 는 정규 키 기준이라 흐름 정보의 client 로 환산)
fn from_client(a: &Analysis, st: &FlowState, f: &[u8], dir_src_port_at: usize) -> bool {
    let fi = &a.flows[st.id as usize];
    be16(f, dir_src_port_at) == fi.client.1
}

#[allow(clippy::too_many_arguments)]
fn feed_stream(
    a: &mut Analysis,
    st: &mut FlowState,
    f: &[u8],
    l4: usize,
    ps: usize,
    pe: usize,
    no: u32,
    ts: i64,
    prefs: &Prefs,
    d_idx: usize,
    pa: &mut PacketAnn,
) {
    let payload = &f[ps..pe];
    let was_buffered = !st.dir[d_idx].buf.is_empty();
    let app = if was_buffered {
        a.flows[st.id as usize].app
    } else {
        classify_flow(a, st, payload, prefs)
    };
    let Some(app) = app else { return };
    // 바이트를 쌓지 않고 한 프레임 안에 PDU 가 다 있으면 그 자리를 가리킨다
    let req_side = from_client(a, st, f, l4);
    let mut off = 0usize;
    if !was_buffered {
        loop {
            let rest = &payload[off..];
            if rest.is_empty() {
                break;
            }
            match industrial::frame_len(app, rest) {
                FrameLen::Len(n) if n <= rest.len() => {
                    let peek = industrial::peek(app, &rest[..n], req_side);
                    push_pdu(
                        a,
                        st,
                        PduRec {
                            frame: no,
                            first_frame: no,
                            app,
                            flow: st.id,
                            loc: PduLoc::InFrame((ps + off) as u32, n as u32),
                            ts_ns: ts,
                            is_req: peek.is_req,
                            pair: u32::MAX,
                            status: PairStatus::Unpaired,
                            resp_ns: -1,
                            peek,
                        },
                        pa,
                    );
                    off += n;
                }
                FrameLen::Bad => return,
                _ => break,
            }
        }
        if off == payload.len() {
            return;
        }
        st.dir[d_idx].buf_first_frame = no;
        st.dir[d_idx].buf.extend_from_slice(&payload[off..]);
        pa.flags |= ann::SEGMENT_OF_PDU;
        return;
    }
    // 버퍼에 이어 붙여 PDU 를 뽑는다
    st.dir[d_idx].buf.extend_from_slice(payload);
    let first = st.dir[d_idx].buf_first_frame;
    loop {
        let buf = &st.dir[d_idx].buf;
        if buf.is_empty() {
            break;
        }
        match industrial::frame_len(app, buf) {
            FrameLen::Len(n) if n <= buf.len() => {
                let bytes: Box<[u8]> = buf[..n].into();
                let peek = industrial::peek(app, &bytes, req_side);
                st.dir[d_idx].buf.drain(..n);
                push_pdu(
                    a,
                    st,
                    PduRec {
                        frame: no,
                        first_frame: first,
                        app,
                        flow: st.id,
                        loc: PduLoc::Owned(bytes),
                        ts_ns: ts,
                        is_req: peek.is_req,
                        pair: u32::MAX,
                        status: PairStatus::Unpaired,
                        resp_ns: -1,
                        peek,
                    },
                    pa,
                );
                st.dir[d_idx].buf_first_frame = no;
            }
            FrameLen::Bad => {
                st.dir[d_idx].buf.clear();
                break;
            }
            _ => break,
        }
    }
    if st.dir[d_idx].buf.len() > 65536 {
        st.dir[d_idx].buf.clear();
    }
    if !st.dir[d_idx].buf.is_empty() {
        pa.flags |= ann::SEGMENT_OF_PDU;
    }
}

#[allow(clippy::too_many_arguments)]
fn feed_datagram(
    a: &mut Analysis,
    st: &mut FlowState,
    f: &[u8],
    l4: usize,
    ps: usize,
    pe: usize,
    no: u32,
    ts: i64,
    prefs: &Prefs,
    _di: usize,
    pa: &mut PacketAnn,
) {
    let payload = &f[ps..pe];
    let Some(app) = classify_flow(a, st, payload, prefs) else {
        return;
    };
    let req_side = from_client(a, st, f, l4);
    let mut off = 0;
    while off < payload.len() {
        let rest = &payload[off..];
        match industrial::frame_len(app, rest) {
            FrameLen::Len(n) if n <= rest.len() => {
                let peek = industrial::peek(app, &rest[..n], req_side);
                push_pdu(
                    a,
                    st,
                    PduRec {
                        frame: no,
                        first_frame: no,
                        app,
                        flow: st.id,
                        loc: PduLoc::InFrame((ps + off) as u32, n as u32),
                        ts_ns: ts,
                        is_req: peek.is_req,
                        pair: u32::MAX,
                        status: PairStatus::Unpaired,
                        resp_ns: -1,
                        peek,
                    },
                    pa,
                );
                off += n;
            }
            _ => break,
        }
    }
}

/// PDU 를 목록에 넣고 요청/응답 짝을 맞춘다
fn push_pdu(a: &mut Analysis, st: &mut FlowState, rec: PduRec, pa: &mut PacketAnn) {
    let idx = a.pdus.len() as u32;
    if pa.pdu_count == 0 {
        pa.pdu_first = idx;
    }
    pa.pdu_count += 1;
    let is_req = rec.is_req;
    a.pdus.push(rec);
    if is_req {
        st.pending.push(idx);
        return;
    }
    // 응답 — 맞는 요청 찾기
    let resp = &a.pdus[idx as usize];
    let pos = {
        let find = |newest_first: bool| -> Option<usize> {
            let it: Box<dyn Iterator<Item = (usize, &u32)>> = if newest_first {
                Box::new(st.pending.iter().enumerate().rev())
            } else {
                Box::new(st.pending.iter().enumerate())
            };
            for (k, &ri) in it {
                if industrial::matches(&a.pdus[ri as usize].peek, &resp.peek, resp.app) {
                    return Some(k);
                }
            }
            None
        };
        find(industrial::match_newest_first(resp.app))
    };
    match pos {
        Some(k) => {
            let ri = st.pending.remove(k) as usize;
            let dt = (a.pdus[idx as usize].ts_ns - a.pdus[ri].ts_ns).max(0);
            let bad = a.pdus[idx as usize].peek.code != 0;
            let status = if bad {
                PairStatus::Exception
            } else {
                PairStatus::Ok
            };
            let dtv = if a.pdus[ri].ts_ns == NO_TS || a.pdus[idx as usize].ts_ns == NO_TS {
                -1
            } else {
                dt
            };
            a.pdus[ri].pair = idx;
            a.pdus[ri].status = status;
            a.pdus[ri].resp_ns = dtv;
            a.pdus[idx as usize].pair = ri as u32;
            a.pdus[idx as usize].status = status;
            a.pdus[idx as usize].resp_ns = dtv;
        }
        None => a.pdus[idx as usize].status = PairStatus::Orphan,
    }
}

fn finalize_pairs(a: &mut Analysis, states: &mut [FlowState], prefs: &Prefs) {
    let timeout = prefs.timeout_ms as i64 * 1_000_000;
    for st in states.iter_mut() {
        let close = a.flows[st.id as usize].fin_rst_frame;
        for &ri in &st.pending {
            let r = &a.pdus[ri as usize];
            let status = if close.is_some_and(|c| c >= r.frame) {
                PairStatus::Closed
            } else if r.ts_ns != NO_TS && a.end_ts_ns != NO_TS && a.end_ts_ns - r.ts_ns >= timeout {
                PairStatus::Timeout
            } else {
                PairStatus::CaptureEnd
            };
            a.pdus[ri as usize].status = status;
        }
        st.pending.clear();
    }
}
