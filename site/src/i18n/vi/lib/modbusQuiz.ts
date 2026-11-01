// Văn bản từ lib/modbusQuiz.ts và script trang luyện tập Modbus (câu tiếng Anh → tiếng Việt) — gói 4.
// Tên hàm và ý nghĩa mã ngoại lệ trong câu hỏi dùng nguyên bản dịch modbusDecode của gói 1 (trang cũng tải gói modbusDecode).
export default {
  "holding registers": "thanh ghi giữ (holding register)",
  "input registers": "thanh ghi đầu vào (input register)",
  "Slave {}, function {} ({}); the address is 0-based so {} → {} = {} {}; quantity {} = 00 {}; the last 2 bytes are the CRC16 (low byte first) {}.":
    "Địa chỉ trạm {0}, mã hàm {1} ({2}); địa chỉ tính từ 0 nên {3} → {4} = {5} {6}; số lượng {7} = 00 {8}; 2 byte cuối là CRC16 (byte thấp trước) {9}.",
  "Which Modbus RTU request reads {} {} ({} registers) from slave {}?": "Lệnh hỏi Modbus RTU nào đọc {0} {1} ({2} thanh ghi) từ trạm {3}?",
  "Write the Modbus RTU request, CRC included, in HEX that reads {} {} ({} registers) from slave {}.": "Hãy viết bằng HEX, kèm cả CRC, lệnh hỏi Modbus RTU đọc {0} {1} ({2} thanh ghi) từ trạm {3}.",
  "You asked slave {} for {} registers starting at {} and got the response below. What is the value of {} (unsigned decimal)?":
    "Bạn gửi tới trạm {0} lệnh hỏi đọc {1} thanh ghi bắt đầu từ {2} và nhận được phản hồi bên dưới. Giá trị của {3} (thập phân không dấu) là bao nhiêu?",
  "After slave {}, function 03 and byte count {} (= {}) each register takes 2 bytes, high byte first. {} is register #{}, so bytes {}–{}: {} {} = 0x{}{} = {}.":
    "Sau địa chỉ trạm {0}, mã hàm 03 và số byte {1} (= {2}), mỗi thanh ghi chiếm 2 byte, byte cao trước. {3} là thanh ghi thứ {4}, nên là byte {5}–{6}: {7} {8} = 0x{9}{10} = {11}.",
  "What does this response ({} {}) mean?": "Phản hồi này ({0} {1}) có nghĩa là gì?",
  "{} is function {} with 0x80 added — an exception response; the next byte {} is the exception code: {}. {}":
    "{0} là mã hàm {1} cộng thêm 0x80 — tức phản hồi ngoại lệ; byte tiếp theo {2} là mã ngoại lệ: {3}. {4}",
  "The CRC16 Modbus of the bytes below is {}. Which two bytes go at the end of the frame?": "CRC16 Modbus của các byte bên dưới là {0}. Hai byte nào được gắn vào cuối khung?",
  "Unlike register values, the Modbus RTU CRC is sent low byte first: {} → {} {}. That is why the CRC 0xCDC5 of «01 03 00 00 00 0A» is appended as «C5 CD».":
    "Khác với giá trị thanh ghi, CRC của Modbus RTU được gửi byte thấp trước: {0} → {1} {2}. Vì vậy CRC 0xCDC5 của “01 03 00 00 00 0A” được gắn vào thành “C5 CD”.",
  "ABCD (high word first)": "ABCD (word cao trước)",
  "CDAB (low word first, word swap)": "CDAB (word thấp trước, đảo word)",
  "The device manual says float32 values are sent in {} order. With the two registers below, what is the value?": "Tài liệu thiết bị ghi rằng giá trị float32 được gửi theo thứ tự {0}. Với hai thanh ghi bên dưới, giá trị thực là bao nhiêu?",
  "ABCD means the first register is the high word, so read {} as IEEE 754 float32 = {}. Taking it as CDAB gives a nonsense value such as {}.":
    "ABCD nghĩa là thanh ghi đầu là word cao, nên đọc {0} như float32 IEEE 754 = {1}. Nếu hiểu nhầm là CDAB sẽ ra giá trị vô lý như {2}.",
  "CDAB means the first register is the low word, so swap them and read {} as float32 = {}. Reading it as-is (ABCD) gives a nonsense value such as {}.":
    "CDAB nghĩa là thanh ghi đầu là word thấp, nên đảo hai thanh ghi rồi đọc {0} như float32 = {1}. Đọc nguyên như vậy (ABCD) sẽ ra giá trị vô lý như {2}.",
  "Pick the read request": "Chọn lệnh hỏi đọc",
  "Write the read request": "Viết lệnh hỏi đọc",
  "Find a value in a response": "Tìm giá trị trong phản hồi",
  "Meaning of an exception": "Ý nghĩa của ngoại lệ",
  "CRC byte order": "Thứ tự byte của CRC",
  "Float word order": "Thứ tự word của float",
  // script trên trang
  "Score {}/{} · streak {} · best {}": "Điểm {0}/{1} · chuỗi đúng {2} · cao nhất {3}",
  "Pick one of the choices.": "Hãy chọn một đáp án.",
  "Type your answer.": "Hãy nhập câu trả lời.",
  Correct: "Đúng",
  "Not quite": "Chưa đúng",
  answer: "đáp án",
  "Read more: ": "Đọc thêm: ",
};
