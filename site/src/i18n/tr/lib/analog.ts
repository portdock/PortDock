// lib/analogScale.ts metinleri (İngilizce cümle → Türkçe)
export default {
  "Unipolar input: 0 = low, 27648 = high. 27649–32511 overrange, -1 to -4864 underrange, beyond that overflow/underflow":
    "Tek kutuplu giriş: 0 = alt sınır, 27648 = üst sınır. 27649–32511 üst aşım bölgesi, -1 ile -4864 arası alt aşım bölgesi, bunların ötesi taşma/alt taşma",
  "4–20 mA (R60AD6-DG 2-wire transmitter input) and 0–20 mA (R60AD4 and other current inputs) → digital output 0–32000":
    "4–20 mA (R60AD6-DG, 2 telli transmiter girişi) ve 0–20 mA (R60AD4 ve diğer akım girişleri) → dijital çıkış değeri 0–32000",
  "4–20 mA → 4000–20000 (3200–21000 full range), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000":
    "4–20 mA → 4000–20000 (tam aralık 3200–21000), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000",
  "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (4–20 mA spans -819 to 17407)": "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (4–20 mA, -819 ile 17407 arasını kapsar)",
  "Enter a number": "Bir sayı girin",
  "Enter numbers for the ranges": "Aralıklar için sayı girin",
  "Engineering low and high are equal": "Ölçüm aralığının alt ve üst değeri aynı",
  "Count low and high are equal": "Ham değerin alt ve üst sınırı aynı",
  "≤ 3.6 mA — NE 43 failure signal range (open loop, sensor fault, etc.)": "≤ 3,6 mA — NE 43 arıza sinyali bölgesi (kopuk hat, sensör arızası vb.)",
  "≥ 21 mA — NE 43 failure signal range": "≥ 21 mA — NE 43 arıza sinyali bölgesi",
  "3.6–3.8 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "3,6–3,8 mA — NE 43 ölçüm aralığının (3,8–20,5 mA) dışında",
  "20.5–21 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "20,5–21 mA — NE 43 ölçüm aralığının (3,8–20,5 mA) dışında",
  "Below 4 mA — under range but inside the NE 43 measurement range (down to 3.8 mA)": "4 mA’nın altında — aralığın altında ama NE 43 ölçüm aralığının içinde (3,8 mA’ya kadar)",
  "Above 20 mA — over range but inside the NE 43 measurement range (up to 20.5 mA)": "20 mA’nın üstünde — aralığın üstünde ama NE 43 ölçüm aralığının içinde (20,5 mA’ya kadar)",
  "Within 4–20 mA": "4–20 mA içinde",
  "Below the low end ({} {})": "Alt sınırın altında ({0} {1})",
  "Above the high end ({} {})": "Üst sınırın üstünde ({0} {1})",
  "Within {}–{} {}": "{0}–{1} {2} içinde",
  "Count {} exceeds the module maximum ({}) — overflow": "Ham değer {0}, modülün en büyük değerini ({1}) aşıyor — taşma",
  "Count {} is below the module minimum ({}) — underflow": "Ham değer {0}, modülün en küçük değerinin ({1}) altında — alt taşma",
};
