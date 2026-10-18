// 칸 설정 창 — 이름·형식(u16~f64·문자열)·워드/바이트 순서·값 자동 변화를 한 번에 고친다.
import { useEffect, useState } from "react";
import { NumInput } from "@shared/NumInput";
import { tip } from "@shared/tips";
import { useRestoreFocus } from "@shared/restoreFocus";
import { dict, type Key, type Lang } from "./i18n";
import {
  BIT_SIM_KINDS,
  ORDERS,
  REG_TYPES,
  SIM_KINDS,
  STR_MAX,
  defaultSim,
  overlapOf,
  regsOf,
  simCheck,
  simKindName,
  type Order,
  type Point,
  type SimCfg,
  type SimKindName,
  type VType,
} from "./regmap";

const TYPE_LABEL: Record<VType, { ko: string; en: string }> = {
  bit: { ko: "비트", en: "Bit" },
  u16: { ko: "U16 (0~65535)", en: "U16 (0–65535)" },
  s16: { ko: "S16 (부호 있음)", en: "S16 (signed)" },
  u32: { ko: "U32 (2칸)", en: "U32 (2 regs)" },
  s32: { ko: "S32 (2칸, 부호 있음)", en: "S32 (2 regs, signed)" },
  f32: { ko: "F32 실수 (2칸)", en: "F32 float (2 regs)" },
  f64: { ko: "F64 실수 (4칸)", en: "F64 double (4 regs)" },
  string: { ko: "문자열", en: "String" },
};
export const typeLabel = (t: VType, lang: Lang) => TYPE_LABEL[t][lang];

