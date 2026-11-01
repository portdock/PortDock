// Textos de lib/analogScale.ts (frase em inglês → português)
export default {
  "Unipolar input: 0 = low, 27648 = high. 27649–32511 overrange, -1 to -4864 underrange, beyond that overflow/underflow":
    "Entrada unipolar: 0 = mínimo, 27648 = máximo. 27649–32511 acima da faixa, -1 a -4864 abaixo da faixa; além disso, overflow/underflow",
  "4–20 mA (R60AD6-DG 2-wire transmitter input) and 0–20 mA (R60AD4 and other current inputs) → digital output 0–32000":
    "4–20 mA (entrada para transmissor a 2 fios do R60AD6-DG) e 0–20 mA (R60AD4 e outras entradas de corrente) → valor digital 0–32000",
  "4–20 mA → 4000–20000 (3200–21000 full range), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000":
    "4–20 mA → 4000–20000 (faixa total 3200–21000), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000",
  "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (4–20 mA spans -819 to 17407)": "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (em 4–20 mA vai de -819 a 17407)",
  "Enter a number": "Informe um número",
  "Enter numbers for the ranges": "Informe números para as faixas",
  "Engineering low and high are equal": "Os limites inferior e superior de engenharia são iguais",
  "Count low and high are equal": "O valor digital mínimo e o máximo são iguais",
  "≤ 3.6 mA — NE 43 failure signal range (open loop, sensor fault, etc.)": "≤ 3,6 mA — faixa de sinal de falha da NE 43 (malha aberta, falha do sensor etc.)",
  "≥ 21 mA — NE 43 failure signal range": "≥ 21 mA — faixa de sinal de falha da NE 43",
  "3.6–3.8 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "3,6–3,8 mA — fora da faixa de medição da NE 43 (3,8–20,5 mA)",
  "20.5–21 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "20,5–21 mA — fora da faixa de medição da NE 43 (3,8–20,5 mA)",
  "Below 4 mA — under range but inside the NE 43 measurement range (down to 3.8 mA)": "Abaixo de 4 mA — abaixo da faixa, mas dentro da faixa de medição da NE 43 (até 3,8 mA)",
  "Above 20 mA — over range but inside the NE 43 measurement range (up to 20.5 mA)": "Acima de 20 mA — acima da faixa, mas dentro da faixa de medição da NE 43 (até 20,5 mA)",
  "Within 4–20 mA": "Dentro de 4–20 mA",
  "Below the low end ({} {})": "Abaixo do limite inferior ({0} {1})",
  "Above the high end ({} {})": "Acima do limite superior ({0} {1})",
  "Within {}–{} {}": "Dentro de {0}–{1} {2}",
  "Count {} exceeds the module maximum ({}) — overflow": "O valor digital {0} passa do máximo do módulo ({1}) — overflow",
  "Count {} is below the module minimum ({}) — underflow": "O valor digital {0} está abaixo do mínimo do módulo ({1}) — underflow",
};
