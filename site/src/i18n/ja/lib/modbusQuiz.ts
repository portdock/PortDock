// lib/modbusQuiz.ts 와 Modbus 연습장 화면 스크립트 문구(영어 문장 → 일본어) — 4차 묶음.
// 문제 안의 함수 이름·예외 코드 뜻은 1차 묶음 modbusDecode 의 번역을 그대로 쓴다(쪽이 modbusDecode 묶음도 싣는다).
export default {
  "holding registers": "保持レジスタ",
  "input registers": "入力レジスタ",
  "Slave {}, function {} ({}); the address is 0-based so {} → {} = {} {}; quantity {} = 00 {}; the last 2 bytes are the CRC16 (low byte first) {}.":
    "局番 {0}、ファンクション {1}({2})。先頭アドレスは 0 起点なので {3} → {4} = {5} {6}、点数 {7} = 00 {8}、最後の 2 バイトは CRC16(下位バイトが先)の {9} です。",
  "Which Modbus RTU request reads {} {} ({} registers) from slave {}?": "局番 {3} の機器の{0} {1}({2} 点)を読み出す Modbus RTU の要求はどれ?",
  "Write the Modbus RTU request, CRC included, in HEX that reads {} {} ({} registers) from slave {}.": "局番 {3} の機器の{0} {1}({2} 点)を読み出す Modbus RTU の要求を、CRC まで含めて HEX で書いてください。",
  "You asked slave {} for {} registers starting at {} and got the response below. What is the value of {} (unsigned decimal)?":
    "局番 {0} に {2} から {1} 点を読み出す要求を送り、下の応答が返りました。{3} の値(符号なし 10 進)は?",
  "After slave {}, function 03 and byte count {} (= {}) each register takes 2 bytes, high byte first. {} is register #{}, so bytes {}–{}: {} {} = 0x{}{} = {}.":
    "局番 {0}・ファンクション 03・バイト数 {1}(= {2})の後に、レジスタごとに 2 バイト(上位バイトが先)が続きます。{3} は {4} 番目なので {5}~{6} バイト目の {7} {8} = 0x{9}{10} = {11}。",
  "What does this response ({} {}) mean?": "この応答({0} {1})の意味は?",
  "{} is function {} with 0x80 added — an exception response; the next byte {} is the exception code: {}. {}":
    "ファンクションコードに 0x80 を足した {0} は «ファンクション {1} に対する例外応答»、次のバイト {2} が例外コードです: {3}。{4}",
  "The CRC16 Modbus of the bytes below is {}. Which two bytes go at the end of the frame?": "下のバイト列の CRC16 Modbus の値は {0} です。フレームの最後に付く 2 バイトは?",
  "Unlike register values, the Modbus RTU CRC is sent low byte first: {} → {} {}. That is why the CRC 0xCDC5 of «01 03 00 00 00 0A» is appended as «C5 CD».":
    "Modbus RTU の CRC は、レジスタの値と違って下位バイトが先に送られます: {0} → {1} {2}。そのため «01 03 00 00 00 0A» の CRC 0xCDC5 は «C5 CD» として付きます。",
  "ABCD (high word first)": "ABCD(上位ワードが先)",
  "CDAB (low word first, word swap)": "CDAB(下位ワードが先、ワードスワップ)",
  "The device manual says float32 values are sent in {} order. With the two registers below, what is the value?": "機器のマニュアルに、float32 は {0} の順で送るとあります。2 つのレジスタの値が下のとおりなら、実際の値は?",
  "ABCD means the first register is the high word, so read {} as IEEE 754 float32 = {}. Taking it as CDAB gives a nonsense value such as {}.":
    "ABCD は最初のレジスタが上位ワードなので、{0} をそのまま IEEE 754 の float32 として読みます = {1}。順序を CDAB と取り違えると {2} のようなおかしな値になります。",
  "CDAB means the first register is the low word, so swap them and read {} as float32 = {}. Reading it as-is (ABCD) gives a nonsense value such as {}.":
    "CDAB は最初のレジスタが下位ワードなので、2 つを入れ替えた {0} を float32 として読みます = {1}。そのまま(ABCD)読むと {2} のようなおかしな値になります。",
  "Pick the read request": "読み出し要求を選ぶ",
  "Write the read request": "読み出し要求を書く",
  "Find a value in a response": "応答から値を探す",
  "Meaning of an exception": "例外応答の意味",
  "CRC byte order": "CRC のバイト順",
  "Float word order": "浮動小数点のワード順",
  // 화면 스크립트
  "Score {}/{} · streak {} · best {}": "得点 {0}/{1} · 連続 {2} · 最高 {3}",
  "Pick one of the choices.": "選択肢を 1 つ選んでください。",
  "Type your answer.": "答えを入力してください。",
  Correct: "正解",
  "Not quite": "不正解",
  answer: "正解",
  "Read more: ": "詳しく: ",
};
