// 다른 PortDock 프로그램으로 열기(0.3.0) — 백엔드 open_app(crates/core/src/launch.rs Target)을 부르고,
// 이 PC 에서 찾지 못하면 넘길 값(주소·포트 이름)을 복사하고 내려받기 페이지를 알린다.
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { copyText } from "./logCopy";
import type { ToastApi } from "./Toast";
import type { Lang } from "./uiText";

/** 열 프로그램과 넘길 값 — Rust launch::Target 과 같은 모양 */
export type OpenTarget =
  | { app: "modbus-master"; tcp?: string; rtu?: string; baud?: number; unit?: number }
  | { app: "serial"; port: string; baud?: number }
  | { app: "tcp"; connect: string };

export const APP_TITLE: Record<OpenTarget["app"], string> = {
  "modbus-master": "PortDock Modbus Master",
  serial: "PortDock Serial",
  tcp: "PortDock TCP",
};

/** 사이트의 그 프로그램 페이지(내려받기 링크가 있다) */
export const appPage = (app: OpenTarget["app"], lang: Lang) => `https://portdock.dev/${lang === "en" ? "en/" : ""}${app}/`;

const T = {
  ko: {
    opened: "{a} 를 열었습니다 — {b}. 연결은 그 창에서 누르세요.",
    missing: "이 PC 에서 {a} 를 찾지 못해 «{b}» 를 복사했습니다 — 그 프로그램에 붙여 넣으세요.",
    get: "내려받기 페이지",
  },
  en: {
    opened: "Opened {a} — {b}. Press connect in that window.",
    missing: "{a} was not found on this PC, so «{b}» was copied — paste it there.",
    get: "Download page",
  },
};
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);

/**
 * 열기 — 찾으면 true. 못 찾으면 copy 를 클립보드에 넣고 알림(내려받기 페이지 버튼)을 띄운 뒤 false.
 * 백엔드 오류(값이 잘못됨 등)는 알림으로 보이고 false
 */
export async function openInApp(target: OpenTarget, copy: string, lang: Lang, toast: ToastApi): Promise<boolean> {
  const name = APP_TITLE[target.app];
  try {
    if (await invoke<boolean>("open_app", { target })) {
      toast.show(fill(T[lang].opened, { a: name, b: copy }), { ms: 6000 });
      return true;
    }
  } catch (e) {
    toast.show(String(e), { error: true });
    return false;
  }
  await copyText(copy);
  const url = appPage(target.app, lang);
  toast.show(fill(T[lang].missing, { a: name, b: copy }), { ms: 12000, action: { label: T[lang].get, run: () => void openUrl(url).catch(() => {}) } });
  return false;
}
