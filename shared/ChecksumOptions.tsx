// 체크섬 고르기 + «⚙» 옵션 대화상자 — 앞 n바이트 빼고 계산, 끝 m바이트 앞에 넣기(ETX 앞), 바이트 순서 뒤집기, 범용 CRC 매개변수.
// 보내기 줄과 수신 체크섬 검사(Serial·TCP·UDP)가 함께 쓴다. 백엔드로는 checksumToRust 로 바꿔 보낸다.
import { useEffect, useState } from "react";
import { CHECKSUMS, CRC_PRESETS, checksumDesc, checksumLabel, ckOptsActive, crcProblem, DEFAULT_CRC, type ChecksumKind, type CkOpts, type CrcParams } from "./format";
import { NumInput } from "./NumInput";
import { useRestoreFocus } from "./restoreFocus";
import { tip } from "./tips";
import { io } from "./ioText";
import { ui, type Lang } from "./uiText";
import "./io.css";

/** 체크섬 고르기(+ 범용 CRC) 와 ⚙ 버튼. 고른 종류가 범용 CRC 인데 매개변수가 없으면 기본값을 넣고 대화상자를 연다 */
export function ChecksumPicker({
  lang,
  kind,
  ck,
  onChange,
  rx,
  noneLabel,
  tipKey,
  ariaLabel,
}: {
  lang: Lang;
  kind: ChecksumKind | null;
  ck: CkOpts | null | undefined;
  onChange: (kind: ChecksumKind | null, ck: CkOpts | null) => void;
  /** 수신 검사 — 문구만 다르다 */
  rx?: boolean;
  noneLabel: string;
  tipKey?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const active = ckOptsActive(ck) || kind === "crc";
  return (
    <span className="ck-pick">
      <select
        value={kind ?? ""}
        aria-label={ariaLabel}
        data-tip={tipKey ? tip(lang, tipKey) : undefined}
        title={kind ? checksumDesc(kind, ck, lang) : undefined}
        onChange={(e) => {
          const k = (e.target.value || null) as ChecksumKind | null;
          if (k === "crc" && !ck?.crc) {
            onChange(k, { ...(ck ?? {}), crc: { ...DEFAULT_CRC } });
            setOpen(true);
          } else onChange(k, ck ?? null);
        }}
      >
        <option value="">{noneLabel}</option>
        {CHECKSUMS.map((c) => (
          <option key={c.kind} value={c.kind}>
            {c.label}
          </option>
        ))}
        <option value="crc">{checksumLabel("crc", lang)}</option>
      </select>
      <button
        type="button"
        className={`btn small ck-opt${active ? " on" : ""}`}
        onClick={() => setOpen(true)}
        disabled={!kind}
        data-tip={kind ? `${io(lang, "ckOptTip")}${active ? ` — ${checksumDesc(kind, ck, lang)}` : ""}` : io(lang, "ckNeedKind")}
        aria-label={io(lang, "ckOptTitle")}
      >
        ⚙{active ? "•" : ""}
      </button>
      {open && kind && <ChecksumDialog lang={lang} kind={kind} ck={ck ?? {}} rx={rx} onChange={(c) => onChange(kind, c)} onClose={() => setOpen(false)} />}
    </span>
  );
}

const hexOf = (n: number, w: number) => `0x${(n >>> 0).toString(16).toUpperCase().padStart(w / 4, "0")}`;

/** HEX 칸(0x 있어도 됨) — 입력하는 동안 글자 그대로, 맞는 값일 때만 반영 */
function HexInput({ value, width, onValue, label }: { value: number; width: number; onValue: (n: number) => void; label: string }) {
  const [text, setText] = useState(hexOf(value, width));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setText(hexOf(value, width));
  }, [value, width, focus]);
  const parse = (s: string) => {
    const t = s.trim().replace(/^0x/i, "");
    return /^[0-9a-f]{1,8}$/i.test(t) ? parseInt(t, 16) >>> 0 : null;
  };
  const bad = parse(text) == null;
  return (
    <input
      className={`mono${bad ? " bad" : ""}`}
      value={text}
      aria-label={label}
      spellCheck={false}
      onFocus={() => setFocus(true)}
      onBlur={() => {
        setFocus(false);
        setText(hexOf(value, width));
      }}
      onChange={(e) => {
        setText(e.target.value);
        const n = parse(e.target.value);
        if (n != null) onValue(n);
      }}
    />
  );
}

