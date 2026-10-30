// Simulator 도움말 — 화면 ? 버튼·F1 로 연다
import type { HelpDoc } from "@shared/HelpDialog";
import { termsSection } from "@shared/glossary";
import { logHandlingLines, notationLines, settingsLines, shortcutLines, windowLines } from "@shared/helpCommon";
import { simAutoReplySections } from "@shared/helpAutoReply";

export const help: HelpDoc = {
  ko: [
    {
      title: "이 프로그램은",
      body: [
        "PortDock Simulator 는 PC 를 «가짜 장비» 로 만들어, 실제 장비 없이 상위 프로그램(마스터·HMI·검사 프로그램)을 시험하는 도구입니다.",
        "받은 데이터가 규칙에 맞으면 정해 둔 응답을 돌려주고, 장비처럼 먼저 상태 보고·하트비트를 보낼 수도 있습니다.",
        "시리얼(COM), TCP 서버, TCP 클라이언트, UDP 네 가지 방식으로 동작합니다.",
      ],
    },
    {
      title: "처음 쓰는 순서",
      id: "start",
      body: [
        "- 1. 왼쪽 «연결 방식» 을 고르고 포트·주소를 넣습니다.",
        "- 2. «+ 규칙 추가» 로 규칙을 만듭니다: «받으면» 패턴, «응답» 내용, 필요하면 체크섬·줄 끝·지연. 규칙이 하나도 없으면 [Modbus RTU 03 응답] [SCPI *IDN? 응답] [에코(받은 것 그대로)] 예제 버튼으로 시작할 수 있습니다.",
        "- 3. «시작» 을 누릅니다. 상위 프로그램에서 요청을 보내면 맞는 규칙이 응답하고, 아래 «통신 기록» 에 찍힙니다.",
        "- 4. 규칙별 «응답한 횟수» 로 어떤 규칙이 몇 번 답했는지 확인합니다.",
      ],
    },
    {
      title: "화면 구성",
      body: [
        "- 왼쪽: «연결 방식», 포트·주소, «프레임 구분», «시작»/«멈춤», 상태, «파일로 계속 저장».",
        "- 가운데 위: «응답 규칙» 카드들, «끝 문자 떼고 비교»·«안 맞은 요청 기록(NO MATCH)», «횟수 초기화», «규칙 묶음 저장»·«규칙 묶음 불러오기».",
        "- 그 아래: «장비가 먼저 보내기» 접기(평소 접힘, 반복을 켜면 펼쳐짐).",
        "- 맨 아래: «통신 기록»(시각·RX ◀ / TX ▶ / EV·상대 주소·내용), HEX/ASCII 전환, 찾기 줄, «화면 내용 저장»·«지우기».",
        ...windowLines("ko"),
      ],
    },
    {
      title: "연결 방식",
      body: [
        "- «시리얼(COM)»: «포트»·«속도(bps)»·«패리티» 를 고릅니다. 데이터 비트 8, 정지 비트 1, 흐름 제어 없음으로 엽니다. USB 를 뽑았다 꽂으면 저절로 다시 엽니다.",
        "- 목록에 없는 포트(모뎀으로 잡힌 포트·일부 가상 포트)는 «포트» 목록 맨 아래 «직접 입력…» 으로 이름(예: COM12)을 넣어 엽니다. 목록에는 Windows 의 SERIALCOMM 에 있는 포트도 함께 나옵니다.",
        "- «TCP 서버 (상대가 연결)»: «주소»(보통 0.0.0.0)와 «포트» 로 기다립니다. 상위 프로그램이 이 PC 로 연결하는 경우입니다. 받은 연결에 각각 응답합니다.",
        "- «TCP 클라이언트 (상대에 연결)»: «연결할 곳» 의 주소·포트로 연결합니다. 상위 프로그램이 서버로 기다리는 경우입니다. 끊기면 다시 연결합니다.",
        "- «UDP»: «받을 포트» 로 받고, 응답은 보낸 쪽으로 돌려줍니다. «보낼 곳» 은 장비가 먼저 보낼 때 아직 받은 것이 없으면 쓰입니다. 브로드캐스트 주소(255.255.255.255, x.x.x.255)로 보내려면 시작 전에 «브로드캐스트 허용» 을 켜세요.",
        "- 주소 칸 옆 «▾» 는 최근 연결 — 시작에 성공한 주소·포트가 최근 것부터 8개까지 남습니다(TCP 클라이언트 «연결할 곳», TCP 서버 «주소», UDP «보낼 곳» 이 따로). 누르면 주소·포트 칸을 채우고, ✕ 로 하나씩 지웁니다. 연결 방식을 바꾸면 그 방식에서 마지막으로 쓴 주소·포트로 채워집니다.",
        "- 실행 중에는 연결 방식·포트·주소·속도를 바꿀 수 없습니다(🔒). 멈추고 바꾸세요. 프레임 구분·응답 규칙·비교 옵션은 실행 중에도 바로 적용됩니다.",
        "- 재연결 대기·멈춤 상태줄에는 마지막 실패 이유가 함께 나옵니다.",
        "- 명령줄 «--auto»(또는 설정 «켤 때 마지막 연결 다시 열기»): 켤 때 마지막으로 시작에 성공한 설정으로 바로 시작합니다. 그 시리얼 포트가 없으면 조용히 그만둡니다. 자동으로 시작하면 통신 기록에 사건 줄이 남고, 응답 규칙이 켜져 있으면 알림도 나옵니다.",
        "- 다른 창에서 일하는 동안 연결이 끊기거나 재연결 대기로 바뀌면 작업 표시줄 단추가 깜빡입니다(«멈춤» 을 누른 것은 빼고). 설정(⚙)에서 끌 수 있습니다.",
        "- 시리얼인데 포트가 없으면 «시작» 이 잠깁니다.",
      ],
    },
    {
      title: "프레임 구분",
      body: [
        "규칙은 «한 덩어리(프레임)» 단위로 비교합니다. 그래서 받은 바이트를 어디서 끊을지 정합니다(UDP 는 데이터그램 하나가 한 덩어리라 필요 없음).",
        "- «끊김 시간(조용한 간격)»: «끊김 시간(ms)» 동안 아무것도 안 오면 끊습니다. Modbus RTU 같은 바이너리 프로토콜에 맞습니다.",
        "- «끝 문자»: «끝 문자(HEX)»(예: 0A, 0D 0A)가 오면 끊습니다. 끝 문자가 안 와도 «끊김 시간(ms)» 이 지나면 내보냅니다. ASCII 명령에 맞습니다. 처음 고르면 끝 문자 0A(LF)·끊김 시간 50ms 로 시작합니다.",
        "- «끝 문자(HEX)» 는 «0D 0A», «0D0A», «CR LF»·«CRLF» 처럼 써도 됩니다. 칸 아래에 «해석: 0D 0A (2바이트)» 처럼 읽은 결과가, 읽을 수 없으면 빨갛게 이유가 나옵니다. 비어 있으면 끊김 시간으로만 끊는다고 알려 줍니다.",
        "- 실행 중에 바꿔도 바로 적용됩니다.",
      ],
    },
    {
      title: "응답 규칙",
      body: [
        "카드 하나가 규칙 하나입니다. 위에서부터 차례로 비교해 처음 맞는 규칙 하나만 응답합니다. 맞는 규칙이 없으면 아무 응답도 하지 않습니다.",
        "- 체크박스: 규칙 켜기·끄기. 끈 규칙은 건너뜁니다.",
        "- 이름: 기록에 «AUTO 이름» 으로 남고 응답 횟수도 이름으로 셉니다. 이름이 겹치면 경고가 나옵니다.",
        "- «받으면»: 패턴 방식(HEX/ASCII), «정확히»(프레임 전체가 같아야 함) 또는 «포함»(프레임 안 어딘가에 있으면 됨), 패턴. ASCII 면 «와일드카드» 체크가 붙습니다(아래 «와일드카드»).",
        "- 새 규칙(«+ 규칙 추가»)은 바로 위 규칙의 방식 — 받기 HEX/ASCII·정확히/포함, 응답 HEX/ASCII·체크섬·줄 끝 — 을 물려받습니다. 와일드카드는 늘 꺼진 채 시작합니다.",
        "- 통신 기록의 RX 줄(또는 «NO MATCH» 줄)을 오른쪽 버튼으로 누르고 «이 요청으로 규칙 만들기» 를 고르면 그 바이트로 규칙을 만들고 응답 칸으로 갑니다. 글자면 ASCII·글자 그대로(끝 CR·LF 는 빼고 응답 줄 끝으로), Modbus RTU 면 CRC 자리를 «**» 로 하고 응답 체크섬을 CRC16 Modbus 로, Modbus TCP 면 트랜잭션 ID 를 «?? ??» 로 둡니다. «**» 같은 무엇이든 받는 규칙이 있으면 그 위에 넣습니다.",
        "- «끝 문자 떼고 비교»(기본 켬): 받은 프레임 끝의 끝 문자와 뒤쪽 CR·LF 를 떼고 비교합니다. 그래서 «정확히» 패턴에 줄 끝을 적지 않아도 됩니다. 끄면 받은 바이트 그대로 비교합니다.",
        "- «안 맞은 요청 기록(NO MATCH)»(기본 켬): 어떤 규칙에도 맞지 않은 요청을 통신 기록에 «NO MATCH» 사건(EV)으로 남깁니다.",
        "- «응답»: 응답 방식(HEX/ASCII), 응답 내용, «체크섬», «줄 끝 붙이기», «지연»(ms, 0~600000).",
        "- 응답은 «내용 + 체크섬 + 줄 끝» 순으로 만듭니다. 체크섬은 응답 내용 전체로 계산합니다. 내용에 {req 0..1}·{counter}·{rand 0..9}·{time}·{crc …} 같은 자리를 쓰면 받을 때마다 채웁니다(아래 «응답 템플릿»).",
        "- «▸ 자세히»: 지연 범위(흔들림)·N번째마다·확률로 무응답, 응답 여러 개 돌리기, 예시 요청으로 응답 미리보기(아래 «장애 흉내·응답 돌리기»).",
        "- ↑ «위로(먼저 검사)», ↓ «아래로», ✕ «삭제»(확인 창 대신 5초 동안 알림의 «되돌리기» 로 같은 자리에 되살림). 응답의 HEX↔ASCII 를 바꾸면 같은 바이트의 새 표기로 바뀝니다.",
        "- 규칙을 고치면 실행 중에도 바로 적용됩니다. 패턴·응답이 틀린 규칙은 카드가 빨갛게 되고 아래에 이유가 나오며, 그 규칙만 빠지고 나머지 규칙은 동작합니다(«틀린 규칙 N개는 빼고 동작합니다»).",
        "- 규칙은 프로그램을 껐다 켜도 남아 있습니다.",
      ],
    },
    {
      title: "와일드카드",
      body: [
        "- HEX: «??» = 아무 바이트 1개, «**» = 아무 바이트 0개 이상.",
        "- ASCII 는 규칙마다 «와일드카드» 체크로 정합니다. 끄면(새 규칙의 기본) ?·* 도 글자 그대로 비교합니다 — SCPI «*IDN?» 를 그대로 쓰면 «*IDN?» 에만 맞고 «XIDN!» 에는 맞지 않습니다.",
        "- 켜면 «?» = 아무 글자 1개, «*» = 0개 이상입니다. 켠 채 ?·* 글자 자체를 맞추려면 «\\x3F»(?)·«\\x2A»(*) 로 쓰세요. 켠 규칙의 패턴에 ?·* 가 있으면 노란 알림줄과 [와일드카드 끄기] 가 나옵니다.",
        "- 이 체크가 생기기 전(10/18 이전)에 저장한 규칙은 켜진 채로 읽어 동작이 바뀌지 않습니다. «\\r»·«\\n»·«\\xNN» 이스케이프는 어느 쪽이든 씁니다.",
        "- 예: «01 03 ?? ?? 00 01 **» = 주소 1·기능 03·아무 시작 주소·개수 1, 뒤의 CRC 는 무엇이든.",
        "- 예: ASCII «포함» + «STATUS?» — 와일드카드를 끄면 «STATUS?» 글자가 있을 때만, 켜면 «STATUS» 다음에 아무 글자 1개가 있으면(물음표가 아니어도) 맞습니다.",
        "- «**» 하나만 있는 규칙은 무엇이든 받습니다. 맨 아래에 두면 «그 밖의 모든 요청» 에 대한 기본 응답(예: NAK)이 됩니다.",
      ],
    },
    {
      title: "규칙 경고",
      body: [
        "- «무엇이든 받아서 아래 규칙은 응답하지 않습니다»: «**» 같은 규칙이 다른 규칙보다 위에 있습니다. ↓ 로 맨 아래로 옮기세요.",
        "- «위 규칙과 패턴이 같아 응답하지 않는 규칙»: 같은 패턴이 위에 있어 아래 규칙은 영영 쓰이지 않습니다.",
        "- «이름이 같은 규칙»: 응답 횟수가 합쳐져 구분이 안 됩니다. 이름을 바꾸세요.",
      ],
    },
    {
      title: "응답 횟수와 규칙 묶음",
      body: [
        "- 카드마다 «응답한 횟수» 가 나옵니다. «횟수 초기화» 로 0 으로 되돌립니다.",
        "- «규칙 묶음 저장»: 규칙 전체와 연결 방식·포트·주소(브로드캐스트 포함)·프레임 구분·비교 옵션·«장비가 먼저 보내기» 내용·반복 간격을 한 JSON 파일(프로필)로 저장합니다. 장비·시험마다 만들어 두세요.",
        "- «규칙 묶음 불러오기»: 지금 규칙·설정을 바꿀지 먼저 묻고, 파일 내용으로 바꿉니다. 실행 중이면 연결 설정은 빼고 불러옵니다. 예전 파일(규칙·프레임 구분만)도 읽으며, 파일에 없는 설정은 그대로 둡니다. 형식이 틀리면 «규칙 묶음 파일 형식이 틀립니다» 가 나오고 그대로 둡니다.",
      ],
    },
    {
      title: "장비가 먼저 보내기",
      body: [
        "장비가 요청 없이 보내는 상태 보고·하트비트·알람을 흉내 냅니다. 응답 규칙과는 따로이며, 규칙 칸으로 오해하지 않게 평소에는 접혀 있습니다(접힌 제목에 지금 내용, 반복 중이면 «1000 ms 마다 보내는 중»). 반복을 켜면 저절로 펼쳐지고, 열고 닫은 상태는 기억합니다.",
        "- HEX/ASCII, 내용, «체크섬», «줄 끝 붙이기» 를 정하고 «보내기» 를 누릅니다. 아래에 실제로 나갈 바이트가 보입니다.",
        "- 내용에 응답 템플릿을 쓸 수 있습니다(10/19): {counter dec} 는 보낸 횟수(시작할 때마다 0부터), {rand 0..100 dec} 는 무작위 값, {time}·{unix ms} 는 시각, {crc …} 는 체크섬 — 보낼 때마다 새로 채웁니다(«응답 템플릿» 절, {req} 는 요청이 없어 못 씀). 아래 «보낼 바이트» 는 예시 값입니다. 예) «{rand 20..25 dec}.{rand 0..9 dec},{counter dec}» + 줄 끝 CR LF + 반복 100ms → PortDock Plot 으로 그래프.",
        "- «반복(ms)» 을 체크하면 정한 간격(10ms 이상)으로 계속 보냅니다. 상대가 아직 없거나 끊겼으면 그 차례만 건너뛰고 «상대를 기다리는 중» 을 보이며, 상대가 붙으면 이어서 보냅니다. 체크를 끄거나 «멈춤» 을 눌러야 꺼집니다.",
        "- 보내는 곳: 시리얼은 그 포트, TCP 서버는 연결한 모든 상대, TCP 클라이언트는 연결한 상대, UDP 는 마지막으로 보내온 쪽(없으면 «보낼 곳»).",
        "- 시작 전에는 «보내기»·«반복» 이 잠깁니다.",
        ...notationLines("ko"),
      ],
    },
    {
      title: "통신 기록",
      body: [
        "- RX ◀ 받은 것, TX ▶ 보낸 것(규칙 응답·먼저 보내기), EV 사건(시작·연결·끊김·«AUTO 규칙이름» 등).",
        "- RX 줄·«NO MATCH» 줄의 오른쪽 버튼 메뉴 «이 요청으로 규칙 만들기» 로 받은 요청을 옮겨 적지 않고 규칙을 만듭니다(위 «응답 규칙»).",
        "- HEX/ASCII 버튼으로 보기 방식을 바꿉니다. 맨 아래에 있으면 새 줄을 따라 내려가고, 위로 올려 보면 멈춥니다.",
        "- «파일로 계속 저장»: 시작한 뒤에 파일을 고르면 그때부터 모든 줄을 계속 씁니다. «저장 멈춤» 으로 끝냅니다.",
        "- 마지막 500줄만이 아니라 설정 «화면에 남길 줄 수» 만큼 전부 굴려 볼 수 있습니다.",
        "- 기록 위 찾기 줄(Ctrl+F)에 HEX·글자를 넣으면 맞는 줄을 칠하고 다음·이전으로 옮겨 갑니다. RX·TX 만 보기·«맞는 줄만» 으로 거를 수 있습니다.",
        "- «화면 내용 저장»(Ctrl+S): 지금 보이는 기록을 텍스트 파일로 저장합니다. 지금 보기(HEX·ASCII)대로 쓰고, 거르기가 켜져 있으면 보이는 줄만 씁니다(첫 줄에 그렇게 적힘).",
        ...logHandlingLines("ko", { sendAgain: true, find: true }),
      ],
    },
    {
      title: "설정(⚙)",
      body: [
        "- «언어»·«테마»·«글자 크기»·«로그 시각 표시»·«화면에 남길 줄 수».",
        "- «연결하면 자동으로 파일 로그 시작»: «자동 로그 폴더» 를 고르면 시작할 때마다 자동으로 저장합니다.",
        "- «연결·기록 중에 창을 닫으려 하면 묻기».",
        "- «설정 내보내기»·«설정 가져오기»: 화면 설정을 JSON 파일로 옮깁니다. 규칙은 «규칙 묶음 저장» 으로 따로 옮깁니다.",
        ...settingsLines("ko", { run: true }),
      ],
    },
    {
      title: "단축키·팁",
      body: [
        ...shortcutLines("ko", { repeat: true, startStop: true, saveView: true, saveViewNew: true, find: true }),
        "- 칸에 마우스를 올리면 말풍선으로 설명이 나옵니다.",
        "- 같은 PC 에서 시험하려면: TCP 는 서버 127.0.0.1 로, 시리얼은 가상 COM 쌍(com0com 등)으로 상위 프로그램과 연결합니다.",
        "- 응답 지연으로 상위 프로그램의 타임아웃 처리를, 일부러 틀린 응답으로 오류 처리를 시험할 수 있습니다.",
      ],
    },
    {
      title: "문제 해결",
      body: [
        "- 응답이 안 나감: 규칙이 켜져 있는지, 패턴 방식(HEX/ASCII)·«정확히/포함» 이 맞는지, 위에 «**» 규칙이 있는지 보세요. 통신 기록의 RX 줄과 패턴을 비교하세요. «안 맞은 요청 기록» 을 켜 두면 안 맞은 요청마다 «NO MATCH» 줄이 남고, 그 줄의 오른쪽 버튼으로 바로 규칙을 만들 수 있습니다. 엉뚱한 요청에 답하면 ASCII 규칙의 «와일드카드» 가 켜져 있지 않은지 보세요.",
        "- 요청이 둘로 쪼개지거나 합쳐짐: «프레임 구분» 과 «끊김 시간(ms)» 을 조정하세요.",
        "- 시리얼 포트가 안 열림: 다른 프로그램이 쓰고 있는지 확인하세요.",
        "- TCP 서버에 연결이 안 됨: 윈도우 방화벽 허용, 포트, 상위 프로그램이 연결하는 IP 를 확인하세요.",
        "- 프로그램이 안 열림: Microsoft Edge WebView2 가 필요합니다(윈도우 11 은 기본 포함).",
      ],
    },
  ],
  en: [
    {
      title: "About this program",
      body: [
        "PortDock Simulator turns the PC into a «fake device» so you can test host software (masters, HMIs, test programs) without the real hardware.",
        "When received data matches a rule it sends the configured reply, and it can also send status reports or heartbeats on its own, like a device.",
        "It works over Serial (COM), TCP server, TCP client and UDP.",
      ],
    },
    {
      title: "Getting started",
      id: "start",
      body: [
        "- 1. Choose a «Transport» on the left and enter the port or address.",
        "- 2. Add rules with «+ Add rule»: a «When» pattern, a «Reply», and optionally checksum, line ending and delay. With no rules yet, the [Modbus RTU 03 reply] [SCPI *IDN? reply] [Echo] example buttons give you a start.",
        "- 3. Press «Start». When the host sends a request the matching rule replies, and both show in «Traffic».",
        "- 4. Check how often each rule replied in «Times replied».",
      ],
    },
    {
      title: "Layout",
      body: [
        "- Left: «Transport», port/address, «Framing», «Start»/«Stop», status, «Log to file».",
        "- Top: «Reply rules» cards, «Ignore line ending when matching» / «Log unmatched requests (NO MATCH)», «Reset counts», «Save rule set» / «Load rule set».",
        "- Below: the «Device-initiated message» section (collapsed; opens when repeat is on).",
        "- Bottom: «Traffic» (time, RX ◀ / TX ▶ / EV, peer address, data), HEX/ASCII toggle, find bar, «Save view» and «Clear».",
        ...windowLines("en"),
      ],
    },
    {
      title: "Transport",
      body: [
        "- «Serial (COM)»: choose «Port», «Baud rate» and «Parity». Opened as 8 data bits, 1 stop bit, no flow control. Unplugging and replugging USB reopens it automatically.",
        "- For a port that is not listed (ports Windows lists as modems, some virtual ports), choose «Type a port…» at the bottom of the «Port» list and enter its name (e.g. COM12). The list also includes ports registered in Windows SERIALCOMM.",
        "- «TCP server (peer connects)»: listens on «Host» (usually 0.0.0.0) and «Port» for the host software to connect. Each connection gets its own replies.",
        "- «TCP client (connect to peer)»: connects to the «Connect to» host and port when the host software is the server. It reconnects when disconnected.",
        "- «UDP»: receives on «Listen port» and replies to the sender. «Send to» is used for device-initiated messages before anything has been received. To send to a broadcast address (255.255.255.255, x.x.x.255), check «Allow broadcast» before starting.",
        "- The «▾» next to the host box lists recent connections — up to 8 host:port pairs that started successfully, newest first (kept separately for the TCP client «Connect to», the TCP server «Host» and the UDP «Send to»). Click one to fill the host and port; ✕ removes it. Switching transport fills in the last address used with that transport.",
        "- Transport, port, addresses and baud are locked (🔒) while running; stop to change them. Framing, reply rules and match options apply immediately.",
        "- When waiting to reconnect or stopped, the status line also shows the last failure reason.",
        "- The «--auto» command-line option (or the «Reopen the last connection at startup» setting) starts right away with the settings of the last successful start. If that serial port is missing it stops quietly. An automatic start leaves an event line in Traffic, and a notice if reply rules are on.",
        "- If the connection drops or starts waiting to reconnect while you work in another window, the taskbar button flashes (not when you press «Stop»). You can turn this off in Settings (⚙).",
        "- With Serial and no port, «Start» is disabled.",
      ],
    },
    {
      title: "Framing",
      body: [
        "Rules are compared against whole frames, so you choose where incoming bytes are split (UDP needs none: one datagram is one frame).",
        "- «Idle gap»: split when nothing arrives for «Idle gap (ms)». Suits binary protocols such as Modbus RTU.",
        "- «Terminator»: split when «Terminator (HEX)» (e.g. 0A, 0D 0A) arrives; pending bytes are also flushed after the idle gap. Suits ASCII commands. When first chosen it starts with terminator 0A (LF) and a 50 ms idle gap.",
        "- «Terminator (HEX)» also accepts «0D0A» or names like «CR LF» / «CRLF». Below the field it shows how it was read, e.g. «Read as: 0D 0A (2 bytes)», or the reason in red. When empty, it warns that only the idle gap splits frames.",
        "- Changes apply immediately while running.",
      ],
    },
    {
      title: "Reply rules",
      body: [
        "Each card is a rule. Rules are checked top-down and only the first match replies. If none matches, nothing is sent.",
        "- Checkbox: enable or disable the rule. Disabled rules are skipped.",
        "- Name: logged as «AUTO name», and reply counts are kept by name. Duplicate names show a warning.",
        "- «When»: pattern mode (HEX/ASCII), «exact» (whole frame must match) or «contains» (anywhere in the frame), and the pattern. ASCII rules get a «Wildcards» checkbox (see «Wildcards»).",
        "- A new rule («+ Add rule») takes the format of the rule above it — match HEX/ASCII and exact/contains, reply HEX/ASCII, checksum and line ending. Wildcards always start off.",
        "- Right-click an RX line (or a «NO MATCH» line) in Traffic and choose «Make a rule from this request» to create a rule from those bytes and jump to its reply. Text becomes an ASCII literal pattern (trailing CR/LF moves to the reply line ending); Modbus RTU gets «**» for the CRC and a CRC16 Modbus reply checksum; Modbus TCP gets «?? ??» for the transaction ID. If a catch-all rule such as «**» exists, the new rule goes above it.",
        "- «Ignore line ending when matching» (on by default): the terminator and trailing CR/LF are removed from the received frame before comparing, so «exact» patterns need no line ending. When off, the raw bytes are compared.",
        "- «Log unmatched requests (NO MATCH)» (on by default): a request no rule matched is logged as a «NO MATCH» event (EV).",
        "- «Reply»: reply mode (HEX/ASCII), content, «Checksum», «Line ending», «Delay» (ms, 0–600000).",
        "- A reply is built as «content + checksum + line ending»; the checksum covers the whole content. Fields such as {req 0..1}, {counter}, {rand 0..9}, {time}, {crc …} in the content are filled for every request (see «Reply templates»).",
        "- «▸ More»: delay range (jitter), drop every Nth / by chance, rotating replies, and a reply preview from a sample request (see «Fault injection and rotating replies»).",
        "- ↑ «Move up (checked first)», ↓ «Move down», ✕ «Delete» (no dialog — «Undo» in the notice restores it in place for 5 seconds). Switching a reply between HEX and ASCII converts it to the same bytes.",
        "- Edits apply immediately, even while running. A rule with an invalid pattern or reply turns red with the reason below it; only that rule is skipped and the others stay active («N invalid rule(s) skipped»).",
        "- Rules are kept after restarting.",
      ],
    },
    {
      title: "Wildcards",
      body: [
        "- HEX: «??» = any one byte, «**» = zero or more bytes.",
        "- ASCII: set per rule with the «Wildcards» checkbox. Off (the default for new rules) compares ? and * literally — SCPI «*IDN?» matches only «*IDN?», not «XIDN!».",
        "- On: «?» = any one character, «*» = zero or more. To match a literal ? or * while on, write «\\x3F» (?) or «\\x2A» (*). A rule with wildcards on and ? or * in its pattern shows a yellow notice with [Turn wildcards off].",
        "- Rules saved before this checkbox existed (before 10/18) load with wildcards on, so they behave as before. «\\r», «\\n» and «\\xNN» escapes work either way.",
        "- Example: «01 03 ?? ?? 00 01 **» = Slave ID 1, function 03, any start address, count 1, any CRC.",
        "- Example: ASCII «contains» + «STATUS?» — with wildcards off it needs the text «STATUS?»; with them on, «STATUS» followed by any one character (not necessarily a question mark).",
        "- A rule of just «**» matches everything. At the bottom it becomes the default reply (e.g. NAK) for everything else.",
      ],
    },
    {
      title: "Rule warnings",
      body: [
        "- «matches everything, so the rules below it never reply»: a rule like «**» sits above others. Move it to the bottom with ↓.",
        "- «Same pattern as a rule above»: the lower rule can never be used.",
        "- «Rules share a name»: their reply counts are merged. Rename one.",
      ],
    },
    {
      title: "Counts and rule sets",
      body: [
        "- Each card shows «Times replied». «Reset counts» sets them to 0.",
        "- «Save rule set»: saves all rules plus transport, ports, addresses (incl. broadcast), framing, match options, the device-initiated message and its repeat interval as one JSON file (a profile). Keep one per device or test.",
        "- «Load rule set»: asks first, then replaces the rules and settings with the file. While running, connection settings are not loaded. Older files (rules and framing only) still load; settings missing from the file are left as they are. An invalid file shows «Invalid rule set file.» and nothing changes.",
      ],
    },
    {
      title: "Device-initiated message",
      body: [
        "Imitates status reports, heartbeats or alarms that a device sends without a request. It is separate from the reply rules and stays collapsed so it is not mistaken for one (the collapsed title shows the content, or «sending every 1000 ms» while repeating). Turning on repeat opens it; its open state is remembered.",
        "- Choose HEX/ASCII, content, «Checksum» and «Line ending», then press «Send». The exact bytes are shown below.",
        "- The content may use reply templates (10/19): {counter dec} is the send count (from 0 at each start), {rand 0..100 dec} a random value, {time} / {unix ms} the time, {crc …} a checksum — filled anew on every send (see «Reply templates»; {req} is unavailable as there is no request). «Will send» below shows sample values. Example: «{rand 20..25 dec}.{rand 0..9 dec},{counter dec}» + line ending CR LF + repeat 100 ms → graph it in PortDock Plot.",
        "- Check «Repeat (ms)» to send every interval (10 ms or more). While no peer is connected, turns are skipped with «Waiting for a peer» and sending resumes when one connects. Only unchecking it or «Stop» turns it off.",
        "- Destination: the serial port; all connected peers (TCP server); the server (TCP client); the last sender, or «Send to» if none (UDP).",
        "- «Send» and «Repeat» are disabled until you start.",
        ...notationLines("en"),
      ],
    },
    {
      title: "Traffic",
      body: [
        "- RX ◀ received, TX ▶ sent (rule replies and device-initiated messages), EV events (start, connect, disconnect, «AUTO rule name», …).",
        "- «Make a rule from this request» in the right-click menu of an RX or «NO MATCH» line creates a rule without retyping the request (see «Reply rules»).",
        "- Toggle HEX/ASCII view. At the bottom the view follows new lines; scroll up to pause it.",
        "- «Log to file»: after starting, pick a file to write every line from then on. «Stop logging» ends it.",
        "- You can scroll through every line kept by the «Lines kept on screen» setting, not just the last 500.",
        "- Type HEX or text in the find bar above the log (Ctrl+F) to highlight matching lines and step to the next or previous one. Filter to RX or TX only, or to matching lines only.",
        "- «Save view» (Ctrl+S) saves the log on screen to a text file, in the current view (HEX / ASCII). With a filter on, only the visible lines are saved (noted in the first line).",
        ...logHandlingLines("en", { sendAgain: true, find: true }),
      ],
    },
    {
      title: "Settings (⚙)",
      body: [
        "- Language, theme, font size, timestamp format, line limit.",
        "- «Start file log automatically»: with an auto-log folder, each start writes a log automatically.",
        "- «Ask before closing while connected or logging».",
        "- «Export settings» / «Import settings» move display settings as JSON. Move rules with «Save rule set».",
        ...settingsLines("en", { run: true }),
      ],
    },
    {
      title: "Shortcuts and tips",
      body: [
        ...shortcutLines("en", { repeat: true, startStop: true, saveView: true, saveViewNew: true, find: true }),
        "- Hover over a field to see a tooltip.",
        "- Testing on one PC: use a TCP server on 127.0.0.1, or a virtual COM pair (e.g. com0com) for serial.",
        "- Use reply delays to test the host's timeouts, and deliberately wrong replies to test its error handling.",
      ],
    },
    {
      title: "Troubleshooting",
      body: [
        "- No reply: check the rule is enabled, the pattern mode (HEX/ASCII) and exact/contains, and that no «**» rule sits above it. Compare the RX line with the pattern. With «Log unmatched requests» on, each unmatched request leaves a «NO MATCH» line, and right-clicking it makes a rule. If a rule answers the wrong requests, check whether «Wildcards» is on for an ASCII rule.",
        "- Requests split or merged: adjust «Framing» and «Idle gap (ms)».",
        "- Serial port does not open: check whether another program is using it.",
        "- Cannot connect to the TCP server: check the Windows Firewall prompt, the port, and the IP the host connects to.",
        "- The program does not open: Microsoft Edge WebView2 is required (included in Windows 11).",
      ],
    },
  ],
};

// 응답 템플릿·장애 흉내(10/18) — «와일드카드» 다음에
for (const lang of ["ko", "en"] as const) {
  const at = help[lang].findIndex((x) => x.title === (lang === "ko" ? "와일드카드" : "Wildcards"));
  help[lang].splice(at < 0 ? help[lang].length - 1 : at + 1, 0, ...simAutoReplySections(lang));
}

// «용어» 절 — 공용 목록(shared/glossary.ts)에서 이 앱 화면에 나오는 것만, 맨 끝에
for (const lang of ["ko", "en"] as const) help[lang].push(termsSection(lang, ["gap", "crlf", "checksum", "datagram", "rxtx", "baud"]));
