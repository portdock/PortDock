// 절연 저항 판정(lib/insulation.ts·views/InsulationPage.astro) — 7차 묶음. 회로 이름·판정·결과 복사 글. 영어 문장 → 일본어
export default {
  "SELV and PELV (extra-low voltage: ≤ 50 V AC, ≤ 120 V DC)": "SELV・PELV(特別低電圧: AC 50 V 以下・DC 120 V 以下)",
  "FELV, up to 500 V (e.g. 230 V, 400 V, 480 V)": "FELV、500 V 以下(例: 230 V・400 V・480 V)",
  "Above 500 V (up to 1000 V)": "500 V 超(1000 V まで)",
  "No issue found (in this measurement)": "問題なし(この測定の範囲で)",
  "Worth a look": "要確認",
  Problem: "問題あり",
  "Enter the test voltage and the reading (MΩ).": "試験電圧と測定値(MΩ)を入れてください。",
  "{} MΩ — below the {} MΩ minimum.": "{0} MΩ — 最小値 {1} MΩ を下回っています。",
  "Possible causes: moisture, dust or water ingress, damaged insulation, contaminated terminals, or equipment left connected (surge protectors, EMC filters, drives). Split the circuit into sections and measure again.": "原因の候補: 湿気・ほこり・浸水、被覆の損傷、端子台の汚れ、外していない機器(サージ保護器・ノイズフィルタ・インバーター)が回路に残っている。区間を分けて測り直してください。",
  "{} MΩ — at or above the {} MΩ minimum.": "{0} MΩ — 最小値 {1} MΩ 以上です。",
  "The {} V test voltage is lower than the specified DC {} V — a good result at a lower voltage may not hold at the specified one.": "試験電圧 {0} V は規定の試験電圧(DC {1} V)より低くなっています — 低い電圧で高い値が出ても、規定の電圧では違うことがあります。",
  "The {} V test voltage is higher than the specified DC {} V — check the equipment on this circuit can withstand it first (risk of damaging electronics).": "試験電圧 {0} V は規定の試験電圧(DC {1} V)より高くなっています — この回路の機器が耐えられるか先に確認してください(電子機器を傷めるおそれ)。",
  "Insulation resistance check": "絶縁抵抗の判定",
  Circuit: "回路",
  Test: "測定",
  requirement: "基準",
};
