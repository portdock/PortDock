# Security policy / 보안 정책

[English](#english) · [한국어](#한국어)

## English

### Reporting a vulnerability

Please **do not open a public issue** for a security problem. Report it privately instead:

- **GitHub** — [Report a vulnerability](https://github.com/portdock/PortDock/security/advisories/new) (Security → Advisories → *Report a vulnerability*). Only the maintainer can see it.
- **Email** — <portdock.contact@gmail.com>, subject starting with `[security]`.

Please include the program and version (Settings → About), Windows version, what an attacker can do, and the steps or a file that reproduces it. Korean or English is fine.

### Supported versions

| Version | Security fixes |
|---|---|
| Latest release on [GitHub Releases](https://github.com/portdock/PortDock/releases/latest) | Yes |
| Older releases | No — please update first and check whether the problem remains |

All eleven programs are released together with the same version number, so a fix ships as a new release of every program.

### What to expect

PortDock is maintained by **one person in their spare time, mainly on weekends**.

- Acknowledgement: usually within 7 days.
- Assessment and fix: as soon as practical, depending on severity. There is no guaranteed fix date and no bug bounty.
- You will be told when a fix is released. Unless you prefer otherwise, you will be credited in the release notes and the advisory.
- Please give us a reasonable time to release a fix before you publish details.

### Scope

In scope: the PortDock programs, their installers and portable packages, and the release workflow in this repository.

Not security issues:

- The industrial protocols themselves have no authentication (Modbus, SCPI raw socket, plain TCP/UDP). When you start a server in PortDock (Modbus Slave TCP, TCP server or relay, Simulator, UDP), anyone who can reach that port on your network can talk to it — that is how these protocols work. Bind to a specific network adapter and use them on trusted networks.
- Mistakes in the device register maps (`data/devices`) — please open a normal issue.
- Vulnerabilities in a third-party component that are not reachable through PortDock — please report them to that project. (If one *is* reachable through PortDock, report it here.)

## 한국어

### 취약점 신고

보안 문제는 **공개 이슈로 올리지 마시고** 아래로 비공개로 알려 주세요.

- **GitHub** — [취약점 신고](https://github.com/portdock/PortDock/security/advisories/new) (Security → Advisories → *Report a vulnerability*). 메인테이너만 볼 수 있습니다.
- **메일** — <portdock.contact@gmail.com>, 제목을 `[security]` 로 시작해 주세요.

프로그램 이름과 버전(설정 → 정보), 윈도우 버전, 공격자가 무엇을 할 수 있는지, 재현 순서나 파일을 함께 보내 주세요. 한국어·영어 모두 됩니다.

### 지원 버전

| 버전 | 보안 수정 |
|---|---|
| [GitHub 릴리스](https://github.com/portdock/PortDock/releases/latest)의 최신판 | 함 |
| 그 이전 판 | 하지 않음 — 먼저 최신판으로 올린 뒤 문제가 남는지 확인해 주세요 |

열 프로그램은 같은 버전으로 함께 나오므로, 수정은 모든 프로그램의 새 릴리스로 나갑니다.

### 응답

PortDock 은 **1인 메인테이너가 여가 시간, 주로 주말에** 관리합니다.

- 받았다는 답: 보통 7일 안.
- 판단과 수정: 심각도에 따라 되도록 빨리. 수정 날짜를 약속하지 않으며 포상금은 없습니다.
- 수정판이 나오면 알려 드립니다. 원하지 않으시면 빼고, 기본으로는 릴리스 노트와 권고문에 신고자를 적습니다.
- 수정판이 나올 때까지 자세한 내용 공개는 잠시 미뤄 주세요.

### 범위

대상: PortDock 프로그램, 설치판·휴대판 파일, 이 저장소의 릴리스 워크플로.

보안 문제가 아닌 것:

- 산업용 프로토콜 자체에는 인증이 없습니다(Modbus, SCPI 소켓, 일반 TCP/UDP). PortDock 에서 서버를 켜면(Modbus Slave TCP, TCP 서버·중계, Simulator, UDP) 네트워크에서 그 포트에 닿는 누구나 통신할 수 있습니다 — 프로토콜이 원래 그렇습니다. 특정 랜카드에만 묶고, 믿을 수 있는 망에서 쓰세요.
- 장비 레지스터 맵(`data/devices`)의 틀린 곳 — 일반 이슈로 알려 주세요.
- PortDock 을 거쳐서는 닿지 않는 제3자 구성 요소의 취약점 — 그 프로젝트에 알려 주세요. (PortDock 을 거쳐 닿는다면 여기로 알려 주세요.)
