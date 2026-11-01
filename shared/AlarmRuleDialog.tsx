// (0.10.0) 감시 조건 창 — 값 하나의 하한·상한·멈춤 초·끊김 초·되돌아올 때 여유. 비운 칸은 보지 않는다.
import type { Lang } from "./lang.ts";
import { useEffect, useState } from "react";
import { useRestoreFocus } from "./restoreFocus";
import { emptyRule, ruleProblem, ruleUsed, type AlarmRule } from "./alarm.ts";
import { alarmText, type AlarmTextKey } from "./alarmText.ts";

const show = (v: number | null) => (v == null ? "" : String(v));

export function AlarmRuleDialog({
  lang,
  keyId,
  label,
  rule,
  onSave,
  onClose,
}: {
  lang: Lang;
  keyId: string;
  /** 무엇을 보는지(제목) */
  label: string;
  rule: AlarmRule | undefined;
  /** null = 조건 지우기 */
  onSave: (r: AlarmRule | null) => void;
  onClose: () => void;
}) {
  const T = (k: AlarmTextKey, v?: Record<string, string | number>) => alarmText(lang, k, v);
  const back = useRestoreFocus<HTMLDivElement>();
  const r0 = rule ?? emptyRule(keyId);
  const [lo, setLo] = useState(show(r0.lo));
  const [hi, setHi] = useState(show(r0.hi));
  const [stuck, setStuck] = useState(show(r0.stuckSec));
  const [lost, setLost] = useState(show(r0.lostSec));
  const [hyst, setHyst] = useState(r0.hyst ? String(r0.hyst) : "");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function save() {
    const n = (s: string): number | null | undefined => {
      const t = s.trim().replace(",", ".");
      if (!t) return null;
      const v = Number(t);
      return Number.isFinite(v) ? v : undefined;
    };
    const vals = [n(lo), n(hi), n(stuck), n(lost), n(hyst)];
    if (vals.some((v) => v === undefined)) return setErr(T("errNum"));
    const [l, h, s, ls, hy] = vals as (number | null)[];
    const r: AlarmRule = { key: keyId, lo: l, hi: h, stuckSec: s == null ? null : Math.round(s), lostSec: ls == null ? null : Math.round(ls), hyst: hy ?? 0 };
    const p = ruleProblem(r);
    if (p) return setErr(T(p === "loHi" ? "errLoHi" : p === "secs" ? "errSecs" : "errHyst"));
    if (!ruleUsed(r)) return setErr(T("errEmpty"));
    onSave(r);
  }

  const field = (k: AlarmTextKey, v: string, set: (s: string) => void, cls: string, auto = false) => (
    <label className={cls}>
      {T(k)}
      <input
        value={v}
        inputMode="decimal"
        autoFocus={auto}
        onChange={(e) => {
          set(e.target.value);
          setErr(null);
        }}
        onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && save()}
      />
    </label>
  );

  return (
    <div className="modal-back" ref={back} onClick={onClose}>
      <div className="modal alarm-dlg" role="dialog" aria-label={T("dlgTitle", { a: label })} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{T("dlgTitle", { a: label })}</b>
          <button className="btn small ghost" onClick={onClose} title={T("close")} aria-label={T("close")}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="alarm-grid">
            {field("lo", lo, setLo, "al-lo", true)}
            {field("hi", hi, setHi, "al-hi")}
            {field("stuck", stuck, setStuck, "al-stuck")}
            {field("lost", lost, setLost, "al-lost")}
            {field("hyst", hyst, setHyst, "al-hyst")}
          </div>
          <div className="hint">{T("hystHint")}</div>
          <div className="hint">{T("emptyHint")}</div>
          {err && (
            <div className="hint warn" role="alert">
              {err}
            </div>
          )}
          <div className="hint alarm-safety">{T("safety")}</div>
          <div className="alarm-dlg-btns">
            {rule && (
              <button className="btn small" onClick={() => onSave(null)}>
                {T("remove")}
              </button>
            )}
            <span className="grow" />
            <button className="btn small" onClick={onClose}>
              {T("close")}
            </button>
            <button className="btn small primary" onClick={save}>
              {T("save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
