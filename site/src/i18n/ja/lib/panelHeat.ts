// 제어반 발열 계산(lib/panelHeat.ts) — 7차 묶음. 설치 방식 이름·판단 글. 영어 문장 → 일본어
export default {
  "Single enclosure, free-standing on all sides": "単独設置、四方が開放",
  "Single enclosure, wall-mounted": "単独設置、背面が壁",
  "First or last in a row, free-standing": "列の端、四方が開放",
  "First or last in a row, wall-mounted": "列の端、背面が壁",
  "Middle of a row, free-standing": "列の中間、四方が開放",
  "Middle of a row, wall-mounted": "列の中間、背面が壁",
  "Middle of a row, wall-mounted, top covered": "列の中間、背面が壁・天面が覆われている",
  "Natural convection is enough by this calculation (no fan).": "この計算では自然放熱で足ります(ファンなし)。",
  "A filter fan can remove the heat — pick a fan with at least the airflow below.": "フィルタ付きファンで排出できる計算です — 下の風量以上のファンを選んでください。",
  "The ambient is less than 5 K below the allowed internal temperature, so the airflow gets large — also consider a cooling unit or heat exchanger (Rittal: ambient should be about 5 K lower).": "外気と盤内許容温度の差が 5 K より小さいため、ファン風量が大きくなります — 盤用クーラーや熱交換器も検討してください(Rittal: 外気は約 5 K 低いことが目安)。",
  "The ambient is at or above the allowed internal temperature — a fan with outside air cannot get below it. Look at a cooling unit or air/water heat exchanger.": "外気が盤内許容温度以上です — 外気を入れるファンでは、盤内をそれより下げられません。盤用クーラーや空気/水熱交換器を検討してください。",
};
