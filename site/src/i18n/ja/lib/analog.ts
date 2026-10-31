// lib/analogScale.ts 문구(영어 문장 → 일본어)
export default {
  "Unipolar input: 0 = low, 27648 = high. 27649–32511 overrange, -1 to -4864 underrange, beyond that overflow/underflow":
    "単極入力: 0 = 下限、27648 = 上限。27649~32511 は上限超過、-1~-4864 は下限未満、その外はオーバーフロー・アンダーフロー",
  "4–20 mA (R60AD6-DG 2-wire transmitter input) and 0–20 mA (R60AD4 and other current inputs) → digital output 0–32000":
    "4~20 mA(R60AD6-DG の 2 線式伝送器入力)・0~20 mA(R60AD4 などの電流入力)→ デジタル出力値 0~32000",
  "4–20 mA → 4000–20000 (3200–21000 full range), 0–20 mA → 0–20000, 0–10 V → 0–10000, 1–5 V → 1000–5000":
    "4~20 mA → 4000~20000(3200~21000 まで)、0~20 mA → 0~20000、0~10 V → 0~10000、1~5 V → 1000~5000",
  "4–20 mA, 0–20 mA, 0–10 V → 0–16383 (4–20 mA spans -819 to 17407)": "4~20 mA・0~20 mA・0~10 V → 0~16383(4~20 mA は -819~17407 まで)",
  "Enter a number": "数値を入れてください",
  "Enter numbers for the ranges": "範囲に数値を入れてください",
  "Engineering low and high are equal": "工業値の下限と上限が同じです",
  "Count low and high are equal": "デジタル値の下限と上限が同じです",
  "≤ 3.6 mA — NE 43 failure signal range (open loop, sensor fault, etc.)": "3.6 mA 以下 — NE 43 の故障信号の範囲(断線・センサ故障など)",
  "≥ 21 mA — NE 43 failure signal range": "21 mA 以上 — NE 43 の故障信号の範囲",
  "3.6–3.8 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "3.6~3.8 mA — NE 43 の測定範囲(3.8~20.5 mA)の外",
  "20.5–21 mA — outside the NE 43 measurement range (3.8–20.5 mA)": "20.5~21 mA — NE 43 の測定範囲(3.8~20.5 mA)の外",
  "Below 4 mA — under range but inside the NE 43 measurement range (down to 3.8 mA)": "4 mA 未満 — 下限を下回るが NE 43 の測定範囲(3.8 mA まで)の中",
  "Above 20 mA — over range but inside the NE 43 measurement range (up to 20.5 mA)": "20 mA 超 — 上限を超えるが NE 43 の測定範囲(20.5 mA まで)の中",
  "Within 4–20 mA": "範囲内(4~20 mA)",
  "Below the low end ({} {})": "下限({0} {1})未満",
  "Above the high end ({} {})": "上限({0} {1})超",
  "Within {}–{} {}": "範囲内({0}~{1} {2})",
  "Count {} exceeds the module maximum ({}) — overflow": "デジタル値 {0} がユニットの最大値({1})を超えています(オーバーフロー)",
  "Count {} is below the module minimum ({}) — underflow": "デジタル値 {0} がユニットの最小値({1})を下回っています(アンダーフロー)",
};
