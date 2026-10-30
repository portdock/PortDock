// 내려받기 쪽에 보이는 버전·파일 크기·SHA256SUMS 주소.
// 버전은 빌드 때 앱 package.json 에서 읽는다(릴리스 절차 1에서 12개 앱을 같은 값으로 올린다 — docs/release.md).
// 크기는 v0.5.0 릴리스 파일(gh api …/releases/latest 의 size, 2026-10-30)을 어림한 값 — 앱마다 조금씩 다르고 판마다 크게 바뀌지 않는다.
//   설치판 3.6~4.0MB · 오프라인 설치판 219.6~220.0MB(WebView2 런타임 동봉) · 휴대판 2.3~2.8MB. 크게 달라지면 여기만 고친다.
import pkg from "../../../apps/serial/package.json";
import type { L } from "./tools";
import { latest } from "./tools";

export const VERSION: string = pkg.version;
export const SIZE: Record<"setup" | "offline" | "portable", L> = {
  setup: { ko: "약 4MB", en: "about 4 MB" },
  offline: { ko: "약 220MB", en: "about 220 MB" },
  portable: { ko: "약 3MB", en: "about 3 MB" },
};
export const SHA256SUMS = latest("SHA256SUMS.txt");
