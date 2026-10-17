import { useEffect, useState } from "react";
import { api, CHECKSUMS, type AutoRule, type ChecksumKind, type TextMode } from "./api";
import type { Key } from "./i18n";

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
}: {
  rules: AutoRule[];
  setRules: (r: AutoRule[]) => void;
  hits: Record<string, number>;
  t: (k: Key) => string;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        setActive(await api.setRules(rules));
        setErr(null);
      } catch (e) {
        setErr(String(e));
        setActive(null);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [rules]);

  const update = (i: number, patch: Partial<AutoRule>) => setRules(rules.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= rules.length) return;
    const next = rules.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setRules(next);
  };

  return (
    <div className="ar">
      {rules.map((r, i) => (
        <div key={i} className={r.enabled ? "arcard" : "arcard off"}>
          <div className="arrow">
            <input type="checkbox" checked={r.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} />
            <input className="arname" value={r.name} onChange={(e) => update(i, { name: e.target.value })} />
            <span className="hits" title={t("hits")}>
              {hits[r.name] ?? 0}
            </span>
            <button className="btn small ghost" onClick={() => move(i, -1)} title="↑">
              ↑
            </button>
            <button className="btn small ghost" onClick={() => move(i, 1)} title="↓">
              ↓
            </button>
            <button className="btn small ghost" title={t("delete")} onClick={() => setRules(rules.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
          <div className="arrow">
            <span className="arlbl">{t("arWhen")}</span>
            <select value={r.patternMode} onChange={(e) => update(i, { patternMode: e.target.value as TextMode })}>
              <option value="hex">HEX</option>
              <option value="ascii">ASCII</option>
            </select>
            <select value={r.kind} onChange={(e) => update(i, { kind: e.target.value as AutoRule["kind"] })}>
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
            <span className="arlbl">{t("arReply")}</span>
            <select value={r.reply.mode} onChange={(e) => update(i, { reply: { ...r.reply, mode: e.target.value as TextMode } })}>
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
            <span className="arlbl">{t("arDelay")}</span>
            <input className="num" type="number" min={0} value={r.delayMs} onChange={(e) => update(i, { delayMs: Math.max(0, Number(e.target.value) || 0) })} />
            <span className="arlbl">ms</span>
          </div>
        </div>
      ))}
      <div className="arrow">
        <button className="btn small" onClick={() => setRules([...rules, blank(rules.length + 1)])}>
          + {t("arAdd")}
        </button>
        {active != null && <span className="hint ok">{t("arActive").replace("{n}", String(active))}</span>}
      </div>
      <div className="hint">{t("arHelp")}</div>
      {err && <div className="error">{err}</div>}
    </div>
  );
}
