// 도움말 — 자동응답 규칙의 템플릿·장애 흉내(Simulator·Serial·TCP·UDP 공통)와 «자동응답» 칸(Serial·TCP·UDP).
import type { HelpSection } from "./HelpDialog";

type Lang = "ko" | "en";

/** 응답 템플릿 — Modbus TCP 예시까지 */
function templateSection(lang: Lang): HelpSection {
  return lang === "ko"
    ? {
        title: "응답 템플릿 ({…} 자리)",
        body: [
          "응답 칸에 {…} 자리를 쓰면 받을 때마다 채워 보냅니다. HEX·ASCII 어느 쪽에도 쓰고, 칸 옆 «자리 넣기» 로 커서 자리에 넣을 수 있습니다.",
          "- {req} 요청 전체 · {req 0..1} 요청 0~1번 바이트(끝 포함) · {req 6} 한 바이트 · {req 2..} 2번부터 끝까지 · {req -2..-1} 끝에서 2바이트(음수는 끝에서, -1 = 마지막).",
          "- {counter} 이 규칙이 지금까지 응답한 횟수(0부터) 1바이트 · {counter 2}·{counter 4} 바이트 수 · 뒤에 le 면 리틀 엔디언(기본 빅 엔디언) · {counter dec} 10진 글자. «횟수 초기화» 로 0 부터 다시.",
          "- {rand 0..100} 그 사이(끝 포함) 무작위 값(크기는 최댓값에 맞춰 1·2·4바이트) · {rand 0..1000 2 le} 크기·순서 지정 · {rand 10..99 dec} 10진 글자.",
          "- {time} 지금 시각 «HH:MM:SS» 글자 · {time %Y-%m-%d %H:%M:%S} 형식 지정 · {unix} 유닉스 초 · {unix ms} 밀리초.",
          "- {crc 종류} 이 자리 앞의 모든 바이트로 계산한 체크섬을 여기에 · {crc bcc 1..-1} 범위 지정(체크섬 자리를 뺀 응답 바이트 기준) · 끝에 swap 이면 바이트 순서 뒤집기. 종류: crc16-modbus·crc16-ccitt·crc16-xmodem·crc8·lrc·bcc·sum8·sum16·crc32.",
          "- 순서: 자리 채우기 → {crc} 자리 → 규칙의 «체크섬»(전체에) → «줄 끝». 그래서 «01 03 02 {req 4..5}» + 체크섬 CRC16 Modbus 도, «01 03 02 {req 4..5} {crc crc16-modbus}» 도 같은 결과입니다.",
          "- 예) Modbus TCP 보유 레지스터 2개 읽기 응답 — 받으면 «?? ?? 00 00 00 06 ?? 03 **», 응답 «{req 0..1} 00 00 00 07 {req 6} 03 04 00 64 00 C8». 트랜잭션 ID(0~1번)와 유닛 ID(6번)를 요청 그대로 돌려줘서 마스터가 짝을 맞춥니다. MBAP 에는 CRC 가 없으므로 체크섬은 «없음».",
          "- 예) 시퀀스 번호가 붙는 장비 — «ACK {counter dec}\\r\\n»(ASCII). 예) STX…ETX 뒤 BCC — «02 {req 1..-2} 03 {crc bcc 1..-1}».",
          "- 요청이 짧아 {req 9} 같은 자리를 채울 수 없으면 보내지 않고 통신 기록에 «AUTO 이름 — 요청 범위 …» 를 남깁니다. 알려진 이름(req·counter·rand·time·unix·crc)이 아닌 { 는 글자 그대로 나갑니다(예: {\"ok\":1}). «{req» 같은 글자를 그대로 보내려면 ASCII 에서 \\x7B 로 쓰세요.",
          "- «자세히» 의 «예시 요청» 에 요청을 적으면(패턴과 같은 HEX/ASCII) 규칙에 맞는지와 실제로 나갈 응답 바이트를 바로 보여 줍니다. 횟수 0·무작위 예시 값으로 채운 것이라 실제 값은 매번 다릅니다.",
        ],
      }
    : {
        title: "Reply templates ({…} fields)",
        body: [
          "A reply may contain {…} fields that are filled for every request. They work in HEX and ASCII, and «Insert field» next to the reply puts one at the cursor.",
          "- {req} whole request · {req 0..1} request bytes 0–1 (inclusive) · {req 6} one byte · {req 2..} byte 2 to the end · {req -2..-1} the last 2 bytes (negative counts from the end, -1 = last).",
          "- {counter} how many times this rule has replied (from 0), 1 byte · {counter 2} / {counter 4} size in bytes · add le for little-endian (default big-endian) · {counter dec} decimal text. «Reset counts» starts over at 0.",
          "- {rand 0..100} random value in the range (inclusive; size 1/2/4 bytes to fit the max) · {rand 0..1000 2 le} explicit size and order · {rand 10..99 dec} decimal text.",
          "- {time} current time «HH:MM:SS» as text · {time %Y-%m-%d %H:%M:%S} custom format · {unix} Unix seconds · {unix ms} milliseconds.",
          "- {crc kind} checksum of all bytes before this field, placed here · {crc bcc 1..-1} explicit range (counted over the reply without checksum fields) · add swap to reverse the byte order. Kinds: crc16-modbus, crc16-ccitt, crc16-xmodem, crc8, lrc, bcc, sum8, sum16, crc32.",
          "- Order: fill fields → {crc} fields → the rule's «Checksum» (over everything) → «Line ending». So «01 03 02 {req 4..5}» with checksum CRC16 Modbus equals «01 03 02 {req 4..5} {crc crc16-modbus}».",
          "- Example — Modbus TCP read of 2 holding registers: when «?? ?? 00 00 00 06 ?? 03 **», reply «{req 0..1} 00 00 00 07 {req 6} 03 04 00 64 00 C8». The transaction ID (bytes 0–1) and unit ID (byte 6) are echoed so the master can pair them. MBAP has no CRC, so set checksum to «None».",
          "- Example — a device with sequence numbers: «ACK {counter dec}\\r\\n» (ASCII). Example — BCC after STX…ETX: «02 {req 1..-2} 03 {crc bcc 1..-1}».",
          "- If a request is too short for a field such as {req 9}, nothing is sent and the log shows «AUTO name — request range …». A { that does not start a known name (req, counter, rand, time, unix, crc) is sent as is (e.g. {\"ok\":1}). To send text like «{req» literally, write \\x7B in ASCII.",
          "- Type a request into «Sample request» under «More» (same HEX/ASCII as the pattern) to see whether it matches and the exact reply bytes. It is filled with count 0 and sample random values, so real values differ.",
        ],
      };
}

