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
| 압력 단위 변환(기·계산기), 압력 단위 변환 psi·mpa bar·kgf cm2, psi bar 변환, kpa bar 변환, mmh2o kpa, kg/cm2 bar 차이 | `/tools/pressure/` | «압력 단위 변환기 — bar·psi·kPa·kgf/cm²·mmH2O», 설명에 «게이지 압력과 절대 압력», «4–20mA 환산표» |
| 단위 변환기, 유량 단위 변환, 토크 단위 변환(기), 마력 kw 변환, kw hp 변환 | `/tools/units/` | «단위 변환기 — 유량·토크·kW 마력·온도 (산업용)» |
| 모터 전류 계산(기), 모터 정격전류 계산(기)·공식, 3상 전류 계산(기)·계산법, 3상 모터 전류 계산 | `/tools/motor-current/` | «모터 전류 계산기 — 3상 kW → A·효율·역률» |
| 모터 회전수 계산, rpm 계산(기), 인버터 rpm 계산, 동기속도 계산, 모터 극수 회전수, 모터 슬립 계산 | `/tools/motor-speed/` | «인버터 주파수 ↔ 모터 회전수 계산기 — 극수·슬립» |
| dbm 변환(기), dbm 계산(기), db dbm 변환, mw dbm 변환, dbuv dbm 변환 | `/tools/db/` | «dB·dBm 변환기 — dBm mW W·dBµV·dBu·전압 비» |
| 모터 정격전류 계산법, 모터 차단기 선정(방법)·용량, 차단기 선정 및 전선 굵기, 허용전류 | `/guides/motor-current-breaker-cable/` | «모터 정격 전류 계산(kW→A)과 차단기·전선 기초», 설명에 «KEC 212.4.1», «IB ≤ In ≤ IZ» |
| 게이지압력 절대압력(차이·변환), kg/cm2 bar 차이, 압력 단위 변환 | `/guides/pressure-units/` | «압력 단위 변환과 센서 범위 설정 (bar·psi·kPa·kgf/cm²)» |
| 인버터 주파수 설정·변경, 모터 회전수 계산방법, 모터 슬립 계산, 인버터 hz rpm | `/guides/vfd-frequency-rpm/` | «인버터 주파수 ↔ 모터 회전수 (극수·슬립·rpm 표시)» |
| 아스키코드표(2진수·16진수·특수문자), 제어문자(종류), 아스키 코드 변환, ascii 제어문자 | `/tools/ascii/` | «ASCII 코드표·제어 문자표 (STX·ETX·ACK·CR·LF)» |
| 16진수 10진수 변환(기), 2의 보수 계산기·변환, bcd 변환(기), 그레이코드 변환, 엔디안 변환, 리틀엔디안 빅엔디안 변환 | `/tools/integer/` | «정수·진수 변환기 — HEX·10진·2의 보수·BCD·엔디언» |
| 보레이트 계산, (uart 보율 — 한국어 자동완성 없음) | `/tools/uart-baud/` | «UART 보율 오차 계산기 — MCU 클럭·UBRR·분주비» |
| can 통신 속도 (설정·계산), can 샘플 포인트 | `/tools/can-bit-timing/` | «CAN 비트 타이밍 계산기 — 샘플 포인트·TQ·프리스케일러» |
| ntc 계산기·계산식, ntc 서미스터 온도 계산, ntc 온도 테이블 계산, 서미스터 온도 계산 | `/tools/ntc/` + 가이드 `ntc-thermistor-temperature` | «NTC 서미스터 계산기 — 온도·저항·B값·Steinhart–Hart», 가이드 «NTC 서미스터 온도 계산 — B값·Steinhart–Hart·ADC» |
| 엔코더 펄스 (계산), 엔코더 분해능 (계산·체배), 엔코더 rpm 계산 | `/tools/encoder/` | «엔코더 펄스 ↔ rpm 계산기 — PPR·체배·응답 주파수» |
| 모드버스 에러코드, modbus 에러 코드 | `/guides/modbus-exception-codes/` | «Modbus 예외 코드(에러 코드) 01·02·03·04 원인» |
| rs232 케이블 결선(도), rs232 크로스 케이블 (핀맵), 널모뎀 케이블, db9 핀맵 | `/guides/rs232-db9-null-modem/` | «RS232 DB9 핀배치·크로스(널 모뎀) 케이블 결선도» |
| 전압 분배 계산기, 분압 저항 계산(기) | `/tools/voltage-divider/` | «분압 저항 계산기 — E12·E24·E96 표준값·부하» |
| adc 계산(기), adc 분해능 (계산), lsb 계산 | `/tools/adc/` + 가이드 `analog-input-scaling` | «ADC 분해능 계산기 — LSB·4–20mA·0–10V 스케일링», 가이드 «아날로그 입력 스케일링 — ADC 값 → 공학값 환산» |
| rc 시정수 (계산기), 차단주파수 계산기, rc 필터 계산기 | `/tools/rc-filter/` | «RC 시정수·차단 주파수 계산기 — 저역 필터» |
| 3상 전력 계산(기), kva 계산(기), kva kw 변환, 역률 계산 | `/tools/three-phase-power/` | «3상 전력 계산기 — kVA·kW·kvar·전류·역률» |
| 콘덴서 용량 계산(기), 역률 개선 콘덴서 용량 계산, 역률 개선 (공식·원리·콘덴서 용량) | `/tools/pf-capacitor/` + 가이드 `power-factor-capacitor` | «역률 개선 콘덴서 용량 계산기 — kvar·µF·Δ/Y», 가이드 «역률과 역률 개선 콘덴서 — kW·kVA·kvar·용량 계산» |

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
| psi to bar, pressure unit converter, mmh2o to pa, inh2o to pa, kgf/cm2 to bar | `/en/tools/pressure/` | «Pressure Unit Converter: bar, psi, kPa, kgf/cm², mmH2O» |
| kw to hp, torque unit converter (nm to kgf cm, lb ft to nm), flow rate unit converter | `/en/tools/units/` | «Unit Converter: Flow, Torque, kW to HP, Temperature» |
| motor current calculator (from kw, 3 phase), kw to amps 3 phase, motor full load current | `/en/tools/motor-current/` | «Motor Current Calculator: kW to Amps, 3-Phase, HP» |
| vfd hz to rpm (calculator), hz to rpm, rpm to hz, synchronous speed calculator, motor slip calculator | `/en/tools/motor-speed/` | «VFD Hz to RPM Calculator: Poles, Slip, Gear Ratio» |
| dbm to mw, dbm to watts, db calculator, dbm to dbuv | `/en/tools/db/` | «dBm to mW, Watts & dBµV Converter (dB Calculator)» |
| motor full load current formula, kw to amps 3 phase motor | `/en/guides/motor-current-breaker-cable/` | «Motor Full Load Current (kW to A), Breakers, Cables» |
| gauge vs absolute pressure (transmitter, sensor), pressure transmitter units | `/en/guides/pressure-units/` | «Pressure Units: bar, psi, kPa, kgf/cm², Gauge vs Abs» |
| vfd frequency to rpm, motor hz to rpm formula, vfd frequency vs rpm | `/en/guides/vfd-frequency-rpm/` | «VFD Hz to RPM: Poles, Slip and the RPM Display» |
| ascii table (hex), ascii code table, ascii control characters | `/en/tools/ascii/` | «ASCII Table with Control Characters (Hex, STX, CR, LF)» |
| hex to decimal (converter), two's complement calculator, hex to signed int, bcd converter, gray code converter, endian converter | `/en/tools/integer/` | «Hex to Decimal: Signed, Two's Complement, BCD, Endian» |
| uart baud rate calculator, uart baud rate error (calculator, tolerance), avr/atmega uart baud rate calculator | `/en/tools/uart-baud/` | «UART Baud Rate Error Calculator: MCU Clock, UBRR» |
| can bit timing calculator, can sample point (calculation), can bus bit timing | `/en/tools/can-bit-timing/` | «CAN Bit Timing Calculator: Sample Point, TQ, Prescaler» |
| ntc thermistor calculator, steinhart hart calculator, thermistor beta value calculator, ntc thermistor equation | `/en/tools/ntc/` + guide | «NTC Thermistor Calculator: Beta, Steinhart–Hart, ADC» |
| encoder pulses to rpm, how to calculate rpm from encoder pulses, encoder ppr calculation | `/en/tools/encoder/` | «Encoder Pulses to RPM Calculator: PPR, ×4, Frequency» |
| modbus exception codes (list), modbus error codes (table), modbus exception code 2/3/4/11 | `/en/guides/modbus-exception-codes/` | «Modbus Exception Codes 01, 02, 03, 04, 0B Explained» |
| rs232 pinout (db9), db9 pinout rs232, null modem cable pinout (db9) | `/en/guides/rs232-db9-null-modem/` | «RS-232 DB9 Pinout & Null Modem Cable Wiring» |
| voltage divider calculator, e96 resistor values, standard resistor values | `/en/tools/voltage-divider/` | «Voltage Divider Calculator: E12, E24, E96 Resistors» |
| adc resolution calculator, adc lsb calculator, analog input scaling (formula·calculator·in plc) | `/en/tools/adc/` + guide `analog-input-scaling` | «ADC Resolution Calculator: LSB, 4–20 mA, 0–10 V Scaling», guide «Analog Input Scaling: ADC Counts to Engineering Units» |
| rc time constant calculator, low pass filter calculator, rc cutoff frequency | `/en/tools/rc-filter/` | «RC Time Constant & Low-Pass Cut-off Calculator» |
| kva to amps (3 phase), three phase power calculator, kva to kw, power factor calculator | `/en/tools/three-phase-power/` | «Three-Phase Power Calculator: kVA, kW, kvar, Amps» |
| power factor correction capacitor calculator, kvar to uf (calculator), capacitor kvar calculation | `/en/tools/pf-capacitor/` + guide `power-factor-capacitor` | «Power Factor Correction Capacitor Calculator: kvar, µF», guide «Power Factor & Correction Capacitors: kW, kVA, kvar» |
| parallel resistor calculator, series and parallel resistor calculator, resistor combination (standard values) | `/en/tools/parallel-resistor/` + guide `resistor-series-parallel` | «Parallel & Series Resistor Calculator (E12, E24, E96)», guide «Resistors in Series & Parallel: Formulas, E12/E24 Pairs» |
| ct ratio calculator, ct burden calculation (formula), ct va burden calculation | `/en/tools/ct-ratio/` + guide `ct-ratio-burden` | «CT Ratio & Burden Calculator: Secondary Current, VA», guide «CT Ratio & CT Burden: Secondary Current, Leads, Meters» |
| capacitive reactance calculator, inductive reactance calculator, lc resonant frequency calculator | `/en/tools/reactance/` | «Reactance Calculator: Xc, XL & LC Resonance» |
| led resistor calculator, 24v led resistor (calculator), led series resistor | `/en/tools/led-resistor/` | «LED Resistor Calculator: 5 V, 12 V, 24 V, Series LEDs» |

