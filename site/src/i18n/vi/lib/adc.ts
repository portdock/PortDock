// Tính độ phân giải và scaling ADC — script màn hình (views/AdcPage.astro), đợt 5. Câu tiếng Anh → tiếng Việt (khóa giữ nguyên câu tiếng Anh trong mã, chỗ {} là {0} {1} …)
export default {
  "Top clipped — {} {} gives {}, at the reference limit. Lower the shunt or ratio, or raise the reference": "Bị cắt ở đầu trên — {0} {1} cho {2}, chạm giới hạn điện áp tham chiếu. Giảm điện trở shunt hoặc tỉ số phân áp, hoặc tăng điện áp tham chiếu",
  "High end {} — {} % of the reference left as headroom": "Đầu trên {0} — còn {1} % điện áp tham chiếu làm khoảng dư",
  "Check the numbers — bits 1–32 (integer), reference and scale above 0, engineering low and high must differ": "Kiểm tra các số — số bit 1–32 (số nguyên), điện áp tham chiếu và tỉ số lớn hơn 0, giá trị kỹ thuật thấp và cao phải khác nhau",
};
