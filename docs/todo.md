# 할 일 — 기술 (공개용)

운영 메모(일정·계정·홍보 등)는 비공개로 따로 관리한다. 여기에는 코드·문서·데이터로 하는 기술 할 일과 지킬 원칙만 둔다.

## 품질 원칙 — 늘 지킬 것
- **수치는 원문으로 확인한 것만** 싣는다. 확인하지 못한 값은 빼고, 뺀 이유를 남긴다(웹 도구·가이드는 `site/SEO.md` «다음 후보», 장비 맵은 그 파일의 `notes`).
- 실기 점검(`docs/test-plan.md`)을 마치기 전에는 «실제 장비에서 검증»·«검증됨»·«시험 완료» 같은 문구를 쓰지 않는다.
- 페이지마다 만든 방법과 출처를 밝힌다(이용 안내 페이지의 고지와 맞춤).
- 모델 이름만 바꾼 껍데기 페이지, 기계 번역으로 언어판을 한꺼번에 만드는 것은 하지 않는다.
- 면책 문구는 «고의·중과실까지 책임지지 않음» 처럼 무효가 될 문구를 쓰지 않는다.
- 사진·자료는 직접 만든 것만 — 회사 현장·고객사 설비 사진은 쓰지 않는다.

## 1. 앱 기능 후보
| 할 일 | 상태 |
|---|---|
| SCPI: VXI-11 지원(HiSLIP·USBTMC·GPIB 는 VISA·드라이버가 필요해 넣지 않음) | 다음 판 |
| PLC Link — 미쓰비시 SLMP(FX5U·iQ-R)·LS XGB FEnet | 후보(시험 장비 필요) |
| CAN 도구(CANable 등 USB 어댑터) | 차점 후보 |
| 공개 뒤 들어오는 버그·요청 고치기(Issues·프로그램 안 «!» 보고) | 공개 뒤 |
| 실기 점검 `docs/test-plan.md`(⏸·💰 항목) | 장비 마련 뒤 |

## 2. 릴리스 절차 — v0.1
점검표는 [release-v0.1.md](release-v0.1.md), 일반 절차는 [release.md](release.md).

| 단계 | 상태 |
|---|---|
| 릴리스 시험 빌드(`release.yml` 수동 실행) — 결과물·SHA256 확인 | ✅ 9앱 |
| Defender·VirusTotal 검사 — 공개 직전 최신 정의로 한 번 더 | 시험 빌드 검사함 |
| 오탐이 남으면 신고 — 창구·문안 [false-positive.md](false-positive.md) | 실제 릴리스 빌드 뒤 |
| 코드 서명(SignPath Foundation 등) | 미정 |
| 태그 `v0.1.0` → 초안 릴리스 → 본문(VirusTotal 링크) → `site/src/data/tools.ts` 의 `RELEASED` 를 `true` 로 → 공개 | 대기 |
| 사이트 내려받기 버튼이 실제 파일로 이어지는지 확인 | 공개 뒤 |
| winget·Scoop 매니페스트(`tools/winget.mjs`·`tools/scoop.mjs`, 명령은 release-v0.1.md 3절) → winget-pkgs PR(패키지마다 하나)·Scoop bucket | 공개 뒤 |
| 화면 캡처·시연 GIF | 대기 |

