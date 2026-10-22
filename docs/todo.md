# 할 일 — 남은 것 전부 (2026-10-22 갱신)

방향(10/22 사용자): 외주·문의는 뒤로, **사이트 광고 수익(애드센스) 위주**. 릴리스는 날짜 고정 없이 «준비되면 바로 공개». 실기 점검은 우선순위 뒤로(대신 «실제 장비에서 검증» 류 문구는 쓰지 않는다).
누가 하는지: **사용자** = 계정·결제·로그인·촬영이 필요한 것, **Claude** = 코드·문서·검사로 되는 것.

## 1. 광고 수익 — 지금
| 할 일 | 누가 | 상태 |
|---|---|---|
| 애드센스 검토 결과 기다리기(메일 portdock.contact@gmail.com) | 사용자 | 10/22 검토 요청함. 게시자 `ca-pub-2423716169041955`, 소유 확인 meta·`/ads.txt` 배포됨 |
| 승인 뒤 광고 단위 만들기 → 번호를 Claude 에게 | 사용자 | 대기 |
| 광고 단위 번호를 `PUBLIC_ADSENSE_SLOT`(또는 `site/src/lib/ads.ts`)에 넣고 배포, 광고 나오는지 확인 | Claude | 승인 뒤 |
| Google Search Console — 도메인 속성 `portdock.dev`(Cloudflare 자동 확인) → sitemap `https://portdock.dev/sitemap-index.xml` 제출 | 사용자 | 안 함 |
| Bing Webmaster Tools — «Google Search Console 에서 가져오기» | 사용자 | 안 함 |
| 네이버 서치어드바이저 — 사이트 등록 → «HTML 태그» 값을 Claude 에게 | 사용자 | 안 함 |
| 네이버 확인 태그를 사이트에 넣고 배포 → 사용자가 «소유 확인» | Claude | 태그 받은 뒤 |
| Cloudflare Web Analytics 켜기(Pages → portdock → 메트릭) — 방문자 수 보기 | 사용자 | 선택 |
| 장비 레지스터 맵 10종 추가(공식 매뉴얼 확인값만) → 검사·커밋 | Claude | 진행 중(LS M100 부터) |
| 현장 사진 찍기 — 직접 산 부품·집 장비만(회사 현장·고객사 설비 금지): RS-485 단자, USB-시리얼 변환기, 4–20mA 결선, Pt100 3선식, 인버터 통신 단자 | 사용자 | 안 함 |
| 받은 사진을 가이드·장비 페이지에 넣기(자르기·설명·alt) | Claude | 사진 받은 뒤 |
| 같은 사진을 Adobe Stock 에 올리기(작가 몫 33%) | 사용자 | 선택 |
| 가이드에 직접 그린 배선도·결선도 SVG 넣기 | Claude | 사용자 결정 대기 |
| 웹 도구·가이드 더 늘리기(검색어 표 `site/SEO.md` 기준) | Claude | 계속 |

## 2. v0.1 릴리스 — 준비되면 공개
| 할 일 | 누가 | 상태 |
|---|---|---|
| 릴리스 시험 빌드(`release.yml` 수동 실행) | Claude | ✅ 10/22 9앱 성공, 결과물 27개·SHA256 확인 |
| Defender 검사 | Claude | ✅ 10/22 위협 없음(공개 직전 최신 정의로 한 번 더) |
| VirusTotal | Claude | ✅ 10/22 휴대판 9개 0탐지, 설치판 9개 SecureAge 1곳, **Modbus Master 설치판만 CrowdStrike Falcon(grayware 60%) 추가** |
| CrowdStrike 오탐 신고(Modbus Master 설치판) | 사용자(제출) · Claude(자료 준비) | 안 함 |
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
GitHub 공개 저장소·CI · Sentry(후원 승인) · 오류 보고 메일 · Cloudflare Pages → `portdock.dev`(옛 pages.dev 는 넘겨줌) · Discussions·비공개 취약점 신고·About/topics · 웹 도구 8종 · 가이드 11편 · 장비 맵 10종 · 릴리스 전 «공개 준비 중» 버튼 · 애드센스 검토 요청.
