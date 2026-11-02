// de — 9. Paket (Modbus-Registerbelegungen: Liste + 77 Geräte, scope.ts SCOPE9). Vorlage: ja/batch9.ts.
// Nicht übersetzt: Hersteller- und Modellnamen, Registernamen, Beschreibungen, Werte, Bits, Einheiten, Hinweise und Quellenangaben (Daten bleiben Englisch).
import type { DeviceKind } from "../index.ts";
import devices from "./pages/devices.ts";
import device from "./pages/device.ts";
import summaries from "./deviceSummaries.ts";

export default {
  pages: { devices, device },
  kinds: {
    inverter: "Frequenzumrichter",
    "power-meter": "Leistungsmesser", // wie «Power meter» in den lib-Tabellen (1.–7. Paket)
    "temperature-controller": "Temperaturregler",
    "panel-meter": "Einbaumessgerät",
    "servo-drive": "Servoregler",
    sensor: "Fühler",
    other: "Sonstiges",
  } satisfies Record<DeviceKind, string>,
  summaries,
};