## 다음 후보 — 아직 페이지가 없는 검색어 (2026-10-23)
검색 수요 확인: 네이버 데이터랩·구글 트렌드 상대값은 **확인 못 함**(트렌드는 자동 조회에 429, 데이터랩은 로그인 화면 조작이 필요). 대신 네이버·구글 **자동완성**에 그 검색어가 뜨는지만 봤다(뜨면 «검색하는 사람이 있다» 는 정도, 양은 모름). 10/23 오전에 1~5, 오후에 6·8·10·11(웹 도구 5종·가이드 3편)을 만들었다. 7(허용 전류)은 원문을 확인하지 못해 뺐다. 10/23 저녁에 13~20(웹 도구 6종·가이드 3편, 21 은 정수 변환기에 합침)을, 그 뒤 22~26(웹 도구 5종·가이드 2편)을 만들었다. 10/23 저녁 늦게 31·32·33·35·36(웹 도구 4종·가이드 2편, 36 은 리액턴스 도구에 합침)을 만들었다. 자동완성은 구글 `suggestqueries`(client=firefox)·네이버 `ac.search.naver.com` 으로 조회 — 네이버는 영문 검색어에 거의 답하지 않고 한국어도 빈 경우가 많아, 구글(hl=ko) 결과를 함께 적었다.
| 순위 | 검색어(자동완성 확인) | 페이지 | 고유함·근거 | 상태 |
|---|---|---|---|---|
| 1 | 서브넷 계산기·서브넷 마스크 계산·IP대역 계산방법(네이버), subnet calculator·plc subnet mask(구글) | `/tools/subnet/` + 가이드 `plc-ip-subnet` | 범용 계산기는 많지만 «PC·장비 양쪽 마스크로 따로 판정(한쪽 통신)» 은 드묾. RFC 4632·1918·3021·3927 | ✅ 10/23 |
| 2 | 전압강하 계산·전압강하 공식·전선 굵기 계산법·dc전압강하(네이버), 24v voltage drop calculator·voltage drop calculator mm2(구글) | `/tools/voltage-drop/` + 가이드 `24v-voltage-drop` | 24 V DC·mm²·AWG 함께, 국내 식(35.6·30.8)과의 관계. IEC 60028·60889, ASTM B258 | ✅ 10/23 |
| 3 | modbus timeout calculator·modbus timeout settings·modbus polling interval·modbus rtu 3.5 character time(구글), 보레이트(네이버) | `/tools/serial-timing/` + 가이드 `modbus-rtu-timeout-polling` | 규격 §2.4.1·§2.5.1.1 수치를 계산기로. 한국어 «모드버스 타임아웃» 은 자동완성 없음 | ✅ 10/23 |
| 4 | rs485 bias resistor calculator·rs485 bias resistor value·rs485 cable length vs baud rate(구글) | `/tools/rs485/` + 가이드 `rs485-bias-termination` | Modbus 규격 §3.4 + TI SLLA070D. 한국어 «rs485 바이어스» 는 자동완성 없음 | ✅ 10/23 |
| 5 | 4 20ma load resistor·4 20ma loop resistance·4 20ma loop power supply(구글) | `/tools/loop-load/` | 옴의 법칙만, 전송기 값은 매뉴얼에서. 한국어는 자동완성 없음 | ✅ 10/23 |
| 6 | 압력 단위 변환(기·계산기)·psi bar 변환·mmh2o kpa(네이버·구글), 유량·토크 단위 변환(기)·마력 kw(네이버·구글), psi to bar·pressure unit converter·kw to hp·torque unit converter(구글) | `/tools/pressure/`·`/tools/units/` + 가이드 `pressure-units` | 범용 변환기는 많아 «센서 범위의 4–20mA 환산표»·«게이지 ↔ 절대»·kgf/cm²·관용 mmH₂O 로 차별. 계수는 정의값에서 곱하고 NIST SP 811 B.8 값과 시험 | ✅ 10/23 |
| 7 | 전선 허용전류(표·계산), 허용전류표, 2.5sq 허용전류(네이버·구글), wire ampacity chart mm2(구글) | 없음 | KEC 232.5.2 는 허용 전류를 KS C IEC 60364-5-52 부속서 B 의 표로 넘김 — KEC 본문(법제처 공고 제2025-227호 PDF)엔 표가 없고, KS·IEC 원문은 유료라 확인 못 함(10/23). 모터 가이드에는 KEC 212.4.1 협조 조건과 표 232.5-1(절연물 허용 온도)까지만 | 보류, 원문 확인 뒤 |
| 8 | 모터 전류 계산(기)·모터 정격전류 계산(기)·3상 전류 계산(기)·모터 차단기 선정(구글·네이버), motor current calculator·kw to amps 3 phase(구글) | `/tools/motor-current/` + 가이드 `motor-current-breaker-cable` | 효율·역률은 명판 값 입력, 기본값은 예시라고 밝힘. ABB Technical guide No. 7 식·예제 3.4 를 시험으로 | ✅ 10/23 |
| 10 | 모터 회전수 계산·rpm 계산(기)·인버터 rpm 계산(구글), vfd hz to rpm·hz to rpm·synchronous speed calculator(구글). 한국어 «인버터 주파수 회전수» 는 자동완성 없음 | `/tools/motor-speed/` + 가이드 `vfd-frequency-rpm` | 슬립(YASKAWA E2-02 식)·감속비·인버터 rpm 표시(극수 설정)·Modbus 출력 주파수 주소까지 — 인버터 장비 맵과 서로 연결 | ✅ 10/23 |
| 11 | dbm 변환(기)·dbm 계산기(구글), dbm 계산(네이버), dbm to mw·dbm to watts·dbm to dbuv(구글) | `/tools/db/` | ITU-R V.574-5 정의. 무선 RSSI·케이블 손실 쪽. 범용 사이트가 많아 우선순위는 낮았음 | ✅ 10/23 |
| 12 | 저항 컬러코드(네이버·구글 자동완성 있음) | 없음 | 산업 현장보다 전자 취미 쪽, 범용 사이트가 많음 | 보류 |
| 9 | 옴의 법칙·전력 계산기 | 없음 | 범용 사이트가 이미 많음 — 낮음 | 보류 |
| 13 | 아스키코드표(2진수·16진수·특수문자)·제어문자(종류)·아스키 코드 변환(네이버·구글), ascii table hex·ascii code table(구글) | `/tools/ascii/` | 범용 표는 많지만 «시리얼 프레임에서 보는 제어 문자(STX·ETX·ACK·NAK·ENQ·XON·XOFF)의 쓰임» 과 HEX↔ASCII 도구 연결로 차별. RFC 20 §2·§4.1, XON·XOFF = DC1·DC3 은 Text-Terminal-HOWTO §11 | ✅ 10/23 |
| 14 | 16진수 10진수 변환(기)·2의 보수 계산기·bcd 변환(기)·그레이코드 변환·엔디안 변환(구글·네이버), hex to signed int·two's complement calculator·endian converter·bcd converter(구글) | `/tools/integer/` | 범용 진법 변환기와 달리 «레지스터 음수(INT16)·BCD·그레이 코드·ABCD/CDAB» 를 한 화면에. 실수(float)는 기존 변환기 몫이라 겹치지 않게 정수만. 정의식, Modbus 규격 §4.2 | ✅ 10/23 |
| 15 | uart baud rate calculator·uart baud rate error (calculator·tolerance)·stm32/avr uart baud rate calculator(구글). 한국어 «보레이트 계산» 은 구글만, «uart 보율»·«보레이트 오차» 는 자동완성 없음 | `/tools/uart-baud/` | ATmega328P 데이터시트 표 19-1·19-2·19-3·19-11·19-12 수치를 시험으로 재현(16 MHz 115.2k → UBRR 8, −3.5 %), 수신 허용 범위 식(§19.8.3). STM32 등 다른 칩은 매뉴얼을 확인하지 않아 이름을 넣지 않고 «소수 비트» 로 일반화 | ✅ 10/23 |
| 16 | can bit timing calculator·can sample point (calculation)·can bus bit timing(구글). 한국어 «can 통신 속도(설정·계산)» 는 구글만, «can 비트 타이밍» 은 자동완성 없음 | `/tools/can-bit-timing/` | NXP AN1798 Rev. 4 표 1·식 (8)~(11)·예제 1·2 를 시험으로, Microchip SAM9X60 §50.7.4.1. CiA 의 권장 샘플 포인트 표는 원문(CiA 301)을 확인하지 못해 수치를 넣지 않음 — 목표값은 사용자가 넣음. CAN FD 데이터 구간은 뺌 | ✅ 10/23 |
| 17 | ntc 계산기·계산식, ntc 서미스터 온도 계산·온도 테이블, 서미스터 온도 계산(구글), ntc thermistor calculator·steinhart hart calculator·thermistor beta value calculator(구글) | `/tools/ntc/` + 가이드 `ntc-thermistor-temperature` | B 식·Steinhart–Hart·분압·ADC·자기 발열을 한 페이지에. TDK NTC 기술 자료(2018-01) §3.1·§3.2.3, Steinhart & Hart(1968), ATmega328P §23.7. Pt100 도구·가이드와 연결 | ✅ 10/23 |
| 18 | 엔코더 펄스(계산)·엔코더 분해능(계산·체배)·엔코더 rpm 계산(구글·네이버), encoder pulses to rpm·how to calculate rpm from encoder pulses(구글) | `/tools/encoder/` | 정의식(rpm × PPR ÷ 60, 체배). 오토닉스 데이터시트 식(최대 응답 회전수 = 응답 주파수 ÷ 분해능 × 60)은 대리점 사본으로만 봐 출처로 달지 않음 — 정의식으로 계산 | ✅ 10/23 |
| 19 | modbus exception codes (list·2·3·4·11)·modbus error codes (table)(구글), 모드버스 에러코드·modbus 에러 코드(구글). 기존엔 해석기·응답 없음 글에 흩어져 있었음 | 가이드 `modbus-exception-codes` | 규격 V1.1b3 §6 상태도의 검사 순서(01 → 03 → 02 → 04)와 함수별 개수 한도, §7 «96 + 5» 예, CRC 는 lib 로 계산 | ✅ 10/23 |
| 20 | rs232 pinout (db9)·db9 pinout rs232·null modem cable pinout(구글), rs232 케이블 결선(도)·rs232 크로스 케이블(핀맵)(네이버·구글), 널모뎀 케이블·db9 핀맵(구글) | 가이드 `rs232-db9-null-modem` | TLDP Serial-HOWTO §19(DB9·DB25 핀), Text-Terminal-HOWTO §12(표준 널 모뎀 결선). TIA-574 원문은 유료라 인용하지 않음. 그림(make.mjs `db9-null-modem`) | ✅ 10/23 |
| 21 | 그레이코드 변환(기·방법)(구글·네이버), gray code converter(구글) | `/tools/integer/` 에 합침 | 절대형 엔코더 출력 — 엔코더 도구와 서로 연결 | ✅ 10/23 (14 에 포함) |
| 22 | 전압 분배 계산기(네이버·구글), 분압 저항 계산(기)(구글), voltage divider calculator(구글) | `/tools/voltage-divider/` | 분압·부하·출력 저항·허용차 + E12·E24·E96 표준 값 조합(같은 비는 하나만). 값은 Vishay 28372(IEC 60063 표)에서 옮기고 E96 = 10^(i/96) 반올림, E24 의 계산값과 다른 8개를 시험으로 확인. 계열별 허용차(±10·5·1 %)는 그 표에 없어 싣지 않음. ADC 입력 임피던스는 ATmega328P §23.6.1 | ✅ 10/23 |
| 23 | adc 계산(기)·adc 분해능 (계산)·lsb 계산(구글), adc resolution calculator(구글) | `/tools/adc/` + 가이드 `analog-input-scaling` | LSB·양자화 실효값·SNR·ENOB 는 Microchip AN693(DS00693A) 식 2·3·5와 «4.096 V 12비트 = 1 mV» 예, 코드 식은 ATmega328P §23.7. 4–20mA(션트)·0–10V(분압) → 공학값, 상한 잘림 경고. PLC 카운트는 기존 4–20mA 도구로 연결. 그림(make.mjs `adc-scaling`). Analog Devices MT-001 은 내려받기가 끝나지 않아 인용 안 함 | ✅ 10/23 |
| 24 | rc 시정수 (계산기)·차단주파수 계산기·rc 필터 계산기(구글), rc time constant calculator·low pass filter calculator(구글) | `/tools/rc-filter/` | 정의식(τ = RC, fc = 1/(2πRC), 1차 이득·위상, 상승 시간 τ·ln 9) + ADC 앞 저역 필터 권고(ATmega328P §23.6.1). E12·E24 가까운 값. TI «Analog Engineer's Pocket Reference» 는 로그인이 필요해 쓰지 않음 | ✅ 10/23 |
| 25 | 3상 전력 계산(기)·kva 계산(기)·kva kw 변환(계산기)·역률 계산(네이버·구글), kva to amps (3 phase)(구글) | `/tools/three-phase-power/` | 모터 전류 계산기(축 출력·효율 → A)와 겹치지 않게 «전기 쪽» 값(A·kW·kVA·kvar·역률)만 다루는 별도 페이지로, 서로 링크. ABB TG7 식 3.15·예제 3.4 명판, ABB Motor guide §4.10 | ✅ 10/23 |
| 26 | 콘덴서 용량 계산(기)·역률 개선 콘덴서 용량 계산(구글), kvar to uf (calculator·formula)(구글) | `/tools/pf-capacitor/` + 가이드 `power-factor-capacitor` | ABB Motor guide(2019) §4.10 표 4.7(K = tan φ1 − tan φ2, 146칸 모두 ±0.0011 안에서 재현 — 시험엔 표본)·C = 3.2·10⁶·Q/U²(50 Hz, ≈ 10⁹/(2π·50) 반올림)·보상 주의(무부하 전류 이하, Y-Δ). 한전 등 역률 요금 기준은 약관 원문을 확인하지 않아 싣지 않음. 인버터 출력 쪽 콘덴서 금지 같은 문구도 원문을 이번에 확인하지 않아 뺌. ABB 기술 응용 문서 8호(역률 개선)는 내려받기가 막혀(403) 못 씀. 그림(`power-triangle`) | ✅ 10/23 |
| 27 | 전자기어비 계산(기)·서보 전자기어비 계산(구글), electronic gear ratio calculator(구글) | 없음 | 제조사마다 파라미터 이름·식이 달라 매뉴얼 원문을 제조사별로 확인해야 함 — 10/23 확인 안 함 | 보류, 매뉴얼 확인 뒤 |
| 28 | ethernet ip basics·profinet basics·how does profinet work(구글), ethercat 원리(구글) | 없음 | PortDock 도구가 다루지 않는 프로토콜이고 ODVA·PI 원문 확인이 필요. 일반 소개 글은 이미 많음 | 보류 |
| 29 | 변압기 용량 계산(서·식·공식)(구글) | 없음 | 수용률·부하율 같은 설계 가정에 따라 값이 달라 표준 수치로 확정할 수 없음 | 뺌 |
| 30 | pwm 듀티 비 계산(구글, 하나뿐) | 없음 | 자동완성이 거의 없음 | 뺌 |
| 31 | 저항 병렬 계산(기·식·법)·저항 병렬 공식·합성저항 계산(기)(구글·네이버), parallel resistor calculator (standard values·reverse)(구글) | `/tools/parallel-resistor/` + 가이드 `resistor-series-parallel` | 분압 도구(비)와 겹치지 않게 «저항 하나의 값» 만 — 직렬·병렬 합성, 병렬 전류 몫, 짝 저항, E12·E24·E96 두 개 조합(오차순), 4k7 표기 읽기. 정의식, 표준 값은 Vishay 28372 | ✅ 10/23 |
| 32 | led 저항 계산(기)·led 저항 값 계산기·led 직렬 저항 계산(구글·네이버), 24v led resistor (calculator)·led resistor calculator(구글) | `/tools/led-resistor/` | 자동완성이 강해(«led 저항 계산기», «24v led resistor calculator») 만듦. 24 V 표시등 쪽으로 — 저항 전력이 LED 의 10배 넘는 점. Vf·If 는 데이터시트 입력, 색별 «보통 값» 은 출처 없이 싣지 않음 | ✅ 10/23 |
| 33 | ct 비 계산·ct비 계산·ct비 선정·ct 부담 (계산)·ct 정격 부담(구글), ct burden calculation (formula)·ct ratio calculator(구글) | `/tools/ct-ratio/` + 가이드 `ct-ratio-burden` | ABB Instrument Transformers Application Guide(1VAP420003-TG, 2004 Rev. A) p.4·5·6·10·12·13·26 — 1~5 A 출력, RCF(20.2:1 → 1.01), IEEE C57.13 표준 부담 B-0.1~B-1.8 재현, 2차 개방. 전력 미터 장비 맵(GIMAC1000·Accura «PT/CT 반영 값») ↔ 가이드 연결. IEC 61869-2 등급별 오차 한도·표준 1차 정격 계열은 원문 미확인이라 뺌 | ✅ 10/23 |
| 34 | op amp gain calculator (non inverting·inverting·differential)(구글), 한국어 «opamp 증폭률 계산» 은 자동완성 없음 | 없음 | 정의식(1 + Rf/Rg 등). 4–20mA·센서 입력 회로와 이어지지만 영어 검색만 보임 | 다음 — 낮음 |
| 35 | 리액턴스 계산(기)·용량성 리액턴스 (공식·계산)·유도성 리액턴스(공식)(구글·네이버), capacitive·inductive reactance calculator(구글) | `/tools/reactance/` | RC 도구(시정수·1차 필터)에 칸을 더하지 않고 별도 페이지로 — 검색어가 «리액턴스» 자체라서. Xc·XL·원하는 X 에 맞는 C·L·콘덴서 전류·kvar(역률 콘덴서 예와 같은 값 시험). 정의식 | ✅ 10/23 |
| 36 | 공진 주파수 계산(기)·lc 공진 주파수 계산(기)(구글·네이버), lc resonant frequency calculator(구글), lc 필터 계산기(구글) | `/tools/reactance/` 에 합침 | f0 = 1/(2π√(LC))·Z0 = √(L/C). 별도 «LC 필터» 페이지는 부하·감쇠에 따라 모양이 달라 정의식만으로는 얇아 뺌 | ✅ 10/23 (35 에 포함) |
| 37 | 실린더 추력 계산(기·엑셀)·공압 실린더 추력 (계산·표)(구글), pneumatic cylinder force calculator (smc·in kg)(구글) | 없음 | 자동완성이 강하고 산업 현장 쪽. 이론 출력 = 압력 × 피스톤 면적(로드 쪽은 로드 면적 뺌) 정의식이지만, 제조사 이론 출력 표(SMC 등)로 시험하려 했으나 공식 카탈로그 PDF(cdn.smcworld.com)가 내려받기를 막아 제3자 사본만 확인(10/23). 부하율 권장값도 원문 확인 필요 | 다음 — 높음, 원문 확인 뒤 |
| 38 | kwh 계산·kwh 당 전기요금(구글) | 없음 | 전력량(kW × h)은 정의식이지만 «요금» 은 약관 단가 원문 확인이 필요 — 수치 없이 만들면 얇음 | 보류 |

