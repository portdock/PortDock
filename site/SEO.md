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
| 모드버스 함수 코드, modbus function code, FC03 FC16 차이 | `/guides/modbus-function-codes/` | «Modbus 함수 코드 정리 (FC01~06·0F·10·17)», 설명에 «개수 한도», «06 과 10» |
| 모드버스 float 읽기, modbus 32비트 워드 순서, CDAB | `/guides/modbus-float-word-order/` | «Modbus float·32비트 값 읽기 — 워드 순서 맞추기», 설명에 «ABCD·CDAB» |
| 모드버스 TCP 연결 안됨, modbus tcp 502, unit id | `/guides/modbus-tcp-connection/` | «Modbus TCP 연결 안 됨 — 502 포트·Unit ID 점검», 설명에 «방화벽·접속 수 제한» |
| RS232 RS485 차이, RS422 RS485 차이 | `/guides/rs232-rs422-rs485/` | «RS232·RS422·RS485 차이 — 배선·거리·장비 수 비교» |
| 4-20mA 원리, 4-20mA 단선, 2선식 4선식 차이 | `/guides/4-20ma-loop/` | «4-20mA 신호 기초와 고장 찾기 (2선식·4선식·단선)», 설명에 «NAMUR NE 43», «3.6 mA·21 mA» |
| PT100 3선식, 측온저항체 2선식 3선식 4선식, 열전대 종류 | `/guides/pt100-thermocouple-wiring/` | «Pt100 2선·3선·4선식 차이와 열전대 K·J·T 고르기», 설명에 «냉접점 보정» |
| CRC16 계산기, 모드버스 CRC 계산 | `/tools/checksum/` | «CRC16 Modbus·체크섬 계산기 (온라인)» |
| 모드버스 요청 만들기, modbus 프레임 생성 | `/tools/modbus/` | «Modbus RTU 요청 만들기 — CRC 포함 계산기» |
| HEX ASCII 변환 | `/tools/hex-ascii/` | «HEX ↔ ASCII 변환기 — 제어 문자 표시» |
| 모드버스 프레임 해석, modbus 패킷 분석, 모드버스 예외 코드 | `/tools/modbus-decoder/` | «Modbus 프레임 해석기 — RTU·TCP HEX 풀이 (온라인)» |
| 모드버스 float 변환, modbus 실수 변환, 레지스터 float 변환, 워드 스왑 | `/tools/modbus-float/` | «Modbus 실수(float) 변환기 — 레지스터 바이트 순서», 설명에 «IEEE 754 float32·float64», «ABCD·CDAB·BADC·DCBA» |
| 웹 시리얼 터미널, 브라우저 시리얼 통신, web serial | `/tools/web-serial/` | «웹 시리얼 터미널 — 브라우저에서 COM 포트 열기» |
| 4-20mA 환산, 4-20mA 계산기, 아날로그 입력 스케일링 | `/tools/4-20ma/` | «4–20mA 환산 계산기 — 전류·공학값·%·PLC 카운트» |
| PT100 저항표, 측온저항체 온도 환산, 열전대 mV 온도 변환, K타입 열전대 표 | `/tools/temperature/` | «Pt100·열전대 온도 환산 — 저항·mV 계산기·표» |
| 보레이트, 모드버스 3.5문자, modbus 타임아웃 계산, 폴링 주기 | `/tools/serial-timing/` | «시리얼 통신 시간 계산기 — 보율·Modbus 3.5문자·폴링» |
| RS485 종단 저항, RS485 바이어스 저항, RS485 거리 | `/tools/rs485/` | «RS485 종단·바이어스 저항 계산기 (120Ω·페일세이프)», 설명에 «200 mV» |
| 4-20mA 부하저항, 4-20mA 루프 전원, 250옴 | `/tools/loop-load/` | «4–20mA 루프 부하 계산기 — 전원 전압·250Ω·케이블 거리» |
| 전압강하 계산, 전선 굵기 계산법, dc 전압강하, AWG mm2 변환 | `/tools/voltage-drop/` | «전압 강하 계산기 — 전선 굵기(mm²·AWG)·24V DC» |
| 서브넷 계산기, 서브넷 마스크 계산, IP대역 계산방법, PLC IP 대역 | `/tools/subnet/` | «IP 서브넷 계산기 — 마스크·대역·PLC 와 PC 같은 대역 확인» |
| 모드버스 타임아웃 설정, modbus 폴링 주기, 3.5문자 시간 | `/guides/modbus-rtu-timeout-polling/` | «Modbus RTU 타임아웃·폴링 주기 설정 (3.5문자 계산)» |
| 서브넷 마스크 설정, PLC IP 설정, PLC 핑 안됨, 같은 대역 | `/guides/plc-ip-subnet/` | «PLC IP 서브넷 마스크 설정 — 같은 대역 판정» |
| 24V 전압강하, 전선 굵기 선정, 센서 전원 전압 강하 | `/guides/24v-voltage-drop/` | «24V DC 전압 강하 계산과 전선 굵기 고르기» |
| RS485 종단 저항 값, RS485 바이어스 저항 값, 페일세이프 | `/guides/rs485-bias-termination/` | «RS485 종단·바이어스 저항 값 정하기 (120Ω·560Ω)» |

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
| modbus function codes, fc03 vs fc04, fc06 vs fc16 | `/en/guides/modbus-function-codes/` | «Modbus Function Codes 01–06, 0F, 10, 17 Explained», description «quantity limits», «06 vs 10» |
| modbus float word order, modbus 32 bit registers, cdab | `/en/guides/modbus-float-word-order/` | «Modbus Float & 32-bit Values: Finding the Word Order», description «ABCD or CDAB» |
| modbus tcp not connecting, modbus tcp port 502, modbus unit id | `/en/guides/modbus-tcp-connection/` | «Modbus TCP Not Connecting: Port 502, Unit ID, Limits» |
| rs232 vs rs485, rs422 vs rs485 | `/en/guides/rs232-rs422-rs485/` | «RS-232 vs RS-422 vs RS-485: Wiring, Distance, Nodes» |
| 4-20ma troubleshooting, 4-20ma 2 wire vs 4 wire, namur ne43 | `/en/guides/4-20ma-loop/` | «4–20 mA Loop Basics & Troubleshooting (2-Wire, 4-Wire)», description «NAMUR NE 43» |
| pt100 2 wire vs 3 wire vs 4 wire, thermocouple types | `/en/guides/pt100-thermocouple-wiring/` | «Pt100 2-, 3-, 4-Wire and Thermocouple Types Compared», description «cold-junction compensation» |
| crc16 modbus calculator | `/en/tools/checksum/` | «CRC16 Modbus & Checksum Calculator Online» |
| modbus rtu request builder | `/en/tools/modbus/` | «Modbus RTU Request Builder with CRC (Online)» |
| modbus frame decoder, modbus tcp packet parser, modbus exception codes | `/en/tools/modbus-decoder/` | «Modbus Frame Decoder: RTU & TCP Hex Parser (Online)» |
| modbus float converter, modbus registers to float, ieee 754 word swap | `/en/tools/modbus-float/` | «Modbus Float Converter — Registers ↔ IEEE 754», description «float32/float64», «ABCD, CDAB, BADC and DCBA byte orders» |
| web serial terminal, browser serial terminal, web serial api | `/en/tools/web-serial/` | «Web Serial Terminal: Open a COM Port in Your Browser» |
| 4-20ma calculator, 4-20 ma scaling, analog input scaling | `/en/tools/4-20ma/` | «4–20 mA Scaling Calculator: mA, %, Engineering Units» |
| pt100 calculator, rtd resistance table, thermocouple mv to temperature, type k table | `/en/tools/temperature/` | «Pt100 & Thermocouple Calculator: Ω, mV ↔ °C» |
| baud rate calculator, modbus 3.5 character time, modbus timeout calculator | `/en/tools/serial-timing/` | «Serial Timing Calculator: Baud, Modbus t3.5, Polling» |
| rs485 bias resistor calculator, rs485 termination, rs485 cable length vs baud rate | `/en/tools/rs485/` | «RS-485 Bias & Termination Resistor Calculator», description «200 mV receiver threshold» |
| 4-20ma load resistor, 4-20ma loop resistance, 4-20ma loop power supply | `/en/tools/loop-load/` | «4–20 mA Loop Load Calculator: Supply, 250 Ω, Cable» |
| voltage drop calculator, 24v voltage drop calculator, voltage drop calculator mm2, wire gauge to mm | `/en/tools/voltage-drop/` | «Voltage Drop Calculator: Wire Size mm² & AWG, 24 V DC» |
| subnet calculator, plc subnet mask, same subnet | `/en/tools/subnet/` | «IP Subnet Calculator: Mask, Range, PLC & PC Subnet» |
| modbus timeout settings, modbus polling interval, modbus rtu 3.5 character time | `/en/guides/modbus-rtu-timeout-polling/` | «Modbus RTU Timeout & Polling Interval: t3.5 Explained» |
| plc subnet mask, plc ip address, same subnet | `/en/guides/plc-ip-subnet/` | «PLC IP Address & Subnet Mask: Same Subnet Check» |
| 24v voltage drop, 24vdc voltage drop calculator, 24v voltage drop distance | `/en/guides/24v-voltage-drop/` | «24 V DC Voltage Drop: Choosing Wire Size (mm², AWG)» |
| rs485 bias resistor value, rs485 failsafe bias resistors, rs485 termination | `/en/guides/rs485-bias-termination/` | «RS-485 Termination & Bias Resistor Values: 120 Ω, 560 Ω» |

