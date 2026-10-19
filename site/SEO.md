# 검색어 ↔ 페이지 (검색 최적화 메모)

사람들이 실제로 치는 검색어를 어느 페이지가 받는지 적는다. 제목·설명 문구는 코드에 있다:
도구 `src/data/tools.ts` 의 `seo`, 가이드 `src/data/guides.ts` 의 `seoTitle`·`desc`, 나머지는 각 `src/views/*.astro` 의 `<Base seoTitle description>`.

## 원칙
- **영문 표기를 한국어 문장과 함께.** 네이버 데이터랩(2024-10~2026-09)에서 이 분야 검색은 `modbus`·`tera term`·`rs232` 같은 영문 표기에 몰리고, «시리얼 통신 프로그램»·«modbus 시뮬레이터» 같은 한국어 긴 검색어는 표시 기준에도 못 미친다. 그래서 한국어 제목에도 Modbus·RS232·RS485·TCP 를 영문으로 쓴다.
- **제목에 남의 제품 이름을 넣지 않는다**(Modbus Poll·Tera Term·Hercules 등). 이름은 도구 페이지의 «비슷한 도구» 문단에서 사실(상용·무료·오픈소스)로만 쓰고, 깎아내리는 말·가격 비교는 쓰지 않는다.
- **«최초·유일·최고» 처럼 근거 없는 말 금지.** 기능은 코드·앱 도움말(`apps/*/src/help.ts`)에 있는 것만.
- **페이지마다 제목·설명이 달라야 한다.** 404 는 색인에서 뺀다(`noindex`).
- **길이**: 한글·한자 2칸, 나머지 1칸으로 세어 제목 66칸·설명 70~160칸(구글 검색 결과의 제목 약 600px·설명 약 920px 에 맞춘 대략값). `node tools/site-check.mjs site/dist` 가 빌드 결과를 검사하고 CI 에서도 돈다.
- **구조화 데이터(JSON-LD)**: 도구 = SoftwareApplication(가격 0, 평점·리뷰는 실제 자료가 없으므로 넣지 않음 — 그래서 구글 리치 결과 대상은 아님), 가이드 = TechArticle, 장비 = Dataset, 모든 하위 페이지 = BreadcrumbList, 첫 화면 = WebSite·Organization, CRC 계산기 = FAQPage. 필수 필드는 같은 검사기가 본다.

## 한국어 검색어
| 검색어(예) | 받는 페이지 | 제목·설명에 넣은 말 |
|---|---|---|
| 시리얼 통신 프로그램, 시리얼 터미널, RS232 통신 프로그램, RS485 통신 테스트 | `/serial/` | «무료 시리얼 통신 프로그램 (RS232·RS485)», «USB 재연결·체크섬·Modbus RTU 풀이» |
| 모드버스 테스트 프로그램, modbus 마스터, modbus 폴링 | `/modbus-master/` | «무료 Modbus 마스터·테스트 프로그램», «RTU·TCP», «40001 표기» |
| Modbus 시뮬레이터, 모드버스 슬레이브 시뮬레이터 | `/modbus-slave/` | «무료 Modbus 슬레이브 시뮬레이터», «장비 없이 PLC·HMI 시험» |
| 장비 시뮬레이터, 가짜 장비, 시리얼 응답 프로그램 | `/simulator/` | «무료 장비 시뮬레이터 (시리얼·TCP·UDP)» |
| TCP 소켓 테스트 프로그램, TCP 서버 클라이언트 프로그램 | `/tcp/` | «무료 TCP 소켓 테스트 프로그램 (클라이언트·서버)» |
| UDP 테스트 프로그램, 멀티캐스트 테스트 | `/udp/` | «무료 UDP 송수신 테스트 프로그램», «브로드캐스트·멀티캐스트» |
| IP 스캐너, PLC IP 찾기, 산업용 네트워크 스캔 | `/netscan/` | «무료 산업 네트워크 IP 스캐너 (장비 찾기)», «Modbus 502·MC·XGT·S7» |
| SCPI 프로그램, 계측기 통신 프로그램, VISA 없이 | `/scpi/` | «무료 SCPI 계측기 터미널 (VISA 없이)» |
| 시리얼 플로터, 시리얼 그래프, 아두이노 그래프 | `/plot/` | «무료 시리얼 플로터 (실시간 그래프·CSV)», «Arduino 식 이름:값» |
| <제조사> <모델> 모드버스 주소 (예: LS S100 모드버스 주소, 오토닉스 TK 모드버스) | `/devices/<제조사>/<모델>/` | «<제조사> <모델> Modbus 주소·레지스터 맵», 설명에 «Modbus(모드버스) 통신 주소» |
| 인버터 모드버스 주소, 온도 조절기 모드버스 | `/devices/` | «국산 장비 Modbus 주소표 — 인버터·온도 조절기·전력 미터» |
| 모드버스 응답 없음, modbus 타임아웃 | `/guides/modbus-no-response/` | «Modbus 응답 없음·타임아웃 점검 순서 (RTU·TCP)» |
| 40001 주소, 모드버스 주소 계산, modbus 주소 0 1 차이 | `/guides/modbus-address-notation/` | «Modbus 주소 40001 vs 0 기준 — 매뉴얼 주소 읽는 법» |
| modbus rtu 프레임, 모드버스 CRC | `/guides/modbus-rtu-frame/` | «Modbus RTU 프레임 읽는 법 — 요청·응답·예외·CRC» |
| RS485 통신 안됨, RS485 종단 저항 | `/guides/rs485-wiring/` | «RS485 통신이 안 될 때 — 배선 점검 다섯 가지» |
| USB 시리얼 지연, FTDI latency | `/guides/usb-serial-latency/` | «USB-시리얼 변환기 지연 — 프레임이 쪼개지는 이유» |
| CRC16 계산기, 모드버스 CRC 계산 | `/tools/checksum/` | «CRC16 Modbus·체크섬 계산기 (온라인)» |
| 모드버스 요청 만들기, modbus 프레임 생성 | `/tools/modbus/` | «Modbus RTU 요청 만들기 — CRC 포함 계산기» |
| HEX ASCII 변환 | `/tools/hex-ascii/` | «HEX ↔ ASCII 변환기 — 제어 문자 표시» |

