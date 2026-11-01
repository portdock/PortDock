// ADC 분해능·스케일링 계산기 화면 스크립트(views/AdcPage.astro) — 5차 묶음. 영어 문장 → 일본어(열쇠는 코드의 영어 문장 그대로, {} 자리는 {0} {1} …)
export default {
  "Top clipped — {} {} gives {}, at the reference limit. Lower the shunt or ratio, or raise the reference": "上限が切れる — {0} {1} で {2} となり基準電圧の端に届きます。シャント抵抗・分圧比を下げるか、基準電圧を上げてください",
  "High end {} — {} % of the reference left as headroom": "上限 {0} — 基準電圧の {1} % が余裕として残ります",
  "Check the numbers — bits 1–32 (integer), reference and scale above 0, engineering low and high must differ": "数値を確認してください — ビット数は 1~32 の整数、基準電圧と倍率は 0 より大きく、工業値の下限と上限は違う値にする必要があります",
};
