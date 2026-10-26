// 켤 때 흰 화면 깜빡임 없애기(0.3.0) — 창은 숨긴 채 만들고(tauri.conf.json "visible": false), 화면을 처음 그린 뒤 보인다.
// 창 바탕색도 고른 테마(설정·윈도우 설정)에 맞춘다. show 를 못 부르면 백엔드가 몇 초 뒤 대신 보인다(각 앱 lib.rs).
import { getCurrentWindow } from "@tauri-apps/api/window";

/** 설정·윈도우 테마 → 바탕색(common.css --bg 와 같은 값) */
export function themeBg(): [number, number, number] {
  let theme: unknown = "system";
  try {
    theme = (JSON.parse(localStorage.getItem("settings") ?? "{}") as { theme?: unknown }).theme;
  } catch {
    /* 기본 */
  }
  const dark = theme === "dark" || (theme !== "light" && typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches);
  return dark ? [0x11, 0x14, 0x18] : [0xf4, 0xf5, 0xf7];
}

let shown = false;

/** 첫 그리기 뒤 한 번 — 오류 화면(Boundary)이어도 부른다 */
export function showWhenPainted() {
  if (shown) return;
  shown = true;
  const w = getCurrentWindow();
  const [r, g, b] = themeBg();
  // 두 프레임 뒤 — 테마·글자 크기가 들어간 첫 화면이 그려진 다음
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      w.setBackgroundColor([r, g, b, 255])
        .catch(() => {})
        .finally(() => void w.show().catch(() => {}));
    }),
  );
}
