# 백신 오탐 신고 (공개 전에)

10/22 시험 빌드(run 39723873313)의 VirusTotal 결과: 휴대판 9개 0탐지, 설치판 9개 SecureAge 1곳, **Modbus Master 설치판만 CrowdStrike Falcon `Win/grayware_confidence_60% (D)` 추가**. Microsoft Defender 는 모두 깨끗.
신고 창구는 VirusTotal 의 오탐 연락처 목록(<https://docs.virustotal.com/docs/false-positive-contacts>, 10/22 확인) 기준.

## CrowdStrike — 메일 `VTscanner@crowdstrike.com`
보낼 사람: `portdock.contact@gmail.com`. 첨부 대신 VirusTotal 링크와 SHA-256 을 적는다(실제 릴리스 파일의 해시로 바꿔서).

```
Subject: False positive: PortDock-Modbus-Master-setup.exe (Win/grayware_confidence_60%)

Hello,

CrowdStrike Falcon on VirusTotal flags our installer as Win/grayware_confidence_60% (D).
It is a free, open-source (GPL-3.0) Windows tool for testing Modbus devices, built
from public source by GitHub Actions. No other major engine (including Microsoft) detects it.

File: PortDock-Modbus-Master-setup.exe (NSIS installer, Tauri 2 app)
SHA-256: <해시>
VirusTotal: https://www.virustotal.com/gui/file/<해시>
Source: https://github.com/portdock/PortDock
Build: https://github.com/portdock/PortDock/actions/runs/<run id>
Website: https://portdock.dev

Could you please review and reclassify it? Thank you.

PortDock — portdock.contact@gmail.com
```

## SecureAge — <https://www.secureage.com/contact-us>
설치판 9개 모두 1곳. 서명 없는 새 실행 파일에 흔한 판정이라 우선순위는 낮다. 보낼 때는 위 문안에서 엔진 이름·파일 목록만 바꾼다.

## 순서
1. 실제 릴리스 빌드(태그) 뒤 VirusTotal 을 다시 돌린다 — 해시가 바뀌므로 시험 빌드 결과로 신고하지 않는다.
2. 남아 있으면 위 메일을 보내고, 판정이 바뀌면 VirusTotal «Reanalyze» 로 다시 확인한다.
3. 코드 서명(SignPath)이 붙으면 머신러닝 판정이 대개 풀린다 — 서명 뒤 다시 본다.
