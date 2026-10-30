// 조건 규칙 창(0.6.0) — «조건 → 지연 → 동작» 목록과 고치기. 규칙 모양·검사는 model.ts, 실행은 백엔드(crates/core/src/mc_rules.rs).
import { useEffect, useState } from "react";
import { NumInput } from "@shared/NumInput";
import { tip } from "@shared/tips";
import { useRestoreFocus } from "@shared/restoreFocus";
import { dict, type Key, type Lang } from "./i18n";
import {
  CMP_OPS,
  COND_KINDS,
  RULE_LIMITS,
  checkRule,
  expandRule,
  handshakeRules,
  isBitAddr,
  isBitOp,
  nextRuleId,
  parseRuleAddr,
  ruleAddrText,
  ruleSummary,
  type ActOp,
  type CmpOp,
  type Cond,
  type CondKind,
  type Rule,
  type RuleAction,
  type RuleErr,
} from "./model";

/** 백엔드가 알려 주는 규칙 하나의 실행 상태 */
export interface RuleStat {
  id: number;
  count: number;
  lastMs: number | null;
  waiting: boolean;
}

type ActDraft = { at: string; op: ActOp; value: number };
interface Draft {
  /** 고치는 규칙 번호(새 규칙이면 null) */
  id: number | null;
  name: string;
  enabled: boolean;
  kind: CondKind;
  at: string;
  op: CmpOp;
  value: number;
  delayMs: number;
  delayMaxMs: number;
  actions: ActDraft[];
  count: number;
  step: number;
}

const ERR_KEY: Record<RuleErr, Key> = {
  condBit: "ruErrCondBit",
  condWord: "ruErrCondWord",
  noActions: "ruErrNoActions",
  tooManyActions: "ruErrNoActions",
  actBit: "ruErrActBit",
  actWord: "ruErrActWord",
  setRange: "ruErrSet",
  addRange: "ruErrAdd",
  delayRange: "ruErrDelay",
  periodShort: "ruErrPeriod",
};

const KIND_KEY: Record<CondKind, Key> = { on: "ruKindOn", off: "ruKindOff", rise: "ruKindRise", fall: "ruKindFall", word: "ruKindWord", always: "ruKindAlways" };
const OP_KEY: Record<ActOp, Key> = { on: "ruOpOn", off: "ruOpOff", toggle: "ruOpToggle", set: "ruOpSet", add: "ruOpAdd" };

function toDraft(r: Rule): Draft {
  const c = r.cond;
  return {
    id: r.id,
    name: r.name,
    enabled: r.enabled,
    kind: c.kind,
    at: c.kind === "always" ? "" : ruleAddrText(c.at),
    op: c.kind === "word" ? c.op : "eq",
    value: c.kind === "word" ? c.value : 0,
    delayMs: r.delayMs,
    delayMaxMs: r.delayMaxMs,
    actions: r.actions.map((a) => ({ at: ruleAddrText(a.at), op: a.op, value: a.value })),
    count: 1,
    step: 1,
  };
}

const EMPTY: Draft = { id: null, name: "", enabled: true, kind: "on", at: "M100", op: "eq", value: 0, delayMs: 300, delayMaxMs: 0, actions: [{ at: "M101", op: "on", value: 0 }], count: 1, step: 1 };

const fmtTime = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
};

