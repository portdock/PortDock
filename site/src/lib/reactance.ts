// 리액턴스·LC 공진 — 웹 도구 «리액턴스·LC 공진 계산기».
// 근거: 정의식(교류 회로 이론)
//   용량성 리액턴스 Xc = 1 ÷ (2π f C), 유도성 리액턴스 XL = 2π f L
//   LC 공진 주파수 f0 = 1 ÷ (2π √(L C)) — 이 주파수에서 Xc = XL
//   특성 임피던스 Z0 = √(L ÷ C)
//   콘덴서에 걸린 전압 U 의 무효 전력 Q = U² ÷ Xc, 전류 I = U ÷ Xc

const pos = (x: number) => x > 0 && Number.isFinite(x);
function fin(x: number) {
  if (!pos(x)) throw new RangeError("X");
  return x;
}
function need(...xs: number[]) {
  if (!xs.every(pos)) throw new RangeError("X");
}
const W = (f: number) => 2 * Math.PI * f;

/** 용량성 리액턴스 Ω */
export function xc(f: number, c: number): number {
  need(f, c);
  return fin(1 / (W(f) * c));
}
/** 유도성 리액턴스 Ω */
export function xl(f: number, l: number): number {
  need(f, l);
  return fin(W(f) * l);
}
/** 원하는 Xc 가 되는 C(F) */
export function cForXc(f: number, x: number): number {
  need(f, x);
  return fin(1 / (W(f) * x));
}
/** 원하는 XL 이 되는 L(H) */
export function lForXl(f: number, x: number): number {
  need(f, x);
  return fin(x / W(f));
}
/** LC 공진 주파수 Hz */
export function f0(l: number, c: number): number {
  need(l, c);
  return fin(1 / (2 * Math.PI * Math.sqrt(l * c)));
}
/** f0·L → C */
export function cForF0(f: number, l: number): number {
  need(f, l);
  return fin(1 / (W(f) ** 2 * l));
}
/** f0·C → L */
export function lForF0(f: number, c: number): number {
  need(f, c);
  return fin(1 / (W(f) ** 2 * c));
}
/** 특성 임피던스 √(L/C) Ω */
export function z0(l: number, c: number): number {
  need(l, c);
  return fin(Math.sqrt(l / c));
}
/** 콘덴서 전압 U(V)·f·C → 전류 A, 무효 전력 var */
export function capLoad(u: number, f: number, c: number) {
  need(u);
  const x = xc(f, c);
  return { amps: fin(u / x), vars: fin((u * u) / x) };
}