## 다음 후보 — 아직 페이지가 없는 검색어 (2026-10-23)
검색 수요 확인: 네이버 데이터랩·구글 트렌드 상대값은 **확인 못 함**(트렌드는 자동 조회에 429, 데이터랩은 로그인 화면 조작이 필요). 대신 네이버·구글 **자동완성**에 그 검색어가 뜨는지만 봤다(뜨면 «검색하는 사람이 있다» 는 정도, 양은 모름). 10/23 에 아래 표의 1~5 를 만들었다.
| 순위 | 검색어(자동완성 확인) | 페이지 | 고유함·근거 | 상태 |
|---|---|---|---|---|
| 1 | 서브넷 계산기·서브넷 마스크 계산·IP대역 계산방법(네이버), subnet calculator·plc subnet mask(구글) | `/tools/subnet/` + 가이드 `plc-ip-subnet` | 범용 계산기는 많지만 «PC·장비 양쪽 마스크로 따로 판정(한쪽 통신)» 은 드묾. RFC 4632·1918·3021·3927 | ✅ 10/23 |
| 2 | 전압강하 계산·전압강하 공식·전선 굵기 계산법·dc전압강하(네이버), 24v voltage drop calculator·voltage drop calculator mm2(구글) | `/tools/voltage-drop/` + 가이드 `24v-voltage-drop` | 24 V DC·mm²·AWG 함께, 국내 식(35.6·30.8)과의 관계. IEC 60028·60889, ASTM B258 | ✅ 10/23 |
| 3 | modbus timeout calculator·modbus timeout settings·modbus polling interval·modbus rtu 3.5 character time(구글), 보레이트(네이버) | `/tools/serial-timing/` + 가이드 `modbus-rtu-timeout-polling` | 규격 §2.4.1·§2.5.1.1 수치를 계산기로. 한국어 «모드버스 타임아웃» 은 자동완성 없음 | ✅ 10/23 |
| 4 | rs485 bias resistor calculator·rs485 bias resistor value·rs485 cable length vs baud rate(구글) | `/tools/rs485/` + 가이드 `rs485-bias-termination` | Modbus 규격 §3.4 + TI SLLA070D. 한국어 «rs485 바이어스» 는 자동완성 없음 | ✅ 10/23 |
| 5 | 4 20ma load resistor·4 20ma loop resistance·4 20ma loop power supply(구글) | `/tools/loop-load/` | 옴의 법칙만, 전송기 값은 매뉴얼에서. 한국어는 자동완성 없음 | ✅ 10/23 |
| 6 | 압력·유량 단위 변환(bar·psi·kPa·m³/h) | 없음 | 범용 단위 변환 사이트가 많아 고유함이 약함 — 만든다면 «계기 범위 환산(4–20mA 와 함께)» 처럼 묶어서 | 후보 |
| 7 | 전선 허용 전류(«전선 굵기 허용 전류», «전선 굵기 sq 표») | 없음 | 수요는 보이지만 KEC·IEC 60364-5-52 표를 원문으로 확인해야 함(포설 방법별) | 후보, 원문 확인 뒤 |
| 8 | 모터 전류 계산(kW → A) | 없음 | 효율·역률이 모터마다 달라 «명판 값 입력» 꼴로만 | 후보 |
| 9 | 옴의 법칙·전력 계산기 | 없음 | 범용 사이트가 이미 많음 — 낮음 | 보류 |

