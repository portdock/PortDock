# PortDock

[![CI](https://github.com/portdock/PortDock/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/portdock/PortDock/actions/workflows/ci.yml)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue)](LICENSE)
[![Release](https://img.shields.io/github/v/release/portdock/PortDock?include_prereleases&sort=semver&label=release)](https://github.com/portdock/PortDock/releases)
![Windows 10/11](https://img.shields.io/badge/Windows-10%20%7C%2011-0078D6)

[English](README.md)

윈도우에서 현장 하드웨어를 시험할 때 쓰는 무료 통신 도구 묶음. 프로그램마다 따로 작게 받아 쓰고, 속의 통신·해석 부품은 함께 씁니다.

| 프로그램 | 하는 일 |
|---|---|
| **PortDock Serial** | 시리얼(COM) 송수신 — RS-232·RS-485·USB 시리얼, 신호선(DTR·RTS·CTS·DSR·RI·CD), USB 를 뽑았다 꽂아도 자동 재연결, 프레임 구분, 체크섬(9종 + 사용자 정의 CRC), Modbus RTU 풀이·요청 만들기, 자동응답, 시각이 찍힌 시험 기록 |
| **PortDock Modbus Slave** | Modbus 슬레이브 장비 흉내(시리얼 RTU·Modbus TCP·RTU over TCP) — 코일·레지스터 표(32비트·실수·문자열 칸), 값 자동 변화, 장애 주입, 내장 장비 프로필, CSV 레지스터 맵, 마스터의 요청 확인 |
| **PortDock TCP** | TCP 클라이언트·서버·중계(모니터) — 여러 접속, 에코, 자동 재접속, Modbus TCP 프레임 구분 |
| **PortDock UDP** | UDP 송수신 — 브로드캐스트, 멀티캐스트, 에코 |
| **PortDock Simulator** | 규칙대로 답하는 가짜 장비(시리얼·TCP·UDP) — «이게 오면 이걸로 답하기» |
| **PortDock Net Scan** | 산업 네트워크 장비 IP 찾기 — 핑·ARP 훑기, MAC 제조사, 산업 포트 판정(Modbus 502·MC·XGT 등), 장기 핑 감시, Wake-on-LAN |
| **PortDock Modbus Master** | Modbus RTU·TCP 마스터(폴링) — 여러 폴링 표, 타입 값(U16~F64·문자열·바이트 순서·40001 표기), 05·06·0F·10 쓰기, 국번·주소 범위 찾기, 내장 장비 프로필, 통신 풀이·통계, 값 CSV 기록, 추세 |
| **PortDock SCPI** | SCPI 계측기 터미널 — LAN 소켓(5025)·RS-232, VISA 없이. 질의·쓰기·읽기와 응답 시간, `*IDN?` 식별, 오류 큐 비우기, `*OPC?` 기다림, 숫자 반복 측정(값 표·추세·CSV), 블록 데이터(#…) HEX 미리보기·파일 저장 |
| **PortDock Plot** | 시리얼·TCP·UDP 로 들어오는 숫자를 실시간 그래프로 — 쉼표·빈칸·탭·세미콜론 글자 줄(자동 감지), Arduino 식 `이름:값`, 머리글 이름, 바이너리 프레임(시작 바이트·u8~f64·엔디언·체크섬). 채널 32개·왼/오른 축, 멈춤·커서·두 점 Δt·Δ값·확대, 통계 표, 받는 동안 CSV 기록, 화면 CSV·PNG 저장 |

홈페이지: <https://portdock.dev>

## 내려받기

**[GitHub Releases](https://github.com/portdock/PortDock/releases/latest)** 에서 받습니다. 파일 이름이 늘 같아서 아래 링크는 언제나 최신판을 가리킵니다.

| 프로그램 | 설치판 | 휴대판 |
|---|---|---|
| Serial | [PortDock-Serial-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Serial-setup.exe) | [PortDock-Serial-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Serial-portable.zip) |
| Modbus Slave | [PortDock-Modbus-Slave-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Modbus-Slave-setup.exe) | [PortDock-Modbus-Slave-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Modbus-Slave-portable.zip) |
| TCP | [PortDock-TCP-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-TCP-setup.exe) | [PortDock-TCP-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-TCP-portable.zip) |
| UDP | [PortDock-UDP-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-UDP-setup.exe) | [PortDock-UDP-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-UDP-portable.zip) |
| Simulator | [PortDock-Simulator-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Simulator-setup.exe) | [PortDock-Simulator-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Simulator-portable.zip) |
| Net Scan | [PortDock-Net-Scan-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Net-Scan-setup.exe) | [PortDock-Net-Scan-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Net-Scan-portable.zip) |
| Modbus Master | [PortDock-Modbus-Master-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Modbus-Master-setup.exe) | [PortDock-Modbus-Master-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Modbus-Master-portable.zip) |
| SCPI | [PortDock-SCPI-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-SCPI-setup.exe) | [PortDock-SCPI-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-SCPI-portable.zip) |
| Plot | [PortDock-Plot-setup.exe](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Plot-setup.exe) | [PortDock-Plot-portable.zip](https://github.com/portdock/PortDock/releases/latest/download/PortDock-Plot-portable.zip) |

윈도우 10·11, x64.

### 설치판과 휴대판

- **설치판**(`-setup.exe`) — 지금 사용자에게만 설치하므로 **관리자 권한이 필요 없습니다.** 시작 메뉴의 *PortDock* 폴더에 들어가고, 제거 프로그램이 함께 설치됩니다.
- **휴대판**(`-portable.zip`) — 아무 곳(USB 메모리, 공유 폴더)에 풀고 exe 를 실행합니다. 아무것도 설치하지 않으며, 설정은 exe 옆 `portdock-data` 폴더에 남습니다. 그 폴더에 쓰기 권한이 있어야 합니다.

### «Windows의 PC 보호» 경고

아직 **코드 서명이 없어서**(SignPath 의 오픈소스 무료 서명 신청 예정) 처음 실행할 때 Microsoft Defender SmartScreen 경고가 뜰 수 있습니다. **추가 정보 → 실행** 을 누르세요. 그 전에 받은 파일이 올린 파일과 같은지 확인할 수 있습니다.

```powershell
Get-FileHash .\PortDock-Serial-setup.exe -Algorithm SHA256
```

나온 값을 같은 릴리스에 붙은 `SHA256SUMS.txt` 와 비교합니다. 릴리스마다 파일별 VirusTotal 검사 링크도 적어 둡니다.

### WebView2

PortDock 은 창을 그릴 때 Microsoft Edge WebView2 를 씁니다. 윈도우 11 에는 기본으로 들어 있고, 업데이트된 윈도우 10 에도 보통 있습니다.

- 설치판은 WebView2 가 없으면 자동으로 받아 설치합니다(인터넷 필요).
- **인터넷이 없는 PC**: WebView2 런타임을 함께 넣은 `PortDock-<App>-setup-offline.exe`(약 +130MB)를 쓰세요. 또는 다른 PC 에서 <https://developer.microsoft.com/microsoft-edge/webview2/> 의 *Evergreen Standalone Installer* 를 받아 옮겨 먼저 설치한 뒤 PortDock 을 설치·실행하세요. 휴대판은 WebView2 를 스스로 설치하지 않습니다.

### 데이터 위치

| | 설정·명령 목록·규칙(WebView2 데이터) | 오류 보고서 |
|---|---|---|
| 설치판 | `%LOCALAPPDATA%\dev.portdock.<프로그램>` (예: `dev.portdock.serial`) | `%LOCALAPPDATA%\PortDock\reports\<프로그램>` |
| 휴대판 | exe 옆 `portdock-data\` | `%LOCALAPPDATA%\PortDock\reports\<프로그램>` |

설정 → *설정 내보내기* 로 모든 설정을 JSON 파일 하나로 저장해 다른 PC 로 옮길 수 있습니다. 로그 파일은 직접 고른 곳에 저장됩니다.

## 검사

push·풀 리퀘스트마다 Windows 에서 자동으로 검사합니다([ci.yml](.github/workflows/ci.yml)): 아홉 앱의 화면 빌드·타입 검사, Node 시험 99개(`shared/`·앱·도구), 장비 레지스터 맵 검사(10종·레지스터 368개), 경고를 실패로 보는 `cargo clippy`, Rust 시험 218개(216개 실행, 2개 제외), 제3자 고지·설치 안내문 검사, 사이트 검사·시험·빌드와 빌드된 페이지 검사(제목·링크·구조화 데이터·sitemap). 코드 구조: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · 기여 방법: [CONTRIBUTING.md](CONTRIBUTING.md).

## 소스에서 빌드

필요한 것: 윈도우 10·11, [Node.js](https://nodejs.org/) 22 이상, [Rust](https://rustup.rs/)(stable, MSVC), Visual Studio Build Tools 의 «C++ 를 사용한 데스크톱 개발», WebView2.

```powershell
git clone https://github.com/portdock/PortDock
cd PortDock
npm install

npm run serial            # 개발 모드로 실행 (modbus-slave · tcp · udp · simulator · netscan · modbus-master · scpi · plot 도 같음)
npm run build:serial      # 설치판 → target\release\bundle\nsis\
cargo test --workspace    # 테스트

# 휴대판 빌드 (데이터를 exe 옆에)
npm run tauri -w portdock-serial -- build --no-bundle --config "$PWD\tools\portable.conf.json"
```

구성: `apps/<프로그램>`(각 프로그램의 화면과 Tauri 셸), `crates/core`(공용 Rust — 체크섬·HEX/ASCII·프레임 구분·Modbus·자동응답·세션), `shared/`(공용 화면), `site/`(portdock.dev). 릴리스 절차: [docs/release.md](docs/release.md).

## Code signing policy (코드 서명 정책)

> **상태: 신청 예정 / 승인 후 적용.** 아직 SignPath Foundation 의 승인을 받지 않았고, 지금 릴리스는 **서명되지 않았습니다.** 아래 내용은 승인된 뒤의 릴리스부터 적용됩니다.

(신청 예정) Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org)

- **서명하는 것**: 이 저장소의 소스로 GitHub Actions([release.yml](.github/workflows/release.yml))가 빌드한 PortDock 프로그램만. 릴리스마다 사람이 승인해야 서명됩니다.
- **팀 역할** — 지금은 메인테이너 한 사람이 모든 역할을 맡습니다([portdock 조직 구성원](https://github.com/orgs/portdock/people)):
  - 작성자·검토자(Authors, Reviewers): 메인테이너 — 다른 사람의 풀 리퀘스트는 반영 전에 검토
  - 승인자(Approvers): 메인테이너
- **개인정보**: This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it. — 사용자나 설치·운영하는 사람이 요청하지 않으면 어떤 정보도 다른 네트워크 시스템으로 보내지 않습니다. 장비 통신은 사용자가 지정한 곳으로만 가고, 오류 보고는 «!» 문제 보고 창에서 보내기를 누르거나 설정의 *오류 자동 전송* 을 *묻지 않고 자동으로 보내기* 로 바꾼 경우에만 Sentry 로 보냅니다(기본값 *오류로 꺼지면 묻기*). 설치판은 WebView2 가 없으면 Microsoft 에서 받습니다. 자세히: [개인정보처리방침](https://portdock.dev/privacy/) · [Sentry 개인정보처리방침](https://sentry.io/privacy/) · [Microsoft 개인정보처리방침](https://privacy.microsoft.com/privacystatement)(WebView2). 설치 프로그램의 사용권 화면 맨 위에도 이 안내가 나옵니다.

## 라이선스

Copyright (C) 2026 Juhak

PortDock 은 자유 소프트웨어이며 **GNU GPL v3** ([LICENSE](LICENSE)) 에 따라 배포·수정할 수 있습니다. 어떠한 보증도 없습니다.

제3자 구성 요소와 그 라이선스는 [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt) 에 있으며, 이 파일은 모든 프로그램과 함께 배포됩니다.
