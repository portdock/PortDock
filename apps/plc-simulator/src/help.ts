// PLC Simulator 도움말 — 화면 ? 버튼·F1 로 연다. 사이트 도구 쪽(site/src/data/tools.ts)도 이 글을 보인다.
// 근거: crates/core/src/mc.rs(처리기), 공개 매뉴얼(SLMP SH-080956ENG, MC SH-080008, 종료 코드 SH-081257ENG 3.5) — 매뉴얼은 저장소에 넣지 않고 주소만
import type { HelpDoc } from "@shared/HelpDialog";
import { termsSection } from "@shared/glossary";
import { logHandlingLines, settingsLines, shortcutLines, windowLines } from "@shared/helpCommon";

const SLMP = "https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh080956eng/sh080956engl.pdf";
const MC = "https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh080008/sh080008ab.pdf";
const ETH = "https://dl.mitsubishielectric.com/dl/fa/document/manual/plc/sh081257eng/sh081257engaf.pdf";

export const help: HelpDoc = {
  ko: [
    {
      title: "이 프로그램은",
      body: [
        "PortDock PLC Simulator 는 PC 가 PLC 의 이더넷 포트처럼 MC 프로토콜(SLMP) 요청에 답하게 하는 시험 도구입니다. PLC 없이 HMI·데이터 수집 프로그램·상위 프로그램의 통신을 만들고 시험할 때 씁니다.",
        "3E·4E 프레임, 이진·ASCII 코드, TCP 서버·UDP 를 고릅니다. 디바이스(D·W·R·ZR·M·X·Y·B·L 등) 표의 값으로 일괄 읽기·쓰기, 랜덤 읽기·쓰기, 루프백에 답합니다.",
        "미쓰비시 공개 매뉴얼(SLMP/MC) 기준 구현 — 제휴 아님, 실제 PLC 와 동작이 다를 수 있음. 래더 프로그램은 돌리지 않습니다(값은 표에 넣은 그대로, 또는 «값 자동 변화» 로만 바뀝니다).",
        "응답 지연·무응답·종료 코드 오류를 일부러 만들어 클라이언트의 오류 처리도 시험할 수 있습니다.",
      ],
    },
    {
      title: "처음 쓰는 순서",
      id: "start",
      body: [
        "- 1. 왼쪽 «연결 방식»(TCP 서버·UDP), «프레임»(3E·4E), «데이터 코드»(이진·ASCII), «포트» 를 클라이언트 설정과 똑같이 맞춥니다. 포트 기본값 5000 은 이 프로그램의 기본값입니다 — 매뉴얼은 포트 번호를 정해 두지 않고 PLC 쪽 설정에서 정합니다.",
        "- 2. «묶을 주소» 는 기본 127.0.0.1 — 이 PC 안의 프로그램만 붙습니다. 다른 PC 의 HMI 를 붙이려면 «다른 PC 에서 접속 허용 (0.0.0.0)» 을 켭니다(방화벽 안내가 나옵니다).",
        "- 3. 가운데 위에서 디바이스(예: D)를 고르고 칸에 값을 넣어 둡니다. 시작 전에 넣어 둬도 됩니다. 32비트·실수·이름은 칸의 ⋯(또는 오른쪽 버튼)으로 «칸 설정» 을 엽니다.",
        "- 4. «시작»(F4)을 누르면 요청이 오는 대로 답합니다. 주고받은 내용과 풀이(«0401 일괄 읽기 (워드) D100 ×3», «종료 0000 완료 · 6바이트»)는 아래 «통신 기록» 에 찍힙니다.",
        "- 처음 켜면 비어 있는 «통신 기록» 자리에 이 순서가 카드로 보입니다. «예제 채우기» 는 D0~D7 에 1~8(D0 «상태»·D1 «설정값»), D8~D9 에 F32 23.5(CDAB, «온도»), M0~M7 에 1·0 을 넣습니다(그 자리에 값이 있으면 먼저 묻습니다). «다시 보지 않기» 로 숨깁니다.",
      ],
    },
    {
      title: "화면 구성",
      body: [
        "- 왼쪽: 연결 방식·프레임·데이터 코드·묶을 주소·포트, «자기 국 요청만 받기», «시작»·«멈춤», 상태와 붙은 클라이언트 목록(TCP 는 ✕ 로 하나씩 끊기). 그 아래 «장애 주입 (시험용)»·«통계» 는 접혀 있고 제목을 누르면 펼칩니다(펼친 상태는 기억).",
        "- 가운데 위: 디바이스 버튼(비트 X·Y·M·L·F·B·SM · 워드 D·W·R·ZR·SD · 타이머·카운터 TS·TC·TN·CS·CC·CN), «채우기»·«저장»·«불러오기». 그 아래 «시작 번호»·«개수»·«크기(점)», 비트 디바이스면 «비트»·«워드(16점)» 보기, 워드면 «표시»(U16·S16·HEX·BIN), 회색 «응답 범위: D0–D12287».",
        "- 가운데: 디바이스 칸(번호 · 이름 · 값 · 형식 · ◷ · ⋯). 클라이언트가 바꾼 칸은 잠깐 강조됩니다.",
        "- 아래: «통신 기록»(RX ◀ 요청, TX ▶ 응답, EV 사건)과 찾기·거르기 줄, «파일로 계속 저장»·«지우기», 맨 아래 한 줄 안내(공개 매뉴얼 기준 구현 — 제휴 아님).",
        "- 표와 통신 기록 사이의 막대를 끌면 통신 기록 높이가 바뀌고 기억됩니다.",
        ...windowLines("ko"),
      ],
    },
    {
      title: "서버 설정",
      body: [
        "- «연결 방식»: TCP 서버 — 클라이언트 여러 개가 동시에 붙어도 각각 답합니다(최대 64). 요청 하나가 TCP 조각 여럿으로 나뉘어 오거나 둘이 붙어 와도 머리의 «요청 데이터 길이» 로 끊어 하나씩 답합니다. UDP — 데이터그램 하나가 요청 하나이고, 보낸 곳으로 답합니다.",
        "- «프레임»: 3E 는 부머리 5000(이진 50 00), 4E 는 5400 + 일련번호 + 0000 — 4E 응답에는 요청의 일련번호를 그대로 넣습니다. 고른 것과 다른 프레임이 오면 답하지 않고 «IGNORED» 줄을 남깁니다.",
        "- «데이터 코드»: 이진은 숫자를 작은 자리 바이트부터, ASCII 는 16진 글자로 큰 자리부터 보냅니다(SLMP 4장). 클라이언트와 같아야 합니다.",
        "- «묶을 주소»: 기본 127.0.0.1(이 PC 안에서만). «다른 PC 에서 접속 허용 (0.0.0.0)» 을 켜면 모든 랜카드에서 받습니다 — 처음 시작할 때 윈도우 방화벽 허용 창이 뜰 수 있습니다(관리자 권한 필요). 공장망에서 실제 PLC 와 같은 IP·포트로 띄우지 마세요. 실제 PLC 대신 답하게 됩니다.",
        "- «포트»: 기본 5000. 0 이면 운영체제가 빈 포트를 고르고 상태 칸에 실제 주소가 나옵니다. 이미 쓰는 포트면 «포트가 이미 사용 중» 으로 시작하지 못합니다. 시작에 성공한 «주소:포트» 는 «▾» 최근 목록에 남습니다.",
        "- «자기 국 요청만 받기»: 켜면 요청 머리의 네트워크 00·국 FF·I/O 03FF·멀티드롭 00(연결된 국 자신)만 처리하고, 다른 국 요청에는 종료 코드 C05F 로 답합니다. 끄면(기본) 어느 국 요청이든 이 표로 답하고, 응답 머리에는 요청의 국 정보를 그대로 돌려줍니다. 시작한 동안에도 바뀝니다.",
        "- 감시 타이머 값은 읽기만 하고 쓰지 않습니다(이 흉내는 바로 답합니다).",
      ],
    },
    {
      title: "구현한 명령",
      body: [
        "- 0401 일괄 읽기 · 1401 일괄 쓰기: 서브 명령 0001(비트 1점 단위)·0000(워드 단위 — 비트 디바이스는 16점이 1워드), 0003·0002 는 같은 일을 디바이스 번호 4바이트·코드 2바이트(ASCII 는 코드 4글자·번호 8글자)로. 점 수: 워드 1~960, 비트 이진 1~7168·ASCII 1~3584.",
        "- 0403 랜덤 읽기: 서브 0000·0002. 워드 점과 더블워드 점(번호가 작은 워드가 아래 자리)을 섞어 읽습니다. 점 수 합 1~192(0002 는 1~96).",
        "- 1402 랜덤 쓰기: 비트(서브 0001 은 1~188점, 0003 은 1~94점 — ON/OFF 는 01·00, 0003 이진은 01 00·00 00), 워드·더블워드(서브 0000 은 워드×12 + 더블워드×14 ≤ 1920, 0002 는 ≤ 960).",
        "- 0619 루프백: 받은 데이터(1~960바이트)를 그대로 돌려줍니다.",
        "- 쓰기는 범위를 다 본 뒤에 반영합니다 — 범위를 넘으면 하나도 쓰지 않고 C056.",
        "- 그 밖의 명령(모니터 0801·0802, 블록 0406·1406, 원격 RUN/STOP, 형명 읽기, 파일 등)과 확장 지정 서브 명령(0080 등)은 아직 없습니다 — C059 로 답합니다.",
        `- 메시지 형식은 SLMP Reference Manual SH(NA)-080956ENG 4장·5.2·5.9(${SLMP})와 MELSEC Communication Protocol Reference Manual SH-080008 5장(${MC})을 따랐습니다.`,
      ],
    },
    {
      title: "디바이스",
      body: [
        "- 비트: X 입력(9C) · Y 출력(9D) · M 내부 릴레이(90) · L 래치 릴레이(92) · F 어넌시에이터(93) · B 링크 릴레이(A0) · SM 특수 릴레이(91) · TS·TC 타이머 접점·코일(C1·C0) · CS·CC 카운터 접점·코일(C4·C3). 괄호는 이진 디바이스 코드입니다.",
        "- 워드: D 데이터 레지스터(A8) · W 링크 레지스터(B4) · R 파일 레지스터(AF) · ZR 파일 레지스터 연번(B0) · SD 특수 레지스터(A9) · TN 타이머 현재값(C2) · CN 카운터 현재값(C5).",
        "- X·Y·B·W·ZR 는 번호를 16진으로 씁니다(X1F, W100 = 256번째). 화면의 «시작 번호» 칸도 16진으로 읽습니다(X1F·1F·0x1F 모두 됨). 나머지는 10진입니다.",
        "- «크기(점)»: 디바이스마다 1~65536. 기본값(D 12288, M 8192, X·Y 8192(0~1FFF), R 32768, ZR 65536 …)은 시험용 작은 값이고 어느 기종의 상한과도 같다고 내세우지 않습니다. 이 크기를 넘는 번호를 요청하면 C056 으로 답합니다.",
        "- 비트 디바이스는 «비트» 보기(체크칸)와 «워드(16점)» 보기(16점을 한 워드로 — 번호가 작은 점이 비트 0, 클라이언트가 워드 단위로 읽는 값과 같음)를 고릅니다.",
        "- 32비트 값: 번호가 작은 워드가 아래 자리입니다(예: D200 = 아래 16비트, D201 = 위 16비트). «칸 설정» 의 순서 기본값이 그래서 CDAB 입니다. 실수(F32)도 같습니다.",
        "- 롱 타이머·롱 카운터·인덱스 레지스터·링크 다이렉트 같은 다른 디바이스는 없습니다 — 그 코드는 C05B 로 답합니다.",
      ],
    },
    {
      title: "종료 코드",
      body: [
        "- 응답의 «종료 코드» 가 0000 이면 완료, 아니면 오류이고 그 뒤에 오류 정보(요청의 네트워크·국·I/O·멀티드롭과 명령·서브 명령)가 붙습니다(SLMP 4.2).",
        "- 이 흉내가 쓰는 값 — 뜻은 MELSEC iQ-R Ethernet User's Manual (Application) SH-081257ENG 3.5 «List of Error Codes» 의 설명을 줄인 것이고, 어느 조건에 어느 코드를 쓸지는 이 프로그램이 고른 것입니다(실제 PLC·모듈과 다를 수 있음):",
        "- C050 ASCII 로 바꿀 수 없는 글자(16진이 아닌 글자, 10진 디바이스 번호에 A~F) · C051 워드 점 수 범위 밖 · C052 비트 점 수 범위 밖 · C053 랜덤 비트 점 수 범위 밖 · C054 랜덤 워드·더블워드 점 수 범위 밖 · C056 디바이스 크기를 넘는 번호",
        "- C057 머리의 요청 데이터 길이가 실제와 다름 · C059 모르는 명령·서브 명령 · C05B 모르는 디바이스 코드, 워드 디바이스를 비트 단위로 · C05C 루프백 데이터 수 범위 밖 · C05F 다른 국 요청(«자기 국 요청만 받기» 켬) · C060 비트 값이 0·1 이 아님 · C061 명령 데이터가 점 수보다 짧거나 김",
        `- 출처: ${ETH} (3.5). 이 매뉴얼들은 저장소에 넣지 않았습니다.`,
      ],
    },
    {
      title: "통신 기록",
      body: [
        "- RX ◀ 는 받은 요청, TX ▶ 는 보낸 응답, EV 는 사건(듣기 시작·클라이언트 접속·끊김·IGNORED·END·DELAY)입니다. 줄마다 클라이언트 주소가 붙습니다.",
        "- «풀이 보기» 를 켜면 요청 줄에 «명령 이름 · 첫 디바이스 · 점 수»(랜덤은 «W 워드 수 D 더블워드 수»), 다른 국이면 «NW·ST·IO·MD», 4E 면 «#일련번호», 응답 줄에 «종료 코드 · 뜻 · 데이터 길이» 가 붙습니다. 오류 응답 줄은 빨갛습니다.",
        "- 오류로 답한 요청은 EV 줄 «END C056 주소 범위 밖 — 0401» 처럼 남고 통계의 «종료 코드별» 에 셉니다.",
        ...logHandlingLines("ko", { find: true, checkbox: true }),
      ],
    },
    {
      title: "장애 주입 (시험용)",
      body: [
        "- «응답 지연(ms)»: 응답을 이만큼 늦게 보냅니다. TCP 는 연결마다 따로 기다리므로 지연 중에도 다른 연결의 요청에 답합니다.",
        "- «응답 안 함»: 요청은 평소대로 처리하고(쓰기는 반영) 응답만 보내지 않습니다 — 클라이언트의 시간 초과·재시도 시험.",
        "- «종료 코드로 답함»: 고른 종료 코드(목록 또는 «직접 입력…» 16진)로 답합니다. 이때 쓰기는 반영하지 않습니다.",
        "- «대상 고르기»: «지연 최대»(지연을 응답 지연 ~ 최대 사이에서 요청마다 아무렇게나 — 고른 값은 DELAY 줄), «명령»(0401, 1401 …), «디바이스»(D, M …), «N번째마다», «확률(%)». 비워 두면 모든 요청에 겁니다.",
        "- 장애 주입은 켤 때마다 꺼진 채로 시작합니다. 하나라도 켜지면 제목이 «⚠ 장애 주입 켜짐» 이 되고 아래에 경고 줄이 남습니다.",
      ],
    },
    {
      title: "칸 설정·값 자동 변화",
      body: [
        "- 칸의 ⋯ 또는 오른쪽 버튼: 이름, 형식(U16·S16·U32·S32·F32·F64·문자열), 워드·바이트 순서, 값 자동 변화(증가·감소·랜덤·사인·램프·토글)를 정합니다. 비트 디바이스는 이름과 토글·랜덤만.",
        "- 자동 변화는 백엔드가 돌리므로 창을 내려 두어도 바뀝니다. «클라이언트가 읽을 때마다 바꾸기» 를 켜면 시간이 아니라 그 칸을 읽는 요청(0401·0403)마다 바뀝니다.",
        "- 클라이언트가 쓴 값은 다음 변화 때까지 남고, 증가·감소는 그 값부터 이어 갑니다.",
        "- 값 칸: Enter·↓ 다음 칸, ↑·Shift+Enter 앞 칸, Esc 고치기 취소. 엑셀 등에서 여러 값을 붙여 넣으면 이어진 칸에 한꺼번에 넣습니다.",
      ],
    },
    {
      title: "저장·불러오기",
      body: [
        "- «저장»: 모든 디바이스의 크기(바꾼 것)·0 이 아닌 값·칸 설정·자동 변화를 JSON 파일 하나로 저장합니다(시험 준비 상태를 다른 PC·다음 시험으로 옮기기).",
        "- «불러오기»: 그 파일을 읽어 크기·값·칸 설정을 바꿉니다(파일에 없는 값은 0). 다른 프로그램의 파일은 거절하고, 틀린 칸은 건너뛰고 몇 개인지 알려 줍니다. 시작한 채 불러오면 먼저 묻습니다.",
        "- 따로 저장하지 않아도 값·칸 설정·크기는 다음에 켤 때 그대로 돌아옵니다(장애 주입은 빼고).",
      ],
    },
    {
      title: "설정 (⚙)",
      body: [
        "- «언어»·«테마»(Windows 따라가기·밝게·어둡게)·«글자 크기»·«로그 시각» 형식·«화면에 남길 줄 수»·«새 줄 자동 스크롤».",
        "- «연결하면 자동으로 파일 로그 시작»: «자동 로그 폴더» 를 고르면 «시작» 할 때마다 «portdock-plc-simulator-날짜-시각.log» 로 남깁니다.",
        "- «연결·기록 중에 창을 닫으려 하면 묻기»(시작한 동안도), «설정 내보내기·가져오기», «기본값으로».",
        ...settingsLines("ko", { run: true }),
        "- 명령줄 «--auto»: 마지막으로 시작에 성공한 설정으로 바로 시작합니다(예: «PortDock PLC-Simulator.exe --auto»). 다른 인자는 «무시한 명령줄 인자» 로 알립니다.",
      ],
    },
    {
      title: "단축키·팁",
      body: [...shortcutLines("ko", { find: true, saveView: true, startStop: true }), "- 값은 시작 전에도 넣을 수 있고, 시작한 동안 바꾸면 다음 요청부터 그 값으로 답합니다."],
    },
    {
      title: "문제 해결",
      body: [
        "- 클라이언트가 붙지 않음: «연결된 클라이언트 0» 이면 주소·포트를 확인합니다. 다른 PC 에서 붙으면 «다른 PC 에서 접속 허용» 을 켜고, 윈도우 방화벽에서 이 프로그램을 허용합니다. 127.0.0.1 이면 이 PC 안에서만 붙습니다.",
        "- RX 줄은 오는데 응답이 없음: EV 줄 «IGNORED» 면 프레임(3E/4E)·데이터 코드(이진/ASCII)가 클라이언트와 다릅니다. 장애 주입 «응답 안 함» 도 확인합니다.",
        "- 클라이언트가 오류를 받음: 통신 기록의 «종료» 코드를 보고 위 «종료 코드» 절에서 찾습니다. C056 이면 «크기(점)» 를 늘리고, C059 면 아직 없는 명령입니다.",
        "- 32비트·실수 값이 이상함: «칸 설정» 의 형식과 순서(CDAB 가 기본)를 클라이언트와 맞춥니다.",
        "- «포트가 이미 사용 중»: 다른 프로그램(또는 다른 PortDock 창)이 그 포트를 씁니다.",
        "- 실제 PLC 와 다르게 동작함: 이 프로그램은 공개 매뉴얼의 메시지 형식으로만 만들었고 실기와 견주지 않았습니다. 오류 코드·응답 시간·연결 수 제한·기종별 디바이스 범위는 실제와 다를 수 있습니다.",
        "- 프로그램이 열리지 않음: Microsoft Edge WebView2 가 필요합니다(Windows 11 에는 들어 있음). Windows 7 은 지원하지 않습니다.",
      ],
    },
  ],
  en: [
    {
      title: "About this program",
      body: [
        "PortDock PLC Simulator makes the PC answer MC protocol (SLMP) requests like a PLC's Ethernet port. Use it to build and test HMI, data-collection or host software without a PLC.",
        "Choose 3E or 4E frames, binary or ASCII code, and a TCP server or UDP. Batch read/write, random read/write and loopback requests are answered from device tables (D, W, R, ZR, M, X, Y, B, L …).",
        "Implemented from Mitsubishi Electric's public manuals (SLMP/MC) — not affiliated; behaviour may differ from a real PLC. No ladder program runs: values change only when you edit them, a client writes them, or «Simulation» changes them.",
        "Delays, no response and error end codes can be injected to test the client's error handling.",
      ],
    },
    {
      title: "Getting started",
      id: "start",
      body: [
        "- 1. On the left, match «Transport» (TCP server, UDP), «Frame» (3E, 4E), «Data code» (binary, ASCII) and «Port» with the client. Port 5000 is this program's default — the manuals do not fix a port number; it is set on the PLC side.",
        "- 2. «Bind address» defaults to 127.0.0.1 — only programs on this PC can connect. To connect an HMI on another PC, turn on «Allow other PCs to connect (0.0.0.0)» (a firewall note appears).",
        "- 3. Pick a device at the top (e.g. D) and enter values. You can do this before starting. For 32-bit, float or names open «Cell settings» with ⋯ (or right-click).",
        "- 4. «Start» (F4) — requests are answered as they arrive. Traffic and its decode («0401 Read (words) D100 ×3», «End 0000 OK · 6 bytes») appear in «Traffic» below.",
        "- On first run this checklist appears as a card in the empty «Traffic» area. «Fill example» puts 1–8 in D0–D7 (D0 «Status», D1 «Setpoint»), F32 23.5 (CDAB, «Temperature») in D8–D9 and 1/0 in M0–M7 (asks first if values are already there). «Don't show again» hides it.",
      ],
    },
    {
      title: "Screen layout",
      body: [
        "- Left: transport, frame, data code, bind address, port, «Own station requests only», «Start»/«Stop», status and the connected client list (TCP: ✕ disconnects one). «Fault injection (testing)» and «Statistics» below are folded; click the title to open (remembered).",
        "- Top centre: device buttons (bits X Y M L F B SM · words D W R ZR SD · timers/counters TS TC TN CS CC CN), «Fill», «Save», «Load». Below: «Start», «Count», «Size (points)», for bit devices «Bits»/«Words (16 points)», for words «Format» (U16, S16, HEX, BIN), and a grey «Answered range: D0–D12287».",
        "- Centre: device cells (number · name · value · type · ◷ · ⋯). Cells changed by a client flash briefly.",
        "- Bottom: «Traffic» (RX ◀ request, TX ▶ reply, EV event) with find/filter, «Log to file», «Clear», and a one-line note (implemented from public manuals — not affiliated).",
        "- Drag the bar between the table and the traffic to resize the traffic; it is remembered.",
        ...windowLines("en"),
      ],
    },
    {
      title: "Server settings",
      body: [
        "- «Transport»: TCP server — several clients can connect at once and each is answered (up to 64). A request split over several TCP segments, or two requests in one, are cut by the header's «request data length». UDP — one datagram is one request; the reply goes to the sender.",
        "- «Frame»: 3E has subheader 5000 (binary 50 00); 4E has 5400 + serial number + 0000, and the 4E reply carries the request's serial number. Frames of the other kind are not answered and leave an «IGNORED» line.",
        "- «Data code»: binary sends numbers low byte first; ASCII sends hex characters high digit first (SLMP chapter 4). Must match the client.",
        "- «Bind address»: 127.0.0.1 by default (this PC only). «Allow other PCs to connect (0.0.0.0)» listens on all adapters — the first start may show a Windows Firewall prompt (administrator rights needed). Do not run it on a plant network with the same IP and port as a real PLC; it would answer in its place.",
        "- «Port»: 5000 by default. 0 lets Windows pick a free port; the status shows the real address. A port in use fails with «Port already in use». Successful «address:port» pairs stay in the «▾» recent list.",
        "- «Own station requests only»: when on, only requests addressed to the connected station itself (network 00, station FF, I/O 03FF, multidrop 00) are processed; others get end code C05F. When off (default) any station's request is answered from these tables and the reply header echoes the request's station fields. Can change while started.",
        "- The monitoring timer is read but not used (this simulator answers immediately).",
      ],
    },
    {
      title: "Implemented commands",
      body: [
        "- 0401 Read · 1401 Write: subcommand 0001 (bits, 1 point each) and 0000 (words — 16 points of a bit device make 1 word); 0003/0002 do the same with 4-byte device numbers and 2-byte codes (ASCII: 4-character code, 8-digit number). Points: words 1–960, bits 1–7168 binary or 1–3584 ASCII.",
        "- 0403 Read Random: subcommands 0000/0002. Mixes word points and double-word points (the lower-numbered word is the low part). Total 1–192 points (0002: 1–96).",
        "- 1402 Write Random: bits (subcommand 0001: 1–188 points, 0003: 1–94 — ON/OFF as 01/00, binary 0003 as 01 00/00 00), words/double words (0000: words×12 + double words×14 ≤ 1920, 0002: ≤ 960).",
        "- 0619 Loopback: returns the received data (1–960 bytes) unchanged.",
        "- Writes are applied only after the whole range is checked — if anything is out of range nothing is written and C056 is returned.",
        "- Other commands (monitor 0801/0802, block 0406/1406, remote RUN/STOP, read type name, file …) and extension subcommands (0080 …) are not implemented yet — they get C059.",
        `- The message formats follow SLMP Reference Manual SH(NA)-080956ENG chapters 4, 5.2 and 5.9 (${SLMP}) and MELSEC Communication Protocol Reference Manual SH-080008 chapter 5 (${MC}).`,
      ],
    },
    {
      title: "Devices",
      body: [
        "- Bits: X input (9C) · Y output (9D) · M internal relay (90) · L latch relay (92) · F annunciator (93) · B link relay (A0) · SM special relay (91) · TS/TC timer contact/coil (C1/C0) · CS/CC counter contact/coil (C4/C3). Binary device codes in brackets.",
        "- Words: D data register (A8) · W link register (B4) · R file register (AF) · ZR file register, serial numbers (B0) · SD special register (A9) · TN timer current value (C2) · CN counter current value (C5).",
        "- X, Y, B, W and ZR are numbered in hexadecimal (X1F; W100 is the 256th). The «Start» box reads hex for them too (X1F, 1F and 0x1F all work). Others are decimal.",
        "- «Size (points)»: 1–65536 per device. The defaults (D 12288, M 8192, X/Y 8192 (0–1FFF), R 32768, ZR 65536 …) are small test values and do not claim to match any model's limit. Requests beyond the size get C056.",
        "- Bit devices can be viewed as «Bits» (checkboxes) or «Words (16 points)» (16 points per word — the lowest number is bit 0, the same value a client reads in word units).",
        "- 32-bit values: the lower-numbered word holds the low part (e.g. D200 = low 16 bits, D201 = high 16 bits), so the default order in «Cell settings» is CDAB. Floats (F32) work the same way.",
        "- Other devices (long timers/counters, index registers, link direct devices …) are not available — their codes get C05B.",
      ],
    },
    {
      title: "End codes",
      body: [
        "- An «end code» of 0000 means completed; anything else is an error followed by error information (the request's network, station, I/O, multidrop, command and subcommand) (SLMP 4.2).",
        "- Codes this simulator uses — meanings shortened from MELSEC iQ-R Ethernet User's Manual (Application) SH-081257ENG 3.5 «List of Error Codes»; which condition gets which code was chosen by this program (a real PLC or module may differ):",
        "- C050 characters that cannot be converted from ASCII (non-hex characters, A–F in a decimal device number) · C051 word points out of range · C052 bit points out of range · C053 random bit points out of range · C054 random word/double-word points out of range · C056 number beyond the device size",
        "- C057 header request data length differs from the actual length · C059 unknown command/subcommand · C05B unknown device code, or a word device in bit units · C05C loopback data count out of range · C05F request for another station («Own station requests only» on) · C060 bit value other than 0/1 · C061 command data shorter or longer than the point count",
        `- Source: ${ETH} (3.5). The manuals are not included in the repository.`,
      ],
    },
    {
      title: "Traffic",
      body: [
        "- RX ◀ is a received request, TX ▶ a sent reply, EV an event (listen, client connect/disconnect, IGNORED, END, DELAY). Each line carries the client address.",
        "- With «Decode» on, request lines show «command name · first device · points» (random: «W words D double words»), «NW ST IO MD» for another station, «#serial» for 4E; reply lines show «end code · meaning · data length». Error replies are red.",
        "- Requests answered with an error leave an EV line such as «END C056 address out of range — 0401» and are counted under «Per end code».",
        ...logHandlingLines("en", { find: true, checkbox: true }),
      ],
    },
    {
      title: "Fault injection (testing)",
      body: [
        "- «Response delay (ms)»: sends each reply this much later. TCP waits per connection, so other connections are still answered during a delay.",
        "- «Do not respond»: the request is processed as usual (writes are applied) but no reply is sent — tests the client's timeout and retries.",
        "- «Reply with end code»: replies with the chosen end code (from the list or «Custom…» hex). Writes are not applied then.",
        "- «Choose targets»: «Max delay» (a random delay between the delay and the max for each request, logged as DELAY), «Commands» (0401, 1401 …), «Devices» (D, M …), «Every Nth», «Probability (%)». Empty means every request.",
        "- Fault injection always starts off. When any fault is on the title becomes «⚠ Fault injection on» and a warning line stays below.",
      ],
    },
    {
      title: "Cell settings and simulation",
      body: [
        "- ⋯ on a cell or right-click: name, type (U16, S16, U32, S32, F32, F64, string), word/byte order and simulation (increment, decrement, random, sine, ramp, toggle). Bit devices have a name and toggle/random only.",
        "- Simulation runs in the backend, so it continues while the window is minimized. «Change on every client read» changes the value on each request that reads it (0401, 0403) instead of on a timer.",
        "- A value written by a client stays until the next change; increment/decrement continue from it.",
        "- Value cells: Enter/↓ next cell, ↑/Shift+Enter previous, Esc cancels the edit. Pasting several values from Excel etc. fills consecutive cells at once.",
      ],
    },
    {
      title: "Save and load",
      body: [
        "- «Save»: writes every device's size (if changed), non-zero values, cell settings and simulations to one JSON file — to move a prepared test state to another PC or the next test.",
        "- «Load»: reads such a file and replaces sizes, values and cell settings (values not in the file become 0). Files from other programs are refused; invalid entries are skipped and counted. Loading while started asks first.",
        "- Even without saving, values, cell settings and sizes come back next time (fault injection does not).",
      ],
    },
    {
      title: "Settings (⚙)",
      body: [
        "- «Language», «Theme» (follow Windows, light, dark), «Font size», «Log timestamp» format, «Lines kept on screen», «Auto-scroll on new lines».",
        "- «Start file logging on connect»: with an «Auto-log folder» chosen, each «Start» logs to «portdock-plc-simulator-date-time.log».",
        "- «Ask before closing while connected or logging» (also while started), «Export/Import settings», «Reset to defaults».",
        ...settingsLines("en", { run: true }),
        "- Command-line «--auto»: starts right away with the settings of the last successful start (e.g. «PortDock PLC-Simulator.exe --auto»). Other arguments are reported as «Ignored command-line arguments».",
      ],
    },
    {
      title: "Shortcuts and tips",
      body: [...shortcutLines("en", { find: true, saveView: true, startStop: true }), "- Values can be entered before starting; changes while started apply from the next request."],
    },
    {
      title: "Troubleshooting",
      body: [
        "- The client cannot connect: with «0 clients connected», check address and port. From another PC, turn on «Allow other PCs to connect» and allow this program in Windows Firewall. 127.0.0.1 accepts connections from this PC only.",
        "- RX lines arrive but no reply: an EV «IGNORED» line means the frame (3E/4E) or data code (binary/ASCII) differs from the client. Also check «Do not respond» under fault injection.",
        "- The client gets an error: look up the «End» code in the traffic in the «End codes» section. For C056 increase «Size (points)»; C059 means the command is not implemented yet.",
        "- 32-bit or float values look wrong: match the type and order (CDAB by default) in «Cell settings» with the client.",
        "- «Port already in use»: another program (or another PortDock window) uses that port.",
        "- It behaves differently from a real PLC: this program follows only the message formats in the public manuals and has not been compared with real hardware. Error codes, timing, connection limits and per-model device ranges may differ.",
        "- The program does not open: it needs Microsoft Edge WebView2 (included in Windows 11). Windows 7 is not supported.",
      ],
    },
  ],
};

// «용어» 절 — 공용 목록(shared/glossary.ts)에서 이 앱 화면에 나오는 것만, 맨 끝에
for (const lang of ["ko", "en"] as const) help[lang].push(termsSection(lang, ["mc", "device", "c05f"]));
