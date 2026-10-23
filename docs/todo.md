# 할 일 — 남은 것 전부 (2026-10-22 갱신)

방향(10/22 사용자): 외주·문의는 뒤로, **사이트 광고 수익(애드센스) 위주**. 릴리스는 날짜 고정 없이 «준비되면 바로 공개». 실기 점검은 우선순위 뒤로(대신 «실제 장비에서 검증» 류 문구는 쓰지 않는다).
누가 하는지: **사용자** = 계정·결제·로그인·촬영이 필요한 것, **Claude** = 코드·문서·검사로 되는 것.

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
| Cloudflare Web Analytics 켜기(Pages → portdock → 메트릭) — 방문자 수 보기 | 사용자 | 선택 |
| 장비 레지스터 맵 추가(공식 매뉴얼 확인값만, 주소 기준은 숫자 프레임 예로 확인한 것만) | Claude | ✅ 10/23 — 26종·1107개(+LS S300, 한영넉스 LM, 루텍 Accura 3500·3700, 야스카와 A1000·V1000). 뺀 후보: LS iS7·iG5A·iE5·iC5(Modbus 숫자 프레임 예 없음), GIMAC-V(단위 칸 빔·SWAP 출하값 없음), 한영넉스 NX·NP200(통신 사양서 본문 0x012C ↔ 예시 0x012D 어긋남)·TPR-2F(예시 주소가 맵의 빈 칸·CRC 오타)·MC9(맵이 xlsx 뿐), 오토닉스 MP5·DPU·SPR·PSM·KN-1000B 등(예시에 숫자 없음)·TZ(자체 ASCII), 코노텍(Float 모드 비표준 4바이트 프레임) |
| 장비 맵 다음 후보 — 초안 있음(`C:\dev\review\2026-10-23_장비맵_초안\` — 개인 저장소에 보관): 델타 MS300(출처가 delta-emea CDN 2017판 — deltaww.com 판으로 다시 확인), 미쓰비시 FR-E700·FR-D700. 그 밖에 FR-E800(통신 매뉴얼 IB-0600871 S판 주소 기준은 맞음, Pr.52 모니터 코드 대조 필요)·야스카와 GA500(매뉴얼 로그인 필요)·델타 VFD-E·C2000 | Claude | 다음에 |
| 루텍 Accura 3300E — 자료실 새 판 Rev 2.12(2026-10-22, wr_id=1499)와 지금 파일(Rev 2.11) 대조 | Claude | 다음에 |
| 현장 사진 찍기 — 직접 산 부품·집 장비만(회사 현장·고객사 설비 금지): RS-485 단자, USB-시리얼 변환기, 4–20mA 결선, Pt100 3선식, 인버터 통신 단자 | 사용자 | 안 함 |
| 받은 사진을 가이드·장비 페이지에 넣기(자르기·설명·alt) | Claude | 사진 받은 뒤 |
| 같은 사진을 Adobe Stock 에 올리기(작가 몫 33%) | 사용자 | 선택 |
| 가이드에 직접 그린 배선도·결선도 SVG 넣기 | Claude | ✅ 10/22 8장(한·영), 생성기 `site/figs/make.mjs` |
| 웹 도구·가이드 더 늘리기(검색어 표 `site/SEO.md` 기준) | Claude | 10/23 오전 웹 도구 5종·가이드 4편, 오후 웹 도구 5종(압력 단위·산업 단위·모터 전류·인버터 주파수↔회전수·dB/dBm)·가이드 3편(모터 정격 전류와 차단기·전선, 압력 단위 혼동, 인버터 주파수와 회전수) → 웹 도구 18종·가이드 18편. 허용 전류 도구는 뺌 — KEC 232.5.2 가 KS C IEC 60364-5-52 부속서 B 표로 넘기는데 원문(유료)을 확인 못 함. 다음 후보는 SEO.md «다음 후보» 표 |
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
| winget 등록(그다음 Scoop·Chocolatey) | Claude(매니페스트) · 사용자(필요 시 계정) | 공개 뒤 |
| 화면 캡처·시연 GIF | 사용자 | 안 함 |
| 실기 점검(`docs/test-plan.md`) | 사용자 | 미룸(10/22) |

## 3. 홍보 — 공개 뒤 (초안 `C:\dev\review\2026-10-19_PortDock_홍보\`)
GeekNews Show GN(한 번) → 다음 날 OKKY 피드백 → 첫 주말부터 네이버 카페(하루 한 곳)·AlternativeTo → 11월 중순 Reddit r/PLC → 1주 뒤 r/embedded → 0.1.x 뒤 Show HN → 12월~ awesome 목록·EEVblog·클리앙. 글에 외주 문구는 넣지 않는다.

## 4. 날짜로 잡힌 것
| 언제 | 할 일 | 누가 |
|---|---|---|
| 11/2 입사 뒤 | 겸업·동종업종 조항 확인 — 그 전에는 외주를 «받는다» 약속 금지 | 사용자 |
| 11/2 입사 서류 | 기존 저작물 목록에 PortDock(저장소 주소·공개일 2026-10-19) | 사용자 |
| 2026-12-04 까지 | GitHub 2단계 인증 | 사용자 |
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
GitHub 공개 저장소·CI · Sentry(후원 승인) · 오류 보고 메일 · Cloudflare Pages → `portdock.dev`(옛 pages.dev 는 넘겨줌) · Discussions·비공개 취약점 신고·About/topics · 웹 도구 8종 · 가이드 11편(10/23 → 13종·15편) · 장비 맵 20종(10/23 → 26종) · 릴리스 전 «공개 준비 중» 버튼 · 애드센스 검토 요청.
