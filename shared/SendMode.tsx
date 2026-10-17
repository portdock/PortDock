// 보내기 칸 HEX ↔ ASCII 바꾸기 — 같은 바이트의 새 표기로 옮기고, 켜져 있는 체크섬은 확인 창 대신 알림줄로 알린다.
// Serial·TCP·UDP·Simulator 공통.
import { useState, type Dispatch, type SetStateAction } from "react";
import { CHECKSUMS, type ChecksumKind } from "./format";
import { convertNotation, type TextMode } from "./notation";
import { ui, type Lang } from "./uiText";

type Spec = { text: string; mode: TextMode; checksum: ChecksumKind | null; suffix: string };

/** 체크섬이 붙이는 바이트 수 */
export const checksumLen = (k: ChecksumKind) => (k.startsWith("crc16") || k === "sum16" ? 2 : 1);

export function useModeSwitch<S extends Spec>(spec: S, setSpec: Dispatch<SetStateAction<S>>, lang: Lang) {
  // conv: 표기를 바꿨다는 안내(또는 못 바꾼 이유), ck: 바꿀 때 켜져 있던 체크섬
  const [note, setNote] = useState<{ conv: string | null; convFail: boolean; ck: ChecksumKind | null } | null>(null);

  const changeMode = (mode: TextMode) => {
    if (mode === spec.mode) return;
    const r = convertNotation(spec.text, spec.mode, mode, lang);
    setSpec((s) => ({ ...s, mode, text: r.text }));
    const conv = !spec.text.trim() ? null : r.error ? ui(lang, "convFail", { b: mode.toUpperCase(), e: r.error }) : ui(lang, mode === "ascii" ? "convHexToAscii" : "convAsciiToHex");
    setNote(conv || spec.checksum ? { conv, convFail: !!r.error, ck: spec.checksum } : null);
  };
  /** 글을 고치면 표기 안내는 내린다(체크섬 알림은 체크섬을 끄거나 ✕ 할 때까지) */
  const onEdit = () => setNote((n) => (n && n.conv ? (n.ck ? { ...n, conv: null } : null) : n));

  const ckOn = !!note?.ck && spec.checksum === note.ck;
  const label = note?.ck ? (CHECKSUMS.find((c) => c.kind === note.ck)?.label ?? note.ck) : "";
  const node =
    note && (note.conv || ckOn) ? (
      <div className="mode-notes">
        {ckOn && (
          <div className="notice warn" role="status">
            <span>{ui(lang, "ckStillOn", { a: label, b: spec.mode.toUpperCase(), n: checksumLen(note.ck!) })}</span>
            <button
              type="button"
              className="btn small"
              onClick={() => {
                setSpec((s) => ({ ...s, checksum: null }));
                setNote((n) => (n && n.conv ? { ...n, ck: null } : null));
              }}
            >
              {ui(lang, "ckOff")}
            </button>
            <button type="button" className="btn small ghost" onClick={() => setNote((n) => (n && n.conv ? { ...n, ck: null } : null))} aria-label={ui(lang, "closeNote")} title={ui(lang, "closeNote")}>
              ✕
            </button>
          </div>
        )}
        {note.conv && (
          <div className={note.convFail ? "notice warn" : "notice"} role="status">
            <span>{note.conv}</span>
            <button type="button" className="btn small ghost" onClick={() => setNote((n) => (n && n.ck ? { ...n, conv: null } : null))} aria-label={ui(lang, "closeNote")} title={ui(lang, "closeNote")}>
              ✕
            </button>
          </div>
        )}
      </div>
    ) : null;

  return { changeMode, onEdit, node };
}
