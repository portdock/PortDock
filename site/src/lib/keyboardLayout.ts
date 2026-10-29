// 화면 키보드 배열 — 웹 도구 «키보드 테스트».
// 키는 KeyboardEvent.code(UI Events KeyboardEvent code 명세 — 자판 글자가 아니라 «물리 위치» 이름)로 맞춘다.
// 그래서 한글·영문 입력 상태나 OS 자판 설정과 상관없이 같은 자리의 키가 켜진다.
// 배열(1u = 키 하나 폭):
//   - 영문 ANSI 104: 미국식. 왼쪽 Shift 2.25u, 가로로 긴 Enter, Enter 위 백슬래시.
//   - 영문 ISO 105: 유럽식. 왼쪽 Shift 1.25u 옆에 키 하나 더(IntlBackslash), 세로로 긴 Enter, Enter 왼쪽 키는 code 가 Backslash.
//   - 한국어 106: ANSI 104 + 스페이스 양옆 «한자»(Lang2)·«한/영»(Lang1). 명세상 Lang1 = 한/영, Lang2 = 한자.
//     노트북·일부 키보드는 한/영을 오른쪽 Alt(AltRight), 한자를 오른쪽 Ctrl(ControlRight)로 보낸다 — 화면 안내에 적는다.

export type LayoutId = "ko106" | "ansi104" | "iso105";

