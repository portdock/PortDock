// 일본어 — 9차 묶음(장비 레지스터 맵 — 목록 1쪽 + 장비 77종, scope.ts SCOPE9). 기준판: 다른 언어는 이 파일과 여기서 가져오는 pages/devices.ts·pages/device.ts·deviceSummaries.ts 를 본떠 옮긴다(site/I18N.md «9차 묶음 붙이는 법»).
// pages = 화면 공통 글(devices 목록 views/DevicesIndex.astro, device 장비 한 종 views/DevicePage.astro — 77종이 함께 쓴다),
// kinds = 장비 종류 이름(shared/devices.ts KIND_TEXT — 목록의 묶음 머리·장비 쪽 머리·검색 설명), summaries = 장비마다 요약(장비 id → data/devices/<id>.json 의 summary.en 번역).
// 옮기지 않는 것: 제조사·모델 이름, 레지스터 이름·설명·값·비트·단위, 통신 주의(comm.notes)·주의(notes), 출처의 문서 이름·판·쪽 — 데이터 영어 그대로(화면이 lang="en" 을 단다).
import type { DeviceKind } from "../index.ts";
import devices from "./pages/devices.ts";
import device from "./pages/device.ts";
import summaries from "./deviceSummaries.ts";

export default {
  pages: { devices, device },
  kinds: {
    inverter: "インバーター",
    "power-meter": "電力量計・電力計", // 1~7차 lib 표의 «Power meter»(시운전·IO 리스트·구성도의 장비 종류)와 같은 번역
    "temperature-controller": "温度調節器",
    "panel-meter": "パネルメーター",
    "servo-drive": "サーボアンプ",
    sensor: "センサー",
    other: "その他",
  } satisfies Record<DeviceKind, string>,
  summaries,
};
