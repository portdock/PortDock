# 할 일 — 남은 것 전부 (2026-10-24 저녁 갱신)

방향(10/22 사용자): 외주·문의는 뒤로, **사이트 광고 수익(애드센스) 위주**. 릴리스는 날짜 고정 없이 «준비되면 바로 공개». 실기 점검은 우선순위 뒤로(대신 «실제 장비에서 검증» 류 문구는 쓰지 않는다).
누가 하는지: **사용자** = 계정·결제·로그인·촬영이 필요한 것, **Claude** = 코드·문서·검사로 되는 것.

## 로드맵 (10/24 — 사용자 확인)
릴리스 날짜는 고정하지 않는다(«준비되면 공개»). 아래는 순서와 대략의 시기.

| 단계 | 시기 | 무엇 | 누가 |
|---|---|---|---|
| 1. 광고 시작 준비 | ~10월 말 | 애드센스 승인 → 광고 단위 번호 넣기 · **네이버 서치어드바이저**(국내 검색 핵심) · Bing · Cloudflare Bulk Redirect·www · 웹 도구·가이드·장비 맵 계속 늘리기 | 사용자(계정) · Claude(코드) |
| 2. v0.1 공개 | 11월 | 11/2 입사 → 겸업 조항 확인·입사 서류에 PortDock · 화면 캡처·GIF · 릴리스 빌드 → VirusTotal(오탐이면 신고) → 공개(Publish 는 사용자) → `RELEASED=true` · winget·AlternativeTo · 홍보(GeekNews → OKKY → 네이버 카페 주말 하나씩 → Reddit) · SignPath 결정 | 사용자 · Claude |
| 3. 쌓기 | 12월 | Search Console 에서 검색이 들어오는 페이지 위주로 확장 · r/PLC·r/embedded · 0.1.x 뒤 Show HN · Hugging Face 데이터셋 · 다운로드 피드백 버그 고치기 | Claude 위주 |
| 4. 돌아보기 | 2027-01 | 다운로드·광고 수익·검색 유입·문의 수 → 원장 `C:\dev\review\README.md` 에 계속/방향 바꾸기 판정. 무료 MCP·외주(겸업 조항 결과) 여부도 | Claude(정리) · 사용자(결정) |

계속 지킬 것: «실제 장비에서 검증» 문구 금지(실기 점검 미룸) · 겸업 조항 확인 전 외주 «받는다» 약속 금지 · 수치는 원문으로 확인한 것만, 못 한 것은 빼고 이유를 남김.

10/24 전체 점검(HEAD 65b1995): 자동 검사 전부 통과, 9앱 × 4경우 smoke 36회 통과, 배포 사이트 353 주소 크롤(비정상은 Cloudflare 메일 가림 `/cdn-cgi/l/email-protection` 하나 — 사용자 판단), 배포본 = main. 남은 것: README 릴리스 링크는 공개 뒤 해결. (CT 출처 ABB 1VAP420003-TG 원문 URL 은 10/24 오후 ABB Library 공식 PDF 로 찾아 CT 계산기 «근거» 에 링크 ✅)

