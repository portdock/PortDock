import { useEffect, useRef, useState } from "react";

/**
 * 말풍선 설명 — 앱에 한 번만 둔다(main.tsx).
 * 마우스를 올린 요소(또는 그 바깥 label·button)에 `data-tip` 이나 `title` 이 있으면 0.35초 뒤 말풍선을 띄운다.
 * `title` 은 윈도우 기본 설명과 겹치지 않게 `data-tip` 으로 옮긴다.
 */
export function TipLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; above: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cur = useRef<Element | null>(null);

  useEffect(() => {
    const hide = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      cur.current = null;
      setTip(null);
    };
    const over = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-tip],[title]");
      if (el === cur.current) return;
      hide();
      if (!el) return;
      const title = el.getAttribute("title");
      if (title) {
        el.setAttribute("data-tip", title);
        el.removeAttribute("title");
      }
      const text = el.getAttribute("data-tip");
      if (!text) return;
      cur.current = el;
      timer.current = setTimeout(() => {
        const r = el.getBoundingClientRect();
        const above = r.bottom + 90 > innerHeight;
        const x = Math.min(Math.max(8, r.left + r.width / 2), innerWidth - 8);
        setTip({ text, x, y: above ? r.top - 8 : r.bottom + 8, above });
      }, 350);
    };
    window.addEventListener("mouseover", over);
    window.addEventListener("mousedown", hide);
    window.addEventListener("keydown", hide);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("blur", hide);
    return () => {
      window.removeEventListener("mouseover", over);
      window.removeEventListener("mousedown", hide);
      window.removeEventListener("keydown", hide);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", hide);
    };
  }, []);

  if (!tip) return null;
  return (
    <div className={tip.above ? "tip above" : "tip"} style={{ left: tip.x, top: tip.y }} role="tooltip">
      {tip.text}
    </div>
  );
}
