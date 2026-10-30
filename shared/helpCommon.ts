// 도움말 공통 줄 — 모든 프로그램의 «단축키·팁»·로그 다루기 설명을 같은 말로. 각 앱 help.ts 가 불러 쓴다.
import { KEYS } from "./shortcuts";

type Lang = "ko" | "en";

/** 프로그램마다 있는 기능만 */
export interface HelpFeatures {
  /** Ctrl+S «화면 내용 저장» 이 있는지(Serial·TCP·UDP) */
  saveView?: boolean;
  /** Ctrl+S 가 이번 판(0.3.0)에 새로 생겼는지(Modbus Slave·Simulator) — 줄 앞에 «» */
  saveViewNew?: boolean;
  /** Esc 로 멈출 «반복» 이 있는지 */
  repeat?: boolean;
  /** 로그 찾기(Ctrl+F)가 있는지 */
  find?: boolean;
  /** 연결 단어 — Serial·Slave 는 «연결·끊기», 나머지는 «시작·멈춤» */
  startStop?: boolean;
  /** 그래프 앱(Plot) — 로그 대신 그래프: Space 멈춤·End 실시간·Esc 측정점 지우기, Ctrl+S 는 화면 CSV, Ctrl+Shift+L 은 CSV 기록 */
  graph?: boolean;
}

/** «단축키» 줄 — 글머리표(«- ») 로 시작 */
export function shortcutLines(lang: Lang, f: HelpFeatures): string[] {
  const ko = lang === "ko";
  if (f.graph) return graphShortcutLines(lang, f);
  const lines = [
    ko ? `- ${KEYS.connect}: ${f.startStop ? "시작·멈춤" : "연결·끊기"}(왼쪽 버튼과 같음).` : `- ${KEYS.connect}: ${f.startStop ? "start / stop" : "connect / disconnect"} (same as the button on the left).`,
    ko ? `- ${KEYS.clear}: 화면 기록 지우기(파일 로그는 그대로).` : `- ${KEYS.clear}: clear the on-screen log (file logs are kept).`,
    f.saveView && (ko ? `- ${f.saveViewNew ? "" : ""}${KEYS.save}: 화면 내용 저장.` : `- ${f.saveViewNew ? "" : ""}${KEYS.save}: save view.`),
    ko ? `- ${KEYS.fileLog}: 파일로 계속 저장 켜기·끄기.` : `- ${KEYS.fileLog}: start / stop logging to file.`,
    f.repeat && (ko ? `- ${KEYS.stopRepeat}: 반복 보내기 멈춤(입력칸 밖에서 — 입력칸 안의 Esc 는 그 칸의 동작).` : `- ${KEYS.stopRepeat}: stop repeat sending (outside text boxes — inside a box Esc keeps its own meaning).`),
    ko ? `- ${KEYS.end}: 로그 맨 아래로 가서 다시 따라가기.` : `- ${KEYS.end}: jump to the latest log line and follow again.`,
    ko
      ? "- 로그를 한 번 누른 뒤(로그 칸에 포커스) ↑/↓: 줄 옮겨 고르기 · Shift+↑/↓: 범위 늘리기 · PageUp/PageDown: 한 화면씩 · Home: 첫 줄 · End: 마지막 줄(다시 따라가기). 옮기면 따라가기는 멈춥니다."
      : "- After clicking the log (focus in the log): ↑/↓ move the selection · Shift+↑/↓ extend it · PageUp/PageDown one screen · Home first line · End last line (and follow again). Moving pauses following.",
    ko ? `- ${KEYS.copy}: 고른 로그 줄을 «시각 방향 내용» 으로 복사(지금 보기대로). 입력칸 안에서는 보통 복사.` : `- ${KEYS.copy}: copy the selected log lines as «time direction data» (in the current view). Inside a text box it copies normally.`,
    f.find && (ko ? "- Ctrl+F: 로그 찾기 칸으로. 찾기 칸에서 Enter 다음 · Shift+Enter 이전 · Esc 지우기." : "- Ctrl+F: focus the log find box. In it, Enter next, Shift+Enter previous, Esc clear."),
    ko ? "- F1 또는 화면의 ? 버튼: 이 도움말. Esc 로 닫습니다." : "- F1 or the ? button: this help. Close it with Esc.",
    ko ? "- 숫자 칸: ↑/↓ 1씩, Shift+↑/↓ 10씩, PageUp/PageDown 100씩, 칸을 누른 뒤 마우스 휠. 속도 칸은 ↑/↓ 로 목록의 다음·앞 속도." : "- Number boxes: ↑/↓ by 1, Shift+↑/↓ by 10, PageUp/PageDown by 100, or the mouse wheel once the box is focused. The baud box steps through the listed rates.",
    ko ? "- 대화상자·우클릭 메뉴가 열려 있거나 한글을 조합하는 중에는 단축키가 동작하지 않습니다." : "- Shortcuts are ignored while a dialog or the right-click menu is open, or while composing Korean text.",
  ];
  return lines.filter(Boolean) as string[];
}