## 1. 광고 수익 — 지금
| 할 일 | 누가 | 상태 |
|---|---|---|
| 애드센스 검토 결과 기다리기(메일 portdock.contact@gmail.com) | 사용자 | 10/22 검토 요청함. 게시자 `ca-pub-2423716169041955`, 소유 확인 meta·`/ads.txt` 배포됨 |
| 승인 뒤 광고 단위 만들기 → 번호를 Claude 에게 | 사용자 | 대기 |
| 광고 단위 번호를 `PUBLIC_ADSENSE_SLOT`(또는 `site/src/lib/ads.ts`)에 넣고 배포, 광고 나오는지 확인 | Claude | 승인 뒤 |
| 애드센스 지급 — 수익이 쌓인 뒤에(사용자 10/23 결정, 미뤄도 수익은 계정에 쌓임): ① 수익 $10 즈음 결제 프로필(계정 유형 개인 · 수취인 = 은행 예금주와 같은 실명 · 우편 받는 집 주소 · 휴대폰 인증) → ② 종이 우편 PIN(2~4주) 입력 → ③ $100 전에 은행 계좌 등록 → ④ $100 넘은 다음 달 지급. 미국 세금 양식(개인은 보통 W-8BEN)을 요구하면 화면을 Claude 에게. 광고 수입은 다음 해 5월 종합소득세 신고 대상일 수 있음 | 사용자 | 수익 생긴 뒤 |
| Google Search Console — `https://portdock.dev/` 속성(portdock.contact, 메타 태그 확인 — `Base.astro` 의 값 지우지 말 것) → sitemap 제출 | Claude(Chrome) | ✅ 10/22 확인·sitemap 제출. 색인은 며칠~몇 주 |
| Bing Webmaster Tools — «Google Search Console 에서 가져오기»(Google 권한 허용·Microsoft 로그인이 필요해 사용자) | 사용자 | 안 함 |
| 네이버 서치어드바이저 — 사이트 등록 → «HTML 태그» 값을 Claude 에게 (Chrome 확장에서 네이버 접속이 막혀 Claude 가 못 함) | 사용자 | 안 함 |
| 네이버 확인 태그를 사이트에 넣고 배포 → 사용자가 «소유 확인» | Claude | 태그 받은 뒤 |
| 옛 주소 `portdock.pages.dev` → `portdock.dev` **301** — Cloudflare 대시보드 → (계정) Bulk Redirects → 목록 만들기: Source `portdock.pages.dev`, Target `https://portdock.dev`, Status **301**, «Preserve query string»·«Subpath matching»·«Preserve path suffix» 켜기, **«Include subdomains» 는 끄기**(켜면 배포 미리보기 `<id>.portdock.pages.dev` 까지 넘어감) → 그 목록으로 Bulk Redirect 규칙 만들기. 확인: `curl -sI https://portdock.pages.dev/ads.txt` 가 `301` 과 `location: https://portdock.dev/ads.txt` | 사용자 | 안 함 — 지금은 페이지 머리 스크립트(`location.replace`)로만 넘김: 검색 로봇·`ads.txt`·json·txt 에는 안 걸림 |
| Cloudflare Web Analytics 켜기(Pages → portdock → 메트릭) — 방문자 수 보기 | 사용자 | 선택 |
| 장비 레지스터 맵 추가(공식 매뉴얼 확인값만, 주소 기준은 숫자 프레임 예로 확인한 것만) | Claude | ✅ 10/24 — 45종·1858개(10/24 오후 +야스카와 J1000(SIEP C710606 31D)·오므론 MX2(I570-E2-02F)·슈나이더 ATV312(BBV52816·BBV51701)·오므론 E5CN·E5AN·E5EN·E5GN(H158-E1-02) — 매뉴얼에 인쇄된 예 CRC 오타는 notes 에, 표와 예가 어긋난 레지스터(J1000 H5-13 배율·MX2 트립 모니터·F002·A020·ATV312 ACC·dEC 등)는 빼고 notes / 10/24 +후지전기 FRENIC-Mini·Eco·Multi·MEGA·FRENIC-Ace·FRENIC-HVAC·AQUA, 슈나이더 ATV320 / 10/23 +LS S300, 한영넉스 LM, 루텍 Accura 3500·3700, 야스카와 A1000·V1000, 미쓰비시 FR-E700·FR-D700·FR-E800·FR-A800·FR-F800·FR-A700·FR-F700·FR-D800·FR-CS80, 오므론 E5CC, 슈나이더 ATV12). 뺀 후보: 지멘스 SINAMICS V20(공식 2022판은 내려받기 403, 2016판 매뉴얼은 주소표에 0 기준·40001 두 칸은 있으나 숫자 프레임 예 없음, 10/24 공식 응용 예 63696870 도 403), ABB ACS310·ACS355·ACS580(10/24 — search.abb.com 공식 매뉴얼 D·E·J판 모두 숫자 프레임 예 없이 «40002 는 0001 로» 같은 문장뿐), ATV320 CMD·ETA·LFRD·RFRD 주소(매뉴얼 NVE41308 에 없고 스캐너 출하 배정으로만 나옴)·나머지 파라미터(엑셀 NVE41316 뿐), FRENIC 공통: M38(표의 최소 단위 1.0 ↔ 형식 [3] 0.1)·M69(용량에 따라 배율 0.01/0.1 A)·형식 [16] 비트 6(비트 그림 0 ↔ 표 TL 모순), FRENIC-Ace: Ace 전용 형식 [74]·[19] 코드(M47·M48·M69)·뜻 없는 M78·M79·M53(0099 전압 ↔ 0082 전류)·X6~X9, FRENIC-HVAC: M47·M48(10 h 단위 ↔ 형식 [74] 대조 못 함)·M53(표 5.11 전류 ↔ 5.28 전압), 오토닉스 TF3(공식 다운로드 링크를 못 얻고 대리점 사본뿐)·한영넉스 새 통신 설명서(자료실 동적 페이지로 못 찾음), ATV12 나머지 파라미터(주소·단위가 엑셀 BBV51917 뿐 — 공식 경로 못 찾음), 미쓰비시 D800·CS80 누적 전력량 40225(항목표 0.01 kWh ↔ 같은 매뉴얼 통신 설명 1 kWh 어긋남 — D800 은 32비트 40277~ 로 대신), 델타 MS300(deltaww.com 최신판 2026-04-17 내려받기가 Cloudflare 사람 확인에 막힘, delta-emea 는 deltaww.com 으로 넘어가 다른 공식 경로 없음 — 2017판만 확인돼 보류), LS iS7·iG5A·iE5·iC5(Modbus 숫자 프레임 예 없음), GIMAC-V(단위 칸 빔·SWAP 출하값 없음), 한영넉스 NX·NP200(통신 사양서 본문 0x012C ↔ 예시 0x012D 어긋남)·TPR-2F(예시 주소가 맵의 빈 칸·CRC 오타)·MC9(맵이 xlsx 뿐), 오토닉스 MP5·DPU·SPR·PSM·KN-1000B 등(예시에 숫자 없음)·TZ(자체 ASCII), 코노텍(Float 모드 비표준 4바이트 프레임) |
| 장비 맵 다음 후보 — (10/24 후지 FRENIC 3종·ATV320 넣음, ABB ACS 는 프레임 예 없어 뺌. FRENIC-Ace 출하 통신값은 후지 미국 법인 응용 노트 FECA-AN-183 근거 — 매뉴얼이 아닌 공식 응용 노트라 사용자 판단 필요, 빼려면 comm 의 baud·패리티만 지우면 됨) 델타 MS300(초안 `C:\dev\review\2026-10-23_장비맵_초안\ms300.json` — 사용자가 deltaww.com 에서 최신판 PDF 를 받아 주면 대조, 10/24 오후 다시 시도 — 내려받기 센터 API·filecenter 경로도 못 씀)·VFD-E·C2000(같은 사람 확인), 슈나이더 ATV31(공식 Modbus 매뉴얼 1624597 있음 — ATV312 와 거의 같아 미룸), 야스카와 GA500(매뉴얼 로그인 필요), 후지 FRENIC-Ace E3·FRENIC 출하 통신값(0082 에 없음), 오토닉스 TF3(공식 링크 찾으면). (10/23 FR-E800·A800·F800 누적 전력량 40225 도 같은 어긋남(항목표 0.01 kWh ↔ 통신 1 kWh)이라 빼고 32비트 40277·40279 로 바꿈. A700·F700 은 항목표·통신 설명 모두 1 kWh 로 맞음) | Claude | 다음에 |
| 루텍 Accura 3300E — 자료실 새 판 Rev 2.12(2026-10-22, wr_id=1499)와 지금 파일(Rev 2.11) 대조 | Claude | ✅ 10/23 — 넣은 레지스터의 번호·형식·단위 변화 없음(이름 표기·오타·쪽 번호만), 출처 판 갱신 |
| 현장 사진 찍기 — 직접 산 부품·집 장비만(회사 현장·고객사 설비 금지): RS-485 단자, USB-시리얼 변환기, 4–20mA 결선, Pt100 3선식, 인버터 통신 단자 | 사용자 | 안 함 |
| 받은 사진을 가이드·장비 페이지에 넣기(자르기·설명·alt) | Claude | 사진 받은 뒤 |
| 같은 사진을 Adobe Stock 에 올리기(작가 몫 33%) | 사용자 | 선택 |
| 가이드에 직접 그린 배선도·결선도 SVG 넣기 | Claude | ✅ 10/22 8장(한·영), 생성기 `site/figs/make.mjs` |
| 웹 도구·가이드 더 늘리기(검색어 표 `site/SEO.md` 기준) | Claude | 10/23 오전 웹 도구 5종·가이드 4편, 오후 웹 도구 5종(압력 단위·산업 단위·모터 전류·인버터 주파수↔회전수·dB/dBm)·가이드 3편(모터 정격 전류와 차단기·전선, 압력 단위 혼동, 인버터 주파수와 회전수) → 웹 도구 18종·가이드 18편. 10/23 저녁 웹 도구 6종(ASCII 코드표·정수 변환·UART 보율 오차·CAN 비트 타이밍·NTC 서미스터·엔코더)·가이드 3편(Modbus 예외 코드, RS-232 DB9·널 모뎀, NTC 온도 계산) → 웹 도구 24종·가이드 21편. 허용 전류 도구는 뺌 — KEC 232.5.2 가 KS C IEC 60364-5-52 부속서 B 표로 넘기는데 원문(유료)을 확인 못 함. 10/23 밤 웹 도구 5종(분압 저항 E12·E24·E96·ADC 분해능·RC 시정수·3상 전력·역률 개선 콘덴서)·가이드 2편(아날로그 입력 스케일링, 역률과 콘덴서) → 웹 도구 29종·가이드 23편. 3상 kVA 는 모터 전류 계산기와 겹치지 않게 «전기 쪽» 값만 다루는 별도 페이지. 역률 요금 기준(약관)은 원문 미확인이라 수치 없음. 10/23 늦은 저녁 웹 도구 4종(합성 저항 직렬·병렬·CT 비·2차 전류·부담·리액턴스·LC 공진·LED 저항)·가이드 2편(CT 비·부담, 저항 직렬·병렬) → 웹 도구 33종·가이드 25편. CT 는 ABB 계기용 변성기 가이드(1VAP420003-TG)로, IEC 61869-2 등급별 오차 한도는 원문 미확인이라 뺌. LC 필터는 리액턴스 도구에 합침. 10/24 웹 도구 4종(공압 실린더 추력 — SMC Best Pneumatics 기술 자료, 볼스크류 토크·모터 선정 — THK 515-1E 예제 2개, 히터 용량 kW·전류 — Tempco Engineering Data, op amp 증폭률 — TI SBOA092B)·가이드 2편(공압 실린더 추력과 부하율, 볼스크류 토크와 서보 모터) → 웹 도구 37종·가이드 27편. 배관 유속·펌프 동력은 숫자 예가 있는 제조사 원문을 못 찾아 보류. 10/24 오후 웹 도구 3종(진공 패드 흡착력 — SMC Vacuum Equipment Model Selection, 실린더 공기 소비량 — SMC Best Pneumatics Data 2, 타이밍 벨트 길이·축간 거리 — Gates GT3 Drive Design Manual 17195·Mectrol 백서)·가이드 2편(진공 패드 흡착력과 이젝터, 실린더 공기 소비량과 컴프레서) → 웹 도구 40종·가이드 29편. 컨베이어 모터 용량·밸브 Cv·제어반 발열은 원문 미확인으로 보류. 보류·뺀 이유는 SEO.md «다음 후보» 13~47 |
| AI 가 쓰는 데이터: `/devices/all.json`·`registers.csv`·`/llms-full.txt` | Claude | ✅ 10/22 |
| Hugging Face 계정(portdock.contact) → 데이터셋 저장소 `portdock/modbus-register-maps` 만들기 → `node tools/devices-export.mjs` 결과 폴더를 올리기(Claude 가 Chrome 으로 올릴 수 있음) · Kaggle 도 같은 묶음 | 사용자(계정) · Claude(올리기) | 안 함 |
| Cloudflare → portdock.dev → 보안 → 봇(또는 «AI Crawl Control»)에서 AI 크롤러 차단이 꺼져 있는지 확인 — 켜져 있으면 AI 가 데이터를 못 가져감 | 사용자 | 안 함 |

