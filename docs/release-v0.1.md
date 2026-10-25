# v0.1 공개 릴리스 점검표

첫 공개판(v0.1.0)을 내기 전에 확인할 것. 일반 절차는 [release.md](release.md), 남은 기술 할 일은 [todo.md](todo.md).

## 1. 준비
- [x] GitHub `portdock/PortDock` 공개 저장소 · CI
- [x] 홈페이지 Cloudflare Pages → `portdock.dev`(`site/README.md` 순서)
- [x] 문의 메일(portdock.contact@gmail.com) · 오류 보고(Sentry, EU·IP 저장 안 함)
- [ ] 코드 서명(SignPath Foundation 등) 여부

## 2. 빌드·실기 점검
- [ ] 첫 태그 전에 GitHub Actions `release.yml` 를 수동 실행(workflow_dispatch) → 설치판·휴대판·SHA256 이 만들어지는지
- [ ] `docs/test-plan.md` C1~C33 — 특히 C25(포트 바뀜) · C26(UDP 같은 포트) · C27(FC06) · C28(쪼개진 Modbus) · C30(설치기) · C32(휴대판) · C33(WebView2 없음)
- [ ] 백신 검사: 설치판(온라인·오프라인)·휴대판을 VirusTotal 에 올려 결과 링크를 릴리스 본문에
- [ ] 오탐이 하나라도 나오면 공개 전에 Microsoft Defender 에 제출(<https://www.microsoft.com/wdsi/filesubmission>, «소프트웨어 개발자» 로, 오탐 신고) → 판정이 바뀐 뒤 VirusTotal 다시 검사. winget 은 Defender·다중 백신 검사에 걸리면 정당성과 상관없이 거부하고, Chocolatey 는 VirusTotal 탐지 수로 반려·사람 검토를 가르므로 winget·Chocolatey 등록보다 먼저 한다
- [ ] 화면: `e2e/ui-preview` 캡처로 글자 잘림 확인(실행 없이)

## 3. 릴리스
- [ ] 열 앱 버전 `0.1.0` 확인(`tauri.conf.json` · `Cargo.toml` workspace · 각 `package.json`)
- [ ] `node tools/notices.mjs --check` (제3자 고지 최신)
- [ ] 태그 `v0.1.0` → 초안 릴리스 확인 → 본문(아래) · VirusTotal 링크 → 공개
- [ ] 사이트 내려받기 링크(`/releases/latest/download/PortDock-<App>-setup.exe`)가 실제 파일로 이어지는지
- [ ] winget·Scoop 매니페스트 만들기(공개 뒤 — 릴리스의 `SHA256SUMS.txt` 로 버전 주소·해시를 채움, 결과는 `dist-packages/`, 저장소엔 안 올라감):
  ```powershell
  node tools/winget.mjs --version 0.1.0 --date <공개일 YYYY-MM-DD>   # → dist-packages/winget/manifests/p/PortDock/<App>/0.1.0/ (패키지 10개 × 4파일)
  node tools/scoop.mjs  --version 0.1.0                     # → dist-packages/scoop/bucket/portdock-<app>.json (휴대판 zip 기준 10개)
  # 공개 전 초안 단계라면 초안의 SHA256SUMS.txt 를 받아 --sums SHA256SUMS.txt 로
  winget validate dist-packages/winget/manifests/p/PortDock/Serial/0.1.0   # 패키지마다
  ```
  - winget: 패키지 ID `PortDock.<App>`(Serial·ModbusSlave·TCP·UDP·Simulator·NetScan·ModbusMaster·SCPI·Plot·PortInspector), NSIS 무인 설치 `/S`, 사용자 범위. winget-pkgs 는 **PR 하나에 패키지 버전 하나** → PR 10개. 제출 전 Windows Sandbox 시험(`.\Tools\SandboxTest.ps1 <폴더>`), VirusTotal·Defender 가 깨끗한 뒤에(2절). 제출은 사용자 확인 뒤
  - Scoop: 자체 bucket 저장소(예: `portdock/scoop-bucket`)의 `bucket/` 에 넣으면 `scoop bucket add portdock https://github.com/portdock/scoop-bucket` → `scoop install portdock/portdock-serial`. `checkver`·`autoupdate` 가 있어 다음 버전은 `scoop`의 자동 갱신(또는 다시 이 명령)으로
  - 0.1.0: Scoop 매니페스트 10개를 [portdock/scoop-bucket](https://github.com/portdock/scoop-bucket) 에 올림(Scoop `schema.json` 으로 검사), winget 매니페스트 10개는 `winget validate` 통과 — 제출 전
- [ ] Google Search Console · 네이버 서치어드바이저 등록, sitemap 제출

## 4. 릴리스 본문 초안 (v0.1.0)
기능 문구는 코드 기준(`site/src/data/tools.ts`·README 와 같은 내용). 실기 점검(2절)을 마치기 전이므로 «검증됨»·«시험 완료» 같은 말은 쓰지 않는다.

**PortDock 0.1.0 — 첫 공개판.** 현장 하드웨어 시험용 무료 통신 도구 열 가지(윈도우 10·11, 64비트).
- **Serial** — 시리얼(COM) 송수신, USB 장치 정보·자동 재연결, 신호선, RS-485 송신 방향 제어, 프레임 구분 4가지, 체크섬 9종 + 사용자 정의 CRC, Modbus RTU 풀이·요청 만들기, 자동응답·트리거, 명령 목록·반복, 파일 보내기, Break 신호, 파일 기록
- **Modbus Slave** — Modbus 장비 흉내: 시리얼 RTU·Modbus TCP·RTU over TCP, 표 4종(32비트·실수·문자열 칸), 국번 여러 개, 함수 16(마스크 쓰기)·17(읽고 쓰기)·08(진단 00)·2B/0E(장치 식별)까지 응답, 값 자동 변화, 장애 주입(지연·무응답·CRC·MBAP 길이·예외), 내장 장비 45종 흉내, CSV 레지스터 맵·JSON 저장
- **TCP** — 클라이언트·서버·중계(모니터), 여러 접속·상대별 보내기, 에코, 자동 재접속, keepalive, Modbus TCP 프레임 구분
- **UDP** — 송수신, 보내온 상대 목록, 브로드캐스트·멀티캐스트, 에코
- **Simulator** — 규칙(받으면 → 답하기)으로 장비 흉내, 시리얼·TCP 서버·TCP 클라이언트·UDP, 와일드카드 패턴·응답 템플릿({counter}·{crc} 등), 응답 지연·무응답 흉내, 장비가 먼저 보내기(하트비트), 규칙 묶음 파일
- **Net Scan** — 랜카드 대역 핑·ARP 훑기(관리자 권한 불필요), MAC 제조사(내장 목록), 산업 포트 판정(502·2004·5000~5010·102·44818·4840 등)과 Modbus 장치 식별(FC 2B/0E), 지난 찾기와 비교(새로 나타남·사라짐)·결과 CSV, 장기 핑 감시(CSV), Wake-on-LAN
- **Modbus Master** — Modbus RTU·TCP·RTU over TCP 폴링, 여러 폴링 표, 타입 값(U16~F64·문자열·바이트 순서·40001 표기), 05·06·0F·10 쓰기와 바이트 미리보기, 국번·주소 범위 찾기, 내장 장비 45종 프로필, 타임아웃·재시도·요청 간격, 예외 풀이, 통계, 값 CSV 기록, 추세, CSV 레지스터 맵(Slave 와 같은 형식)
- **SCPI** — VISA 없이 LAN 소켓(5025)·RS-232, 질의·쓰기·읽기와 응답 시간, `*IDN?` 식별, 오류 큐 비우기, `*OPC?` 기다림, 반복 측정(값 표·추세·통계·CSV), 블록 데이터 HEX 미리보기·파일 저장. VXI-11 은 다음 판, HiSLIP·USBTMC·GPIB 는 VISA·드라이버가 필요해 넣지 않음
- **Plot** — 시리얼·TCP·UDP 숫자를 실시간 그래프로: 글자 줄(구분자 자동)·`이름:값`·바이너리 프레임, 채널 32개·좌우 축, 멈춤·커서·두 점 Δ·확대, 받는 동안 CSV 기록, CSV·PNG 저장
- **Port Inspector** — COM 포트 하나를 관리자 권한 없이 읽기만: 장치·드라이버(제공자·버전·날짜·INF), 장치 관리자 문제 코드와 뜻·해 볼 것, VID/PID 로 본 칩 이름, FTDI 지연 타이머 같은 장치 설정·Windows 포트 기본값, USB 절전, 이벤트 로그의 연결 기록(7·30·90일), COM 번호 예약(주인 없는·겹친 번호), TX–RX 루프백 연결 시험(속도마다 잃은·바뀐 바이트, 1바이트 왕복 ms)·2선 RS-485 에코 확인, 이 PC 랜카드 링크 속도·이중, 텍스트·JSON 내보내기. 설정은 바꾸지 않음(고치는 법은 도움말)
- 공통: 한국어·영어, 도움말(F1), 말풍선, 밝게·어둡게, 글자 크기, 문제 보고(동의할 때만 전송)
- 받는 법: 설치판(`-setup.exe`, 관리자 권한 불필요) 또는 휴대판(`-portable.zip`, 설정이 exe 옆에). 아직 코드 서명 전이라 «Windows의 PC 보호» 가 뜨면 «추가 정보 → 실행». SHA256: `SHA256SUMS.txt`, 백신 검사: (VirusTotal 링크)
- 라이선스: GPL-3.0. 버그·요청: GitHub Issues 또는 프로그램 안 «!».