/** 그래프 앱(Plot)의 «단축키» 줄 — 같은 키(F4·Ctrl+L·Ctrl+S·Ctrl+Shift+L·End·Esc)를 그래프에 맞는 말로 */
function graphShortcutLines(lang: Lang, f: HelpFeatures): string[] {
  const ko = lang === "ko";
  return ko
    ? [
        `- ${KEYS.connect}: ${f.startStop ? "받기 시작·받기 멈춤" : "연결·끊기"}(왼쪽 버튼과 같음).`,
        "- Space: 화면 고정·풀기(입력칸·버튼 밖에서 — 받기와 CSV 기록은 계속).",
        `- ${KEYS.end}: 실시간 보기로(확대·옮기기를 버림). 그래프를 두 번 눌러도 같습니다.`,
        `- ${KEYS.stopRepeat}: 측정점 A·B 지우기(입력칸 밖에서).`,
        `- ${KEYS.save}: 화면 CSV 저장(보이는 범위만). ${KEYS.fileLog}: CSV 기록 켜기·끄기. ${KEYS.clear}: 지우기(버퍼·그래프·원시 줄·측정점, 기록 파일은 그대로).`,
        "- F1 또는 화면의 ? 버튼: 이 도움말. Esc 로 닫습니다.",
        "- 숫자 칸: ↑/↓ 1씩, Shift+↑/↓ 10씩, PageUp/PageDown 100씩, 칸을 누른 뒤 마우스 휠. 속도 칸은 ↑/↓ 로 목록의 다음·앞 속도.",
        "- 대화상자가 열려 있거나 한글을 조합하는 중에는 단축키가 동작하지 않습니다.",
      ]
    : [
        `- ${KEYS.connect}: ${f.startStop ? "start / stop receiving" : "connect / disconnect"} (same as the button on the left).`,
        "- Space: freeze / unfreeze the view (outside text boxes and buttons — receiving and CSV recording continue).",
        `- ${KEYS.end}: back to the live view (drops zoom and pan). Double-clicking the graph does the same.`,
        `- ${KEYS.stopRepeat}: clear markers A and B (outside text boxes).`,
        `- ${KEYS.save}: save view CSV (visible range only). ${KEYS.fileLog}: start / stop CSV recording. ${KEYS.clear}: clear (buffer, graph, raw lines and markers; a recording file is kept).`,
        "- F1 or the ? button: this help. Close it with Esc.",
        "- Number boxes: ↑/↓ by 1, Shift+↑/↓ by 10, PageUp/PageDown by 100, or the mouse wheel once the box is focused. The baud box steps through the listed rates.",
        "- Shortcuts are ignored while a dialog is open or while composing Korean text.",
      ];
}

/** 로그 따라가기·줄 고르기·우클릭 메뉴 설명 */
export function logHandlingLines(lang: Lang, f: { sendAgain?: boolean; addCommand?: boolean; find?: boolean; checkbox?: boolean }): string[] {
  const ko = lang === "ko";
  const menu = ko
    ? ["줄 복사", "HEX 복사", "ASCII 복사", "HEX + ASCII 복사", "C 배열로 복사({0x01, 0x03})", f.sendAgain && "다시 보내기(TX 줄 — 그 바이트 그대로)", f.addCommand && "명령 목록에 추가", f.find && "이 내용 찾기"]
    : ["Copy lines", "Copy HEX", "Copy ASCII", "Copy HEX + ASCII", "Copy as C array ({0x01, 0x03})", f.sendAgain && "Send again (TX lines — exactly those bytes)", f.addCommand && "Add to commands", f.find && "Find this"];
  return [
    ko
      ? `- 따라가기: 맨 아래에 있을 때만 새 줄을 따라 내려갑니다. 위로 굴리면 멈추고(새 줄이 와도 읽던 자리 그대로) 오른쪽 아래에 «↓ 맨 아래로 (새 줄 n)» 이 나옵니다. 누르거나 End, 또는 맨 아래까지 굴리면 다시 따라갑니다.${f.checkbox ? " 도구줄 «자동 스크롤» 체크가 지금 따라가는지를 보여 줍니다." : ""}`
      : `- Follow: new lines are followed only while you are at the bottom. Scroll up to pause (the view stays put) — «↓ Jump to latest (n new)» appears at the bottom right. Click it, press End or scroll to the bottom to follow again.${f.checkbox ? " The «Auto-scroll» checkbox shows whether it is following." : ""}`,
    ko
      ? "- 줄 고르기: 누르면 그 줄, Shift+누르기는 범위, Ctrl+누르기는 하나씩 더하기·빼기. 줄을 눌러도 따라가기는 꺼지지 않습니다."
      : "- Selecting: click a line, Shift+click for a range, Ctrl+click to add or remove one. Clicking does not stop following.",
    ko ? `- 오른쪽 버튼 메뉴: ${menu.filter(Boolean).join(" · ")}. 내용 복사(HEX·ASCII·C 배열)는 사건 줄(EV)을 빼고 한 줄에 한 프레임씩 씁니다.` : `- Right-click menu: ${menu.filter(Boolean).join(" · ")}. Data copies (HEX, ASCII, C array) skip event lines (EV), one frame per line.`,
  ];
}

