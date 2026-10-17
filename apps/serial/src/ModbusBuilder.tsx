// «Modbus 요청 만들기» — 국번·함수·주소·개수(값)로 요청 바이트를 만든다. CRC 는 보내기 줄의 체크섬(CRC16 Modbus)이 붙인다.
import { useEffect, useMemo, useState } from "react";
import { buildRequest, convertAddrText, MB_FUNCS, mbFuncInfo, type AddrMode, type MbForm } from "@shared/modbusBuild";
import { load, store } from "@shared/framing";
import { NumInput } from "@shared/NumInput";
import { tip } from "@shared/tips";
import { useRestoreFocus } from "@shared/restoreFocus";
import { hex } from "./api";
import type { Lang } from "./i18n";

const L = {
  ko: {
    title: "Modbus 요청 만들기",
    slave: "국번",
    slaveHint: "1~247 (쓰기는 0 = 모두에게, 응답 없음)",
    func: "함수",
    addr: "시작 주소",
    zero: "0 기준",
    plc: "{a} 표기",
    qty: "개수",
    qtyHint: "1~{a}",
    values: "쓸 값",
    valuesHint: "쉼표·공백으로 나눔. 10진수 또는 0x16진수, 음수 가능",
    coilsHint: "1(ON)·0(OFF) 를 쉼표·공백으로 나눔 — 첫 값이 시작 주소",
    coil: "값",
    on: "ON (FF 00)",
    off: "OFF (00 00)",
    nVals: "값 {n}개",
    preview: "요청 (CRC 앞)",
    crcNote: "+ CRC16 Modbus 2바이트는 보내기 줄이 붙입니다",
    put: "입력칸에 넣기",
    putTip: "보내기 줄을 HEX·체크섬 CRC16 Modbus·줄 끝 없음으로 맞추고 이 바이트를 넣습니다",
    add: "목록에 추가",
    added: "명령 목록에 «{a}» 을(를) 추가했습니다",
    close: "닫기",
    bcast: "국번 0 은 모든 장비에 쓰고, 어느 장비도 답하지 않습니다.",
  },
  en: {
    title: "Build Modbus request",
    slave: "Slave ID",
    slaveHint: "1–247 (writes: 0 = broadcast, no reply)",
    func: "Function",
    addr: "Start address",
    zero: "0-based",
    plc: "{a} notation",
    qty: "Quantity",
    qtyHint: "1–{a}",
    values: "Values",
    valuesHint: "Comma/space separated. Decimal or 0x hex; negatives allowed",
    coilsHint: "1 (ON) / 0 (OFF), comma/space separated — first value is the start address",
    coil: "Value",
    on: "ON (FF 00)",
    off: "OFF (00 00)",
    nVals: "{n} values",
    preview: "Request (before CRC)",
    crcNote: "+ 2-byte CRC16 Modbus is appended by the send bar",
    put: "Put in input",
    putTip: "Sets the send bar to HEX, checksum CRC16 Modbus, no line ending, and fills in these bytes",
    add: "Save to list",
    added: "Added «{a}» to the command list",
    close: "Close",
    bcast: "Slave 0 writes to every device; none of them replies.",
  },
};

const PLC_LABEL: Record<string, string> = { "0": "00001", "1": "10001", "3": "30001", "4": "40001" };
const fc2 = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");

