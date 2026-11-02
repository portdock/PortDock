// Bahasa Indonesia — paket 9 (peta register perangkat: daftar + 77 perangkat, scope.ts SCOPE9). Contoh: ja/batch9.ts.
// Tidak diterjemahkan: nama pabrikan dan model, nama/deskripsi/nilai/bit/satuan register, catatan, nama-edisi-halaman dokumen sumber (data tetap berbahasa Inggris — layar memakai lang="en").
import type { DeviceKind } from "../index.ts";
import devices from "./pages/devices.ts";
import device from "./pages/device.ts";
import summaries from "./deviceSummaries.ts";

export default {
  pages: { devices, device },
  kinds: {
    inverter: "Inverter frekuensi (VFD)",
    "power-meter": "Meter daya",
    "temperature-controller": "Pengendali suhu",
    "panel-meter": "Meter panel",
    "servo-drive": "Penggerak servo",
    sensor: "Sensor",
    other: "Lainnya",
  } satisfies Record<DeviceKind, string>,
  summaries,
};