function ChecksumDialog({ lang, kind, ck, rx, onChange, onClose }: { lang: Lang; kind: ChecksumKind; ck: CkOpts; rx?: boolean; onChange: (c: CkOpts | null) => void; onClose: () => void }) {
  const back = useRestoreFocus<HTMLDivElement>();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  const crc: CrcParams = ck.crc ?? DEFAULT_CRC;
  const setCrc = (p: Partial<CrcParams>) => onChange({ ...ck, crc: { ...crc, ...p } });
  const problem = kind === "crc" ? crcProblem(crc, lang) : null;
  const head = ck.skipHead ?? 0;
  const tail = ck.beforeEnd ?? 0;
  return (
    <div className="modal-back" ref={back} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal ck-dialog" role="dialog" aria-label={io(lang, "ckOptTitle")}>
        <div className="modal-head">
          <b>
            {io(lang, "ckOptTitle")} — {checksumLabel(kind, lang)}
          </b>
          <button type="button" className="btn small ghost" onClick={onClose} title={ui(lang, "closeNote")} aria-label={ui(lang, "closeNote")}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <label>
            {io(lang, "ckSkipHead")}
            <NumInput min={0} max={255} value={head} onValue={(n) => onChange({ ...ck, skipHead: n })} autoFocus />
            <span className="hint">{io(lang, "ckSkipHeadHint")}</span>
          </label>
          <label>
            {io(lang, rx ? "ckBeforeEndRx" : "ckBeforeEnd")}
            <NumInput min={0} max={255} value={tail} onValue={(n) => onChange({ ...ck, beforeEnd: n })} />
            <span className="hint">{io(lang, "ckBeforeEndHint")}</span>
          </label>
          <label className="inline">
            <input type="checkbox" checked={!!ck.swap} onChange={(e) => onChange({ ...ck, swap: e.target.checked })} /> {io(lang, "ckSwap")}
          </label>
          <span className="hint">{io(lang, "ckSwapHint")}</span>
          <div className="ck-layout mono" aria-label={io(lang, "ckLayout")}>
            {head > 0 && <span className="ck-seg dim">{io(lang, "ckLayoutHead", { n: head })}</span>}
            <span className="ck-seg">{io(lang, "ckLayoutBody")}</span>
            <span className="ck-seg ck">{kind === "crc" ? `CRC-${crc.width}` : checksumLabel(kind, lang)}{ck.swap ? " ⇄" : ""}</span>
            {tail > 0 && <span className="ck-seg dim">{io(lang, "ckLayoutTail", { n: tail })}</span>}
          </div>
          {kind === "crc" && (
            <>
              <hr />
              <b className="ck-sub">{io(lang, "crcParams")}</b>
              <label>
                {io(lang, "crcPreset")}
                <select
                  value=""
                  onChange={(e) => {
                    const p = CRC_PRESETS.find((x) => x.name === e.target.value);
                    if (p) onChange({ ...ck, crc: { ...p.p } });
                  }}
                >
                  <option value="">{io(lang, "crcPresetPick")}</option>
                  {CRC_PRESETS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ck-grid">
                <label>
                  {io(lang, "crcWidth")}
                  <select value={crc.width} onChange={(e) => setCrc({ width: Number(e.target.value) as CrcParams["width"] })}>
                    {[8, 16, 32].map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {io(lang, "crcPoly")}
                  <HexInput value={crc.poly} width={crc.width} onValue={(n) => setCrc({ poly: n })} label="poly" />
                </label>
                <label>
                  {io(lang, "crcInit")}
                  <HexInput value={crc.init} width={crc.width} onValue={(n) => setCrc({ init: n })} label="init" />
                </label>
                <label>
                  {io(lang, "crcXorout")}
                  <HexInput value={crc.xorout} width={crc.width} onValue={(n) => setCrc({ xorout: n })} label="xorout" />
                </label>
              </div>
              <label className="inline">
                <input type="checkbox" checked={crc.refin} onChange={(e) => setCrc({ refin: e.target.checked })} /> {io(lang, "crcRefin")}
              </label>
              <label className="inline">
                <input type="checkbox" checked={crc.refout} onChange={(e) => setCrc({ refout: e.target.checked })} /> {io(lang, "crcRefout")}
              </label>
              {problem && <div className="interlock">{problem}</div>}
            </>
          )}
          <div className="row2">
            <button type="button" className="btn small" onClick={() => onChange(kind === "crc" ? { crc } : null)} disabled={!ckOptsActive(ck)}>
              {io(lang, "ckOff")}
            </button>
            <span className="grow" />
            <button type="button" className="btn small primary" onClick={onClose}>
              {ui(lang, "closeNote")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
