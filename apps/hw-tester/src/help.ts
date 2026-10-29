// Hardware Tester 도움말 — 화면 ? 버튼·F1 로 연다
import type { HelpDoc } from "@shared/HelpDialog";
import { settingsLines, windowLines } from "@shared/helpCommon";

export const help: HelpDoc = {
  ko: [
    {
      title: "이 프로그램은",
      body: [
        "PortDock Hardware Tester 는 «와이파이가 자꾸 끊긴다», «블루투스 이어폰이 끊긴다», «소리가 통화 음질로 바뀐다» 를 기록으로 남겨 어디를 볼지 알려 주는 Windows 프로그램입니다.",
        "관리자 권한 없이 읽기만 합니다. 설정·드라이버·연결을 바꾸지 않고, «고쳐 주지» 않습니다. 결과는 «걸리는 것 없음(기록한 동안) / 볼 것 / 기록이 짧음» 까지만 씁니다.",
        "바깥으로 나가는 것은 끊김 기록을 켠 동안의 핑·DNS 질의뿐입니다(대상은 화면에 늘 보입니다). 오류 보고·사용 통계는 다른 PortDock 프로그램과 같습니다(설정에서 정함).",
      ],
    },
    {
      title: "처음 쓰는 순서",
      id: "start",
      body: [
        "- 1. 왼쪽 «Wi-Fi·인터넷 끊김 기록» 에서 인터넷 대상(기본 1.1.1.1, 8.8.8.8 이나 직접 입력)·DNS 로 물을 이름(기본 example.com)·간격(기본 1초)을 고릅니다.",
        "- 2. «기록 시작» 을 누르고 끊김이 생길 때까지 둡니다. 기록하는 동안 PC 가 대기(절전)로 들어가지 않습니다(화면은 꺼져도 됨).",
        "- 3. «요약» 과 그래프에서 «공유기 쪽» 인지 «공유기 너머» 인지 봅니다. «CSV 저장…» 으로 남기고 «요약 복사» 로 문의에 붙입니다.",
        "- 블루투스가 끊기면 «블루투스 연결 기록» 도 함께 켜 둡니다.",
      ],
    },
    {
      title: "Wi-Fi·인터넷 끊김 기록",
      id: "net",
      body: [
        "- 게이트웨이(공유기)와 인터넷 대상에 같은 박자로 핑을 나란히 보냅니다. 게이트웨이는 인터넷 대상으로 가는 길의 다음 홉(Windows 경로표)이고, 시작할 때 찾습니다. 다시 연결되며 바뀌면 «사건» 에 남깁니다.",
        "- 간격은 1초에 한 번보다 짧게 할 수 없습니다. 한 번 기록은 24시간에서 저절로 멈춥니다.",
        "- DNS: 5초마다 정한 이름 하나를 Windows DNS 캐시·hosts 파일을 건너뛰고 DNS 서버에 묻습니다. 비우면 묻지 않습니다.",
        "- Wi-Fi 연결·끊김: Windows 가 남기는 WLAN-AutoConfig 기록(8001 연결·8003 끊김)을 5초마다 읽어 그래프에 세로 줄(빨강 끊김·초록 연결)로, «사건» 에 Windows 이유 문구로 보입니다. Wi-Fi 이름은 읽지 않습니다.",
        "- 그래프: 선 = 응답 시간(ms), 위쪽 띠의 빨간 칸 = 그 박자에 응답 없음, 네모 점 = DNS. 보이는 길이(1분·5분·30분·전체)를 고릅니다.",
        "- 요약(20번 이상 잰 뒤): 게이트웨이까지 손실 2% 이상 → «공유기 쪽(이 PC 의 Wi-Fi·공유기)», 게이트웨이는 괜찮고 인터넷만 손실 2% 이상 → «공유기 너머(회선·통신사·대상)». 게이트웨이 95% 지연 50ms 초과, 인터넷 평균이 게이트웨이보다 100ms 넘게 김, DNS 평균 200ms 초과·실패 20% 이상, 기록 중 Wi-Fi 끊김도 «볼 것» 으로 알립니다.",
        "- 한계: 공유기·통신사가 핑을 낮은 우선순위로 다루면 손실처럼 보일 수 있습니다. Windows 끊김 이유는 증상일 수 있습니다. 원인을 정하지 않고 볼 곳만 알립니다.",
        "- CSV: time,gateway_ms,internet_ms,dns_ms,event — lost = 응답 없음, 빈 칸 = 그 박자에 재지 않음. 첫 줄 # 에 게이트웨이·대상 주소가 들어갑니다.",
      ],
    },
    {
      title: "Wi-Fi 신호·채널",
      id: "signal",
      body: [
        "- «신호 보기» 를 누른 동안만 2초마다 신호 품질(%)·세기(dBm)·링크 속도·규격·대역·채널과 주변 Wi-Fi 의 채널별 개수를 읽습니다. 새로 훑지 않고 Windows 가 가진 목록만 읽습니다.",
        "- Windows 11 24H2 부터 이 값은 위치 권한이 있어야 읽힙니다. 거부했거나 위치 서비스가 꺼져 있으면 화면에 켜는 곳을 안내합니다. 바꾸지 않아도 다른 탭은 됩니다.",
        "- 신호 세기 -67 dBm 이하는 «볼 것», -75 dBm 이하는 «약함» 으로 씁니다.",
        "- Wi-Fi 이름(SSID)·AP 주소(BSSID)는 읽지도 보이지도 저장하지도 않습니다(개수만).",
        "- 무선 랜 서비스가 없는 PC(서버 등)에서는 «무선 랜 서비스가 없습니다» 로 보이고 프로그램은 그대로 씁니다.",
      ],
    },
    {
      title: "블루투스 연결 기록",
      id: "bt",
      body: [
        "- «기록 시작» 을 누른 동안 2초마다 짝지은 장치들의 «연결됨» 상태(장치 관리자 → 속성 → 자세히의 값)를 읽어 바뀐 시각을 남깁니다. Windows 는 이 기록을 따로 남기지 않습니다.",
        "- 장치마다 «장치 N» 번호를 붙입니다. 이름은 화면에만 보이고, 복사·저장 글에는 번호만 들어갑니다.",
        "- 주변 검색·연결·끊기는 하지 않습니다. 끊김이 잦으면 «블루투스 소리» 의 모드와 PortDock Port Inspector «무선» 탭(절전·USB 경로·드라이버·서비스)을 함께 봅니다.",
      ],
    },
    {
      title: "블루투스 소리",
      id: "audio",
      body: [
        "- 기본 출력 장치가 블루투스면 «스테레오(A2DP)» 인지 «핸즈프리(통화용)» 인지 보입니다. 핸즈프리는 마이크를 함께 쓰는 모노·낮은 음질 모드라 «볼 것» 으로 씁니다.",
        "- 왼쪽·오른쪽·양쪽 버튼은 440 Hz 1초 소리를 지금 기본 출력 장치로 냅니다. 헤드폰을 쓰면 먼저 크기를 낮춥니다.",
      ],
    },
    {
      title: "다음 판",
      body: ["- 키보드·마우스·모니터·스피커·마이크·웹캠은 자리만 있습니다. 지금은 각 자리의 링크로 portdock.dev 웹 도구를 열고, 다음 판에 같은 코드로 붙입니다."],
    },
    {
      title: "화면 구성",
      body: ["- 왼쪽: 점검 항목. 기록 중인 항목에 «기록 중» 이 붙습니다. 두 기록(끊김·블루투스)은 함께 켤 수 있습니다.", "- 가운데: 고른 항목의 도구줄·그래프·표.", ...windowLines("ko")],
    },
    {
      title: "설정",
      body: ["- ⚙ 에서 언어·테마·글자 크기·«항상 위»·문제 보고를 정합니다.", ...settingsLines("ko")],
    },
    {
      title: "단축키",
      body: ["- Ctrl+S: 지금 탭의 기록 저장(끊김 기록 CSV · 블루투스 기록 글).", "- F1 또는 ? 단추: 이 도움말. Esc 로 닫습니다."],
    },
  ],
  en: [
    {
      title: "About this program",
      body: [
        "PortDock Hardware Tester records «my Wi-Fi keeps dropping», «my Bluetooth earbuds keep disconnecting» and «the sound switched to call quality» so you can see where to look, on Windows.",
        "Read-only, without administrator rights. It does not change settings, drivers or connections and does not «fix» anything. Results go only as far as «Nothing stood out (while recording) / Worth a look / Too short to tell».",
        "The only traffic it sends is the pings and DNS lookups while the drop log is recording (the targets are always shown). Problem reports and usage statistics work as in the other PortDock programs (chosen in settings).",
      ],
    },
    {
      title: "Getting started",
      id: "start",
      body: [
        "- 1. In «Wi-Fi / internet drop log» on the left, choose the internet target (1.1.1.1 by default, 8.8.8.8 or your own), the name to look up (example.com by default) and the interval (1 s by default).",
        "- 2. Press «Start recording» and leave it until the drops happen. While recording, the PC does not go to sleep (the screen may turn off).",
        "- 3. Read «Summary» and the chart: router side or beyond the router. «Save CSV…» keeps the record and «Copy summary» goes into a support request.",
        "- If Bluetooth drops too, also turn on «Bluetooth connection log».",
      ],
    },
    {
      title: "Wi-Fi / internet drop log",
      id: "net",
      body: [
        "- Pings go side by side, on the same beat, to the gateway (router) and the internet target. The gateway is the next hop toward the internet target (Windows routing table), found at start; if it changes after a reconnect it is logged under «Events».",
        "- The interval cannot be shorter than once per second. One recording stops by itself after 24 hours.",
        "- DNS: every 5 s one name is looked up at the DNS server, skipping the Windows DNS cache and hosts file. Leave it empty to skip.",
        "- Wi-Fi connects and disconnects: the WLAN-AutoConfig log Windows keeps (8001 connect, 8003 disconnect) is read every 5 s and shown as vertical lines on the chart (red drop, green connect) and as Windows' reason wording under «Events». The Wi-Fi name is not read.",
        "- Chart: lines = reply time (ms), red marks in the top band = no reply in that beat, squares = DNS. Pick the visible length (1 min, 5 min, 30 min, all).",
        "- Summary (after 20 samples): gateway loss 2% or more → «router side (this PC's Wi-Fi or the router)»; gateway fine but internet loss 2% or more → «beyond the router (line, ISP or target)». Gateway 95th-percentile latency over 50 ms, internet average more than 100 ms above the gateway, DNS average over 200 ms or 20% failures, and Wi-Fi drops while recording are also marked «Worth a look».",
        "- Limits: routers and ISPs may give pings low priority, which can look like loss. Windows' disconnect reasons may be symptoms. It shows where to look, not the cause.",
        "- CSV: time,gateway_ms,internet_ms,dns_ms,event — lost = no reply, empty = not measured in that beat. The first # line holds the gateway and target addresses.",
      ],
    },
    {
      title: "Wi-Fi signal and channel",
      id: "signal",
      body: [
        "- Only while «Show signal» is on, every 2 s it reads signal quality (%), strength (dBm), link speed, standard, band and channel, and how many nearby Wi-Fi networks use each channel. It reads the list Windows already has and does not scan.",
        "- From Windows 11 24H2 these values need location permission. If it was declined or location services are off, the screen shows where to turn it on. You can leave it off; the other tabs still work.",
        "- Signal at or below -67 dBm is «Worth a look»; at or below -75 dBm is called weak.",
        "- Wi-Fi names (SSID) and access point addresses (BSSID) are never read, shown or saved (counts only).",
        "- On PCs without the wireless LAN service (servers) it shows «No wireless LAN service on this PC» and the program keeps working.",
      ],
    },
    {
      title: "Bluetooth connection log",
      id: "bt",
      body: [
        "- While recording, every 2 s it reads the «Connected» state of paired devices (the value in Device Manager → Properties → Details) and logs when it changes. Windows keeps no such log itself.",
        "- Each device gets a «Device N» number. Names are shown only on the screen; copies and saved files contain numbers only.",
        "- It does not search for, connect or disconnect devices. If drops are frequent, also check the mode under «Bluetooth audio» and PortDock Port Inspector's «Wireless» tab (power saving, USB path, driver, services).",
      ],
    },
    {
      title: "Bluetooth audio",
      id: "audio",
      body: [
        "- If the default output device is Bluetooth, it shows whether it is «Stereo (A2DP)» or «Hands-free (calls)». Hands-free is a mono, lower-quality mode used with the microphone, so it is marked «Worth a look».",
        "- Left, right and both play a 1-second 440 Hz tone on the current default output device. With headphones, lower the level first.",
      ],
    },
    {
      title: "Next version",
      body: ["- Keyboard, mouse, monitor, speakers, microphone and webcam are placeholders only. For now each one links to the portdock.dev web tool; the same code comes into the app in the next version."],
    },
    {
      title: "Screen layout",
      body: ["- Left: the checks. A check that is recording shows «rec». The two recordings (drops and Bluetooth) can run together.", "- Middle: the chosen check's toolbar, chart and tables.", ...windowLines("en")],
    },
    {
      title: "Settings",
      body: ["- ⚙ sets language, theme, font size, «Always on top» and problem reporting.", ...settingsLines("en")],
    },
    {
      title: "Shortcuts",
      body: ["- Ctrl+S: save the current tab's record (drop log CSV, Bluetooth log text).", "- F1 or the ? button: this help. Close it with Esc."],
    },
  ],
};
