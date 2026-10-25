// 쓰기 창 — 칸을 두 번 누르면 연다. 타입대로 값을 넣으면 보낼 함수(05·06·0F·10)와 보낼 바이트를 미리 보여 준다.
import { useEffect, useMemo, useState } from "react";
import { NumInput } from "@shared/NumInput";
import { tip } from "@shared/tips";
import { useRestoreFocus } from "@shared/restoreFocus";
import { api, hex, outcomeText, type Outcome } from "./api";
import { dict, fill, type Key, type Lang } from "./i18n";
import { fcHex, parseInput, regsOf, type Format, type Order, type Shape, type VType } from "./model";

const TYPES: VType[] = ["u16", "s16", "u32", "s32", "f32", "f64", "string"];
const ORDERS: Order[] = ["ABCD", "CDAB", "BADC", "DCBA"];
export const TYPE_LABEL: Record<VType, string> = { bit: "BIT", u16: "U16", s16: "S16", u32: "U32", s32: "S32", f32: "F32", f64: "F64", string: "STR" };

export function WriteDialog({
  lang,
  bits,
  unit,
  addr,
  addrLabel,
  shape,
  format,
  current,
  forceMulti,
  onForceMulti,
  wire,
  onWrite,
  onClose,
}: {
  lang: Lang;
  /** 코일 표(05·0F) — 아니면 보유 레지스터(06·10) */
  bits: boolean;
  unit: number;
  /** 0 기준 주소 */
  addr: number;
  addrLabel: (a: number) => string;
  /** 이 칸의 타입(칸 설정) — 창에서 이번만 바꿀 수 있다 */
  shape: Shape;
  format: Format;
  /** 지금 보이는 값(처음 입력 글) */
  current: string;
  forceMulti: boolean;
  onForceMulti: (v: boolean) => void;
  wire: "tcp" | "rtu";
  /** 쓰기 — 결과(정상이면 창을 닫는다) */
  onWrite: (values: number[], forceMulti: boolean) => Promise<Outcome>;
  onClose: () => void;
}) {
  const t = (k: Key) => dict[lang][k];
  const back = useRestoreFocus<HTMLDivElement>();
  const [type, setType] = useState<VType>(bits ? "bit" : shape.type);
  const [order, setOrder] = useState<Order>(shape.order);
  const [len, setLen] = useState(shape.len ?? 10);
  const [text, setText] = useState(current === "—" ? "" : current);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const regs = useMemo(() => parseInput(text, { type, order, len }, format), [text, type, order, len, format]);
  const max = bits ? 1968 : 123;
  const n = regs?.length ?? 0;
  const problem = !text.trim() ? null : regs == null ? fill(t("wBad"), { a: text.trim() }) : n > max ? fill(t("wTooMany"), { n, max }) : addr + n > 65536 ? t("wOver") : null;
  const multi = n > 1 || forceMulti;
  const fc = bits ? (multi ? 0x0f : 0x05) : multi ? 0x10 : 0x06;
  const fcName = { 0x05: "Write Single Coil", 0x06: "Write Single Register", 0x0f: "Write Multiple Coils", 0x10: "Write Multiple Registers" }[fc];
  const ready = !!regs && n > 0 && !problem;

  // 보낼 바이트 미리보기(백엔드가 실제로 만드는 것 그대로)
  useEffect(() => {
    if (!ready || !regs) {
      setPreview("");
      return;
    }
    let alive = true;
    const id = setTimeout(() => {
      api
        .previewWrite({ unit, bits, start: addr, values: regs, forceMulti }, wire)
        .then((b) => alive && setPreview(hex(b)))
        .catch((e) => alive && setPreview(String(e)));
    }, 120);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [ready, regs, unit, bits, addr, forceMulti, wire]);

  async function send(values: number[] | null = regs) {
    if (!values || !values.length || pending) return;
    setErr(null);
    setPending(true);
    try {
      const o = await onWrite(values, forceMulti);
      if (o.result === "ok" || o.result === "broadcast") onClose();
      else setErr(fill(t("wFail"), { a: outcomeText(o, lang) }));
    } catch (e) {
      setErr(String(e));
    } finally {
      setPending(false);
    }
  }

  const endAddr = Math.min(65535, addr + Math.max(1, n) - 1);
  return (
    <div className="modal-back" ref={back} onClick={onClose}>
      <div className="modal write-dlg" role="dialog" aria-label={fill(t("wTitle"), { a: addrLabel(addr) })} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{fill(t("wTitle"), { a: addrLabel(addr) })}</b>
          <button className="btn small ghost" onClick={onClose} title={t("close")} aria-label={t("close")}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {unit === 0 && wire === "rtu" && <div className="hint warn">{t("wBroadcast")}</div>}
          {bits ? (
            <div className="row2 onoff">
              <button className="btn" disabled={pending} onClick={() => send([1])} data-tip={tip(lang, "mmWriteOn")}>
                {t("wOn")}
              </button>
              <button className="btn" disabled={pending} onClick={() => send([0])} data-tip={tip(lang, "mmWriteOn")}>
                {t("wOff")}
              </button>
            </div>
          ) : (
            <div className="grid2">
              <label data-tip={tip(lang, "mmWriteType")}>
                {t("wType")}
                <select value={type} onChange={(e) => setType(e.target.value as VType)}>
                  {TYPES.map((x) => (
                    <option key={x} value={x}>
                      {TYPE_LABEL[x]}
                      {regsOf(x, len) > 1 ? ` (${regsOf(x, len)})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              {type === "string" ? (
                <label data-tip={tip(lang, "mbPointLen")}>
                  {t("pLen")}
                  <NumInput min={1} max={246} value={len} onValue={setLen} />
                </label>
              ) : (
                <label data-tip={tip(lang, "mbPointOrder")}>
                  {t("wOrder")}
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
          <label data-tip={tip(lang, "mmWriteValue")}>
            {t("wValue")}
            {type === "u16" || type === "s16" ? ` (${format.toUpperCase()})` : type === "bit" ? "" : ` (${TYPE_LABEL[type]}${type !== "string" && order !== "ABCD" ? ` ${order}` : ""})`}
            <input
              className={problem ? "bad mono" : "mono"}
              value={text}
              autoFocus
              spellCheck={false}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()}
            />
          </label>
          <span className="hint">{bits ? t("wBitHint") : type === "u16" ? t("wMultiHint") : fill(t("wSpan"), { a: addrLabel(addr), b: addrLabel(Math.min(65535, addr + regsOf(type, len) - 1)), n: regsOf(type, len) })}</span>
          {problem && (
            <div className="error" role="alert">
              {problem}
            </div>
          )}
          <label className="inline" data-tip={tip(lang, "mmForceMulti")}>
            <input type="checkbox" checked={forceMulti} onChange={(e) => onForceMulti(e.target.checked)} /> {t("forceMulti")}
          </label>
          <div className="wfc mono" data-tip={tip(lang, "mmWritePreview")}>
            <span>
              {t("wFc")}: FC{fcHex(fc)} {fcName}
              {n > 1 ? ` · ${fill(t("wSpan"), { a: addrLabel(addr), b: addrLabel(endAddr), n })}` : ""}
            </span>
            <span className="wbytes">
              {t("wPreview")}: {preview || "—"}
            </span>
          </div>
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
            <button className="btn small primary" disabled={!ready || pending} onClick={() => send()}>
              {pending ? t("wPending") : t("wSend")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
