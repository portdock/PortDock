# 할 일 — 돈이 들거나 사용자가 직접 해야 하는 것

코드로 할 수 있는 것은 먼저 진행하고, 아래는 결정·결제·계정이 필요해 남겨 둔다. (2026-10-18)

## 돈이 드는 것
| 무엇 | 왜 필요 | 대략 비용 | 없으면 |
|---|---|---|---|
| 도메인 `portdock.dev` (Cloudflare Registrar) | 홈페이지·문의 메일 주소 | 연 약 $12 | GitHub Pages 주소 등 임시 주소로 시작 가능 |
| 중고 PLC — 미쓰비시 FX5U 또는 iQ-R(SLMP 내장) | PortDock PLC Link 검증 | 미확인(중고 시세 확인 필요) | PLC Link 는 만들 수 있지만 실기 검증 불가 → 출시 보류 |
| 중고 PLC — LS XGB(FEnet 내장) | PLC Link 의 XGT 검증 | 미확인 | 위와 같음 |
| SCPI 계측기 1대(소형 전원·멀티미터, LAN 또는 RS-232) | PortDock SCPI 실기 검증 | 미확인 | Simulator 로 흉내 내 시험은 가능, 실기 검증만 빠짐 |
| CAN 어댑터(CANable 등 slcan) | CAN 도구(차점 후보) | 미확인 | 보류 |
| 유료 코드 서명(OV 클라우드 서명) | SignPath 무료 서명이 거절될 때만 | 연 20~50만 원(10/17 조사, C) | 무서명 + SmartScreen 안내 |
| 실기 점검용 USB-RS485 변환기 2개(FTDI·CH340 각 1) | 재연결·지연 시험(C25·C28) | 소액 | 있는 것으로 |

## 사용자가 직접 해야 하는 것 (무료)
- GitHub 공개 저장소 `juhak0308/PortDock` 만들기 → Claude 가 올림
- Cloudflare 가입 · Pages 연결 · Email Routing · Turnstile (`site/README.md`)
- 문의 받을 전용 메일 정하기
- Sentry 가입(조직 만들 때 EU, IP 저장 끄기, DPA 동의, 오픈소스 후원 신청) → DSN 을 `shared/report.ts` 에
- SignPath Foundation 무료 서명 신청
- Google Search Console · 네이버 서치어드바이저 등록
- winget 등록(첫 릴리스 뒤)
- 다른 노트북 실기 점검(`docs/test-plan.md`)
- 저작권 등록은 보류 — 원하면 한국저작권위원회 상담 1800-5455 먼저(`docs/release-v0.1.md`)
