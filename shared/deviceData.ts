// 내장 장비 프로필 — 빌드 때 data/devices/<제조사>/<모델>.json 을 모두 묶는다(Vite import.meta.glob).
// 검사는 node tools/devices-check.mjs (CI). 데이터 라이선스: CC BY 4.0 (data/devices/LICENSE)
import type { Device } from "./devices";

const files = import.meta.glob<Device>("../data/devices/*/*.json", { eager: true, import: "default" });

/** 제조사·모델 순 */
export const DEVICES: Device[] = Object.values(files).sort((a, b) => a.manufacturer.en.localeCompare(b.manufacturer.en) || a.model.localeCompare(b.model));