/** 숫자 칸(음수·소수) — 글자 그대로 두고 저장할 때 읽는다 */
function FloatInput({ value, onChange, label, tipKey, lang }: { value: string; onChange: (s: string) => void; label: string; tipKey: string; lang: Lang }) {
  const bad = value.trim() === "" || !Number.isFinite(Number(value));
  return (
    <label data-tip={tip(lang, tipKey)}>
      {label}
      <input className={bad ? "bad" : ""} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

type Draft = Record<"step" | "min" | "max" | "amp" | "offset", string>;

export function CellDialog({
  lang,
  bits,
  addr,
  addrLabel,
  points,
  point,
  sim,
  onSave,
  onClose,
}: {
  lang: Lang;
  bits: boolean;
  /** 0 기준 주소 */
  addr: number;
  /** 화면 표기 주소(«40001») — 끝 주소도 만들 수 있게 함수 */
  addrLabel: (a: number) => string;
  /** 이 표의 다른 점들(겹침 검사) */
  points: Point[];
  point: Point | undefined;
  sim: SimCfg | undefined;
  onSave: (point: Point | null, sim: SimCfg | null) => void;
  onClose: () => void;
}) {
  const t = (k: Key) => dict[lang][k];
  const back = useRestoreFocus<HTMLDivElement>();
  const [name, setName] = useState(point?.name ?? "");
  const [type, setType] = useState<VType>(bits ? "bit" : (point?.type ?? "u16"));
  const [len, setLen] = useState(point?.len ?? 10);
  const [order, setOrder] = useState<Order>(point?.order ?? "ABCD");
  const base = sim ?? defaultSim(addr, bits);
  const [kind, setKind] = useState<SimKindName | "none">(sim ? sim.kind : "none");
  const [d, setD] = useState<Draft>({ step: String(base.step), min: String(base.min), max: String(base.max), amp: String(base.amp), offset: String(base.offset) });
  const [wrap, setWrap] = useState(base.wrap);
  const [waveMs, setWaveMs] = useState(base.waveMs);
  const [onRead, setOnRead] = useState(base.periodMs === 0);
  const [periodMs, setPeriodMs] = useState(base.periodMs || 1000);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const n = regsOf(type, len);
  const kinds: SimKindName[] = bits ? BIT_SIM_KINDS : SIM_KINDS;
  const set = (k: keyof Draft) => (s: string) => setD((x) => ({ ...x, [k]: s }));

  function save() {
    setErr(null);
    const p: Point = { addr, type, order: bits ? "ABCD" : order, name: name.trim(), ...(type === "string" ? { len } : {}) };
    if (addr + n > 65536) return setErr(t("dlgOver"));
    const ov = overlapOf(points, p);
    if (ov != null) return setErr(t("dlgOverlap").replace("{a}", addrLabel(ov)));
    let s: SimCfg | null = null;
    if (kind !== "none") {
      if (type === "string") return setErr(t("dlgStrNoSim"));
      const nums: Record<string, number> = {};
      for (const k of Object.keys(d) as (keyof Draft)[]) {
        const v = Number(d[k]);
        if (d[k].trim() === "" || !Number.isFinite(v)) return setErr(t("dlgNumBad").replace("{a}", d[k]));
        nums[k] = v;
      }
      s = { addr, kind, step: nums.step, min: nums.min, max: nums.max, wrap, amp: nums.amp, offset: nums.offset, waveMs, periodMs: onRead ? 0 : periodMs };
      const why = simCheck(s, lang);
      if (why) return setErr(why);
    }
    onSave(p, s);
  }

  const kindLabel = (k: SimKindName) => simKindName(k, lang);
  const showStep = kind === "increment" || kind === "decrement";
  const showMinMax = showStep || kind === "random" || kind === "ramp";
  const showWave = kind === "sine" || kind === "ramp";

  return (
    <div className="modal-back" ref={back} onClick={onClose}>
      <div className="modal cell-dlg" role="dialog" aria-label={t("dlgTitle").replace("{a}", addrLabel(addr))} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{t("dlgTitle").replace("{a}", addrLabel(addr))}</b>
          <button className="btn small ghost" onClick={onClose} title={t("close")} aria-label={t("close")}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <label data-tip={tip(lang, "mbPointName")}>
            {t("dlgName")}
            <input value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && save()} />
          </label>
          {!bits && (
            <div className="grid2">
              <label data-tip={tip(lang, "mbPointType")}>
                {t("dlgType")}
                <select value={type} onChange={(e) => setType(e.target.value as VType)}>
                  {REG_TYPES.map((x) => (
                    <option key={x} value={x}>
                      {typeLabel(x, lang)}
                    </option>
                  ))}
                </select>
              </label>
              {type === "string" ? (
                <label data-tip={tip(lang, "mbPointLen")}>
                  {t("dlgLen")}
                  <NumInput min={1} max={STR_MAX} value={len} onValue={setLen} />
                </label>
              ) : (
                <label data-tip={tip(lang, "mbPointOrder")}>
                  {t("dlgOrder")}
                  <select value={order} onChange={(e) => setOrder(e.target.value as Order)}>
                    {ORDERS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          {!bits && type === "string" && (
            <label data-tip={tip(lang, "mbPointOrder")}>
              {t("dlgOrder")}
              <select value={order} onChange={(e) => setOrder(e.target.value as Order)}>
                {ORDERS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!bits && (
            <span className="hint">
              {t("dlgSpan")
                .replace("{n}", String(n))
                .replace("{a}", addrLabel(addr))
                .replace("{b}", addrLabel(Math.min(65535, addr + n - 1)))}
              {type !== "u16" && type !== "s16" ? ` · ${t("dlgOrderHint")}` : ""}
            </span>
          )}

          <hr />
          <label data-tip={tip(lang, "mbSimKind")}>
            {t("dlgSim")}
            <select value={kind} disabled={type === "string"} onChange={(e) => setKind(e.target.value as SimKindName | "none")}>
              <option value="none">{t("simNone")}</option>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {kindLabel(k)}
                </option>
              ))}
            </select>
          </label>
          {kind !== "none" && type !== "string" && (
            <>
              {showStep && (
                <div className="grid3">
                  <FloatInput lang={lang} tipKey="mbSimStep" label={t("step")} value={d.step} onChange={set("step")} />
                  <FloatInput lang={lang} tipKey="mbSimMinMax" label={t("min")} value={d.min} onChange={set("min")} />
                  <FloatInput lang={lang} tipKey="mbSimMinMax" label={t("max")} value={d.max} onChange={set("max")} />
                </div>
              )}
              {!showStep && showMinMax && (
                <div className="grid2">
                  <FloatInput lang={lang} tipKey="mbSimMinMax" label={t("min")} value={d.min} onChange={set("min")} />
                  <FloatInput lang={lang} tipKey="mbSimMinMax" label={t("max")} value={d.max} onChange={set("max")} />
                </div>
              )}
              {showStep && (
                <label className="inline" data-tip={tip(lang, "mbSimWrap")}>
                  <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} /> {t("wrap")}
                </label>
              )}
              {kind === "sine" && (
                <div className="grid2">
                  <FloatInput lang={lang} tipKey="mbSimSine" label={t("amp")} value={d.amp} onChange={set("amp")} />
                  <FloatInput lang={lang} tipKey="mbSimSine" label={t("offset")} value={d.offset} onChange={set("offset")} />
                </div>
              )}
              {showWave && (
                <label data-tip={tip(lang, "mbSimWave")}>
                  {t("waveMs")}
                  <NumInput min={1} max={86_400_000} value={waveMs} onValue={setWaveMs} />
                </label>
              )}
              <label className="inline" data-tip={tip(lang, "mbSimOnRead")}>
                <input type="checkbox" checked={onRead} onChange={(e) => setOnRead(e.target.checked)} /> {t("onRead")}
              </label>
              {!onRead && (
                <label data-tip={tip(lang, "mbSimPeriod")}>
                  {t("period")}
                  <NumInput min={50} max={3_600_000} value={periodMs} onValue={setPeriodMs} />
                </label>
              )}
              <span className="hint">{t("simHint")}</span>
            </>
          )}
          {err && (
            <div className="error" role="alert">
              {err}
            </div>
          )}
          <div className="row2 dlg-buttons">
            <button className="btn small" onClick={() => onSave(null, null)} data-tip={tip(lang, "mbCellReset")}>
              {t("resetCell")}
            </button>
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
