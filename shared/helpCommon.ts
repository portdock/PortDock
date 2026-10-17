// 도움말 공통 줄 — 다섯 프로그램의 «단축키·팁»·로그 다루기 설명을 같은 말로. 각 앱 help.ts 가 불러 쓴다.
import { KEYS } from "./shortcuts";

type Lang = "ko" | "en";

/** 프로그램마다 있는 기능만 */
export interface HelpFeatures {
  /** Ctrl+S «화면 내용 저장» 이 있는지(Serial·TCP·UDP) */
  saveView?: boolean;
  /** Esc 로 멈출 «반복» 이 있는지 */
  repeat?: boolean;
  /** 로그 찾기(Ctrl+F)가 있는지 */
  find?: boolean;
  /** 연결 단어 — Serial·Slave 는 «연결·끊기», 나머지는 «시작·멈춤» */
  startStop?: boolean;
}

/** «단축키» 줄 — 글머리표(«- ») 로 시작 */
export function shortcutLines(lang: Lang, f: HelpFeatures): string[] {
  const ko = lang === "ko";
  const lines = [
    ko ? `- ${KEYS.connect}: ${f.startStop ? "시작·멈춤" : "연결·끊기"}(왼쪽 버튼과 같음).` : `- ${KEYS.connect}: ${f.startStop ? "start / stop" : "connect / disconnect"} (same as the button on the left).`,
    ko ? `- ${KEYS.clear}: 화면 기록 지우기(파일 로그는 그대로).` : `- ${KEYS.clear}: clear the on-screen log (file logs are kept).`,
    f.saveView && (ko ? `- ${KEYS.save}: 화면 내용 저장.` : `- ${KEYS.save}: save view.`),
    ko ? `- ${KEYS.fileLog}: 파일로 계속 저장 켜기·끄기.` : `- ${KEYS.fileLog}: start / stop logging to file.`,
    f.repeat && (ko ? `- ${KEYS.stopRepeat}: 반복 보내기 멈춤(입력칸 밖에서 — 입력칸 안의 Esc 는 그 칸의 동작).` : `- ${KEYS.stopRepeat}: stop repeat sending (outside text boxes — inside a box Esc keeps its own meaning).`),
    ko ? `- ${KEYS.end}: 로그 맨 아래로 가서 다시 따라가기.` : `- ${KEYS.end}: jump to the latest log line and follow again.`,
    ko ? `- ${KEYS.copy}: 고른 로그 줄을 «시각 방향 내용» 으로 복사(지금 보기대로). 입력칸 안에서는 보통 복사.` : `- ${KEYS.copy}: copy the selected log lines as «time direction data» (in the current view). Inside a text box it copies normally.`,
    f.find && (ko ? "- Ctrl+F: 로그 찾기 칸으로. 찾기 칸에서 Enter 다음 · Shift+Enter 이전 · Esc 지우기." : "- Ctrl+F: focus the log find box. In it, Enter next, Shift+Enter previous, Esc clear."),
    ko ? "- F1 또는 화면의 ? 버튼: 이 도움말. Esc 로 닫습니다." : "- F1 or the ? button: this help. Close it with Esc.",
    ko ? "- 숫자 칸: ↑/↓ 1씩, Shift+↑/↓ 10씩, PageUp/PageDown 100씩, 칸을 누른 뒤 마우스 휠. 속도 칸은 ↑/↓ 로 목록의 다음·앞 속도." : "- Number boxes: ↑/↓ by 1, Shift+↑/↓ by 10, PageUp/PageDown by 100, or the mouse wheel once the box is focused. The baud box steps through the listed rates.",
    ko ? "- 대화상자·우클릭 메뉴가 열려 있거나 한글을 조합하는 중에는 단축키가 동작하지 않습니다." : "- Shortcuts are ignored while a dialog or the right-click menu is open, or while composing Korean text.",
  ];
  return lines.filter(Boolean) as string[];
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
        "- 창 너비가 900px 이하(화면 반쪽 맞춤 등)면 왼쪽 연결 설정 칸이 접히고, 위에 요약 줄과 «⚙ 연결 설정»·연결 버튼이 나옵니다. «⚙ 연결 설정» 으로 펼치고 ✕ 나 바깥을 눌러 닫습니다.",
      ]
    : [
        "- 📌 in the header: always on top — keeps this window above others (same as «Always on top» in Settings).",
        "- The window title shows the current state (e.g. «COM3 115200 8N1 · Connected ● REC — PortDock Serial»), so you can tell windows apart on the taskbar.",
        "- At 900 px wide or less (e.g. half-screen snap) the left connection panel folds away and a summary line with «⚙ Connection» and the connect button appears. «⚙ Connection» opens the panel; ✕ or clicking outside closes it.",
      ];
}

/** 명령 목록(Serial·TCP·UDP) */
export function commandLines(lang: Lang): string[] {
  return lang === "ko"
    ? [
        "- 목록의 ▶ 는 바로 보내기(이름 칸에서 Enter·더블클릭도), ✎ 는 «입력칸으로 불러오기», ⧉ 는 복제, ✕ 는 지우기입니다. 지우면 5초 동안 아래 알림의 «되돌리기» 로 되살릴 수 있습니다(확인 창은 뜨지 않음).",
        "- 순서 바꾸기: 이름 왼쪽 ↑·↓, 또는 이름 칸에서 Alt+↑/↓.",
        "- «+ 목록에 추가» 를 누르면 새 명령의 이름 칸에 포커스가 가서 바로 이름을 고칠 수 있습니다. 로그 줄의 오른쪽 버튼 «명령 목록에 추가» 로 받은·보낸 바이트를 그대로(HEX, 체크섬·줄 끝 없이) 넣을 수도 있습니다.",
        "- «목록 내보내기»·«목록 가져오기»: 명령 목록만 JSON 파일로 옮깁니다(다른 PC·다른 PortDock 프로그램과 주고받기). 가져올 때 지금 목록이 있으면 «뒤에 추가»·«목록 바꾸기» 를 칸 안에서 고르고, 바꾼 뒤에도 «되돌리기» 할 수 있습니다.",
      ]
    : [
        "- In the list, ▶ sends (Enter or double-click in the name too), ✎ is «Load into the input», ⧉ duplicates and ✕ deletes. A deleted command can be restored with «Undo» in the notice for 5 seconds (no confirmation dialog).",
        "- Reorder with ↑/↓ left of the name, or Alt+↑/↓ in the name box.",
        "- After «+ Add to list» the new command's name box is focused so you can rename it right away. «Add to commands» in a log line's right-click menu adds those exact bytes (HEX, no checksum or line ending).",
        "- «Export list» / «Import list» move only the command list as a JSON file (to another PC or another PortDock program). When importing into a non-empty list, choose «Append» or «Replace list» in place; «Undo» works afterwards too.",
      ];
}

/** 설정(⚙)에 새로 생긴 칸 */
export function settingsLines(lang: Lang): string[] {
  return lang === "ko"
    ? ["- «항상 위»: 이 창을 다른 창 위에 늘 보이게 합니다(머리줄 📌 과 같은 값)."]
    : ["- «Always on top»: keeps this window above other windows (same as 📌 in the header)."];
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