## 내부 링크
- 모든 하위 페이지 머리에 빵부스러기(`src/components/Crumbs.astro`, 화면 줄 + BreadcrumbList).
- 가이드 → 이어지는 도구(`tools`)·이어 읽을 가이드(`related`)·웹 도구(`webTools`)·장비 목록(`devices`)·내려받기.
- 도구 → 관련 가이드(가이드의 `tools` 에 든 것)·비슷한 도구·웹 도구·(Modbus 도구) 내장 장비 10종.
- 사용법 → 목차 아래 관련 가이드.
- 장비 → 같은 종류 장비·Modbus 가이드·Modbus Master/Slave·내려받기.
- 웹 도구 → 그 도구를 쓰는 가이드·다른 웹 도구·내려받기. 도구 페이지 «이어지는 웹 도구» 는 `ToolPage.astro` 의 `WEB_FOR`(시리얼 → 통신 시간·RS-485, Modbus → 통신 시간·서브넷, TCP·UDP·Net Scan → 서브넷).
- 첫 화면 → 도구 9개·가이드 전부·장비 목록.

## 등록 (사용자 할 일, 근거 `C:\dev\review\2026-10-19_PortDock_홍보\10_검색등록_수요.md`)
- Google Search Console: URL 접두어 속성 → 메타 태그 값을 빌드 변수 `PUBLIC_GOOGLE_SITE_VERIFICATION` 에 → `<SITE_URL>/sitemap-index.xml` 제출.
- 네이버 서치어드바이저: 사이트 등록 → 메타 태그 값을 `PUBLIC_NAVER_SITE_VERIFICATION` 에 → sitemap 제출(등록하지 않아도 수집되지만 수집·색인 리포트를 볼 수 있다).
- 도메인을 바꾸면 URL 1:1 301 과 두 검색엔진의 주소 변경 절차를 같은 날에.