## 내부 링크
- 모든 하위 페이지 머리에 빵부스러기(`src/components/Crumbs.astro`, 화면 줄 + BreadcrumbList).
- 가이드 → 이어지는 도구(`tools`)·이어 읽을 가이드(`related`)·웹 도구(`webTools`)·장비 목록(`devices`)·내려받기.
- 도구 → 관련 가이드(가이드의 `tools` 에 든 것)·비슷한 도구·웹 도구·(Modbus 도구) 내장 장비 전체(수는 `data/devices` 에서 자동).
- 사용법 → 목차 아래 관련 가이드.
- 장비 → 같은 종류 장비·Modbus 가이드·Modbus Master/Slave·내려받기.
- 웹 도구 → 그 도구를 쓰는 가이드·다른 웹 도구·내려받기. 도구 페이지 «이어지는 웹 도구» 는 `ToolPage.astro` 의 `WEB_FOR`(시리얼 → 통신 시간·RS-485·ASCII·UART 보율, Modbus Master → 통신 시간·서브넷·모터 회전수·정수 변환, TCP·UDP·Net Scan → 서브넷, Simulator → ASCII, Plot → NTC·엔코더·ADC).
- 가이드의 `deviceKinds` ↔ 장비 종류: 가이드 «이어 읽기» 에 그 종류 장비 맵, 장비 페이지에 «<종류> 가이드·계산기»(인버터 → 주파수·회전수·모터 전류 글과 웹 도구, 전력 미터 → 모터 전류·역률 콘덴서, 패널 미터 → 압력 단위·아날로그 입력 스케일링). 이 글들은 모든 장비의 «Modbus 가이드» 목록에서는 뺀다.
- 첫 화면 → 도구 9개·가이드 전부·장비 목록.

## 등록 (사용자 할 일, 근거 `C:\dev\review\2026-10-19_PortDock_홍보\10_검색등록_수요.md`)
- Google Search Console: URL 접두어 속성 → 메타 태그 값을 빌드 변수 `PUBLIC_GOOGLE_SITE_VERIFICATION` 에 → `<SITE_URL>/sitemap-index.xml` 제출.
- 네이버 서치어드바이저: 사이트 등록 → 메타 태그 값을 `PUBLIC_NAVER_SITE_VERIFICATION` 에 → sitemap 제출(등록하지 않아도 수집되지만 수집·색인 리포트를 볼 수 있다).
- 도메인을 바꾸면 URL 1:1 301 과 두 검색엔진의 주소 변경 절차를 같은 날에.