/** 머리줄 📌·좁은 창 설명 */
export function windowLines(lang: Lang): string[] {
  return lang === "ko"
    ? [
        "- 머리줄 📌: 항상 위 — 이 창을 다른 창 위에 늘 보이게 합니다(설정의 «항상 위» 와 같음).",
        "- 창 제목에 지금 상태가 나옵니다(예: «COM3 115200 8N1 · 연결됨 ● REC — PortDock Serial»). 작업 표시줄에서 어느 창이 어느 포트인지 알 수 있습니다.",
        "- 창 너비가 900px 이하(화면 반쪽 맞춤 등)면 왼쪽 칸이 접히고, 위에 요약 줄과 «⚙ 연결 설정»(Port Inspector 는 «⚙ 포트 목록», Net Scan 은 «⚙ 찾기 설정», Hardware Tester 는 «⚙ 점검 항목»)·연결 버튼이 나옵니다. 언어·📌·!·AI·?·⚙ 단추는 그 줄 오른쪽으로 옮겨 갑니다. «⚙ …» 으로 펼치고 ✕ 나 바깥을 눌러 닫습니다.",
        "- 머리줄 AI: AI 에게 물어보기용 복사— 프로그램·버전·연결 설정·이번 실행의 오류·최근 통신 기록(HEX·글자·풀이 줄. Port Inspector·Hardware Tester 는 점검 결과, Net Scan 은 찾은 장비)을 «원인 후보와 확인 순서를 알려 주세요» 질문 틀과 함께 AI 채팅에 붙여 넣기 좋은 글로 만듭니다. 질문 틀은 앱 성격에 맞춥니다(0.9.0 부터) — 통신 앱은 장비·배선, Hardware Tester 는 PC·무선 환경, Net Scan 은 네트워크 장비 찾기, Port Inspector 는 포트·드라이버. 미리보기를 확인하고 «복사» 하면 클립보드에만 들어갑니다. 8,000자를 넘으면 오래된 기록 줄부터 빼고 뺀 수를 적습니다. 사용자 폴더·윈도우 기본 PC 이름(DESKTOP-… 등)·MAC 뒤 3바이트·공인 IP 는 가리고, 사설 IP 는 원인(서브넷 다름 등)을 보는 데 필요해 기본으로 남깁니다(«사설 IP 도 가리기» 로 가림).",
        "- 붙여 넣는 AI 서비스로 내용이 갑니다. 장비·회사 정보는 확인 후 붙여 넣으세요.",
        "- 글자 크기: Ctrl+마우스 휠 또는 Ctrl+= / Ctrl+- 로 키우고 줄이고, Ctrl+0 으로 처음 크기(13px)로 돌아갑니다. 설정의 «글자 크기» 와 같은 값이라 다음에 켜도 그대로입니다.",
      ]
    : [
        "- 📌 in the header: always on top — keeps this window above others (same as «Always on top» in Settings).",
        "- The window title shows the current state (e.g. «COM3 115200 8N1 · Connected ● REC — PortDock Serial»), so you can tell windows apart on the taskbar.",
        "- At 900 px wide or less (e.g. half-screen snap) the left panel folds away and a summary line with «⚙ Connection» (Port Inspector: «⚙ Ports», Net Scan: «⚙ Scan settings», Hardware Tester: «⚙ Checks») and the connect button appears. The language, 📌, !, AI, ? and ⚙ buttons move to the right end of that line. «⚙ …» opens the panel; ✕ or clicking outside closes it.",
        "- AI in the header: Copy for asking AI — builds text for an AI chat with a question template («list likely causes and the order to check them»): program, version, connection settings, errors in this session and recent traffic (HEX, text and note lines; check results in Port Inspector and Hardware Tester, found devices in Net Scan). The template fits the app (from 0.9.0): device and wiring for the communication apps, PC and wireless setup for Hardware Tester, finding network devices for Net Scan, ports and drivers for Port Inspector. Review the preview and «Copy» — it only goes to the clipboard. Above 8,000 characters the oldest traffic lines are removed and the count is noted. User folders, default Windows PC names (DESKTOP-… etc.), the last 3 bytes of MAC addresses and public IPs are hidden; private IPs are kept by default because causes such as different subnets need them («Hide private IPs too» hides them).",
        "- Whatever you paste goes to that AI service. Check device and company details before pasting.",
        "- Text size: Ctrl+mouse wheel or Ctrl+= / Ctrl+- makes it larger or smaller, and Ctrl+0 returns to the default (13 px). It is the same value as «Font size» in Settings, so it is kept next time.",
      ];
}

/** 명령 목록(Serial·TCP·UDP) */
export function commandLines(lang: Lang): string[] {
  return lang === "ko"
    ? [
        "- 목록의 ▶ 는 바로 보내기(이름 칸에서 Enter·더블클릭도), ✎ 는 «입력칸으로 불러오기», ⧉ 는 복제, ✕ 는 지우기입니다. 지우면 5초 동안 아래 알림의 «되돌리기» 로 되살릴 수 있습니다(확인 창은 뜨지 않음).",
        "- 순서 바꾸기: 이름 왼쪽 ↑·↓, 또는 이름 칸에서 Alt+↑/↓.",
        "- 목록이 비어 있으면 «예시 넣기» 로 자주 쓰는 명령 예시를 넣을 수 있습니다(이름 앞 «예:»). Serial 은 «용도» 에 맞춰 AT·ATI·AT+GMR 또는 Modbus FC03·FC04 읽기, TCP 는 *IDN?(SCPI)·HTTP 요청·Modbus TCP 읽기(프레임 구분이 Modbus TCP 면 Modbus TCP 읽기 둘), UDP 는 글자·*IDN?·HEX 하나씩입니다. 쓰기 명령은 넣지 않습니다.",
        "- «+ 목록에 추가» 를 누르면 새 명령의 이름 칸에 포커스가 가서 바로 이름을 고칠 수 있습니다. 로그 줄의 오른쪽 버튼 «명령 목록에 추가» 로 받은·보낸 바이트를 그대로(HEX, 체크섬·줄 끝 없이) 넣을 수도 있습니다.",
        "- «목록 내보내기»·«목록 가져오기»: 명령 목록만 JSON 파일로 옮깁니다(다른 PC·다른 PortDock 프로그램과 주고받기). 가져올 때 지금 목록이 있으면 «뒤에 추가»·«목록 바꾸기» 를 칸 안에서 고르고, 바꾼 뒤에도 «되돌리기» 할 수 있습니다.",
      ]
    : [
        "- In the list, ▶ sends (Enter or double-click in the name too), ✎ is «Load into the input», ⧉ duplicates and ✕ deletes. A deleted command can be restored with «Undo» in the notice for 5 seconds (no confirmation dialog).",
        "- Reorder with ↑/↓ left of the name, or Alt+↑/↓ in the name box.",
        "- When the list is empty, «Add examples» puts in a few common example commands (names start with «e.g.»). Serial follows «Use»: AT, ATI, AT+GMR or Modbus FC03/FC04 reads; TCP adds *IDN? (SCPI), an HTTP request and a Modbus TCP read (two Modbus TCP reads when framing is Modbus TCP); UDP adds a text, *IDN? and a HEX example. No write commands are added.",
        "- After «+ Add to list» the new command's name box is focused so you can rename it right away. «Add to commands» in a log line's right-click menu adds those exact bytes (HEX, no checksum or line ending).",
        "- «Export list» / «Import list» move only the command list as a JSON file (to another PC or another PortDock program). When importing into a non-empty list, choose «Append» or «Replace list» in place; «Undo» works afterwards too.",
      ];
}

