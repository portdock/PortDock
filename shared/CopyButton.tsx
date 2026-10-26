// 상세 칸 «복사»(0.3.0) — 그 칸에 보이는 글을 그대로 클립보드로(MBAP·Modbus 풀이·덤프). 누르면 잠깐 «복사함».
import { useEffect, useState } from "react";
import { copyText } from "./logCopy";
import { ui, type Lang } from "./uiText";
import { tip } from "./tips";

/** getText: 복사할 글 — 보통 상세 칸 요소의 innerText */
export function CopyButton({ lang, getText, className }: { lang: Lang; getText: () => string; className?: string }) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const id = setTimeout(() => setState("idle"), 1500);
    return () => clearTimeout(id);
  }, [state]);
  return (
    <button
      type="button"
      className={`btn small ghost copy-detail${className ? ` ${className}` : ""}`}
      data-tip={tip(lang, "copyDetail")}
      onClick={() => {
        const text = getText().trim();
        if (!text) return;
        void copyText(text).then((ok) => setState(ok ? "ok" : "fail"));
      }}
    >
      {state === "ok" ? ui(lang, "copiedShort") : state === "fail" ? ui(lang, "copyFailShort") : ui(lang, "copyDetail")}
    </button>
  );
}
