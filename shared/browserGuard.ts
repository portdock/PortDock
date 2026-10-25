// 배포판에서만 WebView 기본 동작을 막는다 — 우클릭 «새로 고침·인쇄» 메뉴, F5·Ctrl+R(화면이 새로 고쳐져 기록이 사라짐),
// Ctrl+P(인쇄), Ctrl+U(소스 보기), Alt+←·→(뒤로·앞으로), 개발자 도구 키. 글 쓰는 칸의 우클릭(잘라내기·붙여넣기)은 그대로 둔다.
// 개발 중(tauri dev·화면 미리보기)에는 아무것도 막지 않는다.
export function installBrowserGuard() {
  if (!import.meta.env.PROD) return;
  window.addEventListener("contextmenu", (e) => {
    const t = e.target as Element | null;
    if (t?.closest?.("input:not([type=checkbox]):not([type=radio]), textarea, [contenteditable=true]")) return;
    e.preventDefault();
  });
  // 마우스 옆 버튼(뒤로·앞으로)도 화면을 바꾼다
  const side = (e: MouseEvent) => (e.button === 3 || e.button === 4) && e.preventDefault();
  window.addEventListener("mouseup", side, true);
  window.addEventListener("mousedown", side, true);
  window.addEventListener(
    "keydown",
    (e) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const block =
        k === "f5" ||
        k === "f12" ||
        k === "browserrefresh" ||
        k === "browserback" ||
        k === "browserforward" ||
        // Alt+←/→ 는 앞·뒤 페이지로 — 화면이 바뀌면 기록이 사라진다
        (e.altKey && (k === "arrowleft" || k === "arrowright")) ||
        (ctrl && !e.shiftKey && (k === "r" || k === "p" || k === "u")) ||
        (ctrl && e.shiftKey && (k === "r" || k === "i" || k === "j" || k === "c" || k === "p"));
      if (block) e.preventDefault();
    },
    true,
  );
}
