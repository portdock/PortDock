// lib/analogScale.ts 문구(영어 문장 → 폴란드어). 용어: wartość fizyczna, wartość cyfrowa(count)
export default {
  "Unipolar input: 0 = low, 27648 = high. 27649–32511 overrange, -1 to -4864 underrange, beyond that overflow/underflow":
    "Wejście unipolarne: 0 = dół zakresu, 27648 = góra zakresu. 27649–32511 to przekroczenie zakresu, od -1 do -4864 zejście poniżej zakresu, dalej przepełnienie/niedomiar",
  "4–20 mA (R60AD6-DG 2-wire transmitter input) and 0–20 mA (R60AD4 and other current inputs) → digital output 0–32000":
    "4–20 mA (wejście przetwornika 2-przewodowego R60AD6-DG) i 0–20 mA (R60AD4 i inne wejścia prądowe) → wartość cyfrowa 0–32000",
  "4–20 mA → 4000–20000 (3200–21000 full range), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000":
    "4–20 mA → 4000–20000 (pełny zakres 3200–21000), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000",
  "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (4–20 mA spans -819 to 17407)": "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (dla 4–20 mA od -819 do 17407)",
  "Enter a number": "Wpisz liczbę",
  "Enter numbers for the ranges": "Wpisz liczby dla zakresów",
  "Engineering low and high are equal": "Dolna i górna granica wartości fizycznej są równe",
  "Count low and high are equal": "Dolna i górna granica wartości cyfrowej są równe",
  "≤ 3.6 mA — NE 43 failure signal range (open loop, sensor fault, etc.)": "≤ 3,6 mA — zakres sygnału awarii NE 43 (przerwana pętla, uszkodzenie czujnika itp.)",
  "≥ 21 mA — NE 43 failure signal range": "≥ 21 mA — zakres sygnału awarii NE 43",
  "3.6–3.8 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "3,6–3,8 mA — poza zakresem pomiarowym NE 43 (3,8–20,5 mA)",
  "20.5–21 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "20,5–21 mA — poza zakresem pomiarowym NE 43 (3,8–20,5 mA)",
  "Below 4 mA — under range but inside the NE 43 measurement range (down to 3.8 mA)": "Poniżej 4 mA — pod zakresem, ale w zakresie pomiarowym NE 43 (do 3,8 mA)",
  "Above 20 mA — over range but inside the NE 43 measurement range (up to 20.5 mA)": "Powyżej 20 mA — ponad zakresem, ale w zakresie pomiarowym NE 43 (do 20,5 mA)",
  "Within 4–20 mA": "W zakresie 4–20 mA",
  "Below the low end ({} {})": "Poniżej dolnej granicy ({0} {1})",
  "Above the high end ({} {})": "Powyżej górnej granicy ({0} {1})",
  "Within {}–{} {}": "W zakresie {0}–{1} {2}",
  "Count {} exceeds the module maximum ({}) — overflow": "Wartość cyfrowa {0} przekracza maksimum modułu ({1}) — przepełnienie",
  "Count {} is below the module minimum ({}) — underflow": "Wartość cyfrowa {0} jest poniżej minimum modułu ({1}) — niedomiar",
};
