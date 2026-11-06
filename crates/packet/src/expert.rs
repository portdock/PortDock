//! «왜 안 되지» 진단(Expert) — 분석 항목마다 평문 설명 열쇠.
//!
//! 해석 결과의 `ExpertInfo.key`(+ `code`)로 이 표를 찾아 «무슨 뜻인가 · 흔한 원인 · 다음에 볼 곳» 을 한국어·영어로 보여 준다.
//! 표는 데이터(정적 배열)라 화면이 언어를 골라 쓴다. `topic` 은 화면이 PortDock 가이드 쪽으로 이어 줄 때 쓰는 주제 이름(주소는 화면이 정한다).

use crate::dissect::ExpertInfo;
use crate::industrial::CodeInfo;

#[derive(Clone, Copy, Debug)]
pub struct Explain {
    pub key: &'static str,
    pub title_en: &'static str,
    pub title_ko: &'static str,
    pub meaning_en: &'static str,
    pub meaning_ko: &'static str,
    pub next_en: &'static str,
    pub next_ko: &'static str,
    pub topic: &'static str,
}

macro_rules! ex {
    ($key:expr, $te:expr, $tk:expr, $me:expr, $mk:expr, $ne:expr, $nk:expr, $topic:expr) => {
        Explain {
            key: $key,
            title_en: $te,
            title_ko: $tk,
            meaning_en: $me,
            meaning_ko: $mk,
            next_en: $ne,
            next_ko: $nk,
            topic: $topic,
        }
    };
}

