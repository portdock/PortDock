import { useEffect, useRef, useState, type InputHTMLAttributes, type KeyboardEvent } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "min" | "max"> & {
  value: number;
  onValue: (n: number) => void;
  min?: number;
  max?: number;
  /** 입력하는 동안은 반영하지 않고 Enter·칸 벗어날 때만 (연결 중 속도처럼 중간값이 위험한 칸) */
  commitOnBlur?: boolean;
};

/**
 * 숫자 칸. 입력하는 동안은 글자 그대로 두고(지우고 새로 쳐도 앞 값이 붙지 않게),
 * 범위 안의 정수일 때만 값을 바꾼다. 잘못된 채로 칸을 벗어나면 원래 값으로 돌아간다.
 * ↑/↓ ±1, Shift+↑/↓ ±10, PageUp/PageDown ±100, 칸에 포커스가 있을 때 마우스 휠 ±1.
 * 목록(list, 예: 속도)이 붙은 칸은 ↑/↓·휠이 목록의 다음·앞 값으로 간다.
 */
export function NumInput({ value, onValue, min = 0, max = Number.MAX_SAFE_INTEGER, commitOnBlur = false, className, ...rest }: Props) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  const parse = (s: string) => {
    const t = s.trim();
    if (!/^\d+$/.test(t)) return null;
    const n = Number(t);
    return n >= min && n <= max ? n : null;
  };
  const bad = parse(text) == null;
  // 칸을 벗어날 때·Enter 때 반영 — 틀린 값이면 원래 값으로
  const commit = () => {
    const n = parse(text);
    if (n == null) setText(String(value));
    else if (commitOnBlur && n !== value) onValue(n);
  };

  /** 지금 칸 값에서 d 만큼(목록이 있으면 목록 칸 수만큼) 옮긴다 */
  const step = (d: number, byList: boolean) => {
    const el = ref.current;
    const cur = parse(text) ?? value;
    let n: number;
    const opts = byList && el?.list ? [...el.list.querySelectorAll("option")].map((o) => Number(o.value)).filter((x) => Number.isFinite(x) && x >= min && x <= max).sort((a, b) => a - b) : [];
    if (opts.length) {
      // 목록 값 사이에 있으면 가장 가까운 다음(앞) 값으로
      n = d > 0 ? (opts.find((x) => x > cur) ?? opts[opts.length - 1]) : ([...opts].reverse().find((x) => x < cur) ?? opts[0]);
    } else n = Math.min(max, Math.max(min, cur + d));
    if (n === cur && parse(text) != null) return;
    setText(String(n));
    if (!commitOnBlur) onValue(n);
  };
  const stepRef = useRef(step);
  stepRef.current = step;

  // 휠은 칸에 포커스가 있을 때만 — 지나가며 굴리다 값이 바뀌지 않게. 페이지가 같이 굴러가지 않게 passive 를 끈다
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (document.activeElement !== el || el.disabled || el.readOnly || !e.deltaY) return;
      e.preventDefault();
      stepRef.current(e.deltaY < 0 ? (e.shiftKey ? 10 : 1) : e.shiftKey ? -10 : -1, true);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    if (k === "ArrowUp" || k === "ArrowDown") {
      e.preventDefault();
      const sign = k === "ArrowUp" ? 1 : -1;
      step(sign * (e.shiftKey ? 10 : 1), !e.shiftKey);
    } else if (k === "PageUp" || k === "PageDown") {
      e.preventDefault();
      step((k === "PageUp" ? 1 : -1) * 100, false);
    }
  };

  return (
    <input
      {...rest}
      ref={ref}
      inputMode="numeric"
      className={`${className ?? ""}${bad ? " bad" : ""}`}
      title={bad ? `${min} ~ ${max}` : rest.title}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        setText(e.target.value);
        const n = parse(e.target.value);
        if (n != null && !commitOnBlur) onValue(n);
      }}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      // Enter 는 반영만 하고 포커스는 그대로 둔다 — 값을 이어서 고치거나 Tab 으로 넘어갈 수 있게
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) commit();
        else onKey(e);
        rest.onKeyDown?.(e);
      }}
    />
  );
}
