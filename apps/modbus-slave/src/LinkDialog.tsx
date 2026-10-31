// 칸 잇기 규칙 창(0.10.0) — 칸끼리 잇는 규칙(따라가기·비례·누적)을 고친다. 계산은 백엔드(crates/core/src/slave_profile.rs).
import { useEffect, useState } from "react";
import { tip } from "@shared/tips";
import { useRestoreFocus } from "@shared/restoreFocus";
import { dict, type Key, type Lang } from "./i18n";
import { LINK_KINDS, linkCheck, linkKindName, linkSummary, maskBits, newLink, type CellRef, type LinkCfg, type LinkKind } from "./profile";

export interface CellOption {
  ref: CellRef;
  label: string;
}

type Draft = { kind: LinkKind; out: string; src: string; run: string; mask: string; gain: string; offset: string; rate: string };

const cellKey = (c: CellRef | null) => (c ? `${c.table}:${c.addr}` : "");
const parseKey = (k: string): CellRef | null => {
  const i = k.lastIndexOf(":");
  return k && i > 0 ? { table: k.slice(0, i) as CellRef["table"], addr: Number(k.slice(i + 1)) } : null;
};
const toDraft = (l: LinkCfg): Draft => ({ kind: l.kind, out: cellKey(l.out), src: cellKey(l.src), run: cellKey(l.run), mask: String(l.runMask), gain: String(l.gain), offset: String(l.offset), rate: String(l.rate) });
const numOr = (s: string) => (s.trim() === "" ? NaN : Number(s));
/** 초안 → 규칙. 결과 칸을 아직 안 골랐으면 out 이 null(linkCheck 가 잡는다) */
const fromDraft = (d: Draft): LinkCfg => {
  const out = parseKey(d.out) as CellRef;
  return { kind: d.kind, out, src: parseKey(d.src), run: d.kind === "approach" ? parseKey(d.run) : null, runMask: d.kind === "approach" ? numOr(d.mask) : 0, gain: numOr(d.gain), offset: numOr(d.offset), rate: numOr(d.rate) };
};

export function LinkDialog({
  lang,
  unit,
  links,
  cells,
  onSave,
  onClose,
}: {
  lang: Lang;
  unit: number;
  links: LinkCfg[];
  cells: CellOption[];
  onSave: (links: LinkCfg[]) => void;
  onClose: () => void;
}) {
  const t = (k: Key) => dict[lang][k];
  const back = useRestoreFocus<HTMLDivElement>();
  const [rows, setRows] = useState<Draft[]>(() => links.map(toDraft));
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const label = (c: CellRef) => cells.find((x) => x.ref.table === c.table && x.ref.addr === c.addr)?.label ?? `${c.table} ${c.addr}`;
  const set = (i: number, patch: Partial<Draft>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  function save() {
    setErr(null);
    const out: LinkCfg[] = [];
    for (let i = 0; i < rows.length; i++) {
      const l = fromDraft(rows[i]);
      const why = linkCheck(l, lang);
      if (why) return setErr(t("lnRow").replace("{n}", String(i + 1)).replace("{a}", why));
      out.push(l);
    }
    onSave(out);
  }

  const cellSelect = (value: string, onChange: (v: string) => void, none: string | null, aria: string) => (
    <select value={value} aria-label={aria} onChange={(e) => onChange(e.target.value)}>
      <option value="">{none ?? t("lnPick")}</option>
      {cells.map((c) => (
        <option key={cellKey(c.ref)} value={cellKey(c.ref)}>
          {c.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="modal-back" ref={back} onClick={onClose}>
      <div className="modal link-dlg" role="dialog" aria-label={t("lnTitle").replace("{u}", String(unit))} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{t("lnTitle").replace("{u}", String(unit))}</b>
          <button className="btn small ghost" onClick={onClose} title={t("close")} aria-label={t("close")}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <span className="hint">{t("lnIntro")}</span>
          <div className="hint warn">{t("profNote")}</div>
          {!cells.length && <div className="hint">{t("lnNoCells")}</div>}
          {!rows.length && cells.length > 0 && <div className="hint">{t("lnEmpty")}</div>}
          <div className="link-rows">
            {rows.map((r, i) => {
              const l = fromDraft(r);
              const why = r.out ? linkCheck(l, lang) : null;
              const mask = Number(r.mask);
              return (
                <fieldset key={i} className="link-row">
                  <legend>
                    {i + 1}. {!why && r.out ? linkSummary(l, label, lang) : linkKindName(r.kind, lang)}
                  </legend>
                  <div className="grid2">
                    <label data-tip={tip(lang, "profLinks")}>
                      {t("lnKind")}
                      <select value={r.kind} onChange={(e) => set(i, { kind: e.target.value as LinkKind })}>
                        {LINK_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {linkKindName(k, lang)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {t("lnOut")}
                      {cellSelect(r.out, (v) => set(i, { out: v }), null, t("lnOut"))}
                    </label>
                    <label>
                      {t("lnSrc")}
                      {cellSelect(r.src, (v) => set(i, { src: v }), r.kind === "integrate" ? t("lnSrcNone") : null, t("lnSrc"))}
                    </label>
                    {r.kind === "approach" && (
                      <label>
                        {t("lnRun")}
                        {cellSelect(r.run, (v) => set(i, { run: v }), t("lnRunNone"), t("lnRun"))}
                      </label>
                    )}
                    {r.kind === "approach" && r.run && (
                      <label data-tip={tip(lang, "lnMask")}>
                        {t("lnMask")}
                        <input className={Number.isInteger(mask) && mask >= 0 ? "" : "bad"} inputMode="numeric" value={r.mask} onChange={(e) => set(i, { mask: e.target.value })} />
                        {Number.isInteger(mask) && mask > 0 && <span className="hint">{t("lnBits").replace("{a}", maskBits(mask).join("·"))}</span>}
                      </label>
                    )}
                    <label data-tip={tip(lang, "lnGain")}>
                      {t("lnGain")}
                      <input className={Number.isFinite(numOr(r.gain)) ? "" : "bad"} inputMode="decimal" value={r.gain} onChange={(e) => set(i, { gain: e.target.value })} />
                    </label>
                    {r.kind === "scale" && (
                      <label>
                        {t("lnOffset")}
                        <input className={Number.isFinite(numOr(r.offset)) ? "" : "bad"} inputMode="decimal" value={r.offset} onChange={(e) => set(i, { offset: e.target.value })} />
                      </label>
                    )}
                    {r.kind === "approach" && (
                      <label data-tip={tip(lang, "lnRate")}>
                        {t("lnRate")}
                        <input className={numOr(r.rate) > 0 ? "" : "bad"} inputMode="decimal" value={r.rate} onChange={(e) => set(i, { rate: e.target.value })} />
                      </label>
                    )}
                  </div>
                  {why && <div className="error">{why}</div>}
                  <div className="row2">
                    <span className="grow" />
                    <button className="btn small" onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))}>
                      {t("lnDel")}
                    </button>
                  </div>
                </fieldset>
              );
            })}
          </div>
          {cells.length > 0 && (
            <button className="btn small" onClick={() => setRows((rs) => [...rs, toDraft(newLink(cells[0].ref))])}>
              {t("lnAdd")}
            </button>
          )}
          {err && (
            <div className="error" role="alert">
              {err}
            </div>
          )}
          <div className="row2 dlg-buttons">
            <span className="grow" />
            <button className="btn small" onClick={onClose}>
              {t("cancel")}
            </button>
            <button className="btn small primary" onClick={save}>
              {t("save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
