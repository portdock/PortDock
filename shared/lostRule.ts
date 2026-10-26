// 끊기면 작업 표시줄 깜빡임(0.3.0)의 판단 — React·Tauri 없는 부분(시험: node --test shared/lostAlert.test.ts)

/** 이전·지금 «끊김» 값과 창이 앞에 있는지·설정으로 깜빡일지 — 끊김으로 바뀐 순간, 창이 뒤에 있을 때만 */
export function shouldFlash(prev: boolean, lost: boolean, focused: boolean, on: boolean) {
  return on && lost && !prev && !focused;
}
