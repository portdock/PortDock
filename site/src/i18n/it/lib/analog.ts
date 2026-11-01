// Testi da lib/analogScale.ts (frase inglese → italiano)
export default {
  "Unipolar input: 0 = low, 27648 = high. 27649–32511 overrange, -1 to -4864 underrange, beyond that overflow/underflow":
    "Ingresso unipolare: 0 = inizio scala, 27648 = fondo scala. 27649–32511 campo di sovrapilotaggio, da -1 a -4864 campo di sottopilotaggio, oltre: overflow/underflow",
  "4–20 mA (R60AD6-DG 2-wire transmitter input) and 0–20 mA (R60AD4 and other current inputs) → digital output 0–32000":
    "4–20 mA (R60AD6-DG, ingresso per trasmettitori a 2 fili) e 0–20 mA (R60AD4 e altri ingressi in corrente) → valore digitale 0–32000",
  "4–20 mA → 4000–20000 (3200–21000 full range), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000":
    "4–20 mA → 4000–20000 (campo completo 3200–21000), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000",
  "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (4–20 mA spans -819 to 17407)": "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (4–20 mA va da -819 a 17407)",
  "Enter a number": "Inserite un numero",
  "Enter numbers for the ranges": "Inserite dei numeri per i campi",
  "Engineering low and high are equal": "Inizio scala e fondo scala sono uguali",
  "Count low and high are equal": "Conteggio minimo e massimo sono uguali",
  "≤ 3.6 mA — NE 43 failure signal range (open loop, sensor fault, etc.)": "≤ 3,6 mA — campo del segnale di guasto NE 43 (loop aperto, guasto del sensore ecc.)",
  "≥ 21 mA — NE 43 failure signal range": "≥ 21 mA — campo del segnale di guasto NE 43",
  "3.6–3.8 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "3,6–3,8 mA — fuori dal campo di misura NE 43 (3,8–20,5 mA)",
  "20.5–21 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "20,5–21 mA — fuori dal campo di misura NE 43 (3,8–20,5 mA)",
  "Below 4 mA — under range but inside the NE 43 measurement range (down to 3.8 mA)": "Sotto 4 mA — sotto scala ma dentro il campo di misura NE 43 (fino a 3,8 mA)",
  "Above 20 mA — over range but inside the NE 43 measurement range (up to 20.5 mA)": "Sopra 20 mA — sopra scala ma dentro il campo di misura NE 43 (fino a 20,5 mA)",
  "Within 4–20 mA": "Entro 4–20 mA",
  "Below the low end ({} {})": "Sotto l'inizio scala ({0} {1})",
  "Above the high end ({} {})": "Sopra il fondo scala ({0} {1})",
  "Within {}–{} {}": "Entro {0}–{1} {2}",
  "Count {} exceeds the module maximum ({}) — overflow": "Il conteggio {0} supera il massimo del modulo ({1}) — overflow",
  "Count {} is below the module minimum ({}) — underflow": "Il conteggio {0} è sotto il minimo del modulo ({1}) — underflow",
};