## 2. v0.1 릴리스 — 준비되면 공개
| 할 일 | 누가 | 상태 |
|---|---|---|
| 릴리스 시험 빌드(`release.yml` 수동 실행) | Claude | ✅ 10/22 9앱 성공, 결과물 27개·SHA256 확인 |
| Defender 검사 | Claude | ✅ 10/22 위협 없음(공개 직전 최신 정의로 한 번 더) |
| VirusTotal | Claude | ✅ 10/22 휴대판 9개 0탐지, 설치판 9개 SecureAge 1곳, **Modbus Master 설치판만 CrowdStrike Falcon(grayware 60%) 추가** |
| CrowdStrike 오탐 신고(Modbus Master 설치판) — 창구·문안 `docs/false-positive.md` | 사용자(메일 보내기) · Claude(자료 준비 ✅) | 실제 릴리스 빌드 뒤 다시 검사하고, 남아 있으면 보냄 |
| SignPath Foundation 무료 서명 신청 여부 결정(권장: Net Scan 제외) | 사용자 | 결정 대기 |
| 태그 `v0.1.0` → 초안 릴리스 → 본문(VirusTotal 링크) → `site/src/data/tools.ts` 의 `RELEASED` 를 `true` 로 → Publish | Claude · Publish 는 사용자 확인 | 대기 |
| 사이트 내려받기 버튼이 실제 파일로 이어지는지 확인 | Claude | 공개 뒤 |
| winget 등록(그다음 Scoop·Chocolatey) | Claude(매니페스트) · 사용자(필요 시 계정·제출 확인) | 매니페스트 생성 스크립트 ✅ 10/24(`tools/winget.mjs`·`tools/scoop.mjs`, 명령은 `docs/release-v0.1.md` 3절) — 공개 뒤 돌려 winget-pkgs PR 9개·Scoop bucket 저장소 |
| 화면 캡처·시연 GIF | 사용자 | 안 함 |
| 실기 점검(`docs/test-plan.md`) | 사용자 | 미룸(10/22) |