/** 설정(⚙)에 새로 생긴 칸 */
export function settingsLines(lang: Lang, f: { run?: boolean } = {}): string[] {
  const ko = lang === "ko";
  const run = !f.run
    ? []
    : ko
      ? [
          "- «연결·기록 중 절전 막기»(기본 꺼짐): 연결(시작)해 있거나 파일로 기록하는 동안 PC 가 대기(절전) 모드로 들어가지 않게 합니다 — 밤샘 기록 중 USB 변환기가 사라지지 않게. 화면은 꺼져도 됩니다. 끊거나 창을 닫으면 풀리고, 전원 설정은 바꾸지 않습니다.",
          "- «켤 때 마지막 연결 다시 열기»(기본 꺼짐): 켤 때 마지막으로 연결에 성공했던 설정으로 저절로 연결(시작)합니다. 그 포트·장치가 없으면 조용히 그만둡니다. 포트를 열면 리셋되는 장비(Arduino 등)에는 끄세요. 명령줄 «--auto» 도 같은 일을 합니다.",
        ]
      : [
          "- «Keep the PC awake while connected or logging» (off by default): keeps the PC from going to sleep while connected (or running) or logging to a file, so a USB adapter does not vanish during an overnight log. The screen may still turn off. Released when you disconnect or close the window; power settings are not changed.",
          "- «Reopen the last connection at startup» (off by default): at startup, connects (starts) with the settings of the last successful connection. Stops quietly if that port or device is missing. Turn it off for devices that reset when the port opens (Arduino, …). The «--auto» command-line option does the same.",
        ];
  return [...settingsBase(lang), ...run];
}

function settingsBase(lang: Lang): string[] {
  return lang === "ko"
    ? [
        "- «항상 위»: 이 창을 다른 창 위에 늘 보이게 합니다(머리줄 📌 과 같은 값).",
        "- «모두 펼치기(전문가 화면)»: 평소 접어 두는 칸(고급 연결·받기 설정·장애 주입·통계·찾는 방법·트리거·자동응답 등)을 펼친 채 보입니다. 켜 둔 채 하나를 접으면 이번 실행 동안만 접힙니다. 끄면 칸마다 기억해 둔 열림 상태로 돌아갑니다.",
        "- «사용 통계 보내기»(기본 꺼짐): 켜면 창을 닫을 때 한 번, 기능별 사용 횟수(연결·보내기·읽기 등 — 횟수만)·켜 둔 시간(분)·프로그램/윈도우 버전·화면 언어·설치판/휴대판 구분을 Aptabase(EU)로 익명으로 보냅니다. 통신 내용·IP·포트·COM 이름·파일 경로·PC/사용자/장비 이름은 보내지 않습니다. 처음 실행할 때 한 번 묻고(고르지 않고 닫으면 보내지 않음), 여기서 언제든 끌 수 있습니다. 인터넷이 없거나 보내지 못하면 버립니다. 이 칸이 없는 판은 통계를 보내지 않습니다.",
        "- 사용 통계를 한 PortDock 앱에서 고르면(묻는 창 또는 이 칸), 아직 묻지 않은 이 PC 의 다른 PortDock 앱은 다시 묻지 않고 그 답을 처음 값으로 씁니다(휴대판은 같은 폴더에 둔 것끼리). 앱마다 이 칸에서 따로 바꿀 수 있고, 가져온 설정 파일로는 켜지지 않습니다. 남기는 것은 «물어봤음» 과 고른 값뿐입니다(설치판 %LOCALAPPDATA%\\dev.portdock\\shared-consent.json, 휴대판 portdock-data\\shared-consent.json).",
        "- «새 버전 확인(하루 한 번)»(기본 꺼짐): 켜면 하루 한 번 GitHub(api.github.com)에 PortDock 최신 릴리스만 묻습니다. 새 버전이면 창 아래에 알림줄과 «릴리스 페이지» 버튼이 나옵니다. 보내는 데이터는 없고 내려받기·설치는 하지 않습니다. «이 버전은 그만 알리기» 로 그 버전 알림을 끕니다. 아래 «정보» 칸의 «새 버전 확인» 버튼은 지금처럼 릴리스 페이지를 엽니다.",
      ]
    : [
        "- «Always on top»: keeps this window above other windows (same as 📌 in the header).",
        "- «Expand all (expert view)»: shows the groups that are normally collapsed (advanced connection, receive settings, fault injection, statistics, scan options, triggers, auto-reply …) open. Folding one while it is on lasts only for this run. Turning it off returns each group to its remembered state.",
        "- «Send usage statistics» (off by default): when on, the program sends an anonymous summary to Aptabase (EU) once, as you close the window — how many times each feature was used (connect, send, read … — counts only), minutes open, program/Windows version, display language and installed/portable edition. Traffic, IP addresses, ports, COM names, file paths and PC/user/device names are never sent. You're asked once on first run (closing the prompt without choosing means no), and you can turn it off here at any time. If you're offline or sending fails, the data is dropped. Builds without this option never send statistics.",
        "- Once you answer the usage-statistics question in one PortDock app (the prompt or this option), other PortDock apps on this PC that have not asked yet use that answer as their starting value instead of asking again (portable copies: those in the same folder). Each app can still change it here, and an imported settings file never turns it on. Only «asked» and your choice are stored (installed: %LOCALAPPDATA%\\dev.portdock\\shared-consent.json, portable: portdock-data\\shared-consent.json).",
        "- «Check for new versions (once a day)» (off by default): when on, the program asks GitHub (api.github.com) once a day for PortDock's latest release only. If a newer version exists, a notice bar with a «Release page» button appears at the bottom of the window. No data is sent and nothing is downloaded or installed. «Don't remind me about this version» silences that version. The «Check for updates» button under «About» still just opens the release page.",
      ];
}

/** 보내기 칸 HEX ↔ ASCII 바꾸기(Serial·TCP·UDP·Simulator) */
export function notationLines(lang: Lang): string[] {
  return lang === "ko"
    ? [
        "- HEX↔ASCII 를 바꾸면 입력 내용이 같은 바이트의 새 표기로 바뀝니다(예: «41 54 0D 0A» ↔ «AT» + CR LF 이스케이프). 못 읽는 내용이면 글자는 그대로 두고 알림줄에 이유가 나옵니다.",
        "- 바꿀 때 체크섬이 켜져 있으면 확인 창 대신 알림줄에 «체크섬 … 이 켜져 있습니다» 와 «체크섬 끄기» 버튼이 나옵니다.",
      ]
    : [
        "- Switching HEX↔ASCII converts the input to the same bytes in the new notation (e.g. «41 54 0D 0A» ↔ «AT» plus CR LF escapes). If the input cannot be read, the text is kept and a notice explains why.",
        "- If a checksum is on when you switch, a notice (instead of a dialog) says so and offers «Turn checksum off».",
      ];
}