export function RulesDialog({
  lang,
  rules,
  stats,
  running,
  onChange,
  onResetCounts,
  onClose,
}: {
  lang: Lang;
  rules: Rule[];
  stats: RuleStat[];
  /** 흉내 운전 상태가 RUN 인지(아니면 규칙이 쉰다고 알림) */
  running: boolean;
  onChange: (rules: Rule[], why?: "example") => void;
  onResetCounts: () => void;
  onClose: () => void;
}) {
  const t = (k: Key) => dict[lang][k];
  const back = useRestoreFocus<HTMLDivElement>();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (draft) setDraft(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, draft]);

  const statOf = (id: number) => stats.find((s) => s.id === id);
  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setAct = (i: number, patch: Partial<ActDraft>) => setDraft((d) => (d ? { ...d, actions: d.actions.map((a, k) => (k === i ? { ...a, ...patch } : a)) } : d));

  function edit(r: Rule | null) {
    setErr(null);
    setDraft(r ? toDraft(r) : { ...EMPTY });
  }

  function save() {
    if (!draft) return;
    setErr(null);
    let cond: Cond;
    if (draft.kind === "always") cond = { kind: "always" };
    else {
      const at = parseRuleAddr(draft.at);
      if (!at) return setErr(t("ruErrAddr").replace("{a}", draft.at));
      cond = draft.kind === "word" ? { kind: "word", at, op: draft.op, value: draft.value } : { kind: draft.kind, at };
    }
    const actions: RuleAction[] = [];
    for (const a of draft.actions) {
      const at = parseRuleAddr(a.at);
      if (!at) return setErr(t("ruErrAddr").replace("{a}", a.at));
      actions.push({ at, op: a.op, value: a.op === "set" || a.op === "add" ? a.value : 0 });
    }
    const rule: Rule = { id: draft.id ?? 0, name: draft.name.trim().slice(0, 60), enabled: draft.enabled, cond, delayMs: draft.delayMs, delayMaxMs: draft.delayMaxMs, actions };
    const why = checkRule(rule);
    if (why) return setErr(t(ERR_KEY[why]));
    const made = expandRule(rule, Math.max(1, draft.count), draft.step, 1);
    if (!made) return setErr(t("ruErrRange"));
    let next = nextRuleId(rules);
    const ids = made.map((_, k) => (k === 0 && draft.id != null ? draft.id : next++));
    const fresh = made.map((r, k) => ({ ...r, id: ids[k] }));
    if (rules.length - (draft.id != null ? 1 : 0) + fresh.length > RULE_LIMITS.rules) return setErr(t("ruErrMany"));
    const out: Rule[] = [];
    for (const r of rules) {
      if (r.id === draft.id) out.push(...fresh);
      else out.push(r);
    }
    if (draft.id == null) out.push(...fresh);
    onChange(out);
    setDraft(null);
  }

  const addExample = () => onChange([...rules, ...handshakeRules(nextRuleId(rules), [t("ruExName1"), t("ruExName2")])], "example");
  const remove = (id: number) => onChange(rules.filter((r) => r.id !== id));
  const toggle = (id: number, on: boolean) => onChange(rules.map((r) => (r.id === id ? { ...r, enabled: on } : r)));
  const copy = (r: Rule) => {
    const id = nextRuleId(rules);
    const at = rules.findIndex((x) => x.id === r.id);
    onChange([...rules.slice(0, at + 1), { ...r, id }, ...rules.slice(at + 1)]);
  };

  /** 동작 주소에 맞는 고르기 — 비트(또는 워드.비트)면 ON·OFF·반전, 워드면 쓰기·더하기, 아직 못 읽으면 다 */
  const opsFor = (text: string): ActOp[] => {
    const a = parseRuleAddr(text);
    if (!a) return ["on", "off", "toggle", "set", "add"];
    return isBitAddr(a) ? ["on", "off", "toggle"] : ["set", "add"];
  };
  const fixOp = (text: string, op: ActOp): ActOp => {
    const ops = opsFor(text);
    return ops.includes(op) ? op : ops[0];
  };

  return (
    <div className="modal-back" ref={back} onClick={onClose}>
      <div className="modal rules-dlg" role="dialog" aria-label={t("ruTitle")} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>
            {t("ruTitle")} ({rules.length})
          </b>
          <button className="btn small ghost" onClick={onClose} title={t("close")} aria-label={t("close")}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <span className="hint">{t("ruIntro")}</span>
          {!running && <div className="hint warn">{t("ruPaused")}</div>}
          <div className="row-inline rules-tools">
            <button className="btn small primary" onClick={() => edit(null)} disabled={!!draft || rules.length >= RULE_LIMITS.rules} data-tip={tip(lang, "plcRuleAdd")}>
              + {t("ruAdd")}
            </button>
            <button className="btn small" onClick={addExample} disabled={!!draft || rules.length + 2 > RULE_LIMITS.rules} data-tip={tip(lang, "plcRuleExample")}>
              {t("ruExample")}
            </button>
            <span className="grow" />
            <button className="btn small" onClick={onResetCounts} disabled={!rules.length} data-tip={tip(lang, "plcRuleResetCounts")}>
              {t("ruResetCounts")}
            </button>
          </div>
          {rules.length === 0 ? (
            <div className="hint rules-empty">{t("ruEmpty")}</div>
          ) : (
            <ul className="rule-list" aria-label={t("ruTitle")}>
              {rules.map((r) => {
                const st = statOf(r.id);
                const bad = checkRule(r);
                return (
                  <li key={r.id} className={`${r.enabled ? "" : "off"}${draft?.id === r.id ? " editing" : ""}`}>
                    <input type="checkbox" checked={r.enabled} onChange={(e) => toggle(r.id, e.target.checked)} aria-label={`${t("ruEnabled")} #${r.id}`} title={t("ruEnabled")} />
                    <span className="rule-main">
                      <span className="rule-name">
                        #{r.id}
                        {r.name ? ` ${r.name}` : ""}
                      </span>
                      <span className="mono rule-sum">{ruleSummary(r, t("ruKindAlways"))}</span>
                      {bad && <span className="error">{t(ERR_KEY[bad])}</span>}
                    </span>
                    <span className="rule-stat hint" title={t("ruStatTip")}>
                      {st?.waiting ? "⏳ " : ""}
                      {t("ruRuns").replace("{n}", String(st?.count ?? 0))}
                      {st?.lastMs ? ` · ${fmtTime(st.lastMs)}` : ""}
                    </span>
                    <button className="btn small ghost" onClick={() => edit(r)} disabled={!!draft} aria-label={`${t("ruEdit")} #${r.id}`} title={t("ruEdit")}>
                      ✎
                    </button>
                    <button className="btn small ghost" onClick={() => copy(r)} disabled={!!draft || rules.length >= RULE_LIMITS.rules} aria-label={`${t("ruCopy")} #${r.id}`} title={t("ruCopy")}>
                      ⧉
                    </button>
                    <button className="btn small ghost" onClick={() => remove(r.id)} disabled={!!draft} aria-label={`${t("ruDelete")} #${r.id}`} title={t("ruDelete")}>
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {draft && (
            <fieldset className="rule-edit">
              <legend>{draft.id == null ? t("ruNew") : `${t("ruEdit")} #${draft.id}`}</legend>
              <label>
                {t("ruName")}
                <input value={draft.name} maxLength={60} autoFocus onChange={(e) => set({ name: e.target.value })} />
              </label>
              <div className="grid2">
                <label data-tip={tip(lang, "plcRuleCond")}>
                  {t("ruCond")}
                  <select value={draft.kind} onChange={(e) => set({ kind: e.target.value as CondKind })}>
                    {COND_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {t(KIND_KEY[k])}
                      </option>
                    ))}
                  </select>
                </label>
                {draft.kind !== "always" && (
                  <label data-tip={tip(lang, "plcRuleAddr")}>
                    {t("ruAddr")}
                    <input className={parseRuleAddr(draft.at) ? "mono" : "mono bad"} value={draft.at} spellCheck={false} placeholder={draft.kind === "word" ? "D100" : "M100 / D100.3"} onChange={(e) => set({ at: e.target.value })} />
                  </label>
                )}
              </div>
              {draft.kind === "word" && (
                <div className="grid2">
                  <label>
                    {t("ruCmp")}
                    <select value={draft.op} onChange={(e) => set({ op: e.target.value as CmpOp })}>
                      {CMP_OPS.map(([o, sign]) => (
                        <option key={o} value={o}>
                          {sign}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("ruValue")}
                    <NumInput min={0} max={65535} value={draft.value} onValue={(n) => set({ value: n })} />
                  </label>
                </div>
              )}
              <div className="grid2">
                <label data-tip={tip(lang, "plcRuleDelay")}>
                  {draft.kind === "always" ? t("ruPeriod") : t("ruDelay")}
                  <NumInput min={0} max={RULE_LIMITS.delayMs} value={draft.delayMs} onValue={(n) => set({ delayMs: n })} />
                </label>
                <label data-tip={tip(lang, "plcRuleDelayMax")}>
                  {t("ruDelayMax")}
                  <NumInput min={0} max={RULE_LIMITS.delayMs} value={draft.delayMaxMs} onValue={(n) => set({ delayMaxMs: n })} />
                </label>
              </div>
              <div className="rule-acts" role="group" aria-label={t("ruActions")}>
                <span className="lbl">{t("ruActions")}</span>
                {draft.actions.map((a, i) => (
                  <div key={i} className="rule-act">
                    <input className={parseRuleAddr(a.at) ? "mono" : "mono bad"} value={a.at} spellCheck={false} aria-label={`${t("ruAddr")} ${i + 1}`} onChange={(e) => setAct(i, { at: e.target.value, op: fixOp(e.target.value, a.op) })} />
                    <select value={a.op} aria-label={`${t("ruDo")} ${i + 1}`} onChange={(e) => setAct(i, { op: e.target.value as ActOp })}>
                      {opsFor(a.at).map((o) => (
                        <option key={o} value={o}>
                          {t(OP_KEY[o])}
                        </option>
                      ))}
                    </select>
                    {!isBitOp(a.op) && <IntInput min={a.op === "add" ? -65535 : 0} max={65535} value={a.value} label={`${t("ruValue")} ${i + 1}`} onValue={(n) => setAct(i, { value: n })} />}
                    <button className="btn small ghost" onClick={() => set({ actions: draft.actions.filter((_, k) => k !== i) })} disabled={draft.actions.length <= 1} aria-label={`${t("ruDelete")} ${i + 1}`} title={t("ruDelete")}>
                      ✕
                    </button>
                  </div>
                ))}
                <button className="btn small" onClick={() => set({ actions: [...draft.actions, { at: "D0", op: "set", value: 0 }] })} disabled={draft.actions.length >= RULE_LIMITS.actions}>
                  + {t("ruAddAction")}
                </button>
              </div>
              <div className="grid2" data-tip={tip(lang, "plcRuleRange")}>
                <label>
                  {t("ruCount")}
                  <NumInput min={1} max={100} value={draft.count} onValue={(n) => set({ count: n })} />
                </label>
                <label>
                  {t("ruStep")}
                  <NumInput min={1} max={1000} value={draft.step} onValue={(n) => set({ step: n })} />
                </label>
              </div>
              {draft.count > 1 && <span className="hint">{t("ruRangeHint").replace("{n}", String(draft.count)).replace("{s}", String(draft.step))}</span>}
              {err && (
                <div className="error" role="alert">
                  {err}
                </div>
              )}
              <div className="row2 dlg-buttons">
                <span className="grow" />
                <button className="btn small" onClick={() => setDraft(null)}>
                  {t("cancel")}
                </button>
                <button className="btn small primary" onClick={save}>
                  {t("save")}
                </button>
              </div>
            </fieldset>
          )}
          <span className="hint">{t("ruFoot")}</span>
        </div>
      </div>
    </div>
  );
}

/** 정수 칸(음수 됨) — 맞는 값이면 바로 반영, 틀리면 빨갛게 */
function IntInput({ value, min, max, label, onValue }: { value: number; min: number; max: number; label: string; onValue: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText((t) => (Number(t) === value ? t : String(value))), [value]);
  const ok = (s: string) => /^[-+]?\d+$/.test(s.trim()) && Number(s) >= min && Number(s) <= max;
  return (
    <input
      className={ok(text) ? "num mono" : "num mono bad"}
      value={text}
      inputMode="numeric"
      aria-label={label}
      onChange={(e) => {
        setText(e.target.value);
        if (ok(e.target.value)) onValue(Number(e.target.value));
      }}
      onBlur={() => !ok(text) && setText(String(value))}
    />
  );
}