pub const EXPLAINS: &[Explain] = &[
    ex!(
        "tcp.retransmission",
        "TCP retransmission",
        "TCP 재전송",
        "The same data was sent again because the sender did not see an acknowledgement in time (or saw duplicate ACKs).",
        "보낸 쪽이 제때 확인(ACK)을 받지 못해(또는 중복 ACK 를 받아) 같은 데이터를 다시 보냈습니다.",
        "1) Look for the same data just before this frame and whether an ACK came back. 2) Frequent retransmissions on one link point to cable, switch port, duplex mismatch or an overloaded device. 3) Check the capture point: frames lost before the capture point look like retransmissions.",
        "1) 이 프레임 바로 앞의 같은 데이터와 ACK 가 돌아왔는지 본다. 2) 한 구간에서 자주 나오면 케이블·스위치 포트·듀플렉스 불일치·장비 과부하를 의심한다. 3) 캡처 위치를 확인한다(캡처 지점 앞에서 잃은 프레임도 재전송처럼 보인다).",
        "tcp-retransmission"
    ),
    ex!(
        "tcp.out_of_order",
        "TCP segment out of order",
        "TCP 순서 어긋남",
        "A segment arrived after later data, filling a gap seen earlier. The network reordered packets or the capture saw them in a different order.",
        "앞서 비어 있던 구간을 채우는 세그먼트가 뒤늦게 도착했습니다. 네트워크가 순서를 바꿨거나 캡처가 다른 순서로 봤습니다.",
        "1) Check whether a retransmission of the same bytes also exists. 2) If it repeats, look for multiple paths (link aggregation, wireless) between the two ends.",
        "1) 같은 바이트의 재전송이 따로 있는지 본다. 2) 되풀이되면 두 끝 사이의 여러 경로(링크 묶음·무선)를 확인한다.",
        "tcp-out-of-order"
    ),
    ex!(
        "tcp.dup_ack",
        "Duplicate ACK",
        "중복 ACK",
        "The receiver acknowledged the same sequence number again with no new data: it is still waiting for a segment that did not arrive.",
        "받는 쪽이 새 데이터 없이 같은 번호를 또 확인했습니다. 오지 않은 세그먼트를 계속 기다리고 있다는 뜻입니다.",
        "1) Find the first ACK with this number and the data frame that should have followed. 2) Three duplicates normally trigger a fast retransmission; check that it follows.",
        "1) 같은 번호의 첫 ACK 와, 뒤따라야 했던 데이터 프레임을 찾는다. 2) 세 번 되풀이되면 보통 빠른 재전송이 뒤따른다 — 뒤따르는지 본다.",
        "tcp-dup-ack"
    ),
    ex!(
        "tcp.zero_window",
        "TCP zero window",
        "TCP 창 0",
        "The receiver announced a receive window of 0: its buffer is full and the sender must stop. A stuck HMI/PLC application that does not read its socket causes this.",
        "받는 쪽이 수신 창 0 을 알렸습니다. 버퍼가 가득 차서 보내는 쪽이 멈춰야 합니다. 소켓을 읽지 않는 HMI·PLC 프로그램이 멈췄을 때 나옵니다.",
        "1) Check whether a window update follows soon (short stall) or never (stuck receiver). 2) Look at the receiving device: CPU load, communication task, connection limit.",
        "1) 곧 창 갱신이 뒤따르는지(잠깐 멈춤) 끝내 없는지(수신 쪽이 멈춤) 본다. 2) 받는 장비의 CPU 부하·통신 작업·접속 수 한도를 본다.",
        "tcp-zero-window"
    ),
    ex!(
        "tcp.lost_segment",
        "Previous segment not captured",
        "앞 세그먼트를 캡처하지 못함",
        "The sequence number jumped ahead: bytes in between were not seen. Normal at the start of a capture; otherwise frames were lost on the way or by the capture.",
        "순서 번호가 앞질러 갔습니다. 사이 바이트를 보지 못했습니다. 캡처를 막 시작했다면 정상이고, 아니면 도중에 잃었거나 캡처가 놓친 것입니다.",
        "1) Check whether the capture started in the middle of the connection. 2) If not, check the capture point (mirror port oversubscribed? capture drops?) and for retransmissions that fill the gap.",
        "1) 캡처가 연결 중간에 시작했는지 본다. 2) 아니면 캡처 위치(미러 포트 과부하? 캡처 누락?)와 구멍을 메우는 재전송이 있는지 본다.",
        "tcp-lost-segment"
    ),
    ex!(
        "tcp.ack_lost_segment",
        "ACK for unseen data",
        "못 본 데이터에 대한 ACK",
        "An ACK covers bytes the capture never saw — common at capture start, otherwise a capture gap.",
        "캡처가 본 적 없는 바이트를 확인하는 ACK 입니다. 캡처 시작에서는 흔하고, 아니면 캡처 누락입니다.",
        "Check the capture point and whether the capture started mid-connection.",
        "캡처 위치와, 연결 중간에 캡처를 시작했는지 확인한다.",
        "tcp-lost-segment"
    ),
    ex!(
        "tcp.keep_alive",
        "TCP keep-alive",
        "TCP 연결 유지 신호(keep-alive)",
        "A one-byte (or empty) probe with an old sequence number that asks the peer to answer, to check whether it is still alive.",
        "상대가 살아 있는지 확인하려고 옛 순서 번호로 보내는 0~1바이트 신호입니다.",
        "1) A keep-alive ACK should follow. If none comes and the connection later resets, the peer or the path is gone. 2) If keep-alives are the only traffic, the application is idle.",
        "1) keep-alive ACK 가 뒤따라야 한다. 없고 나중에 연결이 끊기면 상대나 경로가 사라진 것이다. 2) 이것만 오가면 응용 프로그램이 쉬고 있는 것이다.",
        "tcp-keep-alive"
    ),
    ex!(
        "tcp.window_update",
        "TCP window update",
        "TCP 창 갱신",
        "The receiver announced a larger window with no new data — usually the end of a zero-window stall.",
        "새 데이터 없이 수신 창이 커졌음을 알렸습니다. 보통 창 0 정지가 풀린 것입니다.",
        "Nothing to fix by itself; read it together with the zero-window frame before it.",
        "그 자체로 고칠 것은 없다. 앞의 창 0 프레임과 함께 읽는다.",
        "tcp-zero-window"
    ),
    ex!(
        "tcp.rst",
        "TCP connection reset",
        "TCP 연결 끊김(RST)",
        "One side aborted the connection (RST). A reset after a request without a reply often means the device refused or dropped the connection (connection limit, wrong port, device restart, firewall).",
        "한쪽이 연결을 강제로 끊었습니다(RST). 요청 뒤 응답 없이 RST 가 오면 장비가 접속을 거부했거나(접속 수 한도·잘못된 포트) 재시작했거나 방화벽이 끊은 경우가 많습니다.",
        "1) Look at who sent the RST and what came right before it. 2) A RST in answer to a SYN means nothing listens on that port or the device refuses new connections. 3) Check the device's maximum number of simultaneous connections and whether another client holds them.",
        "1) RST 를 누가 보냈는지, 바로 앞에 무엇이 있었는지 본다. 2) SYN 에 대한 RST 면 그 포트에서 듣는 프로그램이 없거나 새 접속을 거부하는 것이다. 3) 장비의 동시 접속 수 한도와, 다른 클라이언트가 접속을 쥐고 있는지 확인한다.",
        "tcp-reset"
    ),
    ex!(
        "ip.fragment",
        "Fragmented IP datagram",
        "IP 조각",
        "The datagram is split into fragments; this engine does not reassemble IP fragments, so the upper layers of fragments are not decoded.",
        "데이터그램이 조각으로 나뉘어 있습니다. 이 엔진은 IP 조각을 합치지 않으므로 조각의 위 계층은 풀지 않습니다.",
        "If it is expected (large UDP), nothing to do. Otherwise check the MTU along the path.",
        "큰 UDP 처럼 예상한 것이면 할 일 없다. 아니면 경로의 MTU 를 확인한다.",
        "ip-fragment"
    ),
    ex!(
        "frame.malformed",
        "Truncated or malformed packet",
        "잘렸거나 모양이 틀린 패킷",
        "The packet ends before the header says it should (capture snap length, or a damaged frame).",
        "머리가 말하는 길이보다 패킷이 먼저 끝납니다(캡처 길이 제한 또는 손상된 프레임).",
        "Check the capture's snap length (it should be 65535 or at least the full frame) and the cable.",
        "캡처의 스냅 길이(65535 또는 프레임 전체 이상)와 케이블을 확인한다.",
        "malformed-packet"
    ),
    ex!(
        "link.unsupported",
        "Unsupported link type",
        "지원하지 않는 링크 종류",
        "The capture's link-layer type is not Ethernet, Linux cooked, loopback or raw IP.",
        "캡처의 링크 계층 종류가 이더넷·Linux cooked·루프백·Raw IP 가 아닙니다.",
        "Capture again on an Ethernet interface, or convert the file.",
        "이더넷 어댑터로 다시 캡처하거나 파일을 변환한다.",
        "link-type"
    ),
    ex!(
        "modbus.exception",
        "Modbus exception response",
        "Modbus 예외 응답",
        "The device answered with an exception code instead of data; the request reached it but was refused.",
        "장비가 데이터 대신 예외 코드로 답했습니다. 요청은 도착했지만 장비가 거절했습니다.",
        "Open the exception code explanation below and compare the request's function code, address and quantity with the device's register map.",
        "아래 예외 코드 설명을 열어, 요청의 함수 코드·주소·개수를 장비의 레지스터 맵과 비교한다.",
        "modbus-exception"
    ),
    ex!(
        "modbus.unit_mismatch",
        "Unit ID differs between request and response",
        "요청과 응답의 국번(Unit ID) 불일치",
        "The response carries the same transaction ID as the request but a different unit ID — a gateway or device answered on behalf of another address.",
        "응답의 트랜잭션 ID 는 요청과 같은데 국번(Unit ID)이 다릅니다. 게이트웨이나 다른 장비가 대신 답했을 수 있습니다.",
        "1) Check the unit ID the client uses against the device's setting. 2) With a gateway, check its slave-address mapping.",
        "1) 클라이언트가 쓰는 국번과 장비 설정을 비교한다. 2) 게이트웨이면 슬레이브 주소 매핑을 확인한다.",
        "modbus-unit-id"
    ),
    ex!(
        "mc.end_code",
        "MC (SLMP) end code",
        "MC(SLMP) 종료 코드",
        "The PLC answered with a non-zero end code: the request was refused.",
        "PLC 가 0 이 아닌 종료 코드로 답했습니다. 요청을 거절한 것입니다.",
        "Open the end code explanation below (cause and check order).",
        "아래 종료 코드 설명(원인과 점검 순서)을 연다.",
        "mc-end-code"
    ),
    ex!(
        "xgt.error",
        "XGT FEnet error response",
        "XGT FEnet 오류 응답",
        "The PLC answered with an error status (NAK) and an error code.",
        "PLC 가 오류 상태(NAK)와 오류 코드로 답했습니다.",
        "Open the error code explanation below (cause and check order).",
        "아래 오류 코드 설명(원인과 점검 순서)을 연다.",
        "xgt-error"
    ),
    ex!(
        "pair.no_response",
        "No response to the request",
        "요청에 응답 없음",
        "No matching response arrived within the timeout. Either the device did not answer, or the answer was lost, or the capture does not see the device's side.",
        "제한 시간 안에 짝이 되는 응답이 오지 않았습니다. 장비가 답하지 않았거나, 답이 사라졌거나, 캡처가 장비 쪽 통신을 보지 못하는 경우입니다.",
        "1) Check that the capture sees both directions (mirror / relay mode). 2) Check address, unit ID/station number and port against the device. 3) Check whether TCP retransmissions or a reset surround the request.",
        "1) 캡처가 양방향을 다 보는지 확인한다(미러링·중계 모드). 2) 주소·국번(Unit ID)·포트가 장비와 맞는지 확인한다. 3) 요청 주변에 TCP 재전송이나 RST 가 있는지 본다.",
        "no-response"
    ),
    ex!(
        "pair.closed",
        "Connection closed before a response",
        "응답 전에 연결이 닫힘",
        "The connection was closed (FIN/RST) after the request and before any response.",
        "요청 뒤 응답이 오기 전에 연결이 닫혔습니다(FIN/RST).",
        "Look at the closing frame: who closed it, and whether the device limits connections or restarted.",
        "닫은 프레임을 본다. 누가 닫았는지, 장비가 접속 수를 제한하거나 재시작했는지 확인한다.",
        "tcp-reset"
    ),
    ex!(
        "pair.capture_end",
        "Capture ended while waiting",
        "응답을 기다리는 중 캡처가 끝남",
        "The capture ended before the response timeout elapsed; the response may simply not have been captured yet.",
        "응답 제한 시간이 지나기 전에 캡처가 끝났습니다. 응답이 아직 캡처되지 않았을 뿐일 수 있습니다.",
        "Capture a little longer after the last request.",
        "마지막 요청 뒤로 조금 더 캡처한다.",
        "no-response"
    ),
    ex!(
        "pair.orphan",
        "Response without a request",
        "요청 없는 응답",
        "A response arrived with no matching request in the capture (capture started mid-conversation, or a request was lost, or the transaction number does not match).",
        "캡처 안에 짝이 되는 요청이 없는 응답입니다(캡처가 대화 중간에 시작했거나, 요청을 놓쳤거나, 번호가 맞지 않음).",
        "Check whether the capture started mid-conversation and compare the transaction/serial/invoke numbers.",
        "캡처가 대화 중간에 시작했는지 보고, 트랜잭션·일련번호·Invoke 번호를 비교한다.",
        "orphan-response"
    ),
];

