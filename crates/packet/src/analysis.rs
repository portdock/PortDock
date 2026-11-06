//! TCP 흐름 분석(조립·Expert)과 요청/응답 짝 — 패킷마다 붙는 주석(`PacketAnn`)과 PDU 목록.

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
    /// TCP 흐름 번호(`tcp.stream`). 없으면 `u32::MAX`
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

#[derive(Default)]
pub struct Analysis {
    pub ann: Vec<PacketAnn>,
}