## 영어 검색어
| Query (examples) | Page | Words in title/description |
|---|---|---|
| serial terminal windows, rs485 terminal, free serial terminal | `/en/serial/` | «Free Serial Terminal for Windows (RS-232/485)» |
| modbus master free, modbus test tool, modbus poll alternative | `/en/modbus-master/` | «Free Modbus RTU/TCP Test Tool», description «Modbus RTU/TCP master (poll tool)». The product name «Modbus Poll» appears only in the «Similar tools» paragraph |
| modbus slave simulator free, modbus simulator | `/en/modbus-slave/` | «Free Modbus Slave Simulator (RTU/TCP)» |
| device simulator serial, fake serial device | `/en/simulator/` | «Free Device Simulator for Serial, TCP, UDP» |
| tcp test tool, tcp client server tool | `/en/tcp/` | «Free TCP Client, Server and Relay Test Tool» |
| udp test tool, multicast tester | `/en/udp/` | «Free UDP Sender/Receiver (Broadcast, Multicast)» |
| industrial ip scanner, find plc ip | `/en/netscan/` | «Free IP Scanner for Industrial Networks» |
| scpi terminal, scpi without visa | `/en/scpi/` | «Free SCPI Terminal (LAN Socket, RS-232, No VISA)» |
| serial plotter, arduino serial plotter alternative | `/en/plot/` | «Free Serial Plotter for Live Graphs and CSV» |
| <maker> <model> modbus register map | `/en/devices/<maker>/<model>/` | «<maker> <model> Modbus Register Map & Addresses» |
| modbus timeout, modbus no response | `/en/guides/modbus-no-response/` | «Modbus Timeout or No Response: Checklist (RTU/TCP)» |
| modbus 40001 address, modbus 0 based vs 1 based | `/en/guides/modbus-address-notation/` | «Modbus Address 40001 vs 0-Based: Reading the Manual» |
| modbus rtu frame, modbus crc | `/en/guides/modbus-rtu-frame/` | «Modbus RTU Frame Explained: Request, Response, CRC» |
| rs485 not working, rs485 termination | `/en/guides/rs485-wiring/` | «RS-485 Wiring Checks: No Reply or Garbled Data» |
| ftdi latency timer modbus | `/en/guides/usb-serial-latency/` | «USB-Serial Adapter Latency: Split Frames, Late Replies» |
| crc16 modbus calculator | `/en/tools/checksum/` | «CRC16 Modbus & Checksum Calculator Online» |
| modbus rtu request builder | `/en/tools/modbus/` | «Modbus RTU Request Builder with CRC (Online)» |

## 내부 링크
- 모든 하위 페이지 머리에 빵부스러기(`src/components/Crumbs.astro`, 화면 줄 + BreadcrumbList).
- 가이드 → 이어지는 도구(`tools`)·이어 읽을 가이드(`related`)·웹 도구(`webTools`)·장비 목록(`devices`)·내려받기.
- 도구 → 관련 가이드(가이드의 `tools` 에 든 것)·비슷한 도구·웹 도구·(Modbus 도구) 내장 장비 10종.
- 사용법 → 목차 아래 관련 가이드.
- 장비 → 같은 종류 장비·Modbus 가이드·Modbus Master/Slave·내려받기.
- 웹 도구 → 그 도구를 쓰는 가이드·다른 웹 도구·내려받기.
- 첫 화면 → 도구 9개·가이드 전부·장비 목록.

## 등록 (사용자 할 일, 근거 `C:\dev\review\2026-10-19_PortDock_홍보\10_검색등록_수요.md`)
- Google Search Console: URL 접두어 속성 → 메타 태그 값을 빌드 변수 `PUBLIC_GOOGLE_SITE_VERIFICATION` 에 → `<SITE_URL>/sitemap-index.xml` 제출.
- 네이버 서치어드바이저: 사이트 등록 → 메타 태그 값을 `PUBLIC_NAVER_SITE_VERIFICATION` 에 → sitemap 제출(등록하지 않아도 수집되지만 수집·색인 리포트를 볼 수 있다).
- 도메인을 바꾸면 URL 1:1 301 과 두 검색엔진의 주소 변경 절차를 같은 날에.