export interface Key {
  code: string;
  label: string;
  /** 한글 자모 같은 둘째 글자 */
  sub?: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

type Tok = [code: string, label: string, w?: number, h?: number] | number;

const F = (n: number): Tok => [`F${n}`, `F${n}`];
const ROW0: Tok[] = [["Escape", "Esc"], 1, F(1), F(2), F(3), F(4), 0.5, F(5), F(6), F(7), F(8), 0.5, F(9), F(10), F(11), F(12)];
const DIGITS: Tok[] = [["Backquote", "`"], ..."1234567890".split("").map((d): Tok => [`Digit${d}`, d]), ["Minus", "-"], ["Equal", "="], ["Backspace", "Backspace", 2]];
const letters = (s: string): Tok[] => s.split("").map((c): Tok => [`Key${c}`, c]);
const QROW: Tok[] = [["Tab", "Tab", 1.5], ...letters("QWERTYUIOP"), ["BracketLeft", "["], ["BracketRight", "]"]];
const AROW: Tok[] = [["CapsLock", "Caps Lock", 1.75], ...letters("ASDFGHJKL"), ["Semicolon", ";"], ["Quote", "'"]];
const ZKEYS: Tok[] = [...letters("ZXCVBNM"), ["Comma", ","], ["Period", "."], ["Slash", "/"]];
const MODS_L: Tok[] = [["ControlLeft", "Ctrl", 1.25], ["MetaLeft", "Win", 1.25], ["AltLeft", "Alt", 1.25]];
const MODS_R: Tok[] = [["AltRight", "Alt", 1.25], ["MetaRight", "Win", 1.25], ["ContextMenu", "Menu", 1.25], ["ControlRight", "Ctrl", 1.25]];

const MAIN: Record<LayoutId, Tok[][]> = {
  ansi104: [
    ROW0,
    DIGITS,
    [...QROW, ["Backslash", "\\", 1.5]],
    [...AROW, ["Enter", "Enter", 2.25]],
    [["ShiftLeft", "Shift", 2.25], ...ZKEYS, ["ShiftRight", "Shift", 2.75]],
    [...MODS_L, ["Space", "Space", 6.25], ...MODS_R],
  ],
  iso105: [
    ROW0,
    DIGITS,
    // 세로로 긴 Enter 는 이 줄에서 두 줄 높이로 놓는다(아래 줄은 그 자리를 비운다)
    [...QROW, 0.25, ["Enter", "Enter", 1.25, 2]],
    [...AROW, ["Backslash", "#"]],
    [["ShiftLeft", "Shift", 1.25], ["IntlBackslash", "\\"], ...ZKEYS, ["ShiftRight", "Shift", 2.75]],
    [...MODS_L, ["Space", "Space", 6.25], ...MODS_R],
  ],
  ko106: [
    ROW0,
    DIGITS,
    [...QROW, ["Backslash", "\\", 1.5]],
    [...AROW, ["Enter", "Enter", 2.25]],
    [["ShiftLeft", "Shift", 2.25], ...ZKEYS, ["ShiftRight", "Shift", 2.75]],
    [...MODS_L, ["Lang2", "한자"], ["Space", "Space", 4.25], ["Lang1", "한/영"], ...MODS_R],
  ],
};

/** 두벌식 자모(한국어 배열의 둘째 글자) */
const JAMO: Record<string, string> = {
  KeyQ: "ㅂ", KeyW: "ㅈ", KeyE: "ㄷ", KeyR: "ㄱ", KeyT: "ㅅ", KeyY: "ㅛ", KeyU: "ㅕ", KeyI: "ㅑ", KeyO: "ㅐ", KeyP: "ㅔ",
  KeyA: "ㅁ", KeyS: "ㄴ", KeyD: "ㅇ", KeyF: "ㄹ", KeyG: "ㅎ", KeyH: "ㅗ", KeyJ: "ㅓ", KeyK: "ㅏ", KeyL: "ㅣ",
  KeyZ: "ㅋ", KeyX: "ㅌ", KeyC: "ㅊ", KeyV: "ㅍ", KeyB: "ㅠ", KeyN: "ㅜ", KeyM: "ㅡ", Backslash: "₩",
};

// 편집 키·방향키(가운데 묶음)와 숫자 키패드 — 세 배열이 같다
const NAV: Tok[][] = [
  [["PrintScreen", "PrtSc"], ["ScrollLock", "ScrLk"], ["Pause", "Pause"]],
  [["Insert", "Ins"], ["Home", "Home"], ["PageUp", "PgUp"]],
  [["Delete", "Del"], ["End", "End"], ["PageDown", "PgDn"]],
  [],
  [1, ["ArrowUp", "↑"]],
  [["ArrowLeft", "←"], ["ArrowDown", "↓"], ["ArrowRight", "→"]],
];
const PAD: Tok[][] = [
  [],
  [["NumLock", "Num"], ["NumpadDivide", "/"], ["NumpadMultiply", "*"], ["NumpadSubtract", "-"]],
  [["Numpad7", "7"], ["Numpad8", "8"], ["Numpad9", "9"], ["NumpadAdd", "+", 1, 2]],
  [["Numpad4", "4"], ["Numpad5", "5"], ["Numpad6", "6"]],
  [["Numpad1", "1"], ["Numpad2", "2"], ["Numpad3", "3"], ["NumpadEnter", "Enter", 1, 2]],
  [["Numpad0", "0", 2], ["NumpadDecimal", "."]],
];

/** 줄 번호 → 세로 위치(기능 키 줄 아래 0.25u 띄움) */
const rowY = (r: number) => (r === 0 ? 0 : r + 0.25);

function place(rows: Tok[][], x0: number, sub?: Record<string, string>): Key[] {
  const out: Key[] = [];
  rows.forEach((row, r) => {
    let x = x0;
    for (const t of row) {
      if (typeof t === "number") {
        x += t;
        continue;
      }
      const [code, label, w = 1, h = 1] = t;
      const k: Key = { code, label, x, y: rowY(r), w, h };
      if (sub?.[code]) k.sub = sub[code];
      out.push(k);
      x += w;
    }
  });
  return out;
}

/** 본 자판 폭 15u, 가운데 묶음은 15.25u, 숫자 키패드는 18.5u 에서 시작 */
export const MAIN_W = 15;
const NAV_X = 15.25;
const PAD_X = 18.5;

export function layoutKeys(id: LayoutId): Key[] {
  return [...place(MAIN[id], 0, id === "ko106" ? JAMO : undefined), ...place(NAV, NAV_X), ...place(PAD, PAD_X)];
}

/** 배열 전체 크기(u) */
export function layoutSize(keys: readonly Key[]) {
  return { w: Math.max(...keys.map((k) => k.x + k.w)), h: Math.max(...keys.map((k) => k.y + k.h)) };
}

export const LAYOUTS: { id: LayoutId; ko: string; en: string }[] = [
  { id: "ko106", ko: "한국어 106키", en: "Korean 106-key" },
  { id: "ansi104", ko: "영문 ANSI 104키", en: "US ANSI 104-key" },
  { id: "iso105", ko: "영문 ISO 105키", en: "ISO 105-key" },
];

/** 브라우저 언어로 처음 보일 배열 — 한국어면 106, 영국·유럽 쪽이면 ISO, 그 밖은 ANSI */
export function defaultLayout(langs: readonly string[]): LayoutId {
  const l = (langs[0] ?? "").toLowerCase();
  if (l.startsWith("ko")) return "ko106";
  if (/^(en-(gb|ie)|de|fr|es|it|pt-pt|nl|sv|da|nb|no|fi|pl|cs)/.test(l)) return "iso105";
  return "ansi104";
}