/** Serial·TCP·UDP 공통 기능(10/18) 도움말 절 — 각 앱 help.ts 가 끝(문제 해결 앞)에 넣는다 */
export interface IoHelp {
  /** 파일 보내기·문자 간 지연(Serial·TCP) */
  fileSend?: boolean;
  /** Serial — 문자 간·Break·파일 보내기·(반복이 꺼져 있을 때) 횟수가 «⋯ 더보기» 안에 있다 */
  serial?: boolean;
}

export function ioSections(lang: Lang, f: IoHelp = {}): { title: string; body: string[] }[] {
  const ko = lang === "ko";
  const sections: { title: string; body: string[] }[] = [];
  sections.push(
    ko
      ? {
          title: "입력 이력·명령 단축키",
          body: [
            "- 보내기 입력칸에서 ↑/↓: 앞서 보낸 내용을 다시 불러옵니다(최근 50개, HEX/ASCII 모드도 함께). 같은 내용을 또 보내면 맨 뒤로 옮겨질 뿐 두 번 쌓이지 않습니다. 프로그램을 껐다 켜도 남습니다.",
            "- 고치던 글은 잃지 않습니다 — 처음 ↑ 를 누를 때 지금 글을 따로 두었다가, 맨 아래에서 ↓ 를 누르면 그대로 돌아옵니다. 한글을 조합하는 중에는 ↑/↓ 가 움직이지 않습니다.",
            "- 이력은 «보내기» 버튼과 입력칸 Enter 로 보낸 것만 남깁니다(반복·명령 목록·다시 보내기는 남기지 않음).",
            "- 명령 단축키: 명령 목록 각 줄의 «키» 칸에서 F2·F3·F5~F12 중 하나를 고르면 그 키로 바로 보냅니다(입력칸에 있어도 됨). F1(도움말)·F4(연결)는 쓸 수 없고, 다른 명령이 쓰는 키는 «F7 — «이름»» 처럼 회색으로 보여 고를 수 없습니다.",
            "- 단축키는 내보낸 명령 목록 파일에도 들어갑니다. 복제한 명령에는 붙지 않고, 가져올 때 이미 쓰는 키는 빠집니다. 대화상자·우클릭 메뉴가 열려 있으면 동작하지 않습니다.",
          ],
        }
      : {
          title: "Input history and command hotkeys",
          body: [
            "- ↑/↓ in the send box recall earlier sends (last 50, with their HEX/ASCII mode). Sending the same thing again just moves it to the end. History is kept across restarts.",
            "- Your unsent edit is never lost — it is set aside on the first ↑ and comes back with ↓ at the bottom. ↑/↓ do nothing while composing Korean text.",
            "- Only sends from the «Send» button and Enter in the box are remembered (not repeat, commands or Send again).",
            "- Command hotkeys: pick F2, F3 or F5–F12 in a command's «Key» box to send it with that key (works even while typing in the send box). F1 (help) and F4 (connect) are reserved; keys used by another command show greyed out as «F7 — «name»».",
            "- Hotkeys are saved in exported command lists. Duplicated commands get no key, and keys already in use are dropped on import. Hotkeys are ignored while a dialog or the right-click menu is open.",
          ],
        },
    ko
      ? {
          title: "시간 간격 열·처리량·반복 횟수",
          body: [
            "- 도구줄 «보기 설정» 의 «시간 간격 열»: «직전 줄과 간격» 은 바로 앞 RX·TX 줄부터 지난 시간(+12 ms), «응답 시간 (TX→RX)» 은 마지막으로 보낸 TX 부터 이 RX 까지의 시간입니다. 시각 옆 열에 나오고 줄 복사(Ctrl+C)·«화면 내용 저장» 에도 들어갑니다. 사건 줄(EV)은 비어 있습니다.",
            "- 시각은 1ms 단위입니다. USB 변환기·운영체제의 전달 지연(수 ms)이 섞여 있으니 장비의 정확한 응답 시간은 오실로스코프로 보세요.",
            "- 상태줄 오른쪽: «RX 1.2 KB/s · TX 0 B/s» 는 최근 1초 동안의 처리량, «프레임 120/30» 은 «지우기» 뒤로 받은·보낸 줄 수, «마지막 수신 3초 전» 은 마지막으로 받은 때입니다. 받는 중에 10초 넘게 조용하면 빨갛게 바뀝니다.",
            `- «반복(ms)» 옆 «번» 칸${f.serial ? "(반복을 켰거나 횟수를 정해 두었을 때만 보임 — 미리 정하려면 «⋯ 더보기»)" : ""}: 이 횟수만큼 보내고 저절로 멈춥니다(0 = 끌 때까지 계속). 옆에 «보냄 3/10» 처럼 보낸 수가 나오고, 다 보내면 «REPEAT 끝 (10번 보냄)» 사건 줄이 남습니다(화면에만).`,
          ],
        }
      : {
          title: "Time gap column, throughput and repeat count",
          body: [
            "- «Time gap column» in the toolbar's «View options»: «Gap from previous line» shows the time since the previous RX/TX line (+12 ms); «Response time (TX→RX)» the time from the last TX to this RX. It appears next to the time and is included in line copies (Ctrl+C) and «Save view». Event lines (EV) stay empty.",
            "- Times have 1 ms resolution and include USB adapter / OS delivery delays (a few ms); use an oscilloscope for exact device timing.",
            "- Right side of the status line: «RX 1.2 KB/s · TX 0 B/s» is the throughput over the last second, «frames 120/30» the lines received/sent since «Clear», and «last RX 3 s ago» the time of the last reception. It turns red after 10 s of silence while running.",
            `- The «times» box next to «Repeat (ms)»${f.serial ? " (shown only while repeating or when a count is set — set it beforehand under «⋯ More»)" : ""}: repeat stops by itself after that many sends (0 = until turned off). «sent 3/10» shows progress, and «REPEAT done (10 sent)» is added as an event line (screen only).`,
          ],
        },
    ko
      ? {
          title: "트리거",
          body: [
            "오른쪽 칸 «트리거» 를 펼쳐 «+ 트리거» 로 만듭니다. 받은 줄(RX)에 패턴이 들어 있으면 고른 동작을 합니다.",
            "- 패턴 — HEX: «01 03 ?? **»(?? = 아무 1바이트, ** = 0바이트 이상). ASCII: «ALARM*» 처럼(? = 아무 1바이트, * = 0바이트 이상, \\r \\n \\xNN 이스케이프, 글자 ? 는 \\x3F). 줄 안 어디에든 있으면 맞고, 대소문자를 가립니다. 자동응답 규칙에서 «와일드카드» 를 켠 것과 같은 규칙입니다.",
            "- 동작: «색칠»(색을 고를 수 있음) · «소리»(짧은 삐 소리) · «반복 멈춤» · «기록 멈춤»(파일로 계속 저장을 끔) · «사건 줄»(«TRIGGER «이름»» EV 줄) · «깜빡임»(창이 뒤에 있으면 작업 표시줄이 깜빡임). 반복·기록을 멈추면 «— 반복 멈춤» 처럼 사건 줄에 함께 남습니다.",
            "- 줄마다 맞은 횟수가 «3번» 처럼, 머리에 모두 합친 «맞은 횟수 n» 이 나옵니다. «횟수 지우기» 로 0 부터. 체크를 끄면 그 트리거만 쉽니다. 지우면 5초 동안 «되돌리기» 할 수 있습니다.",
            "- 트리거는 화면에서만 동작합니다(색·사건 줄은 화면 기록, 파일 로그에는 남지 않음). 목록은 프로그램을 껐다 켜도 남습니다.",
          ],
        }
      : {
          title: "Triggers",
          body: [
            "Open «Triggers» in the right pane and click «+ Trigger». When a received line (RX) contains the pattern, the chosen actions run.",
            "- Pattern — HEX: «01 03 ?? **» (?? = any byte, ** = zero or more bytes). ASCII: e.g. «ALARM*» (? = any byte, * = zero or more, \\r \\n \\xNN escapes, a literal ? is \\x3F). Matches anywhere in the line, case-sensitive — the same rules as an auto-reply rule with «Wildcards» on.",
            "- Actions: «Color» (pick a color) · «Beep» · «Stop repeat» · «Stop log» (turns off Log to file) · «Event line» (an EV line «TRIGGER «name»») · «Flash» (flashes the taskbar when the window is in the background). Stopping repeat or logging is noted in the event line too.",
            "- Each trigger shows its hit count (e.g. «3×»), the header the total. «Reset counts» starts again from 0. Unchecking pauses one trigger; deleting can be undone for 5 seconds.",
            "- Triggers run on screen only (colors and event lines are not written to the file log). The list is kept across restarts.",
          ],
        },
    ko
      ? {
          title: "체크섬 옵션·CRC-32·범용 CRC",
          body: [
            "보내기 줄과 «수신 체크섬 검사» 의 체크섬 옆 ⚙ 를 누르면 옵션 창이 열립니다. 옵션이 켜져 있으면 ⚙• 로 보입니다.",
            "- «앞에서 빼고 계산할 바이트 수»: STX·주소 같은 머리 n바이트를 계산에서 뺍니다.",
            "- «끝에서 이만큼 앞에 넣기»: 체크섬을 끝에서 m바이트 앞에 넣습니다(ETX 앞 등). 그 m바이트는 계산에서도 빠집니다. 예: «\\x02AB\\x03» + BCC, 앞 1·끝 1 → 02 41 42 [03] 03. 줄 끝 붙이기(CR LF)는 따로 맨 뒤에 붙습니다.",
            "- «바이트 순서 뒤집기»: 2·4바이트 체크섬의 순서를 바꿉니다. 기본은 CRC16 Modbus·CRC-32 가 낮은 바이트 먼저, CCITT·XMODEM·SUM16·범용 CRC 가 높은 바이트 먼저입니다.",
            "- 수신 검사도 같은 옵션을 따릅니다 — 앞 n바이트를 빼고 계산해 끝에서 m바이트 앞의 체크섬과 비교합니다(끝 문자 방식이면 끝 문자를 먼저 뗌).",
            "- «CRC-32»: ISO-HDLC(zip·이더넷과 같은 것), 4바이트. «CRC (사용자 정의)»: 너비 8·16·32, poly·init·xorout(HEX), refin·refout 을 reveng 카탈로그 표기 그대로 넣습니다. «미리 정한 값» 에 CRC-16/ARC·KERMIT·X.25·DNP·CRC-32/MPEG-2·CRC-32C 등이 있습니다. 값이 너비를 넘으면 빨갛게 이유가 나오고 보내지 않습니다.",
            "- 체크섬 옵션은 명령 목록에도 함께 저장·내보내기됩니다.",
          ],
        }
      : {
          title: "Checksum options, CRC-32 and custom CRC",
          body: [
            "Click ⚙ next to the checksum in the send bar or in «Verify RX checksum» to open the options. ⚙• means options are on.",
            "- «Leading bytes left out of the calculation»: leaves a header such as STX or an address out.",
            "- «Insert this many bytes before the end»: puts the checksum m bytes before the end (before ETX etc.); those m bytes are left out of the calculation too. Example: «\\x02AB\\x03» + BCC, skip 1, before end 1 → 02 41 42 [03] 03. The line ending (CR LF) is still appended at the very end.",
            "- «Reverse byte order»: swaps 2- and 4-byte checksums. By default CRC16 Modbus and CRC-32 are low byte first; CCITT, XMODEM, SUM16 and custom CRC high byte first.",
            "- RX verification uses the same options — it skips the first n bytes and compares the checksum m bytes before the end (the terminator is removed first in terminator mode).",
            "- «CRC-32»: ISO-HDLC (as in zip/Ethernet), 4 bytes. «CRC (custom)»: width 8/16/32, poly, init, xorout (HEX), refin and refout exactly as in the reveng catalogue. «Preset» offers CRC-16/ARC, KERMIT, X.25, DNP, CRC-32/MPEG-2, CRC-32C and more. Values that do not fit the width are flagged in red and nothing is sent.",
            "- Checksum options are saved and exported with commands.",
          ],
        },
    ko
      ? {
          title: "글자 인코딩·파일 로그 형식",
          body: [
            "설정(⚙)의 «글자·파일 로그» 칸입니다.",
            "- «글자 인코딩»: UTF-8(기본)·CP949(EUC-KR)·Latin-1·ASCII. ASCII 보기·복사·저장과 ASCII 로 보내는 글자에 씁니다. 이 인코딩으로 읽을 수 없는 바이트는 «<C7>» 처럼, 제어 문자는 «<CR>» 처럼 보입니다. 보낼 글자가 그 인코딩에 없으면 «보낼 바이트» 에 이유가 나오고 보내지 않습니다(\\xNN 이스케이프는 늘 그 바이트). 로그 찾기의 한글은 UTF-8 바이트로 찾습니다 — CP949 줄은 HEX 로 찾으세요.",
            "- «파일 로그 형식»: HEX(예전과 같음) · ASCII(글자) · HEX + ASCII · CSV(엑셀용 «ts,dir,len,hex,ascii,check,note,peer», UTF-8 BOM). CSV 의 = + - @ 로 시작하는 칸은 엑셀이 수식으로 읽지 않게 앞에 ' 를 붙입니다. CSV 를 고르면 저장 파일 이름도 .csv 로 제안합니다.",
            "- «크기로 나누기(MB)»·«시간으로 나누기(시간)»: 넘으면 «이름-002.log», «이름-003.log» … 로 이어 씁니다. 옛 파일 끝에 «LOG NEXT 새 이름», 새 파일 처음에 «LOG PART 2 (prev 옛 이름)» 사건 줄이 남습니다. 0 이면 나누지 않습니다.",
            "- «날짜가 바뀌면 새 파일»: 자정을 넘으면 «이름-20261031.log» 로 이어 씁니다(같은 날 크기로 또 나누면 «이름-20261031-002.log»). «옛 로그 지우기(일)»: 파일 기록을 시작할 때와 다음 파일로 넘어갈 때, 같은 폴더에서 같은 이름 갈래(같은 확장자, 이름 뒤에 «-숫자» 만 붙은 파일 — 자동 로그 이름 «portdock-앱-날짜-시각» 끼리도 같은 갈래)의 파일 중 고친 지 그 날 수가 지난 것을 지우고 «LOG CLEAN 개수» 사건 줄을 남깁니다. 하위 폴더·다른 이름은 건드리지 않습니다. 0 이면 지우지 않습니다.",
            "- 형식·나누기는 다음에 시작하는 파일 기록부터 적용됩니다(지금 쓰는 파일은 그대로).",
          ],
        }
      : {
          title: "Text encoding and file log format",
          body: [
            "The «Text and file log» part of Settings (⚙).",
            "- «Text encoding»: UTF-8 (default), CP949 (EUC-KR), Latin-1, ASCII. Used for the ASCII view, copies and saves, and for characters sent in ASCII mode. Bytes the encoding cannot read appear as «<C7>», control characters as «<CR>». If a character to send is not in the encoding, «Bytes to send» explains why and nothing is sent (\\xNN escapes always give that byte). Korean text in the log search is matched as UTF-8 bytes — search CP949 lines in HEX.",
            "- «File log format»: HEX (as before), ASCII (text), HEX + ASCII, or CSV (for Excel: «ts,dir,len,hex,ascii,check,note,peer», UTF-8 BOM). CSV cells starting with = + - @ get a leading ' so Excel does not treat them as formulas. With CSV the save dialog suggests a .csv name.",
            "- «Split by size (MB)» / «Split by time (hours)»: logging continues in «name-002.log», «name-003.log» … The old file ends with «LOG NEXT new name» and the new one starts with «LOG PART 2 (prev old name)». 0 means never split.",
            "- «New file when the date changes»: after midnight logging continues in «name-20261031.log» (a further size split the same day gives «name-20261031-002.log»). «Delete old logs (days)»: when file logging starts and at each new file, files in the same folder from the same name family (same extension, only «-digits» added to the name — auto-log names «portdock-app-date-time» count as one family) last modified more than that many days ago are deleted, leaving a «LOG CLEAN count» event line. Subfolders and other names are never touched. 0 means never delete.",
            "- Format and splitting apply from the next file log you start (the current file is unchanged).",
          ],
        },
  );
  if (f.fileSend)
    sections.push(
      ko
        ? {
            title: "파일 보내기·문자 간 지연",
            body: [
              `- 보내기 줄${f.serial ? " «⋯ 더보기» 의" : ""} «문자 간(ms)»: 모든 송신(보내기·반복·명령·다시 보내기)에서 바이트 사이에 이만큼 쉽니다. 버퍼가 작아 글자를 놓치는 느린 장비용입니다. 0 이면 한꺼번에.${f.serial ? " 0 이 아니면 «⋯ 더보기» 버튼에 «문자 간 n ms» 가 보입니다." : ""}`,
              `- «파일 보내기…»${f.serial ? "(«⋯ 더보기» 안)" : ""}: 파일을 고르고(열기 대화상자) 바이트 그대로 보냅니다 — 체크섬·줄 끝을 붙이지 않습니다. 최대 32MB.`,
              "- «나누기»: «덩어리» 는 정한 크기(기본 256바이트)씩, «줄 단위» 는 LF·CR LF·홀로 CR 뒤에서 끊어 줄마다 보냅니다. «문자 간 지연» 은 바이트 사이, «줄·덩어리 사이 지연» 은 줄(덩어리) 사이에 쉬는 시간입니다.",
              "- 보내는 동안 진행 막대와 «보내는 중 45% (1,843/4,096 바이트)» 가 대화상자와 보내기 줄 아래에 나오고, 로그에는 줄·덩어리마다 TX 줄이 찍힙니다. «보내기 취소» 로 그 자리에서 멈추면 «SEND CANCELLED 1843/4096» 사건 줄이 남습니다. 연결이 끊기면 멈춥니다.",
              "- 대화상자를 닫아도 보내기는 계속됩니다. 파일을 고르면 크기와 예상 시간(속도·지연으로 계산)이 나옵니다.",
            ],
          }
        : {
            title: "Send file and character delay",
            body: [
              `- «Char delay (ms)» in the send bar${f.serial ? "'s «⋯ More»" : ""}: pauses this long between bytes for every send (Send, repeat, commands, Send again) — for slow devices with small buffers. 0 sends everything at once.${f.serial ? " When it is not 0, the «⋯ More» button shows «char delay n ms»." : ""}`,
              `- «Send file…»${f.serial ? " (in «⋯ More»)" : ""}: choose a file (open dialog) and send it byte for byte — no checksum or line ending is added. Up to 32 MB.`,
              "- «Split»: «Chunks» sends a fixed size (256 bytes by default) at a time; «Lines» splits after LF, CR LF or a lone CR and sends line by line. «Delay between characters» pauses between bytes, «Delay between lines/chunks» between lines (chunks).",
              "- While sending, a progress bar and «Sending 45% (1,843/4,096 bytes)» appear in the dialog and under the send bar, and the log shows a TX line per line/chunk. «Cancel sending» stops right there and logs «SEND CANCELLED 1843/4096». A disconnect stops it too.",
              "- Closing the dialog does not stop sending. After choosing a file, its size and an estimated time (from speed and delays) are shown.",
            ],
          },
    );
  return sections;
}

