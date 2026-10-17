# PortDock

현장 하드웨어 시험용 통신 도구 묶음. 프로그램마다 따로 받아 쓰고, 속의 통신·해석 부품은 함께 쓴다.

| 프로그램 | 용도 | 위치 |
|---|---|---|
| PortDock Serial | 시리얼(COM) 송수신·신호선·자동 재연결·시험 로그 | `apps/serial` |
| PortDock Modbus Slave | Modbus RTU 장비 흉내(레지스터 표) | 예정 |
| PortDock TCP · UDP | 이더넷 장비 시험 | 예정 |
| PortDock Simulator | 규칙(받으면 → 답하기)으로 아무 장비나 흉내 | 예정 (`apps/simulator`) |

- 공용 부품: `crates/core` (Rust) — 체크섬·HEX/ASCII·프레임 구분·Modbus·자동응답·시리얼 세션. 공용 화면 도우미: `shared/`.
- 빌드: `npm install` → `npm run build:serial` · 테스트: `cargo test --workspace`
- 라이선스: GPL-3.0-only