pub fn explain(key: &str) -> Option<&'static Explain> {
    EXPLAINS.iter().find(|e| e.key == key)
}

macro_rules! ci {
    ($c:expr, $ne:expr, $nk:expr, $ce:expr, $ck:expr, $he:expr, $hk:expr) => {
        CodeInfo {
            code: $c,
            name_en: $ne,
            name_ko: $nk,
            cause_en: $ce,
            cause_ko: $ck,
            check_en: $he,
            check_ko: $hk,
        }
    };
}

/// Modbus 예외 코드(Application Protocol V1.1b3 §7) — 원인·점검 순서
pub const MODBUS_EXCEPTIONS: &[CodeInfo] = &[
    ci!(
        1,
        "Illegal Function",
        "허용되지 않는 함수",
        "The device does not support this function code, or not in its current state.",
        "장비가 이 함수 코드를 지원하지 않거나, 지금 상태에서는 처리할 수 없습니다.",
        "1) Check the device manual's list of supported function codes (some devices only support 03/06/16). 2) Try the equivalent function (e.g. 04 instead of 03, 16 instead of 06).",
        "1) 장비 매뉴얼의 지원 함수 코드 목록을 본다(03·06·16 만 되는 장비가 많다). 2) 비슷한 함수로 바꿔 본다(03 대신 04, 06 대신 16 등)."
    ),
    ci!(
        2,
        "Illegal Data Address",
        "허용되지 않는 데이터 주소",
        "The address, or start address plus quantity, does not exist in the device.",
        "요청한 주소(또는 시작 주소+개수 범위)가 장비에 없습니다.",
        "1) Check the address base: manuals list 40001-style numbers, the frame carries address-1 (zero based). 2) Check that start+quantity stays inside one defined block. 3) Compare with the device map.",
        "1) 주소 기준을 확인한다. 매뉴얼의 40001 식 번호와 프레임의 주소(0 기준, 번호−40001)가 다르다. 2) 시작+개수가 정의된 한 블록 안에 있는지 본다. 3) 장비 맵과 비교한다."
    ),
    ci!(
        3,
        "Illegal Data Value",
        "허용되지 않는 데이터 값",
        "A value in the request is not allowed, including its structure such as quantity or byte count.",
        "요청에 담긴 값이 허용되지 않습니다(개수·바이트 수 같은 요청 모양 포함).",
        "1) Check the quantity against the function's limit (125 registers for 03/04, 123 for 16). 2) Check the written value against the register's allowed range.",
        "1) 개수가 함수의 한도(03·04 는 125, 16 은 123)를 넘지 않는지 본다. 2) 쓴 값이 그 레지스터의 허용 범위인지 본다."
    ),
    ci!(
        4,
        "Server Device Failure",
        "장비 내부 오류",
        "An unrecoverable error occurred in the device while it performed the action.",
        "요청을 처리하는 동안 장비에서 복구할 수 없는 오류가 났습니다.",
        "Check the device's own alarm/error display and its power and configuration; retry after a restart.",
        "장비 자체의 경보·오류 표시, 전원, 설정을 본다. 재시작 뒤 다시 시도한다."
    ),
    ci!(
        5,
        "Acknowledge",
        "접수됨(처리 중)",
        "The request was accepted but takes a long time; poll later to see whether it finished.",
        "요청은 받았고 처리에 시간이 걸립니다. 끝났는지는 나중에 다시 물어야 합니다.",
        "Poll again after a while; do not resend the same command.",
        "잠시 뒤 다시 물어본다. 같은 명령을 다시 보내지 않는다."
    ),
    ci!(
        6,
        "Server Device Busy",
        "장비 사용 중",
        "The device is busy with a long-running command; retry later.",
        "장비가 오래 걸리는 명령을 처리 중입니다. 나중에 다시 보내야 합니다.",
        "Slow down the polling rate or wait and retry.",
        "폴링 주기를 늦추거나 잠시 기다렸다 다시 보낸다."
    ),
    ci!(
        8,
        "Memory Parity Error",
        "메모리 패리티 오류",
        "A memory parity error was found while reading or writing a file record (functions 0x14/0x15).",
        "파일 레코드 읽기·쓰기(함수 0x14·0x15)에서 메모리 패리티 오류가 났습니다.",
        "Retry; if it repeats the device memory may be faulty.",
        "다시 시도한다. 되풀이되면 장비 메모리 고장일 수 있다."
    ),
    ci!(
        10,
        "Gateway Path Unavailable",
        "게이트웨이 경로 없음",
        "The gateway could not set up a path to the target (misconfigured or overloaded).",
        "게이트웨이가 대상 장비로 가는 경로를 잡지 못했습니다(설정 오류·과부하).",
        "Check the gateway's port/slave mapping and load.",
        "게이트웨이의 포트·슬레이브 매핑과 부하를 확인한다."
    ),
    ci!(
        11,
        "Gateway Target Device Failed to Respond",
        "게이트웨이 뒤 장비 무응답",
        "The device behind the gateway did not respond.",
        "게이트웨이 뒤의 대상 장비가 응답하지 않았습니다.",
        "Check the serial side: wiring, baud rate/parity, slave address, termination, power of the target.",
        "시리얼 쪽을 확인한다: 배선·통신 속도·패리티·국번·종단 저항·대상 전원."
    ),
];

