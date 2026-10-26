// 포트 고르기(0.3.0) — 목록에 없는 COM 을 직접 넣기. React·Tauri 없는 부분(시험: node --test shared/portPick.test.ts)
// 직접 넣은 포트는 localStorage «manualPort» 에 하나만 기억한다 — 목록에 없어도 다른 포트로 저절로 바뀌지 않고 «연결» 이 된다.
import { load, store } from "./framing.ts";

/** «COM3»·«com12»·«\\.\COM12»·« COM 7 » → «COM3»·«COM12». COM1~COM256 만, 아니면 null */
export function comName(s: string): string | null {
  const m = /^(?:\\\\\.\\)?com\s*(\d{1,3})$/i.exec(s.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 256 ? `COM${n}` : null;
}

/** 직접 넣은 포트(없으면 "") */
export const manualPort = (): string => {
  const v = load<string>("manualPort", "");
  return comName(v) ?? "";
};

export const setManualPort = (name: string) => store("manualPort", comName(name) ?? "");

/** 이 포트로 연결해도 되는지 — 목록에 있거나, 사용자가 직접 넣은 포트 */
export function portUsable(ports: readonly { name: string }[], name: string, manual: string = manualPort()): boolean {
  if (!name) return false;
  return ports.some((p) => p.name.toLowerCase() === name.toLowerCase()) || (manual !== "" && manual.toLowerCase() === name.toLowerCase());
}

/** 고르기 칸의 추가 항목 — 지금 값이 목록에 없을 때: 직접 넣은 것이면 "manual", 아니면 "missing", 목록에 있거나 비면 null */
export function extraChoice(ports: readonly { name: string }[], value: string, manual: string = manualPort()): "manual" | "missing" | null {
  if (!value || ports.some((p) => p.name.toLowerCase() === value.toLowerCase())) return null;
  return manual !== "" && manual.toLowerCase() === value.toLowerCase() ? "manual" : "missing";
}
