// 자동응답 규칙 편집 — Simulator(가운데 넓은 칸)와 Serial·TCP·UDP(오른쪽 좁은 칸 «자동응답»)가 함께 쓴다.
// 위에서부터 처음 맞는 하나만 답한다. 바꾸면 실행 중에도 바로 적용. 규칙마다 «자세히» 에 장애 흉내·응답 돌리기·미리보기.
import { useEffect, useRef, useState } from "react";
import { CHECKSUMS, hex } from "./format";
import { NumInput } from "./NumInput";
import { tip } from "./tips";
import { duplicateNames, duplicatePatterns, shadowedRules } from "./interlocks";
import { convertNotation } from "./notation";
import type { ToastApi } from "./Toast";
import { ui, type Lang } from "./uiText";
import { ar, INSERTS } from "./autoReplyText";
import { blankRule, exampleRule, faultSummary, wildChars, type AutoRule, type ExampleKind, type ReplySpec, type RulePreview, type TextMode } from "./autoReply";
import type { AutoReplyApi } from "./autoReplyApi";
import "./autoreply.css";

type SetRules = (r: AutoRule[] | ((cur: AutoRule[]) => AutoRule[])) => void;

/** 템플릿 자리 «{req 0..1}» 등(백엔드 autoreply::Template 과 같은 이름들) */
const PLACE_RE = /(\{(?:req|counter|rand|time|unix|crc)(?: [^}]*)?\})/;
const PLACE_START = /\{(?=(?:req|counter|rand|time|unix|crc)[ }])/g;

