// pl — 9. paczka (mapy rejestrów Modbus: lista + 86 urządzeń, scope.ts SCOPE9). Wzór: ja/batch9.ts.
// Nie tłumaczymy: nazw producentów i modeli, nazw rejestrów, opisów, wartości, bitów, jednostek, uwag i źródeł (dane zostają po angielsku).
import type { DeviceKind } from "../index.ts";
import devices from "./pages/devices.ts";
import device from "./pages/device.ts";
import summaries from "./deviceSummaries.ts";

export default {
  pages: { devices, device },
  kinds: {
    inverter: "Falownik",
    "power-meter": "Miernik mocy", // jak «Power meter» w tabelach lib (paczki 1–7)
    "temperature-controller": "Regulator temperatury",
    "panel-meter": "Miernik panelowy",
    "servo-drive": "Serwonapęd",
    sensor: "Czujnik",
    other: "Inne",
  } satisfies Record<DeviceKind, string>,
  summaries,
};
