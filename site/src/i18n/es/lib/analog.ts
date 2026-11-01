// lib/analogScale.ts 문구(영어 문장 → 스페인어)
export default {
  "Unipolar input: 0 = low, 27648 = high. 27649–32511 overrange, -1 to -4864 underrange, beyond that overflow/underflow":
    "Entrada unipolar: 0 = mínimo, 27648 = máximo. 27649–32511 rebase por exceso, -1 a -4864 rebase por defecto; más allá, desbordamiento por exceso o por defecto",
  "4–20 mA (R60AD6-DG 2-wire transmitter input) and 0–20 mA (R60AD4 and other current inputs) → digital output 0–32000":
    "4–20 mA (entrada de transmisor a 2 hilos del R60AD6-DG) y 0–20 mA (R60AD4 y otras entradas de corriente) → valor digital 0–32000",
  "4–20 mA → 4000–20000 (3200–21000 full range), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000":
    "4–20 mA → 4000–20000 (rango completo 3200–21000), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000",
  "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (4–20 mA spans -819 to 17407)": "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (4–20 mA abarca de -819 a 17407)",
  "Enter a number": "Escriba un número",
  "Enter numbers for the ranges": "Escriba números para los rangos",
  "Engineering low and high are equal": "El valor de ingeniería mínimo y el máximo son iguales",
  "Count low and high are equal": "Las cuentas mínimo y máximo son iguales",
  "≤ 3.6 mA — NE 43 failure signal range (open loop, sensor fault, etc.)": "≤ 3.6 mA: rango de señal de fallo según NE 43 (lazo abierto, fallo del sensor, etc.)",
  "≥ 21 mA — NE 43 failure signal range": "≥ 21 mA: rango de señal de fallo según NE 43",
  "3.6–3.8 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "3.6–3.8 mA: fuera del rango de medida de NE 43 (3.8–20.5 mA)",
  "20.5–21 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "20.5–21 mA: fuera del rango de medida de NE 43 (3.8–20.5 mA)",
  "Below 4 mA — under range but inside the NE 43 measurement range (down to 3.8 mA)": "Menos de 4 mA: por debajo del rango, pero dentro del rango de medida de NE 43 (hasta 3.8 mA)",
  "Above 20 mA — over range but inside the NE 43 measurement range (up to 20.5 mA)": "Más de 20 mA: por encima del rango, pero dentro del rango de medida de NE 43 (hasta 20.5 mA)",
  "Within 4–20 mA": "Dentro de 4–20 mA",
  "Below the low end ({} {})": "Por debajo del mínimo ({0} {1})",
  "Above the high end ({} {})": "Por encima del máximo ({0} {1})",
  "Within {}–{} {}": "Dentro de {0}–{1} {2}",
  "Count {} exceeds the module maximum ({}) — overflow": "Las cuentas {0} superan el máximo del módulo ({1}): desbordamiento",
  "Count {} is below the module minimum ({}) — underflow": "Las cuentas {0} están por debajo del mínimo del módulo ({1}): desbordamiento por defecto",
};
