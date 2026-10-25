// 칸 설정 창 — 주소 하나의 이름·형식(U16~F64·문자열)·워드/바이트 순서. 칸에서 오른쪽 버튼 또는 ⋯ 로 연다.
// 같은 모양을 CSV(table,address,type,order,name,value)로 Modbus Slave 와 주고받는다.
import { useEffect, useState } from "react";
import { NumInput } from "@shared/NumInput";
import { tip } from "@shared/tips";
import { useRestoreFocus } from "@shared/restoreFocus";
import { dict, fill, type Key, type Lang } from "./i18n";
import { regsOf, type Order, type Point, type VType } from "./model";
import { TYPE_LABEL } from "./WriteDialog";

const TYPES: VType[] = ["u16", "s16", "u32", "s32", "f32", "f64", "string"];
const ORDERS: Order[] = ["ABCD", "CDAB", "BADC", "DCBA"];

export function PointDialog({
  lang,
  bits,
  addr,
  addrLabel,
  points,
  point,
  onSave,
  onClose,
}: {
  lang: Lang;
  bits: boolean;
  addr: number;
  addrLabel: (a: number) => string;
  /** 이 표의 점들(겹침 검사) */
  points: Point[];
  point: Point | undefined;
  /** null = 보통 칸으로 */
  onSave: (p: Point | null) => void;
  onClose: () => void;
}) {
  const t = (k: Key) => dict[lang][k];
  const back = useRestoreFocus<HTMLDivElement>();
  const [name, setName] = useState(point?.name ?? "");
  const [type, setType] = useState<VType>(bits ? "bit" : (point?.type ?? "u16"));
  const [len, setLen] = useState(point?.len ?? 10);
  const [order, setOrder] = useState<Order>(point?.order ?? "ABCD");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const n = bits ? 1 : regsOf(type, len);
  function save() {
    if (addr + n > 65536) return setErr(t("pOver"));
    const other = points.find((q) => q.addr !== addr && q.addr < addr + n && addr < q.addr + (bits ? 1 : regsOf(q.type, q.len)));
    if (other) return setErr(fill(t("pOverlap"), { a: addrLabel(other.addr) }));
    onSave({ addr, type: bits ? "bit" : type, order: bits ? "ABCD" : order, name: name.trim(), ...(type === "string" ? { len } : {}) });
  }

  return (
    <div className="modal-back" ref={back} onClick={onClose}>
      <div className="modal cell-dlg" role="dialog" aria-label={fill(t("pTitle"), { a: addrLabel(addr) })} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>{fill(t("pTitle"), { a: addrLabel(addr) })}</b>
          <button className="btn small ghost" onClick={onClose} title={t("close")} aria-label={t("close")}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <label data-tip={tip(lang, "mbPointName")}>
            {t("pName")}
            <input value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && save()} />
          </label>
          {!bits && (
            <>
              <div className="grid2">
                <label data-tip={tip(lang, "mbPointType")}>
                  {t("pType")}
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
                    <NumInput min={1} max={250} value={len} onValue={setLen} />
                  </label>
                ) : (
                  <label data-tip={tip(lang, "mbPointOrder")}>
                    {t("pOrder")}
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
              {type === "string" && (
                <label data-tip={tip(lang, "mbPointOrder")}>
                  {t("pOrder")}
                  <select value={order} onChange={(e) => setOrder(e.target.value as Order)}>
                    {ORDERS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <span className="hint">
                {fill(t("pSpan"), { n, a: addrLabel(addr), b: addrLabel(Math.min(65535, addr + n - 1)) })}
                {n > 1 ? ` · ${t("pOrderHint")}` : ""}
              </span>
            </>
          )}
          {err && (
            <div className="error" role="alert">
              {err}
            </div>
          )}
          <div className="row2 dlg-buttons">
            <button className="btn small" onClick={() => onSave(null)} data-tip={tip(lang, "mmPointReset")}>
              {t("pReset")}
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
