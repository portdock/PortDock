// 9차 묶음 — 장비 레지스터 맵(목록 + 장비 86종). 기준판 ja/batch9.ts. 제조사·모델·레지스터 이름·설명·값·주의·출처는 영어 그대로(화면이 lang="en").
import type { DeviceKind } from "../index.ts";
import devices from "./pages/devices.ts";
import device from "./pages/device.ts";
import summaries from "./deviceSummaries.ts";

export default {
  pages: { devices, device },
  kinds: {
    inverter: "Variador (VFD)",
    "power-meter": "Analizador de potencia",
    "temperature-controller": "Controlador de temperatura",
    "panel-meter": "Indicador de panel",
    "servo-drive": "Servoaccionamiento",
    sensor: "Sensor",
    other: "Otro",
  } satisfies Record<DeviceKind, string>,
  summaries,
};
