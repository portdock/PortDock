import { useEffect, useState } from "react";
import { api, CHECKSUMS, type AutoRule, type ChecksumKind, type TextMode } from "./api";
import type { Key } from "./i18n";
import { NumInput } from "@shared/NumInput";
import { tip } from "@shared/tips";
import { duplicateNames, duplicatePatterns, shadowedRules } from "@shared/interlocks";
import { convertNotation } from "@shared/notation";
import type { ToastApi } from "@shared/Toast";
import { ui } from "@shared/uiText";

const blank = (n: number): AutoRule => ({
  name: `rule ${n}`,
  enabled: true,
  pattern: "",
  patternMode: "hex",
  kind: "exact",
  reply: { text: "", mode: "hex", checksum: null, suffix: "" },
  delayMs: 0,
});

/** 응답 규칙 편집. 위에서부터 처음 맞는 하나만 답한다. 바꾸면 실행 중에도 바로 적용. */
export function AutoReply({
  rules,
  setRules,
  hits,
  t,
  toast,
}: {
  rules: AutoRule[];
  setRules: (r: AutoRule[] | ((cur: AutoRule[]) => AutoRule[])) => void;
  hits: Record<string, number>;
  t: (k: Key) => string;
  toast: ToastApi;
}) {
  const [err, setErr] = useState<string | null>(null);
  // 말풍선 언어 — 화면 문구로 판단
  const lang: "ko" | "en" = t("arWhen") === "When" ? "en" : "ko";
  const [active, setActive] = useState<number | null>(null);
  // 틀려서 빠진 규칙(번호 → 이유). 나머지 규칙은 그대로 동작한다
  const [invalid, setInvalid] = useState<Record<number, string>>({});

  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        const r = await api.setRules(rules);
        // 예전 백엔드는 숫자만 돌려준다
        if (typeof r === "number") {
          setActive(r);
          setInvalid({});
        } else {
          setActive(r.active);
          setInvalid(Object.fromEntries(r.errors.map((x) => [x.index, x.message])));
        }
        setErr(null);
      } catch (e) {
        setErr(String(e));
        setActive(null);
        setInvalid({});
      }
    }, 300);
    return () => clearTimeout(id);
  }, [rules]);

  // 인터락: 무엇이든 맞는 규칙 아래는 영영 답하지 않음 · 같은 이름은 응답 횟수가 섞임
  const shadow = shadowedRules(rules);
  const dups = duplicateNames(rules);
  // 같은 패턴이 위에 있으면 아래 것은 답하지 않는다
  const dupPat = duplicatePatterns(rules);
  const update = (i: number, patch: Partial<AutoRule>) => setRules(rules.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  /** 지우기 — 확인 창 대신 5초 «되돌리기»(같은 자리로 돌아온다) */
  const remove = (i: number) => {
    const r = rules[i];
    setRules(rules.filter((_, j) => j !== i));
    toast.show(ui(lang, "deletedRule", { a: r.name }), {
      undo: () => setRules((cur) => [...cur.slice(0, Math.min(i, cur.length)), r, ...cur.slice(Math.min(i, cur.length))]),
    });
  };
  /** 응답 HEX ↔ ASCII — 같은 바이트의 새 표기로. 못 바꾸면 글자는 그대로 두고 이유를 알린다 */
  const replyMode = (i: number, mode: TextMode) => {
    const r = rules[i];
    const c = convertNotation(r.reply.text, r.reply.mode, mode, lang);
    update(i, { reply: { ...r.reply, mode, text: c.text } });
    if (c.error) toast.show(ui(lang, "convFail", { b: mode.toUpperCase(), e: c.error }), { error: true, ms: 5000 });
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= rules.length) return;
    const next = rules.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setRules(next);
  };

  return (
    <div className="ar">
      {rules.length === 0 && <div className="empty-guide">{t("noRules")}</div>}
      {rules.map((r, i) => (
        <div key={i} className={`arcard${r.enabled ? "" : " off"}${invalid[i] ? " bad" : ""}`}>
          <div className="arrow">
            <input type="checkbox" checked={r.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} />
            <input className="arname" value={r.name} onChange={(e) => update(i, { name: e.target.value })} />
            <span className="hits" data-tip={tip(lang, "hits")}>
              {hits[r.name] ?? 0}
            </span>
            <button data-tip={tip(lang, "moveUp")} className="btn small ghost" onClick={() => move(i, -1)} title={t("moveUp")} aria-label={t("moveUp")}>
              ↑
            </button>
            <button data-tip={tip(lang, "moveDown")} className="btn small ghost" onClick={() => move(i, 1)} title={t("moveDown")} aria-label={t("moveDown")}>
              ↓
            </button>
            <button className="btn small ghost" data-tip={ui(lang, "cmdDelTip")} aria-label={t("delete")} onClick={() => remove(i)}>
              ✕
            </button>
          </div>
          <div className="arrow">
            <span className="arlbl" data-tip={tip(lang, "arWhen")}>{t("arWhen")}</span>
            <select value={r.patternMode} onChange={(e) => update(i, { patternMode: e.target.value as TextMode })}>
              <option value="hex">HEX</option>
              <option value="ascii">ASCII</option>
            </select>
            <select data-tip={tip(lang, r.kind === "exact" ? "arExact" : "arContains")} value={r.kind} onChange={(e) => update(i, { kind: e.target.value as AutoRule["kind"] })}>
              <option value="exact">{t("arExact")}</option>
              <option value="contains">{t("arContains")}</option>
            </select>
            <input
              className="mono grow"
              value={r.pattern}
              placeholder={r.patternMode === "hex" ? "01 03 ?? ?? 00 0A **" : "READ?*\\r"}
              onChange={(e) => update(i, { pattern: e.target.value })}
            />
          </div>
          <div className="arrow">
            <span className="arlbl" data-tip={tip(lang, "arReply")}>{t("arReply")}</span>
            <select value={r.reply.mode} onChange={(e) => replyMode(i, e.target.value as TextMode)} data-tip={ui(lang, "sendModeTip")} aria-label="HEX / ASCII">
              <option value="hex">HEX</option>
              <option value="ascii">ASCII</option>
            </select>
            <input
              className="mono grow"
              value={r.reply.text}
              placeholder={r.reply.mode === "hex" ? "01 03 02 00 64" : "OK"}
              onChange={(e) => update(i, { reply: { ...r.reply, text: e.target.value } })}
            />
            <select
              value={r.reply.checksum ?? ""}
              onChange={(e) => update(i, { reply: { ...r.reply, checksum: (e.target.value || null) as ChecksumKind | null } })}
            >
              <option value="">{t("checksum")}: {t("none")}</option>
              {CHECKSUMS.map((c) => (
                <option key={c.kind} value={c.kind}>
                  {c.label}
                </option>
              ))}
            </select>
            <select value={r.reply.suffix} onChange={(e) => update(i, { reply: { ...r.reply, suffix: e.target.value } })}>
              <option value="">{t("suffix")}: {t("none")}</option>
              <option value="\r">CR</option>
              <option value="\n">LF</option>
              <option value="\r\n">CR LF</option>
            </select>
            <span className="arlbl" data-tip={tip(lang, "arDelay")}>{t("arDelay")}</span>
            <NumInput className="num" min={0} max={600000} value={r.delayMs} onValue={(n) => update(i, { delayMs: n })} />
            <span className="arlbl">ms</span>
          </div>
          {invalid[i] && <div className="arerr">{t("arInvalid").replace("{a}", invalid[i])}</div>}
        </div>
      ))}
      <div className="arrow">
        <button data-tip={tip(lang, "arAdd")} className="btn small" onClick={() => setRules([...rules, blank(rules.length + 1)])}>
          + {t("arAdd")}
        </button>
        {active != null && <span className="hint ok">{t("arActive").replace("{n}", String(active))}</span>}
        {Object.keys(invalid).length > 0 && <span className="hint warn">{t("arSkipped").replace("{n}", String(Object.keys(invalid).length))}</span>}
      </div>
      {shadow.by && shadow.names.length > 0 && (
        <div className="interlock">{t("ilShadow").replace("{a}", shadow.by).replace("{b}", shadow.names.join(", "))}</div>
      )}
      {dups.length > 0 && <div className="interlock">{t("ilDup").replace("{a}", dups.join(", "))}</div>}
      {dupPat.length > 0 && <div className="interlock">{t("ilDupPat").replace("{a}", dupPat.join(", "))}</div>}
      <div className="hint">{t("arHelp")}</div>
      {err && <div className="error">{err}</div>}
    </div>
  );
}