## 3. 사이트 콘텐츠 후보
| 할 일 | 상태 |
|---|---|
| 웹 도구·가이드 늘리기 — 검색어 표와 보류 이유는 `site/SEO.md` | 계속 |
| 물·공기 물성 표·계산기(온도별 밀도·비열·점도 — NIST 등 공식 수치) | 후보 |
| 배관 유속·펌프 동력, 컨베이어 모터 용량, 밸브 Cv, 제어반 발열 | 보류 — 숫자 예가 있는 원문을 못 찾음 |
| 전선 허용 전류 | 보류 — 근거 표준(KS C IEC 60364-5-52 부속서 B) 원문 미확인 |
| 역률 요금 기준(국내 약관) | 수치 없이 둠 — 원문 미확인 |
| Search Console 에서 노출은 있는데 클릭이 적은 페이지 고치기 | 색인 뒤 |
| 직접 찍은 사진(RS-485 단자·USB-시리얼 변환기·4–20mA·Pt100 3선식·인버터 통신 단자)을 가이드·장비 페이지에(자르기·설명·alt) | 사진 생긴 뒤 |
| 배선도·결선도 SVG(생성기 `site/figs/make.mjs`) | ✅ 8장(한·영) |
| AI 가 쓰는 데이터 `/devices/all.json`·`registers.csv`·`/llms-full.txt` | ✅ |
| 장비 맵 데이터셋 공개(Hugging Face·Kaggle — `node tools/devices-export.mjs` 결과) | 후보 |
| 광고 단위 번호를 `PUBLIC_ADSENSE_SLOT`(또는 `site/src/lib/ads.ts`)에 넣고 표시 확인 | 단위 생긴 뒤 |

사이트 설정에서 지킬 것: `Base.astro` 의 검색엔진 소유 확인 meta 값은 지우지 않는다 · `PUBLIC_CF_ANALYTICS_TOKEN` 은 비워 둔다(Pages 자동 주입과 두 번 셈) · @portdock.dev 로 메일을 보내게 되면 SPF·DKIM 을 그 서비스에 맞게 바꾼다(지금은 `v=spf1 -all`·DMARC reject).

## 4. 장비 레지스터 맵 — 확장 규칙과 후보
지금 55종·2268개(`data/devices/`, 검사 `node tools/devices-check.mjs`).

규칙:
- 공식 매뉴얼(또는 제조사 공식 응용 노트)에서 확인한 값만. 출처 문서 번호·판·쪽을 남긴다.
- 주소 기준(0 기준·40001 표기)은 매뉴얼의 **숫자 프레임 예**로 확인한 것만. 예가 없으면 그 장비는 넣지 않는다.
- 표와 예가 어긋나는 레지스터(배율·단위·주소)는 빼고 `notes` 에 이유를 적는다. 매뉴얼 예의 CRC 오타도 `notes` 에.
- 대리점 사본·로그인 필요 자료·엑셀 뿐인 맵은 쓰지 않는다.

다음 후보:
| 장비 | 막힌 것 |
|---|---|
| 델타 MS300·VFD-E·C2000 | 최신판 PDF 내려받기가 사람 확인에 막힘 |
| 슈나이더 ATV31 | ATV312 와 거의 같아 미룸(공식 Modbus 매뉴얼은 있음) |
| 야스카와 GA500 | 매뉴얼 로그인 필요 |
| 후지 FRENIC-Ace E3 · FRENIC 출하 통신값 | 공식 자료에서 못 찾음 |
| 오토닉스 TF3 | 공식 다운로드 링크를 못 얻음 |
| 지멘스 SINAMICS V20, ABB ACS310·ACS355·ACS580, LS iS7·iG5A·iE5·iC5 | 숫자 프레임 예 없음 |

## 5. 시험용 장비 (아직 없음)
`docs/test-plan.md` 의 💰 항목은 아래 장비가 있어야 한다. 없으면 각 항목 괄호 안의 대안(가상 COM 쌍·Simulator)으로.

| 장비 | 쓰는 곳 |
|---|---|
| USB-RS485 변환기 2개(FTDI·CH340) | 실기 점검 — 재연결·지연(C25·C28), Modbus Master RTU |
| SCPI 계측기 1대(소형 전원·멀티미터, LAN 또는 RS-232) | SCPI 실기(SC8·SC9) |
| Arduino 호환 보드 1개 | Plot 실기(PL6~PL8) |
| 중고 PLC — 미쓰비시 FX5U 또는 iQ-R(SLMP) · LS XGB(FEnet) | PLC Link 검증 |
| CAN 어댑터(CANable 등) | CAN 도구 |
