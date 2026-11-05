// Türkçe — 9. paket (cihaz register haritaları: liste + 86 cihaz, scope.ts SCOPE9). Örnek: ja/batch9.ts.
// Çevrilmeyenler: üretici ve model adları, register adları/açıklamaları/değerleri/bitleri/birimleri, notlar, kaynak belge adı-baskı-sayfa (veri İngilizce kalır — ekran lang="en" taşır).
import type { DeviceKind } from "../index.ts";
import devices from "./pages/devices.ts";
import device from "./pages/device.ts";
import summaries from "./deviceSummaries.ts";

export default {
  pages: { devices, device },
  kinds: {
    inverter: "Sürücü (VFD)",
    "power-meter": "Güç ölçer",
    "temperature-controller": "Sıcaklık kontrol cihazı",
    "panel-meter": "Pano tipi gösterge",
    "servo-drive": "Servo sürücü",
    sensor: "Sensör",
    other: "Diğer",
  } satisfies Record<DeviceKind, string>,
  summaries,
};