/** 장애 흉내·응답 돌리기 */
function faultSection(lang: Lang): HelpSection {
  return lang === "ko"
    ? {
        title: "장애 흉내·응답 돌리기",
        body: [
          "규칙 카드의 «▸ 자세히» 를 펼치면 상위 프로그램의 시간 초과·재시도·상태 변화 처리를 시험할 수 있습니다. 켜 둔 것은 카드 아래 작은 표시(«지연 10~50ms», «3번째마다 버림» 등)로 늘 보입니다.",
          "- «지연 범위»: 처음 값~끝 값(ms) 사이에서 매번 무작위로 늦게 답합니다(흔들림). 끝 값이 처음 값 이하이면 처음 값으로 고정 지연. 기록에 «AUTO 이름 +37ms» 처럼 실제 지연이 남습니다.",
          "- «N번째마다 무응답»: 이 규칙에 맞은 N번째·2N번째… 요청에는 답하지 않습니다(0 = 끔). «확률(%)로 무응답»: 그 확률로 답하지 않습니다. 버린 요청은 «DROP 이름 — …» 사건 줄로 남고 응답 횟수에는 들어가지 않습니다.",
          "- «응답 돌리기»: «+ 응답 추가» 로 응답을 여러 개 두면 맞을 때마다 «차례로»(1 → 2 → … → 1) 또는 «무작위» 로 바꿔 보냅니다. 장비 상태(대기 → 동작 → 완료)가 바뀌는 흉내에 씁니다. 기록에 «AUTO 이름 [2/3]» 처럼 몇 번째 응답인지 남습니다.",
          "- «차례로» 와 {counter} 는 규칙의 응답 횟수를 씁니다 — «횟수 초기화» 로 처음부터. 규칙을 고쳐도(이름이 같으면) 이어서 셉니다.",
        ],
      }
    : {
        title: "Fault injection and rotating replies",
        body: [
          "Expand «▸ More» on a rule card to test the host's timeout, retry and state handling. Active options are always shown as small tags under the card («delay 10–50 ms», «drop 1 in 3», …).",
          "- «Delay range»: replies after a random delay between the start and end (ms) every time (jitter). If the end is not above the start, the start is a fixed delay. The log shows the real delay, e.g. «AUTO name +37ms».",
          "- «drop every Nth request»: the Nth, 2Nth … requests matching this rule get no answer (0 = off). «% = drop by chance» drops with that probability. Dropped requests are logged as «DROP name — …» and do not count as replies.",
          "- «Rotate replies»: with several replies («+ Add reply»), each match sends the next one «in sequence» (1 → 2 → … → 1) or a «random» one — to mimic a device whose state changes (idle → running → done). The log shows which, e.g. «AUTO name [2/3]».",
          "- «In sequence» and {counter} use the rule's reply count — «Reset counts» starts over. Editing a rule (same name) keeps counting.",
        ],
      };
}