## 3. 홍보 — 공개 뒤 (초안 `C:\dev\review\2026-10-19_PortDock_홍보\`)
GeekNews Show GN(한 번) → 다음 날 OKKY 피드백 → 첫 주말부터 네이버 카페(하루 한 곳)·AlternativeTo → 11월 중순 Reddit r/PLC → 1주 뒤 r/embedded → 0.1.x 뒤 Show HN → 12월~ awesome 목록·EEVblog·클리앙. 글에 외주 문구는 넣지 않는다.

## 4. 날짜로 잡힌 것
| 언제 | 할 일 | 누가 |
|---|---|---|
| 11/2 입사 뒤 | 겸업·동종업종 조항 확인 — 그 전에는 외주를 «받는다» 약속 금지 | 사용자 |
| 11/2 입사 서류 | 기존 저작물 목록에 PortDock(저장소 주소·공개일 2026-10-19) | 사용자 |
| ~~2026-12-04 까지~~ | ~~GitHub 2단계 인증~~ ✅ 10/20 켬(인증 앱·GitHub Mobile·패스키, 복구 코드 보관). 남음: 조직 portdock 의 «2FA 필수» 는 SignPath 신청 전에 | 사용자 |
| 2027-09 중 | 도메인 `portdock.dev` 갱신 결정(자동 갱신 일부러 끔, 만료 2027-10-22, 갱신 $12.20) | 사용자 |
| 2027-01 | 다운로드·광고 수익·문의 수 돌아보기(원장 review/README.md) | Claude |

