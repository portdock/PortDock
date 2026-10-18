// «Modbus 요청 만들기» — 국번(유닛 ID)·함수·주소·개수(값)로 요청 바이트를 만든다. Serial(RTU)·TCP(Modbus TCP) 공통.
// RTU: CRC 는 보내기 줄의 체크섬(CRC16 Modbus)이 붙인다. TCP: MBAP 머리(트랜잭션·프로토콜 0·길이·유닛)를 붙이고 CRC 는 없다.
import { useEffect, useMemo, useState } from "react";
import { buildRequest, convertAddrText, MB_FUNCS, mbFuncInfo, type AddrMode, type MbForm } from "./modbusBuild";
import { buildTcpRequest } from "./mbap";
import { load, store } from "./framing";
import { hex } from "./format";
import { NumInput } from "./NumInput";
import { tip } from "./tips";
import { useRestoreFocus } from "./restoreFocus";
import type { Lang } from "./uiText";
import "./modbus.css";

const L = {
  ko: {
    title: "Modbus 요청 만들기",
    titleTcp: "Modbus TCP 요청 만들기",
    slave: "국번",
    unit: "유닛 ID",
    slaveHint: "1~247 (쓰기는 0 = 모두에게, 응답 없음)",
    unitHint: "0~255 — 장비 설명서의 Unit ID(대개 1, 게이트웨이 뒤 RTU 장비면 그 국번, 무시하는 장비는 아무 값)",
    tid: "트랜잭션 ID",
    tidHint: "0~65535 — 응답이 같은 값을 돌려줍니다. 보내기 줄의 «트랜잭션 ID 자동 증가» 가 켜져 있으면 보낼 때마다 바뀝니다",
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
    previewTcp: "요청 (MBAP 머리 + PDU)",
    crcNote: "+ CRC16 Modbus 2바이트는 보내기 줄이 붙입니다",
    tcpNote: "Modbus TCP 에는 CRC 가 없습니다 — 체크섬 없이 그대로 나갑니다",
    put: "입력칸에 넣기",
    putTip: "보내기 줄을 HEX·체크섬 CRC16 Modbus·줄 끝 없음으로 맞추고 이 바이트를 넣습니다",
    putTipTcp: "보내기 줄을 HEX·체크섬 없음·줄 끝 없음으로 맞추고 이 바이트를 넣습니다",
    add: "목록에 추가",
    added: "명령 목록에 «{a}» 을(를) 추가했습니다",
    close: "닫기",
    bcast: "국번 0 은 모든 장비에 쓰고, 어느 장비도 답하지 않습니다.",
  },
  en: {
    title: "Build Modbus request",
    titleTcp: "Build Modbus TCP request",
    slave: "Slave ID",
    unit: "Unit ID",
    slaveHint: "1–247 (writes: 0 = broadcast, no reply)",
    unitHint: "0–255 — the device's Unit ID (usually 1; the RTU slave ID behind a gateway; any value if the device ignores it)",
    tid: "Transaction ID",
    tidHint: "0–65535 — the response echoes it. With «Auto transaction ID» on in the send bar it changes on every send",
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
    previewTcp: "Request (MBAP header + PDU)",
    crcNote: "+ 2-byte CRC16 Modbus is appended by the send bar",
    tcpNote: "Modbus TCP has no CRC — sent as is, without a checksum",
    put: "Put in input",
    putTip: "Sets the send bar to HEX, checksum CRC16 Modbus, no line ending, and fills in these bytes",
    putTipTcp: "Sets the send bar to HEX, no checksum, no line ending, and fills in these bytes",
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
  wire = "rtu",
  onPut,
  onAdd,
  onClose,
}: {
  lang: Lang;
  /** rtu: 국번 + PDU(CRC 는 보내기 줄이) · tcp: MBAP + PDU */
  wire?: "rtu" | "tcp";
  /** 요청 바이트를 보내기 입력칸에 */
  onPut: (bytes: number[]) => void;
  /** 명령 목록에 이름과 함께 */
  onAdd: (name: string, bytes: number[]) => void;
  onClose: () => void;
}) {
  const t = L[lang];
  const tcp = wire === "tcp";
  const [form, setForm] = useState<MbForm>(() => load("mbForm", { slave: 1, fc: 3, addrText: "0", addrMode: "zero", qty: 10, valuesText: "" }));
  useEffect(() => store("mbForm", form), [form]);
  const [tid, setTid] = useState<number>(() => load("mbTid", 1));
  useEffect(() => store("mbTid", tid), [tid]);
  const [added, setAdded] = useState<string | null>(null);
  const back = useRestoreFocus<HTMLDivElement>();
  const f = mbFuncInfo(form.fc) ?? MB_FUNCS[2];
  const r = useMemo(() => (tcp ? buildTcpRequest(form, tid, lang) : buildRequest(form, lang)), [form, lang, tcp, tid]);
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

  // 목록 이름 — «FC03 #1 @0 ×10» 처럼(TCP 는 앞에 TCP)
  const name = () =>
    `${tcp ? "TCP " : ""}FC${fc2(f.code)} #${form.slave} @${r.addr ?? 0}${f.write ? (f.max === 1 ? `=${form.valuesText.trim()}` : ` ×${r.qty}`) : ` ×${r.qty}`}`;

  return (
    <div className="modal-back" ref={back} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal mbuild" role="dialog" aria-label={tcp ? t.titleTcp : t.title}>
        <div className="modal-head">
          <b>{tcp ? t.titleTcp : t.title}</b>
          <button className="icon-btn" onClick={onClose} title={t.close} aria-label={t.close}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="mb-grid">
            {tcp && (
              <>
                <label>
                  {t.tid}
                  <NumInput min={0} max={65535} value={tid} onValue={setTid} />
                </label>
                <span className="hint">{t.tidHint}</span>
              </>
            )}
            <label>
              {tcp ? t.unit : t.slave}
              <NumInput min={0} max={tcp ? 255 : 247} value={form.slave} onValue={(n) => set({ slave: n })} />
            </label>
            <span className="hint">{tcp ? t.unitHint : t.slaveHint}</span>

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
                <span className="hint mb-span">
                  {f.bit ? t.coilsHint : t.valuesHint}
                  {f.max > 1 && r.bytes ? ` · ${t.nVals.replace("{n}", String(r.qty))} (1~${f.max})` : ""}
                </span>
              </>
            )}
          </div>

          {r.note && <div className="hint">{r.note}</div>}
          {r.error ? <div className="interlock">{r.error}</div> : !tcp && form.slave === 0 && <div className="hint warn">{t.bcast}</div>}

          <div className="mb-preview">
            <span className="hint">{tcp ? t.previewTcp : t.preview}</span>
            <code>{r.bytes ? hex(r.bytes) : "—"}</code>
            <span className="hint">{tcp ? t.tcpNote : t.crcNote}</span>
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
            <button className="btn primary" disabled={!r.bytes} title={tcp ? t.putTipTcp : t.putTip} onClick={() => r.bytes && onPut(r.bytes)}>
              {t.put}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
