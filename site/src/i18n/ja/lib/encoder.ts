// 엔코더 펄스 ↔ rpm 계산기 화면 스크립트(views/EncoderPage.astro) — 5차 묶음. 영어 문장 → 일본어(열쇠는 코드의 영어 문장 그대로, {} 자리는 {0} {1} …)
export default {
  "1 count": "1 カウント",
  "{} rpm is within the response frequency ({} ≤ {} per channel)": "{0} rpm は最大応答周波数の範囲内(1 相 {1} ≤ {2})",
  "{} rpm exceeds the response frequency ({} > {} per channel) — lower the PPR or use a faster input": "{0} rpm は最大応答周波数を超えています(1 相 {1} > {2})— PPR を下げるか、より高速な入力が必要です",
  "Check the numbers — PPR must be above 0": "数値を確認してください — PPR は 0 より大きくする必要があります",
};