## 5. 나중에 / 선택
- Sentry 2단계 인증(선택)
- 도메인 뒤 Email Routing(`contact@portdock.dev` → portdock.contact@gmail.com)·Turnstile — 문의 양식을 열 때(외주 뒤로라 보류)
- 조직 portdock 구성원 공개(개인 아이디가 보임 — 원할 때)
- 저작권 등록은 보류 — 원하면 한국저작권위원회 상담 1800-5455 먼저(`docs/release-v0.1.md`)

## 돈이 드는 것
| 무엇 | 왜 필요 | 대략 비용 | 상태 |
|---|---|---|---|
| 도메인 `portdock.dev` | 홈페이지·애드센스(내 도메인 필요) | 첫해 $8.20, 갱신 $12.20 | ✅ 10/22 구입 |
| 중고 PLC — 미쓰비시 FX5U 또는 iQ-R(SLMP) · LS XGB(FEnet) | PortDock PLC Link 검증 | 미확인 | 보류 |
| SCPI 계측기 1대 | SCPI 실기 검증 | 미확인 | 보류 |
| CAN 어댑터(CANable 등) | CAN 도구(차점 후보) | 미확인 | 보류 |
| 유료 코드 서명(OV 클라우드) | SignPath 가 거절될 때만 | 연 20~50만 원(10/17, C) | 보류 |
| USB-RS485 변환기 2개(FTDI·CH340) | 재연결·지연 시험(C25·C28) | 소액 | 보류 |

## 끝난 것 (10/19~22)
GitHub 공개 저장소·CI · Sentry(후원 승인) · 오류 보고 메일 · Cloudflare Pages → `portdock.dev`(옛 pages.dev 는 HTML 페이지만 스크립트로 넘김 — 301 은 위 1절 Bulk Redirect) · Discussions·비공개 취약점 신고·About/topics · 웹 도구 8종 · 가이드 11편(10/24 → 40종·29편) · 장비 맵 20종(10/24 → 45종·1858개) · 릴리스 전 «공개 준비 중» 버튼 · 애드센스 검토 요청.