/** «화면 구성» 에 더할 줄(10/18 기능) */
export function ioLayoutLines(lang: Lang, f: { serial?: boolean; fileSend?: boolean } = {}): string[] {
  const ko = lang === "ko";
  return [
    ko
      ? `- 도구줄에는 «보기 설정»(시간 간격 열: 없음·직전 줄과 간격·응답 시간)${f.serial ? "과 «터미널» 보기 단추" : ""}가 있고, 상태줄 오른쪽에 처리량(RX·TX B/s)·프레임 수·«마지막 수신 n초 전» 이 나옵니다.`
      : `- The toolbar has «View options» (time gap column: none / gap from previous line / response time)${f.serial ? " and the «Terminal» view button" : ""}; the right side of the status line shows throughput (RX/TX B/s), frame counts and «last RX n s ago».`,
    f.serial
      ? ko
        ? "- 보내기 줄 둘째 줄: «반복(ms)»·«번»(횟수 — 반복을 켰거나 정해 두었을 때만)·«+ 목록에 추가»·«⋯ 더보기»(문자 간(ms)·«Break»·ms·«파일 보내기…»·반복 횟수). 체크섬 옆 ⚙ 는 체크섬 옵션입니다."
        : "- Second send row: «Repeat (ms)», «times» (only while repeating or when set), «+ Save to list» and «⋯ More» (Char delay (ms), «Break» and its ms, «Send file…», repeat count). ⚙ next to the checksum opens checksum options."
      : ko
      ? `- 보내기 줄 둘째 줄: «반복(ms)»·«번»(횟수)·«+ 목록에 추가»${f.fileSend ? `·«문자 간(ms)»${f.serial ? "·«Break»" : ""}·«파일 보내기…»` : ""}. 체크섬 옆 ⚙ 는 체크섬 옵션입니다.`
      : `- Second send row: «Repeat (ms)», «times», «+ Save to list»${f.fileSend ? `, «Char delay (ms)»${f.serial ? ", «Break»" : ""} and «Send file…»` : ""}. ⚙ next to the checksum opens checksum options.`,
    ko ? "- 오른쪽 칸 «명령 목록» 아래에 «트리거» 가 있습니다(▸ 를 눌러 펼침)." : "- «Triggers» sits below «Commands» in the right pane (click ▸ to expand).",
  ];
}

