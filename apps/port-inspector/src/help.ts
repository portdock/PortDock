// Port Inspector 도움말 — 화면 ? 버튼·F1 로 연다
import type { HelpDoc } from "@shared/HelpDialog";
import { settingsLines, windowLines } from "@shared/helpCommon";

export const help: HelpDoc = {
  ko: [
    {
      title: "이 프로그램은",
      body: [
        "PortDock Port Inspector 는 COM 포트 하나를 고르면 장치 관리자·이벤트 뷰어·레지스트리를 따로 뒤져야 보이는 것을 한 화면에 모아 보여 줍니다: 장치·드라이버(제공자·버전·날짜·INF)·장치 관리자 문제 코드와 뜻·USB 칩(VID/PID)·FTDI 지연 타이머 같은 장치 설정·Windows 포트 기본값·USB 절전 설정·최근 연결과 드라이버 기록·COM 번호 예약.",
        "관리자 권한 없이 읽기만 합니다. 레지스트리·장치 설정·드라이버를 바꾸지 않고, 다른 프로그램의 핸들을 훑지도 않습니다.",
        "TX 와 RX 를 이어 두면 «연결 시험» 으로 속도마다 바이트가 그대로 돌아오는지와 왕복 시간(ms)을 재고, 2선 RS-485 변환기가 보낸 것을 스스로 되받는지(에코)도 알려 줍니다.",
        "결과는 «문제 없음(읽은 범위) / 볼 것 / 문제 있음 / 읽지 못함» 으로 표시합니다. PC 가 읽은 범위만 말하므로, 배선·종단·바이어스·접지처럼 PC 가 볼 수 없는 것은 화면 아래에 늘 함께 적습니다.",
      ],
    },
    {
      title: "처음 쓰는 순서",
      id: "start",
      body: [
        "- 1. 왼쪽 «COM 포트» 목록에서 포트를 누릅니다. 예전에 꽂았던 장치까지 보려면 «지금 없는 장치도 보기» 를 켭니다.",
        "- 2. 가운데에 카드가 나옵니다: 장치·드라이버, USB 경로(USB 장치일 때), 설정, 절전, 연결 기록, COM 번호 예약, 연결 시험, 이 PC 랜카드, 이 PC. 카드 머리에 결과가 붙고, «볼 것»·«문제 있음» 이면 그 까닭이 바로 아래 줄에 나옵니다.",
        "- 3. 문제 보고·문의에는 위 «텍스트 복사»(또는 «저장…»)로 결과를 붙입니다. 사용자 폴더 경로는 «~» 로 가립니다.",
        "- 처음 켜면 빈 자리에 이 순서가 카드로 보입니다. «다시 보지 않기» 를 누르면 짧은 한 줄 안내로 바뀝니다.",
      ],
    },
    {
      title: "화면 구성",
      body: [
        "- 왼쪽: COM 포트 목록(지금 있는 것이 먼저, COM 번호순). 문제 코드가 있는 장치는 빨간 번호, 지금 없는 장치는 «지금 없음», Ports 장치 목록에 없는 COM(모뎀·가상 COM 드라이버 등)은 «장치 정보 없음» 이 붙습니다. ↻ 로 목록을 다시 읽습니다.",
        "- 가운데 맨 위 탭: «COM 포트»(아래 카드들)와 «무선 (Wi-Fi·블루투스)» — 무선 탭은 고른 COM 포트와 상관없이 이 PC 의 Wi-Fi·블루투스를 봅니다(0.5.0 부터, «무선» 절).",
        "- 가운데 위 도구줄: 고른 포트와 전체 결과(카드 가운데 가장 무거운 것), 읽은 시각, «다시 읽기»(F4), «텍스트 복사», «JSON 복사», «저장…».",
        "- 카드는 머리를 눌러 접고 펼칩니다(카드마다 기억). 설정의 «모두 펼치기» 를 켜면 모두 펼친 채 시작합니다.",
        "- 맨 아래 «PC 가 볼 수 없는 것» 상자와 portdock.dev 가이드 링크는 늘 보입니다.",
        ...windowLines("ko"),
      ],
    },
    {
      title: "결과 표시",
      id: "levels",
      body: [
        "- 문제 없음(읽은 범위): 읽은 값에서 걸리는 것을 찾지 못했습니다. 배선·장비 설정까지 괜찮다는 뜻은 아닙니다.",
        "- 볼 것: 문제일 수도, 아닐 수도 있는 값입니다(예: FTDI 지연 타이머 16ms, 절전 켜짐, COM17 이상). 대부분 그대로 둬도 되지만 증상과 맞으면 봅니다.",
        "- 문제 있음: 장치 관리자 문제 코드, 같은 COM 번호를 두 장치가 쥠, 루프백에서 바이트를 잃거나 바뀜처럼 사실로 확인된 것만 씁니다.",
        "- 읽지 못함: 권한·정책·드라이버 때문에 그 값을 읽지 못했습니다. 다른 카드는 계속 읽습니다. 무엇을 왜 못 읽었는지는 카드나 아래 줄에 나옵니다.",
      ],
    },
    {
      title: "장치·드라이버와 문제 코드",
      body: [
        "- 이름·COM 번호·인스턴스 ID(⧉ 로 복사)·VID:PID·칩·USB 제품 이름(장치가 스스로 알린 이름)·제조사·위치(USB 허브 포트)·드라이버 제공자·버전·날짜·INF·서비스 이름·상태·마지막 연결/분리·처음 설치 시각을 보입니다.",
        "- 문제 코드는 장치 관리자가 보이는 번호(10 시작할 수 없음, 28 드라이버 없음, 43 장치가 문제를 알림 …)입니다. 뜻은 Microsoft 문서 «Device Manager error messages» 를 줄인 것이고, «해 볼 것» 은 USB-시리얼 변환기에서 먼저 해 볼 일입니다.",
        "- 칩 이름은 VID/PID 표(FTDI·Prolific PL2303·WCH CH34x·Silicon Labs CP210x 등, 제조사·공개 드라이버 장치 표에 있는 번호만)로 봅니다. 복제 칩도 같은 번호를 쓰므로 «장치가 알린 번호로 본 이름» 입니다.",
        "- 단서: FTDI PID 0000(2014년 드라이버가 복제 칩의 PID 를 0 으로 바꾼 일), Prolific + 문제 코드 10(단종된 옛 리비전·복제 칩에서 흔함)은 «볼 것» 으로 알립니다. 단정하지는 않습니다.",
        "- «위로 이어진 장치»: FTDI 처럼 COM 장치 위에 USB 장치가 따로 있으면 그 이름입니다.",
      ],
    },
    {
      title: "설정 — 포트 기본값·FTDI 지연 타이머",
      body: [
        "- «Windows 포트 기본값» 은 레지스트리 Ports 키의 값(예: 9600,n,8,1)입니다. 프로그램이 포트를 열 때 정한 속도·패리티가 이보다 앞서므로, 대개 장비 연결과는 상관없습니다.",
        "- «장치 설정 (Device Parameters)» 는 드라이버가 장치마다 둔 값을 이름·값 그대로 보입니다. 풀이는 공개 문서로 확인된 이름만 붙입니다(FTDI LatencyTimer, PortName).",
        "- FTDI 지연 타이머(LatencyTimer, 기본 16ms): 버퍼가 차지 않으면 이 시간만큼 모았다가 PC 로 보냅니다. 짧은 요청·응답을 빨리 주고받는 Modbus RTU 폴링 같은 일에서 응답이 늦게 보일 수 있어 16 이상이면 «볼 것» 입니다.",
      ],
    },
    {
      title: "USB 경로",
      body: [
        "- USB 변환기면 이 장치에서 위로 허브 → 루트 허브 → USB 컨트롤러까지 한 줄씩 보입니다. 장치 관리자 «연결별 장치» 보기와 같은 사슬입니다.",
        "- 포트: 바로 위 허브의 몇 번 포트에 꽂혔는지. 협상 속도: 그 허브가 알려 준 속도(Low 1.5 Mbps · Full 12 Mbps · High 480 Mbps · SuperSpeed 5 Gbps 이상). USB-시리얼 칩은 대부분 Full Speed 로 붙고, 이것이 시리얼 속도보다 훨씬 빠르므로 느린 것이 아닙니다.",
        "- 허브 전원: 버스 전원(전원 어댑터 없이 USB 로만 전원을 받음)·자체 전원. 버스 전원 허브에 여러 장치를 달면 전원이 모자랄 수 있습니다.",
        "- USB 3 를 쓸 수 있다는 장치가 더 낮은 속도로 붙어 있으면 «볼 것» — 케이블이나 USB 2 포트 때문일 수 있습니다. 허브를 거치는 것·버스 전원 허브는 적기만 하고 판정하지 않습니다.",
        "- 허브에는 상태를 묻는 조회만 보냅니다(관리자 권한 필요 없음). 허브 리셋 횟수·전류 같은 값은 읽지 않습니다.",
      ],
    },
    {
      title: "절전",
      body: [
        "- «USB 선택적 절전» 은 전원 옵션(고급 설정 → USB 설정)의 값입니다. 전원 연결·배터리 따로 읽습니다.",
        "- «전원 절약을 위해 컴퓨터가 이 장치를 끌 수 있음» 은 장치 관리자 → 장치 속성 → 전원 관리 탭의 값입니다. 이 장치와 위 USB 장치·허브 가운데 그 설정이 있는 것만 나옵니다(드라이버가 지원해야 생김).",
        "- 켜져 있으면 «볼 것» 입니다. 대부분 문제 없지만, 오래 켜 두는 감시·기록 PC 에서 변환기가 가끔 끊기면 끄는 것을 검토합니다.",
      ],
    },
    {
      title: "연결 기록",
      body: [
        "- 장치 속성의 마지막 연결·분리 시각과, 이벤트 로그(Microsoft-Windows-Kernel-PnP/Configuration, System 의 Kernel-PnP·UserPnp)에서 이 장치와 위 USB 장치의 이벤트를 기간(7·30·90일)만큼 찾아 최근 것부터 200건까지 보입니다.",
        "- 410 은 장치 시작(꽂을 때마다), 400 은 구성(드라이버 설치), 420 은 삭제, 411 은 시작 문제입니다. 설명 글은 Windows 가 만든 것(PC 언어)입니다.",
        "- 하루에 3번 이상 다시 연결된 날이 있거나 시작 문제·오류 이벤트가 있으면 «볼 것» 입니다 — 케이블·허브·절전을 봅니다.",
        "- 이벤트 로그를 읽을 수 없는 PC(회사 정책 등)에서는 «읽지 못함» 과 까닭이 나옵니다.",
      ],
    },
    {
      title: "COM 번호 예약",
      body: [
        "- Windows 는 한 번 쓴 COM 번호를 장치를 뺀 뒤에도 예약해 둡니다(레지스트리 COM Name Arbiter 의 ComDB). 그래서 새 변환기가 COM15 처럼 높은 번호를 받기도 합니다.",
        "- «예약된 번호» = ComDB, «지금 있는 장치» = 지금 꽂힌 장치의 번호, «지금 없는 장치가 쥔 번호» = 예전 장치, «주인 없는 예약 번호» = 예약됐지만 아는 장치가 없는 번호, «여러 장치가 쥔 번호» = 같은 번호를 두 장치가 받은 경우(한 번에 하나만 쓸 수 있어 «문제 있음»).",
        "- COM17 이상은 «볼 것» 입니다 — 옛 프로그램 가운데 COM1~16 만 고를 수 있는 것이 있습니다.",
        "- «지금 열 수 있는 COM (SERIALCOMM)» 은 드라이버가 지금 열어 둔 COM 이름 목록입니다.",
      ],
    },
    {
      title: "연결 시험 — 루프백·에코",
      id: "loop",
      body: [
        "- 시험 전에 선·버스에서 장비를 뗍니다. 시험 바이트가 장비에 명령으로 들어갈 수 있어, «시험 시작» 을 누르면 한 번 더 묻습니다.",
        "- 루프백: DB9 는 2번(RX)과 3번(TX)을, TTL 변환기는 TX 와 RX 를 잇습니다. 고른 속도(기본 9600·19200·38400·57600·115200)마다 무작위 256바이트를 32바이트씩 보내 받은 것과 비교하고(보냄·같음·잃음·바뀜), 1바이트 왕복을 20번 재서 중앙값·최대(ms)를 보입니다. 첫 묶음에서 아무것도 돌아오지 않으면 그 속도를 일찍 끝냅니다.",
        "- 왕복 시간은 USB 지연·드라이버·이 프로그램 시간을 모두 더한 값입니다. 중앙값이 10ms 이상이면 «볼 것» — FTDI 지연 타이머(기본 16ms) 같은 USB 변환기 설정 때문일 수 있습니다.",
        "- 오류 표시(프레임·패리티·넘침·break)는 시험 끝에 드라이버에 물어 봅니다(ClearCommError). USB 변환기 드라이버가 이 표시를 올려 주는지는 칩마다 달라, «없음» 이 오류가 없었다는 보증은 아닙니다.",
        "- 2선 RS-485 에코: 버스에서 장비를 뗀 채 고른 속도로 «PortDock echo» 를 보내, 같은 바이트가 돌아오면 «에코 있음» 입니다. 에코가 있는 변환기를 쓰면 받는 쪽에 보낸 것이 먼저 섞여 보입니다(PortDock Serial 의 에코 처리·Modbus 도구의 에코 무시가 이것을 다룹니다).",
        "- 다른 프로그램이 포트를 쓰는 중이면 «사용 중» 이 나옵니다. 어느 프로그램인지는 Microsoft Process Explorer 의 «Find → Find Handle or DLL» 에 장치 카드의 «서비스» 이름(예: FTSER2K, usbser)을 넣어 찾습니다.",
        "- 4선(RS-422) 변환기는 TX+–RX+, TX−–RX− 를 이어 루프백으로 시험할 수 있습니다(변환기 설명서의 단자 이름을 봅니다).",
      ],
    },
    {
      title: "이 PC 랜카드",
      body: [
        "- «랜카드 읽기» 를 누르면 실제 랜카드마다 연결 여부·링크 속도·이중(전이중/반이중)·IPv4·게이트웨이를 보입니다.",
        "- 링크 속도·이중은 랜카드가 스위치와 맞춘 값입니다. 10 Mbps 나 반이중이면 케이블·스위치 포트의 자동 협상을 봅니다. 장비 IP 찾기는 PortDock Net Scan 이 합니다.",
        "- 랜카드마다 장치 관리자 «고급» 탭의 값(점보 프레임·수신/송신 버퍼·인터럽트 완화·EEE·흐름 제어·속도/이중·RSS — 보이는 값과 레지스트리 원값), «전원 절약을 위해 끌 수 있음», 받기 오류·버린 패킷(누적), 네트워크 프로필(공용·개인·도메인)과 그 프로필의 방화벽 켜짐을 함께 읽습니다. 모두 관리자 권한 없이 읽습니다.",
        "- «용도» 를 고르면 그 용도에 맞춰 봅니다. «일반» 은 링크·이중·오류만, «GigE 카메라» 는 점보 프레임·수신 버퍼·절전·공용 프로필·방화벽·EEE 까지, «PLC·Modbus TCP 장비» 는 절전·공용 프로필·EEE 까지 봅니다. 어느 쪽이든 «볼 것» 까지만 붙이고 «문제 있음» 으로 단정하지 않습니다.",
        "- «GigE 카메라» 용도면 카메라 제조사 공개 문서(Basler·MathWorks·Balluff·Teledyne)에 적힌 값을 출처 링크와 함께 나란히 보입니다. PortDock 이 정한 권장값이 아니며, 제조사끼리 다른 값(인터럽트 완화 정도 등)은 둘 다 보입니다.",
        "- 점보 프레임은 PC·카메라·스위치 셋 다 맞아야 합니다. PC 쪽 값만으로 «문제 없음» 이라고 볼 수 없습니다. 드라이버가 표준 키워드를 쓰지 않으면 그 항목은 «이 드라이버는 알려 주지 않음» 으로 보입니다.",
        "- 방화벽은 프로필이 켜졌는지만 읽습니다. 포트·프로그램별 규칙은 이 화면에서 읽지 않습니다.",
        "- 값을 바꾸려면 장치 관리자 → 네트워크 어댑터 → 그 랜카드 → 속성 → «고급»·«전원 관리» 탭에서 직접 합니다(관리자 권한).",
      ],
    },
    {
      title: "이 PC — 장비 PC 설정",
      id: "pc",
      body: [
        "- «이 PC 설정 읽기» 를 누르면 장비를 돌리는 PC 에서 자주 문제가 되는 Windows 설정과 최근 기록을 관리자 권한 없이 읽습니다. 고른 COM 포트와는 상관없는 PC 전체 값입니다.",
        "- 전원·절전: 빠른 시작(최대 절전이 꺼져 있으면 쓰이지 않음), 지금 전원 계획의 절전·최대 절전·화면 끄기 시간, PCI Express 링크 상태 전원 관리, USB 선택적 절전 — 전원 연결·배터리 따로.",
        "- 업데이트·재시작: 업데이트 정책(그룹 정책 값 — 자동 업데이트·AUOptions·로그인 중 자동 재시작 안 함·드라이버 제외), 사용 시간(활동 시간), 재시작 대기(Windows 업데이트 RebootRequired·구성 요소 RebootPending·다음 시작 때 파일 바꾸기 예약).",
        "- 화면 보호기·시간: 화면 보호기와 대기 시간·로그온 화면, 시간 동기화 방식(NTP·도메인·동기화 안 함)·서버·W32Time 서비스 시작 유형, 시간 서비스 이벤트의 마지막 «시간 원본과 동기화» 기록과 경고 수.",
        "- 최근 기록: 고른 기간(7·30·90일)의 예기치 않은 종료(Kernel-Power 41·EventLog 6008)와 하드웨어 경고·오류(WHEA-Logger·disk·Ntfs) 건수와 마지막 시각. 예기치 않은 종료의 원인(정전·전원 버튼·멈춤)은 PC 가 알지 못합니다.",
        "- «용도» 가 «일반 PC» 면 설정 값은 적기만 하고 기록(예기치 않은 종료·하드웨어 오류)만 «볼 것» 으로 표시합니다. «장비 PC» 를 고르면 빠른 시작 켜짐·절전 진입·USB 선택적 절전·자동 재시작을 막는 정책 없음·재시작 대기·시간이 맞춰지지 않음에도 «볼 것» 을 붙입니다.",
        "- 정답은 현장마다 다릅니다. 사무용 PC 엔 켜 두는 게 맞는 값(업데이트·절전)이 대부분이라 «볼 것» 까지만 붙이고 «문제 있음» 으로 단정하지 않습니다. 업데이트를 끄라고 권하지 않습니다 — 사용 시간·재시작 정책은 Microsoft 문서 «Configure policy settings on IoT devices» 를 봅니다.",
        "- 항목마다 «바꾸는 곳»(설정·제어판·그룹 정책 경로)이 함께 나옵니다. 이 프로그램은 바꾸지 않습니다.",
        "- 관리자만 읽을 수 있는 것 — 절전을 막는 프로그램(powercfg /requests), Microsoft Defender 예외, 디스크 SMART — 은 읽지 않고 «관리자만 읽을 수 있음» 으로 적습니다.",
      ],
    },
    {
      title: "무선 — Wi-Fi·블루투스 (0.5.0 부터)",
      id: "wireless",
      body: [
        "- 가운데 위 «무선 (Wi-Fi·블루투스)» 탭을 처음 열면 이 PC 의 Wi-Fi·블루투스를 관리자 권한·위치 권한 없이 읽습니다. 고른 COM 포트와는 상관없습니다. 핑 같은 트래픽을 보내지 않고, 주변 장치를 검색하지 않습니다. F4 로 다시 읽습니다.",
        "- Wi-Fi: 무선 어댑터(제품 이름·연결됨/연결 안 됨), 드라이버(제공자·버전·날짜), 장치 «전원 절약을 위해 컴퓨터가 이 장치를 끌 수 있음», 전원 계획의 «무선 어댑터 절전 모드»(전원 연결·배터리), 고른 기간(7·30·90일)의 끊김 기록(이벤트 뷰어 WLAN-AutoConfig 이벤트 8003 — 이유별 건수와 마지막 시각), 드라이버 경고·오류(System 로그).",
        "- 연결된 네트워크 이름(SSID)·신호·채널은 Windows 가 위치 권한으로 묶어 두어 읽지 않습니다. 끊김 기록에서도 이유 코드·문구만 꺼내고 네트워크 이름은 버립니다. 이유 문구는 Windows 가 남긴 그대로(PC 언어)라 원인이 아니라 증상일 수 있습니다.",
        "- 블루투스: 어댑터(라디오)·드라이버·장치 절전, USB 동글이면 USB 경로(허브를 거치는지), Bluetooth 지원 서비스·오디오 게이트웨이 서비스 상태, System 로그의 BTHUSB·BTHPORT 경고·오류, 블루투스 오디오 끝점이 핸즈프리(통화용)인지 스테레오인지와 기본 장치인지.",
        "- «볼 것» 이 붙는 것: 장치 절전 켜짐, 전원 연결 상태에서도 무선 어댑터 절전, 끊김이 평균 일주일에 5번 이상, 드라이버·블루투스 오류 수준 이벤트, 블루투스 동글이 USB 허브를 거침, Bluetooth 지원 서비스가 멈춤·사용 안 함, 핸즈프리 끝점이 기본 출력 장치, 장치 관리자 문제 코드. 모두 원인 후보일 뿐이라 «문제 있음» 으로 단정하지 않습니다.",
        "- 핸즈프리: 회의·통화 앱이 헤드셋 마이크를 열면 블루투스 헤드셋은 핸즈프리 프로필로 바뀌어 소리가 모노·낮은 음질이 됩니다. 음악·영상에는 «헤드폰»(스테레오) 끝점을 기본 출력으로 고르고, 통화 앱의 마이크를 PC 마이크로 바꾸면 바뀌지 않습니다.",
        "- 항목마다 «바꾸는 곳» 이 함께 나오고, 블루투스 항목에는 Microsoft 지원 문서 «Bluetooth keeps disconnecting in Windows» 링크가 붙습니다. 이 프로그램은 설정을 바꾸지 않습니다.",
        "- 이 탭의 «텍스트 복사»·«JSON 복사»·«저장…» 은 무선 결과만 담고, 블루투스 오디오 장치 이름을 «장치 1» 처럼 가립니다. 화면에는 그대로 보입니다.",
        "- PC 가 볼 수 없는 것: 네트워크 이름·신호·채널·주변 Wi-Fi, 공유기·통신사 쪽과 인터넷 속도, 2.4GHz 간섭(전자레인지·USB 3 장치), 헤드셋 쪽 배터리·펌웨어, 짝지은 장치 목록. 관리자만 읽을 수 있는 Windows 무선 보고서(netsh wlan show wlanreport)는 읽지 않습니다.",
      ],
    },
    {
      title: "PC 가 볼 수 없는 것",
      id: "cannot",
      body: [
        "- RS-485 A/B(+/−) 뒤바뀜 — 제조사마다 이름이 다릅니다.",
        "- 종단 저항(양 끝 120Ω)·바이어스 저항, 접지·공통선(GND)·차폐.",
        "- 장비 쪽 설정(국번·속도·패리티)과 배선 길이·잡음.",
        "- 이런 것은 화면 아래 가이드(RS-485 배선, 바이어스·종단, USB 시리얼 지연, Modbus 응답 없음, RS-232 DB9·널 모뎀)를 보고 따로 확인합니다.",
      ],
    },
    {
      title: "고치는 법(직접)",
      body: [
        "- 이 프로그램은 값을 바꾸지 않습니다. 바꿀 때는 Windows 화면에서 직접 합니다(관리자 권한이 필요할 수 있음).",
        "- FTDI 지연 타이머: 장치 관리자 → 포트(COM & LPT) → 장치 속성 → 포트 설정 → 고급 → «지연 타이머(msec)». 1 은 FTDI 가 권하지 않으므로 2~4 쯤으로 줄여 봅니다. 적용하려면 변환기를 다시 꽂아야 할 수 있습니다.",
        "- 장치 절전: 장치 관리자 → 장치(또는 위 USB 장치·허브) 속성 → 전원 관리 → «전원 절약을 위해 컴퓨터가 이 장치를 끌 수 있음» 끄기.",
        "- USB 선택적 절전: 제어판 → 전원 옵션 → 설정 변경 → 고급 전원 관리 옵션 변경 → USB 설정 → USB 선택적 절전 설정 «사용 안 함».",
        "- 이 PC 설정(빠른 시작·절전·업데이트·시간 동기화 등): 이 PC 카드의 항목마다 나오는 «바꾸는 곳» 에서 합니다.",
        "- 지금 없는 장치·유령 COM 번호: 장치 관리자 → 보기 → «숨겨진 장치 표시» 에서 흐린 포트 장치를 제거하면 그 번호가 풀립니다. ComDB 를 레지스트리에서 직접 고치는 것은 잘못하면 두 장치가 같은 번호를 받으므로 권하지 않습니다.",
      ],
    },
    {
      title: "내보내기",
      body: [
        "- «텍스트 복사»: 카드별 결과·읽은 값·연결 시험·«PC 가 볼 수 없는 것» 을 글로 복사합니다(이슈·메일에 붙이기 좋게).",
        "- «JSON 복사»: 읽은 값 전부를 JSON 으로 복사합니다.",
        "- «저장…»(Ctrl+S): 파일 이름을 .txt 로 두면 텍스트, .json 으로 바꾸면 JSON 으로 저장합니다.",
        "- 사용자 폴더 경로(C:\\Users\\이름\\…)는 «~» 로 가립니다. 장치 인스턴스 ID·일련번호는 그대로 들어가므로 붙이기 전에 한 번 봅니다.",
        "- «Serial 로 열기»: 고른 포트(지금 꽂혀 있는 장치)를 PortDock Serial 에 채워 엽니다. 연결은 그 창에서 누릅니다. 이 PC 에서 Serial 을 찾지 못하면 포트 이름을 복사하고 내려받기 페이지를 알려 줍니다.",
      ],
    },
    {
      title: "설정",
      body: ["- ⚙ 에서 언어·테마·글자 크기·«항상 위»·문제 보고를 정합니다.", ...settingsLines("ko")],
    },
    {
      title: "단축키와 팁",
      body: [
        "- F4: 다시 읽기(목록·고른 포트·기록).",
        "- Ctrl+S: 결과 저장.",
        "- F1 또는 화면의 ? 버튼: 이 도움말. Esc 로 닫습니다.",
        "- 칸에 마우스를 올리면 설명이 나옵니다.",
      ],
    },
    {
      title: "문제 해결",
      body: [
        "- 목록이 비었음: 이 PC 에 COM 포트 장치가 없습니다. 변환기를 꽂고 ↻, 예전 장치를 보려면 «지금 없는 장치도 보기».",
        "- 변환기를 꽂았는데 목록에 없음: 드라이버가 없어 «포트» 가 아닌 «기타 장치» 로 잡혔을 수 있습니다(문제 코드 28). 장치 관리자에서 확인하고 칩 제조사 드라이버를 설치합니다.",
        "- «읽지 못함»(WMI·이벤트 로그): 회사 정책으로 막힌 PC 에서 나옵니다. 다른 카드는 그대로 읽힙니다.",
        "- 연결 시험에서 아무것도 돌아오지 않음: TX·RX 연결, 변환기 전원·LED, 그 속도를 변환기가 받는지 봅니다.",
        "- 프로그램이 열리지 않음: Microsoft Edge WebView2 가 필요합니다(Windows 11 에는 들어 있음).",
      ],
    },
  ],
  en: [
    {
      title: "About",
      body: [
        "PortDock Port Inspector gathers, for one COM port, what you would otherwise dig out of Device Manager, Event Viewer and the registry: the device and driver (provider, version, date, INF), the Device Manager problem code and what it means, the USB chip (VID/PID), device settings such as the FTDI latency timer, the Windows port default, USB power saving, recent plug and driver history, and COM number reservations.",
        "It only reads, without administrator rights. It never changes the registry, device settings or drivers, and it does not scan other programs' handles.",
        "With TX tied to RX, «Connection test» checks that bytes come back unchanged at each speed and measures the round trip (ms); it also tells whether a 2-wire RS-485 adapter receives what it sends (echo).",
        "Results are marked «No issue found (in what was read) / Worth a look / Problem / Could not read». It speaks only about what the PC can read, so what the PC cannot see — wiring, termination, bias, ground — is always listed at the bottom.",
      ],
    },
    {
      title: "Getting started",
      id: "start",
      body: [
        "- 1. Click a port in the «COM ports» list on the left. To include devices plugged in earlier, turn on «Show devices not connected now».",
        "- 2. Cards appear in the middle: device and driver, USB path (for USB devices), settings, power saving, history, COM number reservations, connection test, network adapters, this PC. Each card header shows a result; for «Worth a look» or «Problem» the reason is on the line below.",
        "- 3. For a problem report or question, use «Copy text» (or «Save…») at the top. User folder paths are masked as «~».",
        "- On first start these steps show as a card in the empty area. «Don't show again» turns it into a one-line hint.",
      ],
    },
    {
      title: "Screen layout",
      body: [
        "- Left: the COM port list (connected first, by COM number). Devices with a problem code show a red number, devices not connected now show «not connected», and COMs not in the port device list (modems, virtual COM drivers …) show «no device info». ↻ reloads the list.",
        "- Tabs at the very top of the middle: «COM ports» (the cards below) and «Wireless (Wi-Fi, Bluetooth)» — the wireless tab looks at this PC's Wi-Fi and Bluetooth regardless of the chosen COM port (from 0.5.0, see «Wireless»).",
        "- Top toolbar: the chosen port and the overall result (the heaviest of the cards), read time, «Refresh» (F4), «Copy text», «Copy JSON», «Save…».",
        "- Click a card header to fold or unfold it (remembered per card). With «Expand all» in Settings every card starts open.",
        "- The «What the PC cannot see» box with portdock.dev guide links is always shown at the bottom.",
        ...windowLines("en"),
      ],
    },
    {
      title: "Result marks",
      id: "levels",
      body: [
        "- No issue found (in what was read): nothing in the values read looks wrong. It does not mean the wiring or device settings are fine.",
        "- Worth a look: a value that may or may not matter (e.g. FTDI latency timer 16 ms, power saving on, COM17 or higher). Usually fine as is; check it if it matches your symptom.",
        "- Problem: used only for facts — a Device Manager problem code, two devices holding the same COM number, bytes lost or changed in the loopback test.",
        "- Could not read: the value could not be read because of rights, policy or the driver. The other cards are still read; the card or the line below says what and why.",
      ],
    },
    {
      title: "Device, driver and problem codes",
      body: [
        "- Shows name, COM number, instance ID (⧉ copies it), VID:PID, chip, USB product name (as reported by the device), manufacturer, location (USB hub port), driver provider, version, date, INF, service name, status, last plugged in / removed and first install time.",
        "- Problem codes are the numbers Device Manager shows (10 cannot start, 28 no driver, 43 device reported problems …). Meanings are condensed from Microsoft's «Device Manager error messages»; «What to try» lists what to try first with a USB-serial adapter.",
        "- The chip comes from a VID/PID table (FTDI, Prolific PL2303, WCH CH34x, Silicon Labs CP210x … — only numbers listed by the vendors or public driver device tables). Clones reuse the same numbers, so it is «the name for the number the device reports».",
        "- Clues: FTDI PID 0000 (a 2014 driver rewrote clone chips' PID to 0) and Prolific + problem code 10 (common with discontinued revisions or clones) are flagged «Worth a look» — not conclusive.",
        "- «Devices above»: when a COM device sits under a separate USB device (as with FTDI), its name.",
      ],
    },
    {
      title: "Settings — port default and FTDI latency timer",
      body: [
        "- «Windows port default» is the value in the registry Ports key (e.g. 9600,n,8,1). The speed and parity a program sets when it opens the port take precedence, so it rarely matters for a device link.",
        "- «Device settings (Device Parameters)» shows the values the driver stored for the device, names and values as is. Explanations are added only for names confirmed by public documents (FTDI LatencyTimer, PortName).",
        "- FTDI latency timer (LatencyTimer, default 16 ms): unless the buffer fills, data waits this long before going to the PC. Fast short request/response traffic such as Modbus RTU polling can look slow, so 16 or more is «Worth a look».",
      ],
    },
    {
      title: "USB path",
      body: [
        "- For a USB adapter, each step from the device up through hubs and the root hub to the USB controller is shown on its own line — the same chain as Device Manager's «Devices by connection» view.",
        "- Port: which port of the hub just above it is plugged into. Negotiated speed: what that hub reports (Low 1.5 Mbps · Full 12 Mbps · High 480 Mbps · SuperSpeed 5 Gbps or more). Most USB-serial chips connect at Full Speed, which is far faster than the serial line, so it is not slow.",
        "- Hub power: bus-powered (power only over USB, no adapter) or self-powered. With several devices on a bus-powered hub, power can run short.",
        "- If a device that reports USB 3 capability is connected at a lower speed, it is marked «Worth a look» — the cable or a USB 2 port may be why. Going through hubs and bus-powered hubs are noted only, not judged.",
        "- Hubs are only sent status queries (no administrator rights needed). Hub reset counts and current draw are not read.",
      ],
    },
    {
      title: "Power saving",
      body: [
        "- «USB selective suspend» is the power options value (Advanced settings → USB settings), read for plugged in and on battery.",
        "- «Allow the computer to turn off this device to save power» is the Power Management tab in Device Manager. Only this device and the USB devices or hubs above it that have the setting are listed (the driver must support it).",
        "- When on it is «Worth a look». Usually harmless, but on a PC that monitors or logs for long periods, consider turning it off if the adapter drops now and then.",
      ],
    },
    {
      title: "History",
      body: [
        "- The last plugged-in and removed times from the device properties, plus events for this device and the USB device above it from the event logs (Microsoft-Windows-Kernel-PnP/Configuration, and Kernel-PnP / UserPnp in System) over the chosen period (7, 30 or 90 days), newest first, up to 200.",
        "- 410 is device started (every plug-in), 400 configured (driver install), 420 deleted, 411 start problem. The descriptions are written by Windows (in the PC's language).",
        "- Days with 3 or more reconnects, or start-problem / error events, are «Worth a look» — check the cable, hub and power saving.",
        "- On a PC where the event logs cannot be read (company policy), «Could not read» appears with the reason.",
      ],
    },
    {
      title: "COM number reservations",
      body: [
        "- Windows keeps a COM number reserved even after the device is removed (ComDB under COM Name Arbiter in the registry), which is why a new adapter may get a high number such as COM15.",
        "- «Reserved numbers» = ComDB, «Devices connected now» = numbers of plugged-in devices, «Numbers held by devices not connected now» = earlier devices, «Reserved numbers with no device» = reserved but no known device, «Numbers held by more than one device» = two devices got the same number (only one can be used at a time — «Problem»).",
        "- COM17 or higher is «Worth a look» — some older programs only offer COM1–16.",
        "- «COM names openable now (SERIALCOMM)» lists the COM names drivers have open right now.",
      ],
    },
    {
      title: "Connection test — loopback and echo",
      id: "loop",
      body: [
        "- Disconnect the device from the line or bus first. Test bytes could reach a device as commands, so «Start test» asks once more.",
        "- Loopback: on a DB9 tie pin 2 (RX) to pin 3 (TX); on a TTL adapter tie TX to RX. For each chosen speed (default 9600, 19200, 38400, 57600, 115200) it sends 256 random bytes in 32-byte chunks and compares what comes back (sent, same, lost, changed), then times 20 one-byte round trips (median and max, ms). If nothing comes back in the first chunk, that speed ends early.",
        "- The round trip includes USB latency, driver and program time. A median of 10 ms or more is «Worth a look» — possibly a USB adapter setting such as the FTDI latency timer (default 16 ms).",
        "- Error flags (framing, parity, overrun, break) are asked from the driver at the end (ClearCommError). Whether a USB adapter driver raises them varies by chip, so «none» does not guarantee there were no errors.",
        "- 2-wire RS-485 echo: with no device on the bus it sends «PortDock echo» at the chosen speed; if the same bytes come back it reports an echo. With such an adapter your own bytes show up before the reply (PortDock Serial's echo handling and the Modbus tools' echo skip deal with this).",
        "- If another program has the port open you get «busy». To find which one, search for the «Service» name from the device card (e.g. FTSER2K, usbser) with «Find → Find Handle or DLL» in Microsoft Process Explorer.",
        "- A 4-wire (RS-422) adapter can be loopback-tested by tying TX+ to RX+ and TX− to RX− (check the terminal names in the adapter manual).",
      ],
    },
    {
      title: "Network adapters on this PC",
      body: [
        "- «Read adapters» lists each physical adapter with connection, link speed, duplex (full/half), IPv4 and gateway.",
        "- Link speed and duplex are what the adapter negotiated with the switch. With 10 Mbps or half duplex, check the cable and auto-negotiation on the switch port. To find device IPs, use PortDock Net Scan.",
        "- For each adapter it also reads the Device Manager «Advanced» tab values (jumbo frames, receive/transmit buffers, interrupt moderation, EEE, flow control, speed/duplex, RSS — shown value and registry value), «allow the computer to turn off this device», receive errors and discards (cumulative), the network profile (Public, Private, Domain) and whether the firewall is on for it. All without administrator rights.",
        "- Pick a «Use» to look at it for that use. «General» looks at link, duplex and errors only; «GigE camera» adds jumbo frames, receive buffers, power saving, Public profile, firewall and EEE; «PLC / Modbus TCP device» adds power saving, Public profile and EEE. Either way it marks at most «Worth a look», never «Problem».",
        "- With «GigE camera», values from camera vendors' public docs (Basler, MathWorks, Balluff, Teledyne) are shown side by side with links. They are not PortDock recommendations; where vendors differ (interrupt moderation rate, for example) both are shown.",
        "- Jumbo frames must match on the PC, the camera and the switch — the PC value alone cannot show there is no issue. If a driver does not use the standard keyword, that item shows «not reported by this driver».",
        "- For the firewall, only whether each profile is on is read. Per-port and per-program rules are not read here.",
        "- To change values, use Device Manager → Network adapters → the adapter → Properties → «Advanced» and «Power Management» tabs (administrator).",
      ],
    },
    {
      title: "This PC — equipment PC settings",
      id: "pc",
      body: [
        "- «Read this PC's settings» reads, without administrator rights, the Windows settings and recent records that often matter on a PC running equipment. These are PC-wide values, not tied to the chosen COM port.",
        "- Power and sleep: fast startup (not in effect when hibernation is off), the current power plan's sleep, hibernate and display-off times, PCI Express Link State Power Management and USB selective suspend — plugged in and on battery.",
        "- Updates and restarts: update policy (group policy values — automatic updates, AUOptions, no auto-restart with logged-on users, drivers excluded), active hours, and pending restarts (Windows Update RebootRequired, component servicing RebootPending, files scheduled to be replaced at next start).",
        "- Screen saver and time: the screen saver with its wait time and logon screen, the time sync type (NTP, domain, no sync), server and W32Time service start type, and from time service events the last «synchronizing with time source» record and the warning count.",
        "- Recent records: counts and last times of unexpected shutdowns (Kernel-Power 41, EventLog 6008) and hardware warnings and errors (WHEA-Logger, disk, Ntfs) in the chosen period (7, 30 or 90 days). The PC cannot tell what caused an unexpected shutdown (power cut, power button, hang).",
        "- With «Use» set to «General PC», settings are only listed and just the records (unexpected shutdowns, hardware errors) are marked «Worth a look». With «Equipment PC», fast startup on, sleep, USB selective suspend, no policy holding back automatic restarts, a pending restart and an unsynced clock are marked too.",
        "- The right values differ from site to site. Most of them (updates, sleep) are right to keep on an office PC, so it marks at most «Worth a look», never «Problem». It never advises turning updates off — for active hours and restart policies see Microsoft's «Configure policy settings on IoT devices».",
        "- Each item shows «Where to change» (Settings, Control Panel or group policy path). This program does not change them.",
        "- What only an administrator can read — programs keeping the PC awake (powercfg /requests), Microsoft Defender exclusions, disk SMART — is not read and is listed as «Administrator only».",
      ],
    },
    {
      title: "Wireless — Wi-Fi and Bluetooth (from 0.5.0)",
      id: "wireless",
      body: [
        "- The first time you open the «Wireless (Wi-Fi, Bluetooth)» tab at the top of the middle area, it reads this PC's Wi-Fi and Bluetooth without administrator or location permission. It is not tied to the chosen COM port. It sends no traffic such as pings and does not scan for nearby devices. F4 reads again.",
        "- Wi-Fi: the wireless adapter (product name, connected or not), its driver (provider, version, date), the device's «Allow the computer to turn off this device to save power», the power plan's «Wireless Adapter Settings → Power Saving Mode» (plugged in and on battery), disconnect records in the chosen period (7, 30 or 90 days — WLAN-AutoConfig event 8003 in Event Viewer, counted by reason with the last time), and driver warnings and errors (System log).",
        "- Windows ties the connected network name (SSID), signal and channel to location permission, so they are not read. From the disconnect records only the reason code and text are taken; network names are dropped. The reason text is what Windows logged (in the PC's language), so it may be a symptom rather than the cause.",
        "- Bluetooth: the adapter (radio), driver and device power saving, the USB path for a USB dongle (whether it goes through a hub), the state of the Bluetooth Support Service and the Audio Gateway service, BTHUSB and BTHPORT warnings and errors in the System log, and whether Bluetooth audio endpoints are hands-free (calls) or stereo and which one is the default.",
        "- Marked «Worth a look»: device power saving on, wireless power saving even when plugged in, disconnects averaging 5 or more a week, error-level driver or Bluetooth events, a Bluetooth dongle behind a USB hub, the Bluetooth Support Service stopped or disabled, a hands-free endpoint as the default output, and a Device Manager problem code. These are only possible causes, so it never says «Problem».",
        "- Hands-free: when a meeting or call app opens the headset microphone, a Bluetooth headset switches to the hands-free profile and the sound becomes mono and lower quality. For music and video, make the «Headphones» (stereo) endpoint the default output; setting the call app's microphone to the PC's own microphone avoids the switch.",
        "- Each item shows «Where to change», and the Bluetooth items link to Microsoft's support article «Bluetooth keeps disconnecting in Windows». This program does not change any setting.",
        "- «Copy text», «Copy JSON» and «Save…» on this tab contain only the wireless results and hide Bluetooth audio device names as «Device 1» and so on. The screen still shows the names.",
        "- What the PC cannot see: the network name, signal, channel and nearby Wi-Fi, the router and provider side and internet speed, 2.4 GHz interference (microwave ovens, USB 3 devices), the headset's battery and firmware, and the list of paired devices. The Windows wireless report (netsh wlan show wlanreport) needs administrator rights and is not read.",
      ],
    },
    {
      title: "What the PC cannot see",
      id: "cannot",
      body: [
        "- RS-485 A/B (+/−) swapped — makers label them differently.",
        "- Termination (120 Ω at both ends) and bias resistors, ground / common (GND) and shielding.",
        "- Device-side settings (Slave ID, baud, parity), cable length and noise.",
        "- Check these separately with the guides at the bottom (RS-485 wiring, bias and termination, USB serial latency, Modbus no response, RS-232 DB9 and null modem).",
      ],
    },
    {
      title: "Fixing things (by hand)",
      body: [
        "- This program never changes values. Change them yourself in Windows (administrator rights may be needed).",
        "- FTDI latency timer: Device Manager → Ports (COM & LPT) → device properties → Port Settings → Advanced → «Latency Timer (msec)». FTDI does not recommend 1, so try about 2–4. The adapter may need replugging to apply it.",
        "- Device power saving: Device Manager → device (or the USB device / hub above it) properties → Power Management → turn off «Allow the computer to turn off this device to save power».",
        "- USB selective suspend: Control Panel → Power Options → Change plan settings → Change advanced power settings → USB settings → USB selective suspend setting «Disabled».",
        "- This PC's settings (fast startup, sleep, updates, time sync …): use «Where to change» shown for each item in the This PC card.",
        "- Devices not connected now and orphan COM numbers: Device Manager → View → «Show hidden devices», then uninstall the dimmed port devices to free their numbers. Editing ComDB in the registry by hand is not recommended — a mistake can give two devices the same number.",
      ],
    },
    {
      title: "Export",
      body: [
        "- «Copy text»: copies each card's result, the values read, the connection test and «What the PC cannot see» as text (handy for issues and mail).",
        "- «Copy JSON»: copies every value read as JSON.",
        "- «Save…» (Ctrl+S): a .txt name saves text, a .json name saves JSON.",
        "- User folder paths (C:\\Users\\name\\…) are masked as «~». Device instance IDs and serial numbers stay in, so have a look before pasting.",
        "- «Open in Serial»: opens PortDock Serial with the selected port (a device plugged in now) filled in. Press connect in that window. If Serial is not found on this PC, the port name is copied and the download page is offered.",
      ],
    },
    {
      title: "Settings",
      body: ["- ⚙ sets language, theme, font size, «Always on top» and problem reporting.", ...settingsLines("en")],
    },
    {
      title: "Shortcuts and tips",
      body: ["- F4: refresh (list, chosen port and history).", "- Ctrl+S: save the result.", "- F1 or the ? button: this help. Close it with Esc.", "- Hover over a field to see a tooltip."],
    },
    {
      title: "Troubleshooting",
      body: [
        "- Empty list: this PC has no COM port device. Plug an adapter in and press ↻; to see earlier devices, turn on «Show devices not connected now».",
        "- An adapter is plugged in but not listed: without a driver it may show under «Other devices» instead of «Ports» (problem code 28). Check Device Manager and install the chip vendor's driver.",
        "- «Could not read» (WMI, event log): appears on PCs where company policy blocks it. The other cards are still read.",
        "- Nothing comes back in the connection test: check the TX–RX link, adapter power and LEDs, and that the adapter accepts that speed.",
        "- The program does not open: Microsoft Edge WebView2 is required (included in Windows 11).",
      ],
    },
  ],
};
