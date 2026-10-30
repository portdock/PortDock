// Serial·TCP·UDP 오른쪽 칸의 «자동응답» — 접고 펼 수 있고, «켜기» 로 바로 켜고 끈다(규칙은 Simulator 와 같은 엔진).
// 규칙·켜기·비교 옵션·펼침은 localStorage 에 남는다. 켜져 있으면 머리에 «켜짐» 을 늘 보인다(모르고 답하는 일이 없게).
import { useEffect, useState } from "react";
import { load, store } from "./framing";
import { useFold } from "./settings";
import { tip } from "./tips";
import type { ToastApi } from "./Toast";
import type { Lang } from "./uiText";
import { ar } from "./autoReplyText";
import { normalizeRule, validRule, type AutoRule, type MatchOptions } from "./autoReply";
import { autoReplyApi, type AutoReplyApi } from "./autoReplyApi";
import { AutoReplyPanel } from "./AutoReplyPanel";
import "./autoreply.css";

export function AutoReplySection({
  lang,
  toast,
  api = autoReplyApi,
  inactiveNote,
  expandAll = false,
}: {
  lang: Lang;
  toast: ToastApi;
  api?: AutoReplyApi;
  /** 지금 자동응답이 쓰이지 않는 이유(예: TCP 중계) — 있으면 칸 안에 보인다 */
  inactiveNote?: string | null;
  /** 설정 «모두 펼치기» — 펼친 채 */
  expandAll?: boolean;
}) {
  const [openSaved, setOpenSaved] = useState(() => load("autoReplyOpen", false));
  const [open, setOpen] = useFold(openSaved, setOpenSaved, expandAll);
  const [on, setOn] = useState(() => load("autoReplyOn", false));
  const [rules, setRulesState] = useState<AutoRule[]>(() => {
    const saved = load<unknown[]>("autoRules", []);
    return Array.isArray(saved) ? saved.filter(validRule).map(normalizeRule) : [];
  });
  const [opts, setOpts] = useState<MatchOptions>(() => ({ stripTerminator: true, logNoMatch: true, ...load<Partial<MatchOptions>>("autoMatchOpts", {}) }));
  const [hits, setHits] = useState<Record<string, number>>({});
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => store("autoReplyOpen", openSaved), [openSaved]);
  useEffect(() => store("autoRules", rules), [rules]);
  useEffect(() => store("autoMatchOpts", opts), [opts]);
  useEffect(() => {
    store("autoReplyOn", on);
    api
      .setEnabled(on)
      .then(() => setErr(null))
      .catch((e) => setErr(String(e)));
  }, [on, api]);
  useEffect(() => {
    api.setMatchOptions(opts).catch(() => {});
  }, [opts, api]);
  // 접혀 있을 때도 규칙은 백엔드에 — 펼치면 규칙 칸이 스스로 보낸다(틀린 규칙 표시와 함께)
  useEffect(() => {
    if (open) return;
    const id = setTimeout(
      () =>
        api
          .setRules(rules)
          .then(() => setErr(null))
          .catch((e) => setErr(String(e))),
      300,
    );
    return () => clearTimeout(id);
  }, [rules, open, api]);
  // 응답 횟수 — 펼쳤거나 켜져 있을 때만 묻는다
  useEffect(() => {
    if (!open && !on) return;
    const tick = () => api.getHits().then(setHits).catch(() => {});
    tick();
    const id = setInterval(tick, 700);
    return () => clearInterval(id);
  }, [open, on, api]);
  const setRules = (r: AutoRule[] | ((cur: AutoRule[]) => AutoRule[])) => setRulesState((cur) => (typeof r === "function" ? r(cur) : r));
  const total = Object.values(hits).reduce((a, b) => a + b, 0);
  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="trg-panel ars-panel">
      <div className="trg-head">
        <button type="button" className="trg-toggle" onClick={() => setOpen(!open)} aria-expanded={open} data-tip={tip(lang, "autoReply")}>
          {open ? "▾" : "▸"} {ar(lang, "section")}
          {rules.length > 0 && <span className="trg-count">{ar(lang, "count", { a: enabledCount, b: rules.length })}</span>}
          {total > 0 && <span className="trg-total">{ar(lang, "total", { n: total.toLocaleString() })}</span>}
        </button>
        <label className={on ? "inline ars-on" : "inline"} data-tip={tip(lang, "autoReplyOn")}>
          <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} aria-label={`${ar(lang, "section")} ${ar(lang, "on")}`} /> {ar(lang, "on")}
        </label>
      </div>
      {on && inactiveNote && <div className="hint warn">{inactiveNote}</div>}
      {open && (
        <>
          <div className="hint">{inactiveNote ?? ar(lang, on ? "onNote" : "offNote")}</div>
          <div className="ars-opts">
            <label className="inline" data-tip={tip(lang, "matchStrip")}>
              <input type="checkbox" checked={opts.stripTerminator} onChange={(e) => setOpts({ ...opts, stripTerminator: e.target.checked })} /> {ar(lang, "matchStrip")}
            </label>
            <label className="inline" data-tip={tip(lang, "logNoMatch")}>
              <input type="checkbox" checked={opts.logNoMatch} onChange={(e) => setOpts({ ...opts, logNoMatch: e.target.checked })} /> {ar(lang, "logNoMatch")}
            </label>
            {total > 0 && (
              <button type="button" className="btn small ghost" data-tip={tip(lang, "resetHits")} onClick={() => api.resetHits().then(() => setHits({})).catch((e) => setErr(String(e)))}>
                {ar(lang, "resetHits")}
              </button>
            )}
          </div>
          <AutoReplyPanel lang={lang} rules={rules} setRules={setRules} hits={hits} toast={toast} api={api} compact expandAll={expandAll} />
          <div className="hint ars-sim">{ar(lang, "simNote")}</div>
        </>
      )}
      {err && <div className="error">{err}</div>}
    </div>
  );
}
