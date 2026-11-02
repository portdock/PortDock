// fr — 9e lot (cartes de registres Modbus : liste + 77 appareils, scope.ts SCOPE9). Modèle : ja/batch9.ts.
// Non traduits : noms de fabricants et de modèles, noms de registres, descriptions, valeurs, bits, unités, remarques et sources (les données restent en anglais).
import type { DeviceKind } from "../index.ts";
import devices from "./pages/devices.ts";
import device from "./pages/device.ts";
import summaries from "./deviceSummaries.ts";

export default {
  pages: { devices, device },
  kinds: {
    inverter: "Variateur de fréquence",
    "power-meter": "Compteur d’énergie", // comme « Power meter » dans les tables lib (lots 1 à 7)
    "temperature-controller": "Régulateur de température",
    "panel-meter": "Indicateur de tableau",
    "servo-drive": "Servovariateur",
    sensor: "Capteur",
    other: "Autre",
  } satisfies Record<DeviceKind, string>,
  summaries,
};