export function ModbusBuilder({
  lang,
  onPut,
  onAdd,
  onClose,
}: {
  lang: Lang;
  /** 요청 바이트를 보내기 입력칸에 */
  onPut: (bytes: number[]) => void;
  /** 명령 목록에 이름과 함께 */
  onAdd: (name: string, bytes: number[]) => void;
  onClose: () => void;
}) {
  const t = L[lang];
  const [form, setForm] = useState<MbForm>(() => load("mbForm", { slave: 1, fc: 3, addrText: "0", addrMode: "zero", qty: 10, valuesText: "" }));
  useEffect(() => store("mbForm", form), [form]);
  const [added, setAdded] = useState<string | null>(null);
  const back = useRestoreFocus<HTMLDivElement>();
  const f = mbFuncInfo(form.fc) ?? MB_FUNCS[2];
  const r = useMemo(() => buildRequest(form, lang), [form, lang]);
  const set = (p: Partial<MbForm>) => {
    setForm((x) => ({ ...x, ...p }));
    setAdded(null);
  };

  // 함수를 바꾸면 개수를 한도 안으로, 주소(PLC 표기)는 같은 주소의 새 앞자리로
  const setFc = (fc: number) => {
    const nf = mbFuncInfo(fc) ?? MB_FUNCS[2];
    set({
      fc,
      qty: nf.write ? form.qty : Math.min(form.qty, nf.max),
      addrText: convertAddrText(form.addrText, { fc: form.fc, mode: form.addrMode }, { fc, mode: form.addrMode }),
      valuesText: fc === 0x05 && !/^(0|1|on|off)$/i.test(form.valuesText.trim()) ? "1" : form.valuesText,
    });
  };
  const setMode = (mode: AddrMode) =>
    set({ addrMode: mode, addrText: convertAddrText(form.addrText, { fc: form.fc, mode: form.addrMode }, { fc: form.fc, mode }) });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 목록 이름 — «FC03 #1 @0 ×10» 처럼
  const name = () => `FC${fc2(f.code)} #${form.slave} @${r.addr ?? 0}${f.write ? (f.max === 1 ? `=${form.valuesText.trim()}` : ` ×${r.qty}`) : ` ×${r.qty}`}`;

  return (
    <div className="modal-back" ref={back} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal mbuild" role="dialog" aria-label={t.title}>
        <div className="modal-head">
          <b>{t.title}</b>
          <button className="icon-btn" onClick={onClose} title={t.close} aria-label={t.close}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="mb-grid">
            <label>
              {t.slave}
              <NumInput min={0} max={247} value={form.slave} onValue={(n) => set({ slave: n })} />
            </label>
            <span className="hint">{t.slaveHint}</span>

            <label>
              {t.func}
              <select value={form.fc} onChange={(e) => setFc(Number(e.target.value))}>
                {MB_FUNCS.map((x) => (
                  <option key={x.code} value={x.code}>
                    {fc2(x.code)} {lang === "ko" ? x.ko : x.en}
                  </option>
                ))}
              </select>
            </label>
            <span />

            <label>
              {t.addr}
              <input className={r.addr == null && r.error ? "mono bad" : "mono"} value={form.addrText} onChange={(e) => set({ addrText: e.target.value })} placeholder={form.addrMode === "plc" ? PLC_LABEL[f.prefix] : "0"} />
            </label>
            <span className="mb-addrmode" data-tip={tip(lang, "mbAddrMode")}>
              <button className={form.addrMode === "zero" ? "seg on" : "seg"} onClick={() => setMode("zero")}>
                {t.zero}
              </button>
              <button className={form.addrMode === "plc" ? "seg on" : "seg"} onClick={() => setMode("plc")}>
                {t.plc.replace("{a}", `${f.prefix}xxxx`)}
              </button>
            </span>

            {!f.write ? (
              <>
                <label>
                  {t.qty}
                  <NumInput min={1} max={f.max} value={form.qty} onValue={(n) => set({ qty: n })} />
                </label>
                <span className="hint">{t.qtyHint.replace("{a}", String(f.max))}</span>
              </>
            ) : f.code === 0x05 ? (
              <>
                <label>
                  {t.coil}
                  <select value={/^(1|on)$/i.test(form.valuesText.trim()) ? "1" : "0"} onChange={(e) => set({ valuesText: e.target.value })}>
                    <option value="1">{t.on}</option>
                    <option value="0">{t.off}</option>
                  </select>
                </label>
                <span />
              </>
            ) : (
              <>
                <label className="mb-span">
                  {t.values}
                  <input className="mono" value={form.valuesText} onChange={(e) => set({ valuesText: e.target.value })} placeholder={f.bit ? "1 0 1 1" : f.max === 1 ? "1234" : "100, 200, 0x01F4"} />
                </label>
                <span className="hint mb-span">{f.bit ? t.coilsHint : t.valuesHint}{f.max > 1 && r.bytes ? ` · ${t.nVals.replace("{n}", String(r.qty))} (1~${f.max})` : ""}</span>
              </>
            )}
          </div>

          {r.note && <div className="hint">{r.note}</div>}
          {r.error ? <div className="interlock">{r.error}</div> : form.slave === 0 && <div className="hint warn">{t.bcast}</div>}

          <div className="mb-preview">
            <span className="hint">{t.preview}</span>
            <code>{r.bytes ? hex(r.bytes) : "—"}</code>
            <span className="hint">{t.crcNote}</span>
          </div>

          <div className="row2 mb-actions">
            {added && <span className="hint ok">{added}</span>}
            <span className="grow" />
            <button
              className="btn"
              disabled={!r.bytes}
              onClick={() => {
                if (!r.bytes) return;
                const n = name();
                onAdd(n, r.bytes);
                setAdded(t.added.replace("{a}", n));
              }}
            >
              + {t.add}
            </button>
            <button className="btn primary" disabled={!r.bytes} title={t.putTip} onClick={() => r.bytes && onPut(r.bytes)}>
              {t.put}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
