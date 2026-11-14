// 표시 필터 막대·위쪽 요약 띠·찾기 막대·Expert 패널
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { DEVICES } from "@shared/deviceData";
import { deviceName } from "@shared/devices";
import { api, type DevMapInfo, type Detail, type ExpertReply, type FieldDef, type FilterFail, type Summary } from "./api";
import type { Lang, TFn } from "./i18n";
import { appFilter, applyCompletion, bytesText, durationText, errorSegments, QUICK_FILTERS, rtText, slowTail, valueSuggestions, wordBefore, type Rt } from "./logic";

// ---------------------------------------------------------------- 필터 막대

export interface FilterBarProps {
  t: TFn;
  /** 지금 걸린 필터 */
  applied: string;
  history: string[];
  busy: boolean;
  /** 서버가 돌려준 오류(적용할 때) */
  applyError: FilterFail | null;
  outcome: { shown: number; total: number; ms: number } | null;
  /** 밖에서 넣어 준 글(우클릭 «필터로 적용»·요약 띠 단추) */
  injected: { text: string; n: number } | null;
  onApply: (text: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

type Check = { state: "empty" | "ok" | "bad"; error: FilterFail | null };

export function FilterBar(p: FilterBarProps) {
  const { t } = p;
  const [text, setText] = useState(p.applied);
  const [check, setCheck] = useState<Check>({ state: "empty", error: null });
  const [caret, setCaret] = useState(0);
  const [items, setItems] = useState<{ label: string; insert: string; desc: string; value: boolean }[]>([]);
  const [hi, setHi] = useState(-1);
  const [showHist, setShowHist] = useState(false);
  const [focus, setFocus] = useState(false);
  const histIdx = useRef(-1);

  useEffect(() => {
    if (p.injected) {
      setText(p.injected.text);
      p.onApply(p.injected.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.injected?.n]);

  // 입력 중 검사(바로 서버 문법 검사) + 자동 완성 후보
  useEffect(() => {
    let stale = false;
    const id = setTimeout(async () => {
      const c = await api.checkFilter(text).catch(() => null);
      if (stale || !c) return;
      setCheck({ state: c.empty ? "empty" : c.ok ? "ok" : "bad", error: c.error });
      const vs = valueSuggestions(text, caret);
      if (vs) {
        setItems(vs.values.map((v) => ({ label: v, insert: v, desc: vs.field, value: true })));
        setHi(-1);
        return;
      }
      const w = wordBefore(text, caret);
      if (!w || w.word.length < 1) {
        setItems([]);
        return;
      }
      const f: FieldDef[] = await api.complete(w.word, 12).catch(() => []);
      if (stale) return;
      setItems(f.filter((d) => d.name !== w.word).map((d) => ({ label: d.name, insert: d.name, desc: `${d.type} — ${d.desc}`, value: false })));
      setHi(-1);
    }, 100);
    return () => {
      stale = true;
      clearTimeout(id);
    };
  }, [text, caret]);

  const accept = (i: number) => {
    const it = items[i];
    if (!it) return;
    const el = p.inputRef.current;
    if (it.value) {
      const w = /("?[\w.:]*)$/.exec(text.slice(0, caret))!;
      const start = caret - w[1].length;
      const next = text.slice(0, start) + it.insert + text.slice(caret);
      setText(next);
      setCaret(start + it.insert.length);
      requestAnimationFrame(() => el?.setSelectionRange(start + it.insert.length, start + it.insert.length));
    } else {
      const r = applyCompletion(text, caret, it.insert);
      setText(r.text);
      setCaret(r.caret);
      requestAnimationFrame(() => el?.setSelectionRange(r.caret, r.caret));
    }
    setItems([]);
  };

  const keyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    const open = items.length > 0 && focus;
    if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setHi((h) => (e.key === "ArrowDown" ? (h + 1) % items.length : (h <= 0 ? items.length : h) - 1));
    } else if (open && e.key === "Tab") {
      e.preventDefault();
      accept(hi >= 0 ? hi : 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && hi >= 0) accept(hi);
      else {
        setItems([]);
        p.onApply(text);
      }
    } else if (e.key === "Escape") {
      if (items.length) {
        setItems([]);
        e.stopPropagation();
      } else if (showHist) setShowHist(false);
    } else if ((e.key === "ArrowUp" || e.key === "ArrowDown") && p.history.length) {
      e.preventDefault();
      histIdx.current = Math.max(-1, Math.min(p.history.length - 1, histIdx.current + (e.key === "ArrowUp" ? 1 : -1)));
      setText(histIdx.current < 0 ? "" : p.history[histIdx.current]);
    }
  };

  const err = check.error ?? (p.applyError && text === p.applied ? null : null);
  const segs = check.state === "bad" && check.error ? errorSegments(text, check.error.pos, check.error.len) : [{ text, bad: false }];
  const dirty = text.trim() !== p.applied.trim();
  const showErr = check.state === "bad" ? check.error : p.applyError;

  return (
    <div className="pk-filter">
      <div className="fb-row">
        <div className={`fb-input ${check.state}`}>
          <div className="mirror" aria-hidden>
            {segs.map((s, i) => (
              <span key={i} className={s.bad ? "bad" : "ok"}>
                {s.text}
              </span>
            ))}
          </div>
          <input
            ref={p.inputRef}
            value={text}
            spellCheck={false}
            autoComplete="off"
            placeholder={t("filterPh")}
            aria-label={t("filterLabel")}
            aria-invalid={check.state === "bad"}
            onChange={(e) => {
              setText(e.target.value);
              setCaret(e.target.selectionStart ?? e.target.value.length);
              histIdx.current = -1;
            }}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
            onKeyDown={keyDown}
            onFocus={() => setFocus(true)}
            onBlur={() => setTimeout(() => setFocus(false), 150)}
          />
          {focus && items.length > 0 && (
            <div className="fb-pop" role="listbox">
              {items.map((it, i) => (
                <div key={it.label} role="option" aria-selected={i === hi} className={`opt${i === hi ? " hi" : ""}`} onPointerDown={(e) => (e.preventDefault(), accept(i))}>
                  <span className="mono">{it.label}</span>
                  <span className="desc">{it.desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="btn small primary" disabled={check.state === "bad" || (!dirty && !p.busy)} onClick={() => p.onApply(text)} title={t("filterApplyTip")}>
          {t("filterApply")}
        </button>
        <button
          className="btn small"
          disabled={!text && !p.applied}
          onClick={() => {
            setText("");
            p.onApply("");
          }}
        >
          {t("filterClear")}
        </button>
        <span className="hist-wrap">
          <button className="btn small ghost" onClick={() => setShowHist((v) => !v)} aria-label={t("filterHistory")} title={t("filterHistory")} disabled={!p.history.length}>
            ▾
          </button>
          {showHist && (
            <div className="fb-pop hist" role="listbox">
              {p.history.map((h) => (
                <div
                  key={h}
                  className="opt"
                  role="option"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setText(h);
                    setShowHist(false);
                    p.onApply(h);
                  }}
                >
                  <span className="mono ellipsis">{h}</span>
                </div>
              ))}
            </div>
          )}
        </span>
        <span className="fb-chips">
          {QUICK_FILTERS.map((q) => (
            <button
              key={q.id}
              className={`chip${p.applied === q.expr ? " on" : ""}`}
              title={q.expr}
              onClick={() => {
                const next = p.applied === q.expr ? "" : q.expr;
                setText(next);
                p.onApply(next);
              }}
            >
              {t(`fb_${q.id}` as never)}
            </button>
          ))}
        </span>
      </div>
      <div className="fb-status" role="status">
        {showErr ? (
          <span className="fb-err">
            {showErr.message}
            {showErr.suggestions.length > 0 && (
              <span className="sug">
                {" "}
                {t("didYouMean")}{" "}
                {showErr.suggestions.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    className="chip small"
                    onClick={() => {
                      const w = wordBefore(text, showErr.pos + showErr.len);
                      const next = w ? text.slice(0, w.start) + s + text.slice(w.start + w.word.length) : text + s;
                      setText(next);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </span>
            )}
          </span>
        ) : p.busy ? (
          <span className="hint">{t("filtering")}</span>
        ) : p.outcome && p.applied ? (
          <span className="hint">{t("filterResult", { a: p.outcome.shown.toLocaleString(), b: p.outcome.total.toLocaleString(), ms: p.outcome.ms })}</span>
        ) : (
          <span className="hint">{err ? "" : t("filterHint")}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 요약 띠

function RtCells({ rt, t }: { rt: Rt; t: TFn }) {
  const slow = slowTail(rt);
  return (
    <span className="rtcells">
      <span title={t("rtMinTip")}>
        {t("rtMin")} <b>{rtText(rt.minNs)}</b>
      </span>
      <span title={t("rtMedTip")}>
        {t("rtMed")} <b>{rtText(rt.medianNs)}</b>
      </span>
      <span className={slow ? "slow" : ""} title={t("rtP95Tip")}>
        {t("rtP95")} <b>{rtText(rt.p95Ns)}</b>
      </span>
      <span title={t("rtMaxTip")}>
        {t("rtMax")} <b>{rtText(rt.maxNs)}</b>
      </span>
    </span>
  );
}

export interface SummaryProps {
  t: TFn;
  lang: Lang;
  file: { name: string; size: number; packets: number; format: string; truncated: boolean; openMs: number } | null;
  summary: Summary | null;
  analyzing: boolean;
  onFilter: (expr: string) => void;
  onRt: () => void;
  devInfo: DevMapInfo | null;
  onDevice: (id: string) => void;
  devId: string;
}

export function SummaryBar(p: SummaryProps) {
  const { t, summary: s } = p;
  const devs = useMemo(() => {
    const g = new Map<string, { id: string; label: string }[]>();
    for (const d of DEVICES) {
      const m = d.manufacturer[p.lang === "ko" ? "ko" : "en"];
      (g.get(m) ?? g.set(m, []).get(m)!).push({ id: d.id, label: deviceName(d, p.lang) });
    }
    return [...g.entries()];
  }, [p.lang]);
  if (!p.file) return null;
  return (
    <div className="pk-summary">
      <div className="sm-main">
        <span className="sm-item" title={t("smFileTip")}>
          <b className="ellipsis">{p.file.name}</b> <span className="muted">{bytesText(p.file.size)} · {p.file.format}</span>
        </span>
        <span className="sm-item">
          {t("smPackets")} <b>{p.file.packets.toLocaleString()}</b>
        </span>
        {s ? (
          <>
            <span className="sm-item">
              {t("smSpan")} <b>{durationText(s.durationNs)}</b>
            </span>
            <span className="sm-item">
              {t("smFlows")} <b>{s.flows.toLocaleString()}</b>
            </span>
          </>
        ) : (
          <span className="sm-item hint">{p.analyzing ? t("analyzing") : ""}</span>
        )}
        {p.file.truncated && <span className="sm-item warn">{t("truncated")}</span>}
        <span className="sm-spacer" />
        <label className="sm-dev" title={t("devTip")}>
          {t("devMap")}
          <select value={p.devId} onChange={(e) => p.onDevice(e.target.value)} aria-label={t("devMap")}>
            <option value="">{t("devNone")}</option>
            {devs.map(([m, list]) => (
              <optgroup key={m} label={m}>
                {list.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {p.devInfo && <span className="muted"> {t("devEntries", { n: p.devInfo.entries })}</span>}
        </label>
        <button className="btn small" onClick={p.onRt} disabled={!s || s.overall.pairs === 0} title={t("rtDistTip")}>
          {t("rtDist")}
        </button>
      </div>
      {s && s.apps.length === 0 && <div className="sm-apps hint">{t("noIndustrial")}</div>}
      {s && s.apps.length > 0 && (
        <div className="sm-apps">
          {s.apps.map((a) => (
            <div className="sm-app" key={a.filter}>
              <button className={`app-name c-${a.key}`} onClick={() => p.onFilter(appFilter(a.filter, "all"))} title={t("clickFilter")}>
                {a.name}
              </button>
              <span className="muted">{t("pairs", { n: a.rt.pairs })}</span>
              <RtCells rt={a.rt} t={t} />
              <button className={`stat${a.rt.noResponse ? " bad" : ""}`} disabled={!a.rt.noResponse} onClick={() => p.onFilter(appFilter(a.filter, "noresp"))} title={t("clickFilter")}>
                {t("noRespN", { n: a.rt.noResponse })}
              </button>
              <button className={`stat${a.rt.exceptions ? " bad" : ""}`} disabled={!a.rt.exceptions} onClick={() => p.onFilter(appFilter(a.filter, "exception"))} title={t("clickFilter")}>
                {t("excN", { n: a.rt.exceptions })}
              </button>
              {a.rt.pending > 0 && <span className="muted">{t("pendingN", { n: a.rt.pending })}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- 찾기 막대

export function FindBar({ t, onClose, onFind, message }: { t: TFn; onClose: () => void; onFind: (kind: string, text: string, forward: boolean) => void; message: string }) {
  const [kind, setKind] = useState("text");
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="pk-find" role="search">
      <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label={t("findKind")}>
        <option value="text">{t("findText")}</option>
        <option value="hex">{t("findHex")}</option>
        <option value="filter">{t("findFilter")}</option>
      </select>
      <input
        ref={ref}
        value={text}
        className="mono"
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Enter") onFind(kind, text, !e.shiftKey);
          if (e.key === "Escape") onClose();
        }}
        placeholder={kind === "hex" ? "00 01 ff" : kind === "filter" ? "modbus.func_code == 16" : t("findPh")}
        aria-label={t("find")}
      />
      <button className="btn small" onClick={() => onFind(kind, text, false)} disabled={!text}>
        ◀ {t("findPrev")}
      </button>
      <button className="btn small primary" onClick={() => onFind(kind, text, true)} disabled={!text}>
        {t("findNext")} ▶
      </button>
      <span className="hint">{message}</span>
      <button className="icon-btn" onClick={onClose} aria-label={t("close")}>
        ✕
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- Expert 패널

export function ExpertPanel({ t, detail, data, onFilter, onGoto }: { t: TFn; detail: Detail | null; data: ExpertReply | null; onFilter: (expr: string) => void; onGoto: (frame: number) => void }) {
  const [key, setKey] = useState<string | null>(null);
  const cur = data?.groups.find((g) => g.key === key) ?? null;
  const mine = detail?.experts ?? [];
  const rows = useMemo(() => (data && key ? data.rows.filter((r) => r.key === key).slice(0, 500) : []), [data, key]);
  const sev = (s: string) => <span className={`sev ${s}`}>{t(`sev_${s}` as never)}</span>;
  const box = (e: { title: string; meaning: string; next: string; codeName: string | null; codeCause: string | null; codeCheck: string | null }) => (
    <div className="ex-explain">
      <h4>{e.title}</h4>
      {e.codeName && (
        <p>
          <b>{e.codeName}</b>
        </p>
      )}
      <p>{e.meaning}</p>
      {e.codeCause && (
        <p>
          <b>{t("exCause")}</b> {e.codeCause}
        </p>
      )}
      {e.codeCheck && (
        <p>
          <b>{t("exCheck")}</b> {e.codeCheck}
        </p>
      )}
      <p>
        <b>{t("exNext")}</b> {e.next}
      </p>
    </div>
  );
  return (
    <div className="pk-expert">
      <div className="ex-left">
        <div className="ex-title">{t("exAll", { n: data?.total ?? 0 })}</div>
        {!data?.ready && <div className="hint pad">{t("analyzing")}</div>}
        {data?.ready && data.groups.length === 0 && <div className="hint pad">{t("exNone")}</div>}
        <div className="ex-groups">
          {data?.groups.map((g) => (
            <div key={g.key} className={`ex-g${g.key === key ? " sel" : ""}`} onClick={() => setKey(g.key)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setKey(g.key)}>
              {sev(g.severity)}
              <span className="ellipsis">{g.explain?.title ?? g.key}</span>
              <b>{g.count.toLocaleString()}</b>
              <button
                className="chip small"
                onClick={(e) => {
                  e.stopPropagation();
                  onFilter(`expert.key == "${g.key}"`);
                }}
                title={t("exFilterTip")}
              >
                {t("exFilter")}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="ex-mid">
        {cur ? (
          <>
            {cur.explain && box({ ...cur.explain, codeName: null, codeCause: null, codeCheck: null })}
            <div className="ex-rows">
              {rows.map((r, i) => (
                <div key={i} className="ex-row" onClick={() => onGoto(r.frame)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onGoto(r.frame)}>
                  <span className="num">#{r.frame}</span>
                  <span className="ellipsis">{r.text}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="hint pad">{t("exPick")}</div>
        )}
      </div>
      <div className="ex-right">
        <div className="ex-title">{t("exThis")}</div>
        {mine.length === 0 && <div className="hint pad">{detail ? t("exThisNone") : t("treeEmpty")}</div>}
        {mine.map((e, i) => (
          <div key={i} className="ex-mine">
            <div>
              {sev(e.severity)} <span>{e.text}</span>
            </div>
            {e.explain && box(e.explain)}
          </div>
        ))}
      </div>
    </div>
  );
}
