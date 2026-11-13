// Packet 도움말 — 화면 ? 버튼·F1 로 연다 (한·영 두 판, 나머지 언어는 영어)
import type { HelpDoc } from "@shared/HelpDialog";

export const help: HelpDoc = {
  ko: [
    {
      title: "이 프로그램은",
      body: [
        "PortDock Packet 은 pcap·pcapng 패킷 파일을 열어 보는 분석 도구입니다. Wireshark 로 만든 파일도 열리고, 저장은 표준 pcapng 형식입니다.",
        "일반 프로토콜(이더넷·ARP·IP·TCP·UDP·DNS·DHCP)에 더해 Modbus TCP·MC(SLMP)·LS XGT FEnet 을 풉니다. 요청과 응답을 짝지어 응답 시간·무응답·예외를 맨 위에 요약합니다.",
        "읽기만 합니다 — 패킷을 만들어 보내지 않고, 파일·캡처 내용을 밖으로 보내지 않습니다. 위쪽 «캡처» 로 이 PC 를 지나는 통신을 바로 캡처할 수도 있습니다.",
      ],
    },
    {
      title: "처음 쓰는 순서",
      id: "start",
      body: [
        "- 1. «열기»(Ctrl+O)로 파일을 고르거나 창에 끌어 놓습니다.",
        "- 2. 맨 위 띠를 봅니다 — 패킷 수·시간 폭·흐름 수, 그리고 Modbus·MC·XGT 별 응답 시간(최소·중앙·95%·최대)과 «무응답»·«예외» 수.",
        "- 3. 빨간 «무응답 n»·«예외 n» 을 누르면 그 패킷만 걸러집니다. 목록에서 패킷을 누르면 아래에 해석 트리와 바이트가 나옵니다.",
        "- 4. 아래 «Expert» 탭에서 재전송·무응답·예외의 뜻과 «다음에 볼 곳» 을 읽습니다.",
        "- 5. 트리의 필드를 누르면 바이트 칸에서 그 범위가 강조됩니다. 필드를 우클릭하면 «필터로 적용»·«이 값만 보기».",
        "- 칸 사이 막대를 끌어 크기를 바꿀 수 있고, 목록 머리를 우클릭하면 열을 켜고 끌 수 있습니다.",
        "- 목록 키: ↑ ↓ PageUp PageDown Home End. 찾기 Ctrl+F, 필터 입력칸 /.",
      ],
    },
    {
      title: "표시 필터 문법 요약",
      id: "filter",
      body: [
        "Wireshark 의 표시 필터와 같은 문법입니다. 입력하는 동안 초록(맞음)·빨강(틀림)으로 보이고, 틀린 곳이 밑줄로 표시되며 이유가 아래에 나옵니다.",
        "- 비교: == != > >= < <=   예) tcp.port == 502, frame.len > 100",
        "- 연결: && (그리고) || (또는) ! (아님) 와 괄호   예) ip.addr == 10.0.0.5 && !arp",
        "- 있는지만: 필드 이름만   예) tcp.analysis.retransmission, modbus",
        "- 글: contains, matches   예) frame.protocols contains \"mbtcp\"",
        "- 대표 필드: ip.addr · ip.src · ip.dst · tcp.port · tcp.stream · modbus.func_code · modbus.exception_code · mc.end_code · xgt.error_code · modbus.response_time · frame.time_delta",
        "- Expert: expert.key == \"pair.no_response\" (무응답), expert.key == \"tcp.retransmission\", expert.severity == \"warn\"",
        "- 입력칸 아래 단추(«Modbus 만»·«오류만»·«무응답»…)는 같은 식을 대신 써 줍니다. 필드를 우클릭하거나 요약 띠의 숫자를 눌러도 식이 채워집니다.",
        "- 입력 중 Tab 은 후보 채우기, ↑ ↓ 는 후보 고르기(후보가 없으면 이전 필터), Enter 는 적용입니다.",
      ],
    },
    {
      title: "응답 시간 읽는 법",
      id: "rt",
      body: [
        "응답 시간은 요청 패킷이 지나간 때부터 짝이 되는 응답 패킷이 지나간 때까지입니다. 이 PC 에서 본 시각이므로 장비가 처리한 시간과 선로 시간이 합쳐진 값입니다.",
        "- 중앙: 절반은 이보다 빠릅니다. 평소 속도로 보면 됩니다.",
        "- 95%: 느린 5% 를 뺀 최대. 중앙값보다 훨씬 크면(표시가 주황) 가끔 크게 늦는다는 뜻입니다 — 통신 주기가 맞지 않거나 장비가 다른 일로 바쁠 때 흔합니다.",
        "- 최대: 가장 느린 한 번. 혼자 튀는 값이면 그 패킷을 눌러 앞뒤를 봅니다.",
        "- 무응답: 제한 시간(기본 1초) 안에 응답이 오지 않았거나, 응답 없이 연결이 닫힌 요청. 국번·주소·방화벽·케이블을 의심합니다.",
        "- 예외: 장비가 «할 수 없다» 고 답한 것(Modbus 예외 코드, MC 종료 코드, XGT 오류). Expert 탭에 원인과 점검 순서가 나옵니다.",
        "- «응답 시간 분포» 단추로 구간별 막대를 보고, 느린 응답만 걸러 볼 수 있습니다.",
        "- 목록의 «응답 시간» 열은 응답 줄에 시간을, 응답이 없는 요청 줄에 빨간 «무응답» 을 보입니다.",
      ],
    },
    {
      title: "실시간 캡처",
      id: "capture",
      body: [
        "- 위쪽 «● 캡처» → 어댑터·IP·포트·프로토콜을 고르고 «캡처 시작». Windows 내장 Packet Monitor 를 써서 설치할 것이 없습니다.",
        "- 관리자 권한이 필요합니다. 아니면 «관리자로 다시 시작» 단추가 나오고, Windows 허용 창이 한 번 뜹니다.",
        "- 1.5초마다 목록이 갱신됩니다. 필터는 그대로 유지되고, 목록 맨 아래를 보고 있으면 새 패킷을 따라갑니다. «■ 중지» 로 멈추고 «저장» 으로 pcapng 를 남깁니다.",
        "- «네트워크 어댑터만» 이 권장입니다(중복이 적음). «스택 전체» 는 같은 패킷이 여러 계층에서 보이는 것을 줄여서 보여 줍니다.",
        "- 이 PC 를 지나는 통신만 보입니다. 스위치 너머의 다른 기기끼리 통신은 미러링 포트가 있어야 보입니다.",
        "- 127.0.0.1(자기 자신) 통신은 잡히지 않습니다. 로컬 시험은 파일을 열어 하세요.",
        "- 읽기·듣기만 합니다 — 패킷을 만들어 보내지 않습니다.",
      ],
    },
    {
      title: "장비 맵",
      id: "devmap",
      body: ["위 띠의 «장비 맵» 에서 장비를 고르면 Modbus 응답의 레지스터 주소가 그 장비의 이름·단위(예: 출력 주파수 ×0.01 Hz)로 해석 트리에 붙습니다. 86종 장비 목록이며, 모르면 «(없음)» 으로 둡니다."],
    },
  ],
  en: [
    {
      title: "About this program",
      body: [
        "PortDock Packet opens pcap and pcapng capture files. Files made by Wireshark open here, and files are saved in the standard pcapng format.",
        "Besides the common protocols (Ethernet, ARP, IP, TCP, UDP, DNS, DHCP) it dissects Modbus TCP, MC (SLMP) and LS XGT FEnet. Requests and responses are paired, and response times, unanswered requests and exceptions are summarized at the top.",
        "It only reads — it never sends packets and never uploads file or capture contents. The «Capture» button at the top records the traffic passing through this PC.",
      ],
    },
    {
      title: "Getting started",
      id: "start",
      body: [
        "- 1. Press «Open» (Ctrl+O) or drop a file on the window.",
        "- 2. Look at the strip on top: packets, time span, flows, and per Modbus/MC/XGT the response time (min · median · 95% · max) with «no response» and «exceptions» counts.",
        "- 3. Click a red «no response n» or «exceptions n» to filter just those packets. Click a packet in the list to see its dissection tree and bytes below.",
        "- 4. The «Expert» tab below explains retransmissions, unanswered requests and exceptions with «where to look next».",
        "- 5. Clicking a tree field highlights its bytes. Right-click a field for «Apply as filter» and «Show only this value».",
        "- Drag the bars between panes to resize. Right-click the list header to show or hide columns.",
        "- List keys: Up Down PageUp PageDown Home End. Find: Ctrl+F. Filter box: /.",
      ],
    },
    {
      title: "Display filter syntax",
      id: "filter",
      body: [
        "The syntax is the same as Wireshark's display filter. While you type, the box turns green (valid) or red (invalid), the mistake is underlined and the reason is shown below.",
        "- Compare: == != > >= < <=   e.g. tcp.port == 502, frame.len > 100",
        "- Combine: && (and) || (or) ! (not) and parentheses   e.g. ip.addr == 10.0.0.5 && !arp",
        "- Presence only: just the field name   e.g. tcp.analysis.retransmission, modbus",
        "- Text: contains, matches   e.g. frame.protocols contains \"mbtcp\"",
        "- Common fields: ip.addr · ip.src · ip.dst · tcp.port · tcp.stream · modbus.func_code · modbus.exception_code · mc.end_code · xgt.error_code · modbus.response_time · frame.time_delta",
        "- Expert: expert.key == \"pair.no_response\" (unanswered), expert.key == \"tcp.retransmission\", expert.severity == \"warn\"",
        "- The buttons under the box («Modbus only», «Errors only», «No response»…) write the expression for you. Right-clicking a field or clicking a number in the top strip fills it in too.",
        "- While typing: Tab fills the suggestion, Up/Down picks one (or goes through the history when there is none), Enter applies.",
      ],
    },
    {
      title: "Reading response times",
      id: "rt",
      body: [
        "The response time runs from the request packet passing this PC to its paired response packet passing. It is the device's processing time plus the wire time.",
        "- median: half of the responses are faster. Treat it as the normal speed.",
        "- 95%: the maximum after leaving out the slowest 5%. Much larger than the median (shown in orange) means it is occasionally very late — common when the polling cycle clashes or the device is busy.",
        "- max: the single slowest. If it stands alone, click that packet and look around it.",
        "- no response: a request with no response within the timeout (1 s by default) or whose connection closed without one. Suspect the unit ID, address, firewall or cable.",
        "- exceptions: the device answered «cannot do that» (Modbus exception code, MC end code, XGT error). The Expert tab gives the cause and what to check.",
        "- «Response time distribution» shows bars per range and can filter the slow responses.",
        "- In the list, the «Response time» column shows the time on the response row and a red «no response» on an unanswered request.",
      ],
    },
    {
      title: "Live capture",
      id: "capture",
      body: [
        "- Top «● Capture» → pick adapter, IP, port and protocol, then «Start capture». It uses Windows' built-in Packet Monitor, so nothing to install.",
        "- Administrator rights are required. Otherwise a «Restart as administrator» button appears and Windows shows one permission prompt.",
        "- The list refreshes every 1.5 s. Your filter stays applied, and the list follows new packets while you are at the bottom. «■ Stop» ends it, «Save» keeps a pcapng.",
        "- «Network adapters only» is recommended (fewer duplicates). «Whole stack» reduces the same packet showing up at several layers.",
        "- Only traffic passing through this PC is visible. Traffic between other devices beyond a switch needs a mirror port.",
        "- Traffic to 127.0.0.1 (this PC itself) is not captured. Open a file for local tests.",
        "- It only listens — it never sends packets.",
      ],
    },
    {
      title: "Device map",
      id: "devmap",
      body: ["Pick a device in «Device map» in the top strip and Modbus register addresses in responses get that device's names and units (e.g. Output frequency ×0.01 Hz) in the dissection tree. 86 devices are listed; leave «(none)» if unknown."],
    },
  ],
};
