// Texte aus lib/analogScale.ts (englischer Satz → Deutsch)
export default {
  "Unipolar input: 0 = low, 27648 = high. 27649–32511 overrange, -1 to -4864 underrange, beyond that overflow/underflow":
    "Unipolarer Eingang: 0 = Anfang, 27648 = Ende. 27649–32511 Übersteuerungsbereich, -1 bis -4864 Untersteuerungsbereich, darüber hinaus Überlauf/Unterlauf",
  "4–20 mA (R60AD6-DG 2-wire transmitter input) and 0–20 mA (R60AD4 and other current inputs) → digital output 0–32000":
    "4–20 mA (R60AD6-DG, Eingang für 2-Leiter-Messumformer) und 0–20 mA (R60AD4 und andere Stromeingänge) → Digitalwert 0–32000",
  "4–20 mA → 4000–20000 (3200–21000 full range), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000":
    "4–20 mA → 4000–20000 (Gesamtbereich 3200–21000), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000",
  "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (4–20 mA spans -819 to 17407)": "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (4–20 mA reicht von -819 bis 17407)",
  "Enter a number": "Bitte eine Zahl eingeben",
  "Enter numbers for the ranges": "Bitte Zahlen für die Bereiche eingeben",
  "Engineering low and high are equal": "Messbereichsanfang und -ende sind gleich",
  "Count low and high are equal": "Rohwert unten und oben sind gleich",
  "≤ 3.6 mA — NE 43 failure signal range (open loop, sensor fault, etc.)": "≤ 3,6 mA — Ausfallsignal nach NE 43 (Drahtbruch, Sensorfehler usw.)",
  "≥ 21 mA — NE 43 failure signal range": "≥ 21 mA — Ausfallsignal nach NE 43",
  "3.6–3.8 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "3,6–3,8 mA — außerhalb des Messbereichs nach NE 43 (3,8–20,5 mA)",
  "20.5–21 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "20,5–21 mA — außerhalb des Messbereichs nach NE 43 (3,8–20,5 mA)",
  "Below 4 mA — under range but inside the NE 43 measurement range (down to 3.8 mA)": "Unter 4 mA — unterhalb des Bereichs, aber innerhalb des Messbereichs nach NE 43 (bis 3,8 mA)",
  "Above 20 mA — over range but inside the NE 43 measurement range (up to 20.5 mA)": "Über 20 mA — oberhalb des Bereichs, aber innerhalb des Messbereichs nach NE 43 (bis 20,5 mA)",
  "Within 4–20 mA": "Innerhalb 4–20 mA",
  "Below the low end ({} {})": "Unter dem Bereichsanfang ({0} {1})",
  "Above the high end ({} {})": "Über dem Bereichsende ({0} {1})",
  "Within {}–{} {}": "Innerhalb {0}–{1} {2}",
  "Count {} exceeds the module maximum ({}) — overflow": "Rohwert {0} überschreitet das Maximum der Baugruppe ({1}) — Überlauf",
  "Count {} is below the module minimum ({}) — underflow": "Rohwert {0} unterschreitet das Minimum der Baugruppe ({1}) — Unterlauf",
};
