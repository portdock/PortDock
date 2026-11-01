// lib/analogScale.ts 문구(영어 문장 → 프랑스어). 본문 소수점은 쉼표
export default {
  "Unipolar input: 0 = low, 27648 = high. 27649–32511 overrange, -1 to -4864 underrange, beyond that overflow/underflow":
    "Entrée unipolaire : 0 = bas, 27648 = haut. 27649–32511 dépassement haut de plage, -1 à -4864 dépassement bas, au-delà débordement haut/bas",
  "4–20 mA (R60AD6-DG 2-wire transmitter input) and 0–20 mA (R60AD4 and other current inputs) → digital output 0–32000":
    "4–20 mA (entrée transmetteur 2 fils R60AD6-DG) et 0–20 mA (R60AD4 et autres entrées courant) → valeur numérique 0–32000",
  "4–20 mA → 4000–20000 (3200–21000 full range), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000":
    "4–20 mA → 4000–20000 (3200–21000 sur toute la plage), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000",
  "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (4–20 mA spans -819 to 17407)": "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (en 4–20 mA, de -819 à 17407)",
  "Enter a number": "Saisissez un nombre",
  "Enter numbers for the ranges": "Saisissez des nombres pour les plages",
  "Engineering low and high are equal": "Les valeurs physiques basse et haute sont égales",
  "Count low and high are equal": "Les valeurs numériques basse et haute sont égales",
  "≤ 3.6 mA — NE 43 failure signal range (open loop, sensor fault, etc.)": "≤ 3,6 mA — plage de signal de défaillance NE 43 (boucle ouverte, capteur défectueux, etc.)",
  "≥ 21 mA — NE 43 failure signal range": "≥ 21 mA — plage de signal de défaillance NE 43",
  "3.6–3.8 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "3,6–3,8 mA — hors de la plage de mesure NE 43 (3,8–20,5 mA)",
  "20.5–21 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "20,5–21 mA — hors de la plage de mesure NE 43 (3,8–20,5 mA)",
  "Below 4 mA — under range but inside the NE 43 measurement range (down to 3.8 mA)": "Sous 4 mA — sous la plage, mais dans la plage de mesure NE 43 (jusqu’à 3,8 mA)",
  "Above 20 mA — over range but inside the NE 43 measurement range (up to 20.5 mA)": "Au-dessus de 20 mA — au-dessus de la plage, mais dans la plage de mesure NE 43 (jusqu’à 20,5 mA)",
  "Within 4–20 mA": "Dans la plage 4–20 mA",
  "Below the low end ({} {})": "Sous la limite basse ({0} {1})",
  "Above the high end ({} {})": "Au-dessus de la limite haute ({0} {1})",
  "Within {}–{} {}": "Dans la plage {0}–{1} {2}",
  "Count {} exceeds the module maximum ({}) — overflow": "La valeur numérique {0} dépasse le maximum du module ({1}) — débordement",
  "Count {} is below the module minimum ({}) — underflow": "La valeur numérique {0} est sous le minimum du module ({1}) — débordement bas",
};
