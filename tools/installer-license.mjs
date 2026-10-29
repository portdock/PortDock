#!/usr/bin/env node
// 설치 프로그램의 «사용권 계약» 화면에 보일 글(tools/installer-license.txt)을 만든다 — 개인정보 안내 + GPL 전문.
//
//   node tools/installer-license.mjs            → tools/installer-license.txt
//   node tools/installer-license.mjs --check    → 다시 만들어 보고, 지금 파일과 다르면 종료 코드 1
//
// 왜: 오픈소스 코드 서명 프로그램(예: SignPath Foundation, https://signpath.org/terms «Respect user privacy and security»)은
// 사용자가 지정하지 않은 곳으로 데이터를 보내는 프로그램이면 설치 중에 개인정보 정책을 보여 주라고 한다. PortDock 은 사용자가 요청할 때만 보내지만(오류 보고),
// 설치하는 사람이 미리 알 수 있게 안내를 사용권 화면 맨 위에 둔다.
// Tauri NSIS 는 bundle.licenseFile 을 «사용권 계약» 화면(MUI_PAGE_LICENSE)으로 보여 주므로, 각 앱 tauri.conf.json 의
// licenseFile 이 이 파일을 가리킨다. 프로그램 옆에 깔리는 LICENSE(resources)는 GPL 전문 그대로다.
// 문구는 shared/report.ts·shared/settings.ts(autoReport 기본 «ask»)·shared/usage.ts(사용 통계 기본 꺼짐)·
// shared/UpdateNotice.tsx(새 버전 확인 기본 꺼짐)의 실제 동작과 맞춘다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "installer-license.txt");

const HEAD = `PortDock — 개인정보 안내 / Privacy notice
==========================================

[한국어]
이 프로그램은 사용자나 설치·운영하는 사람이 직접 요청하지 않으면
어떤 정보도 다른 네트워크 시스템으로 보내지 않습니다.

- 장비와의 통신(시리얼·TCP·UDP·Modbus·SCPI·MC 프로토콜·네트워크 장비 찾기)은
  사용자가 지정한 포트·주소·대역으로만 갑니다.
- 끊김·지연 기록(Hardware Tester)은 «기록 시작» 을 누른 동안만 게이트웨이와
  사용자가 고른 인터넷 주소 하나에 핑을, 정한 이름 하나를 DNS 서버에
  묻습니다. Wi-Fi 이름·블루투스 장치 이름은 저장하거나 보내지 않습니다.
- 통신 내용·명령 목록·규칙·설정은 이 PC 안에만 저장됩니다.
- 새 버전 확인(선택, 기본 꺼짐): 설정에서 «새 버전 확인» 을 켠 경우에만
  하루 한 번 GitHub(api.github.com)에 최신 릴리스를 묻습니다. 보내는
  데이터는 없고, 내려받기·설치는 하지 않습니다.
- 오류 보고: «!» 문제 보고 창에서 보내기를 누르거나, 설정의
  «오류 자동 전송» 을 «묻지 않고 자동으로 보내기» 로 바꾼 경우에만
  오류 원인과 프로그램·윈도우 버전을 오류 수집 서비스 Sentry 로
  보냅니다. 기본값은 «오류로 꺼지면 묻기» 이고, «보내지 않기» 로
  바꿀 수 있습니다.
- 사용 통계(선택, 기본 꺼짐): 처음 실행할 때 한 번 묻고, «보내기» 를
  고르거나 설정에서 «사용 통계 보내기» 를 켠 경우에만 창을 닫을 때
  Aptabase(EU)로 보냅니다. 기능별 사용 횟수·켜 둔 시간·프로그램/
  윈도우 버전·화면 언어·설치판/휴대판 구분만 보내고, 통신 내용·IP·
  포트·COM 이름·파일 경로·PC/사용자/장비 이름은 보내지 않습니다.
- 설치판은 Microsoft Edge WebView2 가 없으면 Microsoft 에서 받아
  설치합니다(오프라인 설치판은 받지 않습니다).
- 제거: 윈도우 «설정 → 앱» 에서 지웁니다.

개인정보처리방침: https://portdock.dev/privacy/

[English]
This program will not transfer any information to other networked
systems unless specifically requested by the user or the person
installing or operating it.

- Device communication (serial, TCP, UDP, Modbus, SCPI, MC protocol,
  network device discovery) goes only to the ports, addresses and subnets
  you choose.
- The drop and latency log (Hardware Tester) pings the gateway and one
  internet address you choose, and looks up one name at the DNS server,
  only while «Start recording» is on. Wi-Fi and Bluetooth device names
  are never saved or sent.
- Traffic, command lists, rules and settings stay on this PC.
- Update check (optional, off by default): only if you turn on «Check
  for new versions» in settings, the program asks GitHub
  (api.github.com) once a day for the latest release. No data is sent,
  and nothing is downloaded or installed.
- Error reports: the error cause and program/Windows versions are sent
  to the error-tracking service Sentry only when you press send in the
  «!» report window, or set «Automatic error reports» to «Send
  automatically» in settings. The default is «Ask after a crash»; you
  can set it to «Never send».
- Usage statistics (optional, off by default): the program asks once on
  first run and sends them to Aptabase (EU) when you close the window,
  only if you chose «Send» or turned on «Send usage statistics» in
  settings. Only feature use counts, minutes open, program/Windows
  version, display language and installed/portable edition are sent —
  never traffic, IP addresses, ports, COM names, file paths or
  PC/user/device names.
- If Microsoft Edge WebView2 is missing, the installer downloads it from
  Microsoft (the offline installer does not).
- Uninstall from Windows «Settings → Apps».

Privacy policy: https://portdock.dev/privacy/

==========================================
PortDock 사용권 / License: GNU General Public License v3.0
==========================================

`;

const LICENSE = fs.readFileSync(path.join(ROOT, "LICENSE"), "utf8").replace(/\r\n/g, "\n");
const text = HEAD + LICENSE;

if (process.argv.includes("--check")) {
  const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8").replace(/\r\n/g, "\n") : "";
  if (now !== text) {
    console.error("tools/installer-license.txt 가 최신이 아닙니다 — node tools/installer-license.mjs 로 다시 만드세요");
    process.exit(1);
  }
  console.log("tools/installer-license.txt 최신");
} else {
  fs.writeFileSync(OUT, text);
  console.log(`→ ${path.relative(ROOT, OUT)}`);
}
