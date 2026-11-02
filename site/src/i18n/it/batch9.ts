// 9차 묶음 — 장비 레지스터 맵(목록 + 장비 77종). 기준판 ja/batch9.ts. 제조사·모델·레지스터 이름·설명·값·주의·출처는 영어 그대로(화면이 lang="en").
import type { DeviceKind } from "../index.ts";
import devices from "./pages/devices.ts";
import device from "./pages/device.ts";
import summaries from "./deviceSummaries.ts";

export default {
  pages: { devices, device },
  kinds: {
    inverter: "Inverter (VFD)",
    "power-meter": "Misuratore di potenza",
    "temperature-controller": "Regolatore di temperatura",
    "panel-meter": "Indicatore da pannello",
    "servo-drive": "Servoazionamento",
    sensor: "Sensore",
    other: "Altro",
  } satisfies Record<DeviceKind, string>,
  summaries,
};