/** Serial·TCP·UDP 오른쪽 «자동응답» 칸 */
function panelSection(lang: Lang): HelpSection {
  return lang === "ko"
    ? {
        title: "자동응답",
        body: [
          "오른쪽 칸 «▸ 자동응답» 은 Simulator 와 같은 규칙으로 받은 줄에 답합니다 — 장비 흉내를 따로 띄우지 않고 이 창에서 바로.",
          "- 머리의 «켜기» 로 켜고 끕니다(켜면 초록색). 꺼도 규칙은 남아 있고, 켜면 바로 답합니다. 규칙·켜기·비교 옵션은 껐다 켜도 남습니다.",
          "- 규칙: «받으면» 패턴(HEX/ASCII, «정확히»/«포함», HEX 와일드카드 ??·**) → «응답»(체크섬·줄 끝·지연). 위에서부터 처음 맞는 하나만 답하고, 응답마다 통신 기록에 «AUTO 이름» 이 남습니다.",
          "- ASCII 패턴은 글자 그대로 비교합니다(새 규칙 기본 — SCPI «*IDN?» 를 그대로). 규칙의 «와일드카드» 를 켜면 ? = 아무 1글자, * = 0개 이상입니다. 10/18 이전에 저장한 규칙은 켜진 채로 읽어 동작이 바뀌지 않습니다.",
          "- 규칙이 없으면 [Modbus RTU 03 응답] [SCPI *IDN? 응답] [에코] 예제 버튼으로 시작합니다. 새 규칙은 바로 위 규칙의 방식(HEX/ASCII·정확히/포함·응답 형식·줄 끝)을 물려받습니다.",
          "- «끝 문자 떼고 비교»: 받은 줄 끝의 끝 문자(프레임 구분)와 CR·LF 를 떼고 비교합니다. «안 맞은 요청 기록(NO MATCH)»: 어느 규칙에도 안 맞으면 «NO MATCH — closest: 이름» 을 남깁니다.",
          "- 응답은 받은 상대에게 갑니다(TCP 서버는 그 접속, UDP 는 보낸 쪽 주소). 우리가 보낸 응답이 그대로 되돌아오면 다시 답하지 않아 끝없는 주고받기를 막습니다.",
          "- 카드 위 숫자는 응답한 횟수, «횟수 초기화» 로 0. 틀린 규칙은 빨갛게 되고 그것만 빠집니다.",
        ],
      }
    : {
        title: "Auto reply",
        body: [
          "«▸ Auto reply» in the right pane answers received lines with the same rules as Simulator — no separate device simulator needed.",
          "- «On» in its header turns it on or off (green when on). Rules are kept while off and reply as soon as it is on. Rules, the switch and match options survive restarts.",
          "- A rule: «When» pattern (HEX/ASCII, «exact»/«contains», HEX wildcards ??/**) → «Reply» (checksum, line ending, delay). The first matching rule replies, and every reply is logged as «AUTO name».",
          "- ASCII patterns compare literally (the default for new rules — SCPI «*IDN?» as is). Turn on a rule's «Wildcards» to make ? any one character and * zero or more. Rules saved before 10/18 load with it on, so they behave as before.",
          "- With no rules, the [Modbus RTU 03 reply] [SCPI *IDN? reply] [Echo] example buttons give you a start. A new rule takes the format of the rule above it (HEX/ASCII, exact/contains, reply format, line ending).",
          "- «Ignore line ending when matching» strips the framing terminator and CR/LF before comparing. «Log unmatched requests (NO MATCH)» logs «NO MATCH — closest: name» when no rule matches.",
          "- Replies go back to the sender (TCP server: that connection; UDP: the sender's address). If our own reply comes straight back, it is not answered again, so endless ping-pong cannot start.",
          "- The number on each card is its reply count; «Reset counts» sets it to 0. An invalid rule turns red and only that rule is skipped.",
        ],
      };
}

/** Simulator — 템플릿·장애 흉내 */
export const simAutoReplySections = (lang: Lang) => [templateSection(lang), faultSection(lang)];
/** Serial·TCP·UDP — 자동응답 칸 + 템플릿·장애 흉내 */
export const ioAutoReplySections = (lang: Lang) => [panelSection(lang), templateSection(lang), faultSection(lang)];
