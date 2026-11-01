// Tính xung encoder ↔ rpm — script màn hình (views/EncoderPage.astro), đợt 5. Câu tiếng Anh → tiếng Việt (khóa giữ nguyên câu tiếng Anh trong mã, chỗ {} là {0} {1} …)
export default {
  "1 count": "1 xung đếm",
  "{} rpm is within the response frequency ({} ≤ {} per channel)": "{0} rpm nằm trong tần số đáp ứng (mỗi kênh {1} ≤ {2})",
  "{} rpm exceeds the response frequency ({} > {} per channel) — lower the PPR or use a faster input": "{0} rpm vượt tần số đáp ứng (mỗi kênh {1} > {2}) — giảm PPR hoặc dùng ngõ vào nhanh hơn",
  "Check the numbers — PPR must be above 0": "Kiểm tra các số — PPR phải lớn hơn 0",
};
