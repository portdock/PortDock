// lib/modbusQuiz.ts ve Modbus alıştırma sayfası betiği metinleri (İngilizce cümle → Türkçe) — 4. paket.
// Sorulardaki fonksiyon adları ve istisna kodu anlamları 1. paketteki modbusDecode çevirisini aynen kullanır (sayfa modbusDecode paketini de yükler).
export default {
  "holding registers": "holding register’lar",
  "input registers": "input register’lar",
  "Slave {}, function {} ({}); the address is 0-based so {} → {} = {} {}; quantity {} = 00 {}; the last 2 bytes are the CRC16 (low byte first) {}.":
    "Slave {0}, fonksiyon {1} ({2}); adres 0 tabanlı olduğundan {3} → {4} = {5} {6}; adet {7} = 00 {8}; son 2 bayt CRC16’dır (düşük bayt önce): {9}.",
  "Which Modbus RTU request reads {} {} ({} registers) from slave {}?": "Slave adresi {3} olan cihazdan {0} {1} ({2} register) okuyan Modbus RTU isteği hangisidir?",
  "Write the Modbus RTU request, CRC included, in HEX that reads {} {} ({} registers) from slave {}.": "Slave adresi {3} olan cihazdan {0} {1} ({2} register) okuyan Modbus RTU isteğini CRC dahil HEX olarak yazın.",
  "You asked slave {} for {} registers starting at {} and got the response below. What is the value of {} (unsigned decimal)?":
    "Slave adresi {0} olan cihaza {2} adresinden başlayan {1} register için istek gönderdiniz ve aşağıdaki yanıt geldi. {3} adresinin değeri (işaretsiz ondalık) nedir?",
  "After slave {}, function 03 and byte count {} (= {}) each register takes 2 bytes, high byte first. {} is register #{}, so bytes {}–{}: {} {} = 0x{}{} = {}.":
    "Slave {0}, fonksiyon 03 ve bayt sayısı {1} (= {2}) sonrasında her register 2 bayt kaplar, yüksek bayt önce. {3}, {4}. register olduğundan baytlar {5}–{6}: {7} {8} = 0x{9}{10} = {11}.",
  "What does this response ({} {}) mean?": "Bu yanıt ({0} {1}) ne anlama gelir?",
  "{} is function {} with 0x80 added — an exception response; the next byte {} is the exception code: {}. {}":
    "{0}, fonksiyon {1} değerine 0x80 eklenmiş hâlidir — yani bir istisna yanıtı; sonraki bayt {2} istisna kodudur: {3}. {4}",
  "The CRC16 Modbus of the bytes below is {}. Which two bytes go at the end of the frame?": "Aşağıdaki baytların CRC16 Modbus değeri {0}. Çerçevenin sonuna hangi iki bayt eklenir?",
  "Unlike register values, the Modbus RTU CRC is sent low byte first: {} → {} {}. That is why the CRC 0xCDC5 of «01 03 00 00 00 0A» is appended as «C5 CD».":
    "Register değerlerinden farklı olarak Modbus RTU CRC’si düşük bayt önce gönderilir: {0} → {1} {2}. Bu yüzden “01 03 00 00 00 0A” çerçevesinin CRC’si 0xCDC5, “C5 CD” olarak eklenir.",
  "ABCD (high word first)": "ABCD (yüksek word önce)",
  "CDAB (low word first, word swap)": "CDAB (düşük word önce, word swap)",
  "The device manual says float32 values are sent in {} order. With the two registers below, what is the value?": "Cihaz kılavuzuna göre float32 değerleri {0} sırasıyla gönderiliyor. Aşağıdaki iki register ile değer nedir?",
  "ABCD means the first register is the high word, so read {} as IEEE 754 float32 = {}. Taking it as CDAB gives a nonsense value such as {}.":
    "ABCD, ilk register’ın yüksek word olduğu anlamına gelir; bu yüzden {0} değerini IEEE 754 float32 olarak okuyun = {1}. CDAB sanılırsa {2} gibi anlamsız bir değer çıkar.",
  "CDAB means the first register is the low word, so swap them and read {} as float32 = {}. Reading it as-is (ABCD) gives a nonsense value such as {}.":
    "CDAB, ilk register’ın düşük word olduğu anlamına gelir; bu yüzden ikisinin yerini değiştirip {0} değerini float32 olarak okuyun = {1}. Olduğu gibi (ABCD) okunursa {2} gibi anlamsız bir değer çıkar.",
  "Pick the read request": "Okuma isteğini seç",
  "Write the read request": "Okuma isteğini yaz",
  "Find a value in a response": "Yanıttaki değeri bul",
  "Meaning of an exception": "İstisnanın anlamı",
  "CRC byte order": "CRC bayt sırası",
  "Float word order": "Float word sırası",
  // sayfa betiği
  "Score {}/{} · streak {} · best {}": "Puan {0}/{1} · seri {2} · en iyi {3}",
  "Pick one of the choices.": "Seçeneklerden birini seçin.",
  "Type your answer.": "Cevabınızı yazın.",
  Correct: "Doğru",
  "Not quite": "Yanlış",
  answer: "cevap",
  "Read more: ": "Daha fazlası: ",
};