pub fn modbus_exception(code: u32) -> Option<&'static CodeInfo> {
    MODBUS_EXCEPTIONS.iter().find(|c| c.code == code)
}

/// 항목의 코드 설명 — `key` 와 `code` 로 찾는다(예외·종료·오류 코드)
pub fn explain_code(key: &str, code: u32) -> Option<&'static CodeInfo> {
    match key {
        "modbus.exception" => modbus_exception(code),
        "mc.end_code" => crate::industrial::mc::end_info(code),
        "xgt.error" => crate::industrial::xgt::xgt_error(code & 0xff)
            .or_else(|| crate::industrial::xgt::xgt_error(code)),
        _ => None,
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Lang {
    Ko,
    En,
}

/// 화면에 보일 완성된 설명 한 덩어리
#[derive(Clone, Debug)]
pub struct Explanation {
    pub title: String,
    pub meaning: String,
    pub next: String,
    /// 코드 설명이 있으면 그 이름·원인·점검 순서
    pub code_name: Option<String>,
    pub code_cause: Option<String>,
    pub code_check: Option<String>,
    pub topic: &'static str,
}

pub fn describe(info: &ExpertInfo, lang: Lang) -> Option<Explanation> {
    let e = explain(info.key)?;
    let pick =
        |en: &'static str, ko: &'static str| (if lang == Lang::Ko { ko } else { en }).to_string();
    let c = explain_code(info.key, info.code);
    Some(Explanation {
        title: pick(e.title_en, e.title_ko),
        meaning: pick(e.meaning_en, e.meaning_ko),
        next: pick(e.next_en, e.next_ko),
        code_name: c.map(|c| pick(c.name_en, c.name_ko)),
        code_cause: c.map(|c| pick(c.cause_en, c.cause_ko)),
        code_check: c.map(|c| pick(c.check_en, c.check_ko)),
        topic: e.topic,
    })
}
