import { useEffect, useRef, useState } from "react";

/**
 * 말풍선 설명 — 앱에 한 번만 둔다(main.tsx).
 * 마우스를 올린 요소(또는 그 바깥 label·button)에 `data-tip` 이나 `title` 이 있으면 0.35초 뒤 말풍선을 띄운다.
 * `title` 은 윈도우 기본 설명과 겹치지 않게 올려 둔 동안만 `data-tip-title` 로 옮겼다가, 마우스가 떠나면 되돌린다.
 * React 가 그 사이 title·data-tip 을 바꾸면 말풍선도 따라 바뀐다.
 */
export function TipLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; above: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // cur: 말풍선을 띄울(띄운) 요소, held: title 을 치워 둔 요소(마우스가 올라가 있는 동안)
  const cur = useRef<Element | null>(null);
  const held = useRef<Element | null>(null);
  const watch = useRef<MutationObserver | null>(null);

  useEffect(() => {
    /** 지금 title 을 잠깐 치워 두고 보여 줄 글을 돌려준다. data-tip 이 있으면 그것이 먼저 */
    const textOf = (el: Element) => {
      const title = el.getAttribute("title");
      if (title !== null) {
        if (title) el.setAttribute("data-tip-title", title);
        else el.removeAttribute("data-tip-title");
        el.removeAttribute("title");
      }
      return el.getAttribute("data-tip") || el.getAttribute("data-tip-title") || "";
    };
    /** 말풍선만 닫는다(클릭·키·스크롤) — title 은 마우스가 떠날 때까지 치워 둔 채로 */
    const hide = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      cur.current = null;
      setTip(null);
    };
    /** 마우스가 요소를 떠나면 치워 둔 title 을 되돌린다 — 그 사이 React 가 새 title 을 넣었으면 그것을 둔다 */
    const release = () => {
      watch.current?.disconnect();
      watch.current = null;
      const el = held.current;
      held.current = null;
      if (!el) return;
      const stashed = el.getAttribute("data-tip-title");
      if (stashed !== null && !el.hasAttribute("title")) el.setAttribute("title", stashed);
      el.removeAttribute("data-tip-title");
    };
    const over = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-tip],[title],[data-tip-title]") ?? null;
      if (el !== held.current) {
        release();
        if (el) {
          held.current = el;
          textOf(el);
          // 올려 둔 동안 설명이 바뀌면 따라간다(잠금 안내·범위 표시 등)
          watch.current = new MutationObserver(() => {
            const text = textOf(el);
            setTip((t) => (t ? (text ? { ...t, text } : null) : t));
          });
          watch.current.observe(el, { attributes: true, attributeFilter: ["title", "data-tip"] });
        }
      }
      if (el === cur.current) return;
      hide();
      if (!el || !textOf(el)) return;
      cur.current = el;
      timer.current = setTimeout(() => {
        const text = textOf(el);
        if (!text) return;
        const r = el.getBoundingClientRect();
        const above = r.bottom + 90 > innerHeight;
        const x = Math.min(Math.max(8, r.left + r.width / 2), innerWidth - 8);
        setTip({ text, x, y: above ? r.top - 8 : r.bottom + 8, above });
      }, 350);
    };
    // 창 밖으로 나가면 되돌린다
    const out = (e: MouseEvent) => {
      if (!e.relatedTarget) {
        hide();
        release();
      }
    };
    const blur = () => {
      hide();
      release();
    };
    window.addEventListener("mouseover", over);
    document.addEventListener("mouseout", out);
    window.addEventListener("mousedown", hide);
    window.addEventListener("keydown", hide);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("blur", blur);
    return () => {
      blur();
      window.removeEventListener("mouseover", over);
      document.removeEventListener("mouseout", out);
      window.removeEventListener("mousedown", hide);
      window.removeEventListener("keydown", hide);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", blur);
    };
  }, []);

  if (!tip) return null;
  return (
    <div className={tip.above ? "tip above" : "tip"} style={{ left: tip.x, top: tip.y }} role="tooltip">
      {tip.text}
    </div>
  );
}
