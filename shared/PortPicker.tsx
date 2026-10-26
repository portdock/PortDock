// COM 포트 고르기(0.3.0) — 목록 + 맨 끝 «직접 입력…». 목록에 없는 포트(모뎀으로 잡힌 포트·일부 가상 포트)를 이름으로 연다.
// 직접 넣은 포트는 하나만 기억해(portPick.ts) 목록에 없어도 다른 포트로 저절로 바뀌지 않는다.
import { useState } from "react";
import { comName, extraChoice, setManualPort } from "./portPick";
import { ui, type Lang } from "./uiText";
import { tip } from "./tips";

const MANUAL = "\u0001manual";

export interface PortLike {
  name: string;
  product?: string | null;
  manufacturer?: string | null;
}

const defaultLabel = (p: PortLike) => {
  const desc = p.product ?? p.manufacturer;
  return desc ? `${p.name} — ${desc}` : p.name;
};

export function PortPicker({
  lang,
  ports,
  value,
  onChange,
  disabled,
  title,
  className,
  ariaLabel,
  emptyLabel,
  label = defaultLabel,
}: {
  lang: Lang;
  ports: readonly PortLike[];
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  title?: string;
  className?: string;
  ariaLabel?: string;
  /** 목록이 비고 값도 없을 때 보일 글(«포트 없음») */
  emptyLabel: string;
  label?: (p: PortLike) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const extra = extraChoice(ports, value);
  const name = comName(text);
  const bad = text.trim() !== "" && !name;
  const done = () => {
    if (!name) return;
    setManualPort(name);
    setEditing(false);
    onChange(name);
  };
  return (
    <>
      <select
        className={className}
        value={value}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        data-tip={tip(lang, "portPick")}
        onChange={(e) => {
          if (e.target.value === MANUAL) {
            setText(extra === "manual" ? value : "");
            setEditing(true);
            return;
          }
          setEditing(false);
          onChange(e.target.value);
        }}
      >
        {ports.length === 0 && !value && <option value="">{emptyLabel}</option>}
        {extra && (
          <option value={value}>
            {value} {ui(lang, extra === "manual" ? "portManualTag" : "portMissingTag")}
          </option>
        )}
        {ports.map((p) => (
          <option key={p.name} value={p.name}>
            {label(p)}
          </option>
        ))}
        <option value={MANUAL}>{ui(lang, "portManual")}</option>
      </select>
      {editing && !disabled && (
        <div className="port-manual">
          <div className="row2">
            <input
              className={`mono${bad ? " bad" : ""}`}
              value={text}
              autoFocus
              placeholder="COM10"
              aria-label={ui(lang, "portManualBox")}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter") done();
                else if (e.key === "Escape") {
                  e.stopPropagation();
                  setEditing(false);
                }
              }}
            />
            <button type="button" className="btn small" onClick={done} disabled={!name}>
              {ui(lang, "portManualOk")}
            </button>
            <button type="button" className="btn small ghost" onClick={() => setEditing(false)} aria-label={ui(lang, "cancel")} title={ui(lang, "cancel")}>
              ✕
            </button>
          </div>
          <span className={bad ? "error" : "hint"}>{ui(lang, bad ? "portManualBad" : "portManualHint")}</span>
        </div>
      )}
    </>
  );
}
