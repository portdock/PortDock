// 채우기·써 넣기 창(0.6.0) — 범위를 숫자로 채우기(시작·개수·값·증가), 시작 번호부터 문자열(글자 코드)·숫자 목록 써 넣기.
// 값 만들기는 model.ts(fillSeries·textWords·parseNumList), 쓰기는 부르는 쪽(api.setValues).
import { useEffect, useState } from "react";
import { NumInput } from "@shared/NumInput";
import { tip } from "@shared/tips";
import { useRestoreFocus } from "@shared/restoreFocus";
import { dict, type Key, type Lang } from "./i18n";
import { DEV_INFO, type Dev } from "./devs";
import { addrText, fillSeries, numText, parseNum, parseNumList, parseWord, textWords } from "./model";

type Mode = "fill" | "text" | "list";

export function FillDialog({
  lang,
  dev,
  size,
  start: start0,
  count: count0,
  onWrite,
  readNow,
  onClose,
}: {
  lang: Lang;
  dev: Dev;
  /** 디바이스 크기(점 수) */
  size: number;
  /** 처음 값 — 지금 보이는 시작 번호·점 수 */
  start: number;
  count: number;
  /** 시작 번호부터 값들을 쓴다 — 성공하면 true */
  onWrite: (start: number, values: number[], mode: Mode) => Promise<boolean>;
  /** (10/31) 지금 값 읽기 — 덮어쓸 칸에 0 이 아닌 값이 있으면 한 번 묻는다(되돌리기가 없으므로) */
  readNow?: (start: number, count: number) => Promise<number[]>;
  onClose: () => void;
}) {
  const t = (k: Key) => dict[lang][k];
  const back = useRestoreFocus<HTMLDivElement>();
  const bits = DEV_INFO[dev].bits;
  const [mode, setMode] = useState<Mode>("fill");
  const [startText, setStartText] = useState(numText(dev, start0));
  const [count, setCount] = useState(Math.max(1, Math.min(count0, size - start0)));
  const [valueText, setValueText] = useState("0");
  const [step, setStep] = useState(bits ? 0 : 1);
  const [stepNeg, setStepNeg] = useState(false);
  const [text, setText] = useState("");
  const [loFirst, setLoFirst] = useState(true);
  const [nul, setNul] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** 덮어쓰기 확인 — 묻는 범위(서명)와 값이 있던 칸 수. 범위·값이 바뀌면 다시 묻는다 */
  const [confirm, setConfirm] = useState<{ sig: string; n: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const start = parseNum(dev, startText);
  const startOk = start != null && start < size;
  const value = bits ? (valueText.trim() === "1" ? 1 : valueText.trim() === "0" ? 0 : null) : parseWord(valueText, "u16");

  /** 쓸 값들 — 틀리면 이유 */
  function values(): number[] | string {
    if (!startOk) return t("fdBadStart").replace("{a}", startText);
    if (mode === "fill") {
      if (value == null) return t(bits ? "fdBadBit" : "fdBadValue");
      return fillSeries(count, value, stepNeg ? -step : step, bits);
    }
    if (mode === "text") {
      const w = textWords(text, loFirst, nul);
      return w ?? t("fdBadText");
    }
    const r = parseNumList(text, bits);
    return Array.isArray(r) ? r : t("fdBadList").replace("{a}", r.bad);
  }
  const v = values();
  const over = typeof v !== "string" && start != null && start + v.length > size;
  const preview =
    typeof v === "string"
      ? v
      : over
        ? t("fdOver").replace("{a}", addrText(dev, size - 1))
        : t("fdPreview")
            .replace("{a}", addrText(dev, start!))
            .replace("{b}", addrText(dev, start! + v.length - 1))
            .replace("{n}", String(v.length));

  const sig = typeof v === "string" ? "" : `${dev}:${start}:${v.join(",")}`;
  const asking = confirm != null && confirm.sig === sig;

  async function run() {
    setErr(null);
    if (typeof v === "string") return setErr(v);
    if (over) return setErr(preview);
    setBusy(true);
    if (readNow && !asking) {
      const now = await readNow(start!, v.length).catch(() => null);
      const n = now ? now.filter((x, i) => x !== 0 && x !== v[i]).length : 0;
      if (n > 0) {
        setBusy(false);
        setConfirm({ sig, n });
        return;
      }
    }
    const ok = await onWrite(start!, v, mode);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <div className="modal-back" ref={back} onClick={onClose}>
      <div className="modal fill-dlg" role="dialog" aria-label={t("fdTitle")} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>
            {t("fdTitle")} — {dev}
          </b>
          <button className="btn small ghost" onClick={onClose} title={t("close")} aria-label={t("close")}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <span className="segs" role="group" aria-label={t("fdTitle")}>
            {(["fill", "text", "list"] as const).map((m) => (
              <button key={m} className={mode === m ? "seg on" : "seg"} aria-pressed={mode === m} disabled={m === "text" && bits} onClick={() => setMode(m)} data-tip={tip(lang, m === "fill" ? "plcFillRange" : m === "text" ? "plcWriteText" : "plcWriteList")}>
                {t(m === "fill" ? "fdFill" : m === "text" ? "fdText" : "fdList")}
              </button>
            ))}
          </span>
          <label>
            {t("fdStart")} ({DEV_INFO[dev].hex ? t("hexBase") : t("decBase")})
            <input className={startOk ? "mono" : "mono bad"} value={startText} autoFocus spellCheck={false} onChange={(e) => setStartText(e.target.value)} />
          </label>
          {mode === "fill" && (
            <>
              <div className="grid2">
                <label>
                  {t("fdCount")}
                  <NumInput min={1} max={size} value={count} onValue={setCount} />
                </label>
                <label>
                  {bits ? t("fdBit") : t("fdValue")}
                  <input className={value == null ? "mono bad" : "mono"} value={valueText} spellCheck={false} onChange={(e) => setValueText(e.target.value)} />
                </label>
              </div>
              {!bits && (
                <div className="grid2">
                  <label>
                    {t("fdStep")}
                    <NumInput min={0} max={65535} value={step} onValue={setStep} />
                  </label>
                  <label className="inline">
                    <input type="checkbox" checked={stepNeg} onChange={(e) => setStepNeg(e.target.checked)} /> {t("fdStepNeg")}
                  </label>
                </div>
              )}
            </>
          )}
          {mode !== "fill" && (
            <label>
              {mode === "text" ? t("fdTextLabel") : t("fdListLabel")}
              <textarea rows={3} className="mono" value={text} spellCheck={false} placeholder={mode === "text" ? "ABC\\x0D" : bits ? "1 0 1 1" : "100, 200, 0x10, -1"} onChange={(e) => setText(e.target.value)} />
            </label>
          )}
          {mode === "text" && (
            <>
              <label>
                {t("fdOrder")}
                <select value={loFirst ? "lo" : "hi"} onChange={(e) => setLoFirst(e.target.value === "lo")}>
                  <option value="lo">{t("fdOrderLo")}</option>
                  <option value="hi">{t("fdOrderHi")}</option>
                </select>
              </label>
              <label className="inline">
                <input type="checkbox" checked={nul} onChange={(e) => setNul(e.target.checked)} /> {t("fdNul")}
              </label>
            </>
          )}
          <div className={typeof v === "string" || over ? "hint warn" : "hint"} role="status">
            {preview}
          </div>
          {asking && typeof v !== "string" && (
            <div className="interlock fd-confirm" role="alert">
              {t("fdConfirm")
                .replace("{a}", addrText(dev, start!))
                .replace("{b}", addrText(dev, start! + v.length - 1))
                .replace("{n}", String(v.length))
                .replace("{m}", String(confirm!.n))}
            </div>
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
            <button className="btn small primary" onClick={run} disabled={busy}>
              {asking ? t("fdOverwrite") : t("fdWrite")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