/** 응답 한 줄 — HEX/ASCII · 본문 · 자리 넣기 · 체크섬 · 줄 끝 */
function ReplyRow({
  lang,
  spec,
  onChange,
  onMode,
  label,
  extra,
}: {
  lang: Lang;
  spec: ReplySpec;
  onChange: (s: ReplySpec) => void;
  onMode: (m: TextMode) => void;
  label: string;
  extra?: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  /** 커서 자리에 템플릿 자리를 넣는다(HEX 면 앞뒤 띄어 쓰기) */
  const insert = (place: string) => {
    const el = input.current;
    const text = spec.text;
    const at = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? at;
    const sp = spec.mode === "hex";
    const before = text.slice(0, at);
    const after = text.slice(end);
    const ins = (sp && before && !/\s$/.test(before) ? " " : "") + place + (sp && after && !/^\s/.test(after) ? " " : "");
    onChange({ ...spec, text: before + ins + after });
    requestAnimationFrame(() => {
      el?.focus();
      const pos = before.length + ins.length;
      el?.setSelectionRange(pos, pos);
    });
  };
  return (
    <div className="arrow wrap">
      <span className="arlbl" data-tip={tip(lang, "arReply")}>
        {label}
      </span>
      <select value={spec.mode} onChange={(e) => onMode(e.target.value as TextMode)} data-tip={ui(lang, "sendModeTip")} aria-label="HEX / ASCII">
        <option value="hex">HEX</option>
        <option value="ascii">ASCII</option>
      </select>
      <input
        ref={input}
        className="mono grow arreply"
        value={spec.text}
        placeholder={spec.mode === "hex" ? "01 03 02 00 64" : "OK"}
        aria-label={label}
        data-tip={tip(lang, "arTemplate")}
        spellCheck={false}
        onChange={(e) => onChange({ ...spec, text: e.target.value })}
      />
      <select
        className="arins"
        value=""
        aria-label={ar(lang, "insert")}
        data-tip={tip(lang, "arInsert")}
        onChange={(e) => {
          if (e.target.value) insert(e.target.value);
        }}
      >
        <option value="">{"{…}"}</option>
        {INSERTS.map(([v, k]) => (
          <option key={v} value={v}>
            {ar(lang, k)}
          </option>
        ))}
      </select>
      <select
        value={spec.checksum === "crc" ? "" : (spec.checksum ?? "")}
        aria-label={ar(lang, "checksum")}
        data-tip={tip(lang, "checksum")}
        onChange={(e) => onChange({ ...spec, checksum: (e.target.value || null) as ReplySpec["checksum"] })}
      >
        <option value="">
          {ar(lang, "checksum")}: {ar(lang, "none")}
        </option>
        {CHECKSUMS.map((c) => (
          <option key={c.kind} value={c.kind}>
            {c.label}
          </option>
        ))}
      </select>
      <select value={spec.suffix} aria-label={ar(lang, "suffix")} data-tip={tip(lang, "suffix")} onChange={(e) => onChange({ ...spec, suffix: e.target.value })}>
        <option value="">
          {ar(lang, "suffix")}: {ar(lang, "none")}
        </option>
        <option value="\r">CR</option>
        <option value="\n">LF</option>
        <option value="\r\n">CR LF</option>
      </select>
      {extra}
    </div>
  );
}

/** 규칙 하나의 «자세히» — 지연 범위·N번째·확률·응답 돌리기·예시 요청 미리보기 */
function RuleMore({
  lang,
  rule,
  update,
  api,
  replyMode,
}: {
  lang: Lang;
  rule: AutoRule;
  update: (p: Partial<AutoRule>) => void;
  api: AutoReplyApi;
  replyMode: (spec: ReplySpec, m: TextMode) => ReplySpec;
}) {
  const [pv, setPv] = useState<{ p: RulePreview | null; err: string | null }>({ p: null, err: null });
  const more = rule.moreReplies ?? [];
  const sample = rule.sample ?? "";
  // 규칙·예시가 바뀌면 잠깐 기다렸다 미리보기
  const key = JSON.stringify(rule);
  useEffect(() => {
    let stale = false;
    const id = setTimeout(() => {
      api
        .previewRule(rule, sample)
        .then((p) => !stale && setPv({ p, err: null }))
        .catch((e) => !stale && setPv({ p: null, err: String(e) }));
    }, 250);
    return () => {
      stale = true;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const setMore = (i: number, s: ReplySpec) => update({ moreReplies: more.map((x, j) => (j === i ? s : x)) });
  return (
    <div className="armore">
      <div className="arrow wrap">
        <b className="arlbl" data-tip={tip(lang, "arFaults")}>
          {ar(lang, "faults")}
        </b>
        <span className="arlbl" data-tip={tip(lang, "arDelayRange")}>
          {ar(lang, "delayRange")}
        </span>
        <NumInput className="num" min={0} max={600000} value={rule.delayMs} onValue={(n) => update({ delayMs: n })} aria-label={ar(lang, "delay")} />
        <span className="arlbl">{ar(lang, "delayTo")}</span>
        <NumInput className="num" min={0} max={600000} value={rule.delayMaxMs ?? 0} onValue={(n) => update({ delayMaxMs: n })} aria-label={`${ar(lang, "delayRange")} max`} />
        <span className="arlbl">ms</span>
      </div>
      <div className="arrow wrap">
        <label className="inline" data-tip={tip(lang, "arDropEvery")}>
          <NumInput className="num small-num" min={0} max={1000000} value={rule.dropEvery ?? 0} onValue={(n) => update({ dropEvery: n })} aria-label={ar(lang, "dropEvery")} />
          <span className="arlbl">{ar(lang, "dropEvery")}</span>
        </label>
        <label className="inline" data-tip={tip(lang, "arDropPct")}>
          <NumInput className="num small-num" min={0} max={100} value={rule.dropPct ?? 0} onValue={(n) => update({ dropPct: n })} aria-label={ar(lang, "dropPct")} />
          <span className="arlbl">{ar(lang, "dropPct")}</span>
        </label>
      </div>
      <div className="arrow wrap">
        <b className="arlbl" data-tip={tip(lang, "arReplies")}>
          {ar(lang, "replies")}
        </b>
        {more.length > 0 && (
          <label className="inline" data-tip={tip(lang, "arOrder")}>
            <span className="arlbl">{ar(lang, "order")}</span>
            <select value={rule.replyOrder ?? "sequence"} onChange={(e) => update({ replyOrder: e.target.value as AutoRule["replyOrder"] })} aria-label={ar(lang, "order")}>
              <option value="sequence">{ar(lang, "orderSeq")}</option>
              <option value="random">{ar(lang, "orderRand")}</option>
            </select>
          </label>
        )}
        <button
          type="button"
          className="btn small"
          data-tip={tip(lang, "arReplies")}
          onClick={() => update({ moreReplies: [...more, { ...rule.reply }] })}
        >
          {ar(lang, "addReply")}
        </button>
      </div>
      {more.map((s, i) => (
        <ReplyRow
          key={i}
          lang={lang}
          spec={s}
          label={ar(lang, "replyN", { n: i + 2 })}
          onChange={(x) => setMore(i, x)}
          onMode={(m) => setMore(i, replyMode(s, m))}
          extra={
            <button type="button" className="btn small ghost" aria-label={ar(lang, "delReply")} data-tip={ar(lang, "delReply")} onClick={() => update({ moreReplies: more.filter((_, j) => j !== i) })}>
              ✕
            </button>
          }
        />
      ))}
      <div className="arrow wrap">
        <span className="arlbl" data-tip={tip(lang, "arSample")}>
          {ar(lang, "sample")}
        </span>
        <span className="arlbl">{rule.patternMode.toUpperCase()}</span>
        <input
          className="mono grow arsample"
          value={sample}
          placeholder={ar(lang, "samplePh")}
          aria-label={ar(lang, "sample")}
          spellCheck={false}
          onChange={(e) => update({ sample: e.target.value })}
        />
        {pv.p?.matches != null && <span className={pv.p.matches ? "hint ok" : "hint warn"}>{ar(lang, pv.p.matches ? "sampleMatch" : "sampleNoMatch")}</span>}
      </div>
      {pv.err && <div className="arerr">{pv.err}</div>}
      {pv.p && (
        <div className="arpreview mono">
          {pv.p.replies.map((r, i) => (
            <div key={i} className={r.error ? "arerr" : undefined}>
              <span className="arlbl">{ar(lang, "previewOf", { n: i + 1 })}:</span> {r.error ?? `${hex(r.bytes ?? [])} (${(r.bytes ?? []).length})`}
            </div>
          ))}
          {pv.p.dynamic && <div className="hint">{ar(lang, "previewDyn")}</div>}
        </div>
      )}
    </div>
  );
}

/** 규칙 목록. `compact` 는 오른쪽 좁은 칸(Serial·TCP·UDP)용 — 줄을 더 접는다 */
export function AutoReplyPanel({
  lang,
  rules,
  setRules,
  hits,
  toast,
  api,
  compact = false,
}: {
  lang: Lang;
  rules: AutoRule[];
  setRules: SetRules;
  hits: Record<string, number>;
  toast: ToastApi;
  api: AutoReplyApi;
  compact?: boolean;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<number | null>(null);
  // 틀려서 빠진 규칙(번호 → 이유). 나머지 규칙은 그대로 동작한다
  const [invalid, setInvalid] = useState<Record<number, string>>({});
  // «자세히» 를 펼친 규칙(번호)
  const [open, setOpen] = useState<Record<number, boolean>>({});

  // 미리보기 예시(sample)만 바뀐 것은 백엔드에 다시 보내지 않는다
  const wireKey = JSON.stringify(rules.map(({ sample: _s, ...r }) => r));
  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        const r = await api.setRules(rules);
        setActive(r.active);
        setInvalid(Object.fromEntries(r.errors.map((x) => [x.index, x.message])));
        setErr(null);
      } catch (e) {
        setErr(String(e));
        setActive(null);
        setInvalid({});
      }
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wireKey]);

  // 인터락: 무엇이든 맞는 규칙 아래는 영영 답하지 않음 · 같은 이름은 응답 횟수가 섞임 · 같은 패턴이 위에 있음
  const shadow = shadowedRules(rules);
  const dups = duplicateNames(rules);
  const dupPat = duplicatePatterns(rules);
  const update = (i: number, patch: Partial<AutoRule>) => setRules((cur) => cur.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  /** 지우기 — 확인 창 대신 5초 «되돌리기»(같은 자리로 돌아온다) */
  const remove = (i: number) => {
    const r = rules[i];
    setRules(rules.filter((_, j) => j !== i));
    setOpen({});
    toast.show(ui(lang, "deletedRule", { a: r.name }), {
      undo: () => setRules((cur) => [...cur.slice(0, Math.min(i, cur.length)), r, ...cur.slice(Math.min(i, cur.length))]),
    });
  };
  /** 응답 HEX ↔ ASCII — 같은 바이트의 새 표기로(템플릿 자리는 그대로 두고 나머지만). 못 바꾸면 글자는 그대로 두고 이유를 알린다 */
  const replyMode = (s: ReplySpec, mode: TextMode): ReplySpec => {
    if (s.mode === mode) return s;
    // 홀수 칸 = 템플릿 자리(그대로), 짝수 칸 = 글자(같은 바이트의 새 표기로)
    const parts = s.text.split(PLACE_RE);
    let failed: string | null = null;
    const out = parts.map((p, i) => {
      if (i % 2 === 1) return p;
      if (s.mode === "hex" && !p.trim()) return "";
      const c = convertNotation(p, s.mode, mode, lang);
      if (c.error) failed = c.error;
      // HEX → ASCII 로 바꾼 글자가 우연히 «{req …}» 처럼 읽히지 않게 { 는 \x7B 로
      return mode === "ascii" ? c.text.replace(PLACE_START, "\\x7B") : c.text;
    });
    if (failed) {
      toast.show(ui(lang, "convFail", { b: mode.toUpperCase(), e: failed }), { error: true, ms: 5000 });
      return { ...s, mode };
    }
    return { ...s, mode, text: mode === "hex" ? out.filter((x) => x.trim()).join(" ") : out.join("") };
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= rules.length) return;
    const next = rules.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setRules(next);
    setOpen((o) => ({ ...o, [i]: !!o[j], [j]: !!o[i] }));
  };
  // 새 규칙은 직전 규칙의 방식(HEX/ASCII·정확히/포함·응답 형식·줄 끝)을 물려받는다
  const add = () => {
    setRules([...rules, blankRule(rules.length + 1, rules[rules.length - 1])]);
    const i = rules.length;
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`.arcard[data-i="${i}"] .arpat`)?.focus());
  };
  /** 빈 화면 예제 — 규칙 하나를 채워 넣고 «자세히»(예시 요청 미리보기)를 펼친다 */
  const addExample = (k: ExampleKind) => {
    setRules([...rules, exampleRule(k)]);
    setOpen({ [rules.length]: true });
  };

  return (
    <div className={compact ? "ar compact" : "ar"}>
      {rules.length === 0 && (
        <div className="empty-guide">
          {ar(lang, "noRules")}
          <div className="arexamples" data-tip={tip(lang, "arExamples")}>
            <span className="arlbl">{ar(lang, "examples")}</span>
            <button type="button" className="btn small arex-modbus" onClick={() => addExample("modbus")}>
              {ar(lang, "exModbus")}
            </button>
            <button type="button" className="btn small arex-scpi" onClick={() => addExample("scpi")}>
              {ar(lang, "exScpi")}
            </button>
            <button type="button" className="btn small arex-echo" onClick={() => addExample("echo")}>
              {ar(lang, "exEcho")}
            </button>
          </div>
        </div>
      )}
      {rules.map((r, i) => {
        const f = faultSummary(r);
        const badges = [
          f.delay && ar(lang, "badgeDelay", { a: f.delay[0], b: f.delay[1] }),
          f.every > 0 && ar(lang, "badgeEvery", { n: f.every }),
          f.pct > 0 && ar(lang, "badgePct", { p: f.pct }),
          f.replies > 1 && ar(lang, "badgeReplies", { n: f.replies, a: ar(lang, f.random ? "orderRand" : "orderSeq") }),
        ].filter(Boolean) as string[];
        return (
          <div key={i} data-i={i} className={`arcard${r.enabled ? "" : " off"}${invalid[i] ? " bad" : ""}`}>
            <div className="arrow">
              <input type="checkbox" checked={r.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} aria-label={ar(lang, "enabled")} title={ar(lang, "enabled")} />
              <input className="arname" value={r.name} aria-label={ar(lang, "name")} onChange={(e) => update(i, { name: e.target.value })} />
              <span className="hits" data-tip={tip(lang, "hits")}>
                {hits[r.name] ?? 0}
              </span>
              <button data-tip={tip(lang, "moveUp")} className="btn small ghost" onClick={() => move(i, -1)} aria-label={ar(lang, "moveUp")} disabled={i === 0}>
                ↑
              </button>
              <button data-tip={tip(lang, "moveDown")} className="btn small ghost" onClick={() => move(i, 1)} aria-label={ar(lang, "moveDown")} disabled={i === rules.length - 1}>
                ↓
              </button>
              <button className="btn small ghost" data-tip={ui(lang, "cmdDelTip")} aria-label={ar(lang, "delete")} onClick={() => remove(i)}>
                ✕
              </button>
            </div>
            <div className="arrow wrap">
              <span className="arlbl" data-tip={tip(lang, "arWhen")}>
                {ar(lang, "when")}
              </span>
              <select value={r.patternMode} onChange={(e) => update(i, { patternMode: e.target.value as TextMode })} aria-label={`${ar(lang, "when")} HEX / ASCII`}>
                <option value="hex">HEX</option>
                <option value="ascii">ASCII</option>
              </select>
              <select data-tip={tip(lang, r.kind === "exact" ? "arExact" : "arContains")} value={r.kind} onChange={(e) => update(i, { kind: e.target.value as AutoRule["kind"] })} aria-label={`${ar(lang, "exact")} / ${ar(lang, "contains")}`}>
                <option value="exact">{ar(lang, "exact")}</option>
                <option value="contains">{ar(lang, "contains")}</option>
              </select>
              <input
                className="mono grow arpat"
                value={r.pattern}
                spellCheck={false}
                aria-label={ar(lang, "when")}
                placeholder={r.patternMode === "hex" ? "01 03 ?? ?? 00 0A **" : (r.wild ?? true) ? "READ?*" : "*IDN?"}
                onChange={(e) => update(i, { pattern: e.target.value })}
              />
              {r.patternMode === "ascii" && (
                <label className="inline arwild" data-tip={tip(lang, "arWild")}>
                  <input type="checkbox" checked={r.wild ?? true} onChange={(e) => update(i, { wild: e.target.checked })} /> {ar(lang, "wild")}
                </label>
              )}
            </div>
            {wildChars(r) && (
              <div className="hint warn arwild-note">
                <span>{ar(lang, "wildOn")}</span>
                <button type="button" className="btn small" onClick={() => update(i, { wild: false })}>
                  {ar(lang, "wildOff")}
                </button>
              </div>
            )}
            <ReplyRow
              lang={lang}
              spec={r.reply}
              label={ar(lang, "reply")}
              onChange={(s) => update(i, { reply: s })}
              onMode={(m) => update(i, { reply: replyMode(r.reply, m) })}
              extra={
                <>
                  <span className="arlbl" data-tip={tip(lang, "arDelay")}>
                    {ar(lang, "delay")}
                  </span>
                  <NumInput className="num" min={0} max={600000} value={r.delayMs} onValue={(n) => update(i, { delayMs: n })} aria-label={ar(lang, "delay")} />
                  <span className="arlbl">ms</span>
                </>
              }
            />
            <div className="arrow wrap">
              <button
                type="button"
                className="btn small ghost armore-btn"
                aria-expanded={!!open[i]}
                data-tip={tip(lang, "arMore")}
                onClick={() => setOpen((o) => ({ ...o, [i]: !o[i] }))}
              >
                {open[i] ? "▾" : "▸"} {ar(lang, open[i] ? "less" : "more")}
              </button>
              {badges.map((b) => (
                <span key={b} className="arbadge">
                  {b}
                </span>
              ))}
            </div>
            {open[i] && <RuleMore lang={lang} rule={r} update={(p) => update(i, p)} api={api} replyMode={replyMode} />}
            {invalid[i] && <div className="arerr">{ar(lang, "invalid", { a: invalid[i] })}</div>}
          </div>
        );
      })}
      <div className="arrow wrap">
        <button data-tip={tip(lang, "arAdd")} className="btn small" onClick={add}>
          + {ar(lang, "add")}
        </button>
        {active != null && <span className="hint ok">{ar(lang, "active", { n: active })}</span>}
        {Object.keys(invalid).length > 0 && <span className="hint warn">{ar(lang, "skipped", { n: Object.keys(invalid).length })}</span>}
      </div>
      {shadow.by && shadow.names.length > 0 && <div className="interlock">{ar(lang, "ilShadow", { a: shadow.by, b: shadow.names.join(", ") })}</div>}
      {dups.length > 0 && <div className="interlock">{ar(lang, "ilDup", { a: dups.join(", ") })}</div>}
      {dupPat.length > 0 && <div className="interlock">{ar(lang, "ilDupPat", { a: dupPat.join(", ") })}</div>}
      <details className="ar-syntax">
        <summary className="hint">{ar(lang, "syntaxTitle")}</summary>
        <div className="hint">{ar(lang, "help")}</div>
      </details>
      {err && <div className="error">{err}</div>}
    </div>
  );
}
