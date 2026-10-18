// 작은 띄움 칸(«⋯ 더보기» 등) — 누른 버튼 위(자리가 없으면 아래)에 띄우고 창 밖으로 나가지 않게 옮긴다(LogMenu 와 같은 위치 계산).
// Esc·바깥 누르기·창 크기 바꾸기로 닫힌다. 안에 입력칸이 있어도 되게 ↑↓·Tab 은 건드리지 않는다.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import "./io.css";

export function Popover({ anchor, onClose, label, className, children }: { anchor: HTMLElement | null; onClose: () => void; label?: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: -9999, top: -9999 });
  // 그린 뒤 크기를 재서 버튼 오른쪽 끝에 맞춰 위로(모자라면 아래로)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !anchor) return;
    const a = anchor.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const left = Math.max(4, Math.min(a.right - r.width, innerWidth - r.width - 4));
    const above = a.top - r.height - 4;
    const top = above >= 4 ? above : Math.max(4, Math.min(a.bottom + 4, innerHeight - r.height - 4));
    setPos({ left, top });
    el.querySelector<HTMLElement>("input, button:not(:disabled), select")?.focus();
  }, [anchor]);
  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as Node;
      // 여는 버튼을 다시 누르면 그 버튼이 닫는다(여기서 닫으면 곧바로 다시 열린다)
      if (!ref.current?.contains(t) && !anchor?.contains(t)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
      anchor?.focus();
    };
    const close = () => onClose();
    window.addEventListener("mousedown", down, true);
    window.addEventListener("keydown", key, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("mousedown", down, true);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("resize", close);
    };
  }, [anchor, onClose]);

  return (
    <div ref={ref} className={className ? `popover ${className}` : "popover"} role="dialog" aria-label={label} style={pos}>
      {children}
    </div>
  );
}
