import { useEffect, useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "min" | "max"> & {
  value: number;
  onValue: (n: number) => void;
  min?: number;
  max?: number;
};

/**
 * 숫자 칸. 입력하는 동안은 글자 그대로 두고(지우고 새로 쳐도 앞 값이 붙지 않게),
 * 범위 안의 정수일 때만 값을 바꾼다. 잘못된 채로 칸을 벗어나면 원래 값으로 돌아간다.
 */
export function NumInput({ value, onValue, min = 0, max = Number.MAX_SAFE_INTEGER, className, ...rest }: Props) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
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

  return (
    <input
      {...rest}
      inputMode="numeric"
      className={`${className ?? ""}${bad ? " bad" : ""}`}
      title={bad ? `${min} ~ ${max}` : rest.title}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        setText(e.target.value);
        const n = parse(e.target.value);
        if (n != null) onValue(n);
      }}
      onBlur={() => {
        setFocused(false);
        if (parse(text) == null) setText(String(value));
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}
