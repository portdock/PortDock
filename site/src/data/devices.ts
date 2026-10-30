// 장비 레지스터 맵 — 저장소 data/devices/<제조사>/<모델>.json 을 빌드 때 읽는다(앱의 «장비 프로필» 과 같은 데이터).
// 데이터 라이선스 CC BY 4.0(data/devices/LICENSE). 검사: node tools/devices-check.mjs
import type { Device } from "@shared/devices";
import { REPO } from "./tools";
import { dataRelease } from "../lib/dataRelease";

const files = import.meta.glob<Device>("../../../data/devices/*/*.json", { eager: true, import: "default" });

/** 제조사·모델 순 */
export const DEVICES: Device[] = Object.values(files).sort((a, b) => a.manufacturer.en.localeCompare(b.manufacturer.en) || a.model.localeCompare(b.model));

/** GitHub 의 원본 JSON(늘 최신) */
export const RAW = REPO.replace("https://github.com/", "https://raw.githubusercontent.com/") + "/main/data/devices";
export const rawUrl = (d: Device) => `${RAW}/${d.id}.json`;
export const sourceUrl = (d: Device) => `${REPO}/blob/main/data/devices/${d.id}.json`;
export const SCHEMA_URL = `${RAW}/schema.json`;
export const LICENSE_URL = `${REPO}/blob/main/data/devices/LICENSE`;
export const CC_BY = "https://creativecommons.org/licenses/by/4.0/";

/** «ls-electric/ig5a» → { maker, model } (페이지 주소) */
export const devParams = (d: Device) => {
  const [maker, model] = d.id.split("/");
  return { maker, model };
};
export const devPath = (d: Device) => `devices/${d.id}/`;

/** 데이터 묶음의 판·기준일·내용 해시(lib/dataRelease.ts) — /data/ 쪽·all.json·llms.txt 가 같이 쓴다 */
export const RELEASE = dataRelease(DEVICES);
/** 인용할 주소(장비 맵 홈) */
export const dataHome = (site: URL | undefined) => new URL("/devices/", site).href;
