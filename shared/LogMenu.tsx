// 로그 줄 오른쪽 버튼 메뉴 — 복사(줄·HEX·ASCII·둘 다·C 배열), 다시 보내기, 명령에 추가, 이 내용 찾기.
// 바깥을 누르거나 Esc·스크롤·창 전환이면 닫힌다. ↑↓ 로 고르고 Enter 로 실행.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { copyText, copyTextOf, type CopyKind } from "./logCopy";
import { hex } from "./format";
import type { LogFrame, ViewMode } from "./logSearch";
import { KEYS } from "./shortcuts";
import { ui, type Lang } from "./uiText";

export type MenuItem = { label: string; hint?: string; run: () => void; disabled?: boolean; title?: string } | "sep";

export function LogMenu({ x, y, items, onClose, label }: { x: number; y: number; items: MenuItem[]; onClose: () => void; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  // 창 밖으로 나가지 않게 — 그린 뒤 크기를 재서 옮긴다
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ left: Math.max(4, Math.min(x, innerWidth - r.width - 4)), top: Math.max(4, Math.min(y, innerHeight - r.height - 4)) });
    el.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [x, y]);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const close = () => onClose();
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      const btns = [...(ref.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
      const i = btns.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = btns.length;
        if (n) btns[(i + (e.key === "ArrowDown" ? 1 : -1) + n) % n].focus();
      } else if (e.key === "Tab") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("mousedown", down, true);
    window.addEventListener("keydown", key, true);
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    // 로그를 굴리면 닫는다(메뉴 안 스크롤은 없음)
    window.addEventListener("wheel", close, { passive: true });
    return () => {
      window.removeEventListener("mousedown", down, true);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("wheel", close);
      // 메뉴가 가져간 포커스를 돌려준다(눌러서 다른 곳으로 옮겼으면 그대로)
      setTimeout(() => {
        const now = document.activeElement;
        if (prev && prev.isConnected && (!now || now === document.body)) prev.focus();
      });
    };
  }, [onClose]);

  return (
    <div className="log-menu" ref={ref} role="menu" aria-label={label} style={pos} onContextMenu={(e) => e.preventDefault()}>
      {items.map((it, i) =>
        it === "sep" ? (
          <div key={i} className="log-menu-sep" role="separator" />
        ) : (
          <button
            key={i}
            type="button"
            role="menuitem"
            disabled={it.disabled}
            title={it.title}
            onClick={() => {
              onClose();
              it.run();
            }}
          >
            <span>{it.label}</span>
            {it.hint && <kbd>{it.hint}</kbd>}
          </button>
        ),
      )}
    </div>
  );
}

/** 로그 메뉴를 띄울 자리와 대상 */
export type MenuAt = { x: number; y: number; seq: number } | null;

/**
 * 로그 메뉴 항목 — Serial·TCP·UDP·Simulator·Modbus Slave 가 같은 순서·같은 말.
 * 없는 기능(다시 보내기·명령 추가·찾기)은 넘기지 않으면 빠진다.
 */
export function logMenuItems(opts: {
  lang: Lang;
  /** 고른 줄(화면 순서) */
  frames: LogFrame[];
  /** 오른쪽 버튼을 누른 줄 */
  clicked: LogFrame | undefined;
  view: ViewMode;
  fmt: (ts: number) => string;
  peers?: boolean;
  onCopied: (ok: boolean, n: number) => void;
  /** TX 줄의 바이트를 그대로 다시 보낸다 */
  sendAgain?: { run: (bytes: number[]) => void; enabled: boolean; why?: string };
  addCommand?: (bytes: number[]) => void;
  find?: (bytes: number[]) => void;
}): MenuItem[] {
  const { lang, frames, clicked, view, fmt, peers } = opts;
  const data = frames.filter((f) => f.dir !== "ev");
  const n = frames.length;
  const copy = (kind: CopyKind) => () => {
    const list = kind === "lines" ? frames : data;
    copyText(copyTextOf(frames, kind, view, fmt, peers)).then((ok) => opts.onCopied(ok, list.length));
  };
  const many = n > 1 ? ` · ${ui(lang, "nLines", { n })}` : "";
  const items: MenuItem[] = [
    { label: ui(lang, "copyLines") + many, hint: KEYS.copy, run: copy("lines") },
    "sep",
    { label: ui(lang, "copyHex"), run: copy("hex"), disabled: !data.length },
    { label: ui(lang, "copyAscii"), run: copy("ascii"), disabled: !data.length },
    { label: ui(lang, "copyBoth"), run: copy("both"), disabled: !data.length },
    { label: ui(lang, "copyC"), run: copy("c"), disabled: !data.length },
  ];
  const bytes = clicked && clicked.dir !== "ev" ? clicked.bytes : null;
  const extra: MenuItem[] = [];
  if (opts.sendAgain && clicked?.dir === "tx" && bytes)
    extra.push({ label: `${ui(lang, "sendAgain")} — ${short(bytes)}`, run: () => opts.sendAgain!.run(bytes), disabled: !opts.sendAgain.enabled, title: opts.sendAgain.enabled ? undefined : opts.sendAgain.why });
  if (opts.addCommand && bytes) extra.push({ label: ui(lang, "addToCommands"), run: () => opts.addCommand!(bytes) });
  if (opts.find && bytes) extra.push({ label: ui(lang, "findThis"), run: () => opts.find!(bytes) });
  return extra.length ? [...items, "sep", ...extra] : items;
}

const short = (b: number[]) => (b.length > 8 ? `${hex(b.slice(0, 8))} …` : hex(b));
