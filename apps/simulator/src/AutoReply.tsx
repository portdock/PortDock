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

/** 자동응답 규칙 편집. 규칙은 위에서부터 처음 맞는 하나만 응답한다. */
export function AutoReply({
  rules,
  setRules,
  sessionId,
  t,
}: {
  rules: AutoRule[];
  setRules: (r: AutoRule[]) => void;
  sessionId: string | null;
  t: (k: Key) => string;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<number | null>(null);

  // 편집할 때마다 문법을 검사하고, 연결돼 있으면 바로 적용한다
  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        const n = sessionId ? await api.setAutoReply(sessionId, rules) : await api.checkAutoReply(rules);
        setErr(null);
        setActive(sessionId ? n : null);
      } catch (e) {
        setErr(String(e));
        setActive(null);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [rules, sessionId]);

  const update = (i: number, patch: Partial<AutoRule>) => setRules(rules.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="ar">
      {rules.map((r, i) => (
        <div key={i} className={r.enabled ? "arcard" : "arcard off"}>
          <div className="arrow">
            <input type="checkbox" checked={r.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} />
            <input className="arname" value={r.name} onChange={(e) => update(i, { name: e.target.value })} />
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
          </div>
          <input
            className="mono"
            value={r.pattern}
            placeholder={r.patternMode === "hex" ? "01 03 ?? ?? 00 0A **" : "READ?*\\r"}
            onChange={(e) => update(i, { pattern: e.target.value })}
          />
          <div className="arrow">
            <span className="arlbl">{t("arReply")}</span>
            <select value={r.reply.mode} onChange={(e) => update(i, { reply: { ...r.reply, mode: e.target.value as TextMode } })}>
              <option value="hex">HEX</option>
              <option value="ascii">ASCII</option>
            </select>
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
          </div>
          <input
            className="mono"
            value={r.reply.text}
            placeholder={r.reply.mode === "hex" ? "01 03 02 00 64" : "OK\\r\\n"}
            onChange={(e) => update(i, { reply: { ...r.reply, text: e.target.value } })}
          />
          <div className="arrow">
            <span className="arlbl">{t("arDelay")}</span>
            <input className="num" type="number" min={0} value={r.delayMs} onChange={(e) => update(i, { delayMs: Math.max(0, Number(e.target.value) || 0) })} />
            <span className="arlbl">ms</span>
          </div>
        </div>
      ))}
      <button className="btn small" onClick={() => setRules([...rules, blank(rules.length + 1)])}>
        + {t("arAdd")}
      </button>
      <div className="hint">{t("arHelp")}</div>
      {active != null && rules.length > 0 && <div className="hint ok">{t("arActive").replace("{n}", String(active))}</div>}
      {err && <div className="error">{err}</div>}
    </div>
  );
}