/** «로그와 사건 줄(EV)» 에 더할 줄(10/18 기능). 화면에만 나오는 줄은 그렇게 적는다 */
export function ioEvLines(lang: Lang, f: { serial?: boolean; fileSend?: boolean } = {}): string[] {
  const ko = lang === "ko";
  const out = ko
    ? [
        "- TRIGGER «이름»: 트리거가 맞았습니다(«— 반복 멈춤»·«— 파일 기록 멈춤» 이 붙을 수 있음). 화면에만 나옵니다.",
        "- REPEAT 끝 (n번 보냄): 반복 횟수를 다 보냈습니다. 화면에만 나옵니다.",
        "- LOG NEXT 새 이름 / LOG PART 2 (prev 옛 이름): 파일 로그를 크기·시간으로 나눠 다음 파일로 이어 썼습니다(두 파일에 남음).",
      ]
    : [
        "- TRIGGER «name»: a trigger matched (may end with «— repeat stopped» / «— file log stopped»). Screen only.",
        "- REPEAT done (n sent): the repeat count was reached. Screen only.",
        "- LOG NEXT new name / LOG PART 2 (prev old name): the file log was split by size or time and continues in the next file (written to both files).",
      ];
  if (f.serial)
    out.push(
      ...(ko
        ? [
            "- SEND CANCELLED 보낸/전체: 파일 보내기(또는 문자 간 지연 송신)를 취소했습니다.",
            "- BREAK 100ms: Break 신호를 보냈습니다.",
            "- RS485 드라이버 토글(RTS_CONTROL_TOGGLE)을 받지 않아 …: 드라이버가 토글을 거절해 프로그램이 RTS 를 켜고 끕니다.",
          ]
        : [
            "- SEND CANCELLED sent/total: a file send (or a character-delayed send) was cancelled.",
            "- BREAK 100ms: a Break signal was sent.",
            "- RS485 driver toggle (RTS_CONTROL_TOGGLE) refused …: the driver refused toggling, so the program toggles RTS instead.",
          ]),
    );
  return out;
}

/** «단축키·팁» 에 더할 줄(10/18 기능) */
export function ioKeyLines(lang: Lang): string[] {
  return lang === "ko"
    ? ["- 보내기 입력칸에서 ↑/↓: 앞서 보낸 내용(이력).", "- F2·F3·F5~F12: 그 키를 준 명령 보내기(명령 목록의 «키» 칸)."]
    : ["- ↑/↓ in the send box: recall earlier sends (history).", "- F2, F3, F5–F12: send the command with that key (the «Key» box in the command list)."];
}
