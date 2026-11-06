// Chữ của cây câu hỏi trong trợ lý tìm nguyên nhân sự cố (tiếng Việt) — hình dạng cây (id, nút tiếp theo, liên kết) dùng chung một tệp data/troubleshoot.ts; ở đây chỉ có chữ, tra theo id nút.
// Câu hỏi: q · hint (chỉ khi cây có gợi ý) · opts (chỉ với câu trả lời không phải có/không, theo thứ tự). Kết quả: title · causes · checks (cùng số lượng và thứ tự với cây).
// Thiếu id hoặc sai số dòng sẽ bị checkText() trong lib/troubleshoot.ts bắt (i18n.test.ts). Nội dung là «nguyên nhân có thể» — không khẳng định.
// Màn hình các ứng dụng (Port Inspector, Hardware Tester …) chỉ có tiếng Hàn/tiếng Anh, nên tên nút và menu giữ tiếng Anh.
import type { TreeText } from "../../lib/troubleshoot.ts";

export default {
  yes: "Có",
  no: "Không",
  symptoms: {
    rs485: "RS-485 / Modbus RTU: không phản hồi hoặc dữ liệu lỗi",
    rs232: "RS-232 không truyền thông được",
    tcp: "Không kết nối được thiết bị Modbus TCP / Ethernet",
    usb: "Bộ chuyển USB-serial không nhận hoặc hay rớt",
    ma: "Giá trị 4-20 mA trông không đúng",
    sensor: "Ngõ vào cảm biến NPN/PNP không lên",
    mc: "Không kết nối được giao thức MC (Mitsubishi)",
    pcusb: "Thiết bị USB trên PC cứ bị rớt kết nối",
  },
  nodes: {
    // ① RS-485 · Modbus RTU
    "rs485-any": { q: "Hoàn toàn không có phản hồi nào?", hint: "«Không» = thỉnh thoảng có phản hồi, hoặc phản hồi có lẫn byte lỗi" },
    "rs485-txled": { q: "Khi gửi lệnh hỏi, đèn LED TX của bộ chuyển đổi có nháy không?", hint: "Không có LED? Thay vào đó, xem các byte đã gửi có hiện trong nhật ký của PortDock Serial không" },
    "rs485-settings": { q: "Bạn đã đối chiếu từng mục tốc độ baud, parity, bit stop và địa chỉ trạm với màn hình cài đặt (hoặc tài liệu) của chính thiết bị chưa?" },
    "rs485-swap": { q: "Nếu đảo hai dây A và B (D+/D−) thì có phản hồi không?", hint: "Đảo dây không làm hỏng thiết bị" },
    "rs485-single": { q: "Chỉ để một thiết bị, nối thẳng vào bộ chuyển đổi bằng dây ngắn, thì có phản hồi không?" },
    "rs485-garbled": { q: "Các byte nhận được có bị lỗi không (lỗi CRC, ký tự lạ)?", hint: "«Không» = byte vẫn đúng nhưng thỉnh thoảng mất phản hồi (timeout)" },
    "rs485-slower": { q: "Giảm tốc độ baud hoặc rút ngắn cáp thì lỗi có giảm không?" },
    "rs485-timeout": { q: "Tăng thời gian chờ phản hồi (ví dụ 1000 ms) thì số phản hồi bị mất có giảm không?" },
    "r-rs485-port": {
      title: "Lệnh hỏi không ra khỏi PC — phía cổng hoặc driver",
      causes: [
        "Đang mở sai số COM (số này đổi khi cắm bộ chuyển đổi sang cổng USB khác)",
        "Một chương trình khác (SCADA, terminal mở trước đó) vẫn đang giữ cổng",
        "Lỗi driver (dấu cảnh báo hoặc mã lỗi trong Device Manager)",
        "Bộ chuyển đổi không tự đổi chiều truyền cho RS-485 2 dây (không có điều khiển TX tự động)",
      ],
      checks: [
        "Tìm số COM của bộ chuyển đổi trong mục «Ports (COM & LPT)» của Device Manager và đặt chương trình cho khớp",
        "Đọc driver và mã lỗi của cổng bằng Port Inspector, và chạy phép thử echo RS-485 2 dây để xem có gì được truyền ra không",
        "Đặt đồng hồ (V⎓) giữa A–B rồi gửi lệnh hỏi liên tục thì số đo phải nhảy — nếu đứng yên là không có gì được truyền",
      ],
    },
    "r-rs485-settings": {
      title: "Nhiều khả năng cài đặt truyền thông khác nhau",
      causes: [
        "Tốc độ baud hoặc parity khác nhau (ví dụ thiết bị 8E1, chương trình 8N1)",
        "Địa chỉ trạm khác, hoặc đang dùng 0 (broadcast) — broadcast không có phản hồi",
        "Giao thức của thiết bị không phải Modbus RTU (giao thức riêng của hãng hoặc ASCII), hoặc đã đổi cài đặt mà chưa lưu và khởi động lại",
      ],
      checks: [
        "Ghi lại các tham số truyền thông từ màn hình thiết bị rồi so từng dòng với chương trình",
        "Với biến tần, kiểm tra thêm tham số «nguồn lệnh chạy» và «chọn giao thức»",
        "Nếu không biết tốc độ baud, quét bằng Modbus Master — quét địa chỉ trạm, còn baud/parity thì dùng «line settings search» (dò cài đặt đường truyền, từ 0.10.0)",
      ],
    },
    "r-rs485-polarity": {
      title: "Ký hiệu A/B (+/−) bị ngược",
      causes: ["Các hãng không thống nhất A hay B là + (đặc tả Modbus: D1 = B = +, D0 = A = −)", "Có thể chỉ một vài thiết bị bị ngược — nếu sau khi đảo mà thiết bị khác ngừng phản hồi, hãy kiểm tra ký hiệu của chúng"],
      checks: ["Bật nguồn, dừng polling: que đỏ ở B (D1·+), que đen ở A (D0·−) phải đo được từ +200 mV trở lên nếu có phân cực", "Ghi trạng thái đã đảo vào sơ đồ đấu dây để không ai đảo lại"],
    },
    "r-rs485-bus": {
      title: "Một thiết bị riêng thì chạy nhưng trên bus thì không — đi dây hoặc bố trí bus",
      causes: [
        "Có từ ba điện trở đầu cuối trở lên (công tắc của thiết bị ở giữa đang bật), hoặc không có cái nào",
        "Hai thiết bị trùng địa chỉ trạm, cùng trả lời một lúc và làm hỏng dữ liệu của nhau",
        "Đường nhánh dài hoặc đi dây hình sao, hay đứt ở một cầu đấu trung gian",
        "Không có dây SG (common), đẩy các thiết bị ở xa ra ngoài khoảng common mode",
      ],
      checks: [
        "Tắt toàn bộ nguồn, đo điện trở A–B: khoảng 60 Ω (hai đầu), khoảng 120 Ω (một đầu), vài trăm Ω đến vài kΩ hoặc hơn (không có — nhiều thiết bị hoặc điện trở phân cực hiện ra sẽ kéo xuống khoảng 1 kΩ), từ 40 Ω trở xuống (quá nhiều). Đầu cuối RC (1 nF + 120 Ω) không thấy được bằng DC và đo ra như «không có»",
        "Bật nguồn: A–SG và B–SG trong khoảng −7 đến +12 V",
        "Lắp lại từng thiết bị một để xem hỏng ở đâu; liệt kê mọi địa chỉ trạm",
      ],
    },
    "r-rs485-device": {
      title: "Chỉ một thiết bị vẫn không chạy — cài đặt thiết bị, cổng truyền thông hoặc bộ chuyển đổi",
      causes: [
        "Cài đặt thiết bị chưa được lưu, hoặc chỉ có hiệu lực sau khi khởi động lại",
        "Truyền thông nằm trên card tùy chọn hoặc cụm cực riêng, hoặc có cài đặt chế độ 2 dây/4 dây",
        "Bộ chuyển đổi hỏng, hoặc đấu vào cực RS-422/RS-232 thay vì RS-485",
      ],
      checks: [
        "Thử riêng bộ chuyển đổi bằng phép thử echo RS-485 2 dây của Port Inspector",
        "Thử cùng thiết bị với bộ chuyển đổi hoặc PC khác",
        "Tra số cực truyền thông và thời điểm cài đặt mới có hiệu lực trong tài liệu thiết bị",
      ],
    },
    "r-rs485-signal": {
      title: "Chất lượng tín hiệu — phản xạ, nhiễu, chiều dài",
      causes: [
        "Không có đầu cuối hoặc chỉ ở một đầu — phản xạ trên đường dài, tốc độ cao",
        "Cáp quá dài so với tốc độ baud (đại khái baud × mét ≤ 10^8)",
        "Không phải cặp xoắn, đi cạnh cáp động lực, hoặc lớp chống nhiễu không nối đất",
      ],
      checks: [
        "Tắt nguồn: A–B khoảng 60 Ω",
        "Common mode A–SG và B–SG trong khoảng −7 đến +12 V, kể cả khi động cơ đang chạy",
        "Kiểm tra giới hạn chiều dài cho tốc độ baud này bằng công cụ tính RS-485",
      ],
    },
    "r-rs485-framing": {
      title: "Khung bị lệch — cài đặt, echo hoặc bị tách",
      causes: [
        "Baud hoặc parity hơi lệch (một số byte vẫn có thể trông đúng)",
        "Bộ chuyển đổi 2 dây dội lại (echo) lệnh hỏi, hiện ra ngay trước phản hồi",
        "Độ trễ USB tách một phản hồi làm hai và bên nhận phân tích riêng từng phần",
      ],
      checks: [
        "Dán các byte nhận được vào công cụ giải mã khung Modbus và kiểm tra địa chỉ, mã hàm và CRC",
        "Kiểm tra echo của bộ chuyển đổi và latency timer của FTDI bằng Port Inspector",
      ],
    },
    "r-rs485-timing": {
      title: "Thời gian quá sát — timeout, chu kỳ polling, độ trễ USB",
      causes: [
        "Timeout ngắn hơn thời gian phản hồi của thiết bị (biến tần và đồng hồ đo có thể mất vài chục đến vài trăm ms)",
        "Lệnh hỏi kế tiếp gửi quá sớm, chồng lên phản hồi trước",
        "Latency timer của bộ chuyển đổi USB (FTDI mặc định 16 ms) cộng thêm vào mỗi khung ngắn",
      ],
      checks: [
        "Tính thời gian hỏi/đáp và timeout tối thiểu bằng công cụ tính thời gian truyền serial",
        "Đọc giá trị latency timer bằng Port Inspector",
      ],
    },
    "r-rs485-idle": {
      title: "Đường dây trôi khi nghỉ hoặc phản hồi va nhau — phân cực hoặc địa chỉ",
      causes: [
        "Không có điện trở phân cực (failsafe), nên nhiễu lúc nghỉ bị đọc thành byte",
        "Hai thiết bị cùng địa chỉ thỉnh thoảng va nhau",
        "Chỉ nhiễu khi động cơ hoặc biến tần chạy (chống nhiễu, nối đất)",
      ],
      checks: [
        "Bật nguồn, dừng polling: điện áp vi sai B–A từ +200 mV trở lên",
        "Liệt kê mọi thiết bị và địa chỉ trên sơ đồ hệ thống để tìm chỗ trùng",
        "So thời điểm mất phản hồi với thời điểm động cơ chạy",
      ],
    },
    // ② RS-232
    "rs232-seen": { q: "Cổng COM có hiện trong Device Manager của PC không?", hint: "Với bộ chuyển USB-RS232, chọn «Không» sẽ chuyển sang nhánh bộ chuyển đổi không được nhận" },
    "rs232-loop": { q: "Khi nối chân 2 (RXD) và 3 (TXD) của DB9 phía PC với nhau (loopback), ký tự gửi đi có quay về không?" },
    "rs232-cross": { q: "TX của thiết bị có nối vào RX của PC (chân 2) và TX của PC (chân 3) có nối vào RX của thiết bị — tức đấu chéo — không?", hint: "Không chắc? Chọn «Không» để xem cách kiểm tra" },
    "rs232-flow": { q: "Điều khiển luồng có đặt là «None» ở cả chương trình và thiết bị không?" },
    "r-rs232-pc": {
      title: "Bị chặn ở cổng PC hoặc bộ chuyển đổi",
      causes: ["Chương trình khác đang giữ cổng, hoặc mở sai số COM", "Bộ chuyển đổi hoặc cổng hỏng, lỗi driver", "Nối nhầm chân (loopback là chân 2–3)"],
      checks: ["Lúc nghỉ, chân 3 (TXD) so với chân 5 (GND) đo được −5 đến −15 V (−3 đến −5 V là yếu — nên xem lại)", "Chạy phép thử loopback của Port Inspector và kiểm tra byte quay về ở từng tốc độ baud"],
    },
    "r-rs232-cross": {
      title: "Có thể TX nối với TX — cáp chéo hay cáp thẳng",
      causes: ["PC và thiết bị đều là DTE nhưng dùng cáp thẳng (TX–TX) — cần cáp null modem (chéo)", "Hoặc thiết bị là DCE mà lại dùng cáp chéo"],
      checks: ["Ở mỗi đầu nối, chân có −5 đến −15 V lúc nghỉ (−3 đến −5 V nếu yếu) là TX của phía đó — nếu hai chân TX cùng một dây thì chúng đang đụng nhau", "Dùng chế độ đo thông mạch dọc theo cáp để xem 2↔3 có được đấu chéo không"],
    },
    "r-rs232-flow": {
      title: "Điều khiển luồng không khớp",
      causes: ["Đang bật điều khiển luồng phần cứng (RTS/CTS) nhưng không nối CTS, nên PC chờ mãi", "Thiết bị cần DTR/DSR được kích nhưng chỉ dùng cáp 3 dây"],
      checks: ["Đặt điều khiển luồng là «None» trong chương trình và thử lại", "Nếu thiết bị bắt buộc bắt tay, nối RTS–CTS (7–8) và DTR–DSR–DCD (4–6–1) ngay trong đầu nối, hoặc dùng cáp bắt tay đầy đủ"],
    },
    "r-rs232-settings": {
      title: "Dây có vẻ đúng — cài đặt, định dạng lệnh hoặc mức tín hiệu",
      causes: ["Baud, số bit dữ liệu, parity hoặc bit stop khác nhau", "Ký tự kết thúc dòng (CR, LF, CR LF) hoặc checksum khác với cái thiết bị cần", "Cổng của thiết bị là UART TTL (3,3/5 V), không phải RS-232"],
      checks: ["Nếu TX của thiết bị nghỉ ở +3,3 hoặc +5 V thì đó là TTL — không nối thẳng vào cổng RS-232", "Gửi và nhận ở dạng HEX rồi so ký tự kết thúc dòng và checksum từng byte"],
    },
    // ③ Modbus TCP · Ethernet
    "tcp-ping": { q: "Thiết bị có trả lời ping từ PC không?" },
    "tcp-subnet": { q: "IP của PC và thiết bị có cùng subnet không? (ví dụ 192.168.0.10/24 và 192.168.0.50)" },
    "tcp-link": { q: "Đèn link ở cổng LAN của PC và thiết bị (hoặc switch) có sáng không?" },
    "tcp-502": { q: "Bạn có mở được kết nối TCP tới cổng 502 (hoặc cổng ghi trong tài liệu) không?", hint: "Thử kết nối bằng PortDock TCP, hoặc PowerShell Test-NetConnection <IP> -Port 502" },
    "tcp-reply": { q: "Sau khi kết nối, lệnh hỏi có được phản hồi không?" },
    "tcp-exception": { q: "Phản hồi có phải ngoại lệ không (mã hàm + 0x80, ví dụ 83 02)?", hint: "«Không» = có phản hồi nhưng giá trị trông sai" },
    "r-tcp-subnet": {
      title: "Khác subnet IP",
      causes: ["Phần mạng khác nhau nên không tới được nhau nếu không có gateway", "Không biết IP của thiết bị (mặc định nhà máy hoặc DHCP)"],
      checks: ["Nhập cả hai IP và mặt nạ vào công cụ tính subnet để xem có cùng subnet không", "Thêm cho card mạng PC một IP thứ hai thuộc subnet của thiết bị (ví dụ 192.168.0.200/24)", "Nếu không biết IP, tìm bằng Net Scan"],
    },
    "r-tcp-link": {
      title: "Không có liên kết vật lý — cáp, cổng hoặc switch",
      causes: ["Cáp hoặc đầu nối hỏng, hoặc cắm nhầm cổng", "Switch mất nguồn hay cổng bị tắt, hoặc cổng LAN của thiết bị bị vô hiệu"],
      checks: ["Đổi cáp và cổng switch", "Đọc trạng thái link, tốc độ và duplex bằng «Read adapters» (đọc card mạng) của Port Inspector"],
    },
    "r-tcp-noping": {
      title: "Có link nhưng không ping được",
      causes: ["Thiết bị được đặt không trả lời ping (ICMP) — hãy thử thẳng kết nối 502", "Hai thiết bị trùng IP (xung đột địa chỉ)", "Một card mạng khác của PC (ví dụ Wi-Fi) cùng subnet nên gói tin đi ra đường đó; tường lửa"],
      checks: ["Rút thiết bị ra rồi ping — nếu vẫn có trả lời thì một thiết bị khác đang dùng IP đó", "Quét subnet bằng Net Scan để xem IP và MAC; kiểm tra IP trùng trên sơ đồ hệ thống", "Tạm vô hiệu các card mạng khác rồi thử lại"],
    },
    "r-tcp-port": {
      title: "Ping được nhưng cổng 502 từ chối",
      causes: ["Modbus TCP bị tắt trên thiết bị hoặc là tùy chọn (card riêng hay license)", "Cổng không phải 502", "Đã hết số kết nối cho phép (SCADA hoặc HMI đang kết nối)"],
      checks: ["Xem cài đặt Modbus TCP, cổng và số kết nối tối đa trong tài liệu", "Ngắt tạm các client khác rồi kết nối lại"],
    },
    "r-tcp-unitid": {
      title: "Đã kết nối nhưng không có phản hồi — Unit ID hoặc gateway",
      causes: [
        "Sai Unit ID — sau gateway thì phải bằng địa chỉ trạm RTU; với thiết bị nối trực tiếp hãy dùng giá trị trong tài liệu (thường là 1 hoặc 255)",
        "Phía RTU của gateway (baud, dây) không chạy — gateway bỏ lệnh hỏi hoặc trả ngoại lệ 0B",
        "Mã hàm mà thiết bị không hỗ trợ",
      ],
      checks: ["Giải mã các byte trao đổi bằng công cụ giải mã khung Modbus để xem MBAP và Unit ID"],
    },
    "r-tcp-exception": {
      title: "Thiết bị trả lời bằng ngoại lệ — địa chỉ, mã hàm hoặc số lượng",
      causes: ["Ngoại lệ 02: không có địa chỉ đó — cách ghi 40001 chưa đổi sang địa chỉ tính từ 0 (lệch một)", "Ngoại lệ 01: mã hàm không được hỗ trợ (ví dụ đọc input register bằng 03)", "Ngoại lệ 03: số lượng quá 125 hoặc quá giới hạn của thiết bị"],
      checks: ["Dán phản hồi vào công cụ giải mã khung Modbus để xem ý nghĩa ngoại lệ", "Kiểm tra bản đồ thanh ghi dùng địa chỉ tính từ 0 hay từ 1"],
    },
    "r-tcp-values": {
      title: "Truyền thông chạy nhưng giá trị trông sai — định dạng, thứ tự hoặc hệ số",
      causes: ["Thứ tự word của giá trị 32 bit (float, int32) khác nhau (ABCD, CDAB …)", "Chưa áp hệ số (×0,1, ×0,01), dấu (int16/uint16) hoặc tỉ số CT", "Địa chỉ lệch một (tính từ 0 hay từ 1)"],
      checks: ["Đưa hai thanh ghi vào công cụ chuyển đổi float Modbus và so cả bốn thứ tự", "So giá trị có dấu và không dấu bằng công cụ chuyển đổi số nguyên"],
    },
    // ④ Bộ chuyển USB-serial
    "usb-sound": { q: "Khi cắm bộ chuyển đổi, Windows có phát tiếng kết nối hoặc Device Manager có thay đổi không?" },
    "usb-com": { q: "Nó có hiện trong «Ports (COM & LPT)» kèm một số COM không?", hint: "«Không» = nó hiện trong «Other devices», có dấu cảnh báo hoặc là thiết bị không rõ" },
    "usb-drops": { q: "Đang dùng thì có bị rớt không (cổng biến mất rồi xuất hiện lại)?" },
    "usb-motor": { q: "Có bị rớt khi tải lớn như động cơ, biến tần hay máy hàn khởi động hoặc đang chạy không?" },
    "usb-comnum": { q: "Số COM có đổi mỗi lần cắm, hoặc nhảy lên số cao như COM15 không?", hint: "«Không» = được nhận và kết nối, nhưng truyền thông chậm hoặc phản hồi bị tách" },
    "r-usb-none": {
      title: "Hoàn toàn không được nhận là thiết bị USB — cáp, cổng hoặc bộ chuyển đổi",
      causes: ["Cáp USB chỉ để sạc (không có dây dữ liệu)", "Cổng mặt trước hoặc hub có vấn đề về kết nối hay nguồn", "Bộ chuyển đổi hỏng"],
      checks: ["Cắm thẳng vào cổng phía sau, không qua hub, bằng cáp khác", "Xem PC khác có bị giống vậy không", "Kiểm tra lần cắm có được ghi trong nhật ký cắm/rút USB của Hardware Tester không (từ 0.10.0)"],
    },
    "r-usb-driver": {
      title: "Thiếu driver hoặc thiết bị không khởi động được",
      causes: ["Chưa cài driver cho chip (FTDI, CH34x, CP210x, PL2303)", "Driver từ chối chip (mã 10…) — hay gặp với PL2303 đời cũ"],
      checks: ["Đọc VID:PID, tên chip và mã lỗi kèm ý nghĩa bằng Port Inspector", "Dùng driver từ trang của hãng chip (nếu cần quyền quản trị thì nhờ bộ phận IT)"],
    },
    "r-usb-emi": {
      title: "Nhiễu hoặc chênh lệch đất lọt vào USB",
      causes: ["Với bộ chuyển đổi không cách ly, chênh lệch điện thế giữa đất thiết bị và đất PC làm USB bị reset", "Cáp truyền thông hoặc cáp USB đi sát cáp động lực"],
      checks: ["Điện áp giữa vỏ USB của PC và SG/PE của thiết bị (V⎓ và V~): dưới 1 V là bình thường; từ 7 V trở lên là có vấn đề", "Thử bộ chuyển đổi cách ly, cáp USB ngắn hơn hoặc lõi ferit", "So thời điểm rớt USB trong Hardware Tester với thời điểm động cơ chạy (từ 0.10.0)"],
    },
    "r-usb-power": {
      title: "Tiết kiệm điện, nguồn hoặc tiếp xúc",
      causes: ["USB selective suspend, hoặc «Allow the computer to turn off this device to save power»", "Hub lấy nguồn từ bus bị thiếu nguồn, hoặc đầu nối lỏng"],
      checks: ["Đọc cài đặt tiết kiệm điện và lịch sử cắm gần đây bằng Port Inspector (chỉ đọc — hãy tự thay đổi trong Windows)", "Xem lay cáp có làm rớt không"],
    },
    "r-usb-comnum": {
      title: "Số COM thay đổi — vị trí cổng, số sê-ri, số đã giữ chỗ",
      causes: ["Chip không có số sê-ri (CH34x…) nhận số mới ở mỗi cổng USB", "Các thiết bị từng cắm trước đó vẫn giữ chỗ số COM (ComDB)"],
      checks: ["Luôn dùng cùng một cổng USB", "Xem các số COM đang được giữ chỗ trong Port Inspector", "PortDock Serial mở lại đúng thiết bị đó dù số COM đổi"],
    },
    "r-usb-latency": {
      title: "Đã kết nối nhưng chậm hoặc phản hồi bị tách — độ trễ USB",
      causes: ["Latency timer của FTDI (mặc định 16 ms) cộng trễ vào mỗi khung ngắn", "Chương trình coi mỗi mảnh là một phản hồi riêng", "Nếu hoàn toàn không truyền thông được, hãy tiếp tục với nhánh RS-485 hoặc RS-232"],
      checks: ["Kiểm tra latency timer và thời gian khứ hồi loopback bằng Port Inspector", "So với thời gian phản hồi dự kiến từ công cụ tính thời gian truyền serial"],
    },
    // ⑤ 4-20 mA
    "ma-kind": { q: "Giá trị sai theo kiểu nào?", opts: ["Đứng ở 0 (hoặc mức thấp nhất)", "Đứng ở mức cao nhất", "Dao động hoặc nhảy", "Có thay đổi nhưng không khớp thực tế"] },
    "ma-flow": { q: "Mắc đồng hồ (mA) nối tiếp trong vòng, dòng chảy có lớn hơn 3,6 mA không?" },
    "ma-volt": { q: "Giữa cực + và − của transmitter có điện áp không (thường từ 10 V trở lên)?" },
    "ma-high": { q: "Dòng đo được có từ 21 mA trở lên không?" },
    "ma-motor": { q: "Dao động có tăng khi động cơ hoặc biến tần chạy không?" },
    "ma-loopv": { q: "Ở gần 20 mA, điện áp tại cực transmitter có vẫn cao hơn điện áp làm việc tối thiểu ghi trong tài liệu không?" },
    "r-ma-open": {
      title: "Trong vòng không có dòng cũng không có áp — hở mạch hoặc mất nguồn",
      causes: ["Đứt dây, cực lỏng hoặc cầu chì", "Nguồn vòng (24 V) tắt hoặc nối nhầm chỗ", "Transmitter 4 dây (nguồn riêng) bị đấu như loại 2 dây nên không có nguồn"],
      checks: ["Đo 24 V ở bộ nguồn rồi ở transmitter để tìm chỗ mất điện áp", "So dây thực tế với các hình đấu 2/3/4 dây"],
    },
    "r-ma-tx": {
      title: "Có áp nhưng không có dòng — transmitter hoặc cực tính",
      causes: ["Loại 2 dây bị đảo cực (+ và − đổi chỗ)", "Ngõ vào bên nhận đặt ở chế độ áp, coi như hở vòng", "Transmitter hỏng"],
      checks: ["Kiểm tra lại + và − của transmitter theo hình trong tài liệu", "Kiểm tra cài đặt hoặc jumper loại kênh (dòng/áp) của card ngõ vào"],
    },
    "r-ma-input": {
      title: "Có dòng nhưng giá trị là 0 — cài đặt hoặc hệ số phía nhận",
      causes: ["Đặt sai dải ngõ vào (0–20 mA, 1–5 V, 0–10 V)", "Đang xem nhầm kênh, hoặc quy đổi đặt bằng 0", "Từ 3,6 mA trở xuống là transmitter đang báo lỗi theo NE 43 (3,6–3,8 mA là dưới thang đo, không phải tín hiệu lỗi)"],
      checks: ["Nhập số mA đo được vào công cụ kiểm tra đồng hồ vạn năng để xem % và vùng NE 43", "So với giá trị số dự kiến (ví dụ 0–27648) trong công cụ tính 4-20 mA"],
    },
    "r-ma-fault-high": {
      title: "Từ 21 mA trở lên — tín hiệu lỗi hoặc ngắn mạch",
      causes: ["Transmitter xuất tín hiệu lỗi phía trên theo NE 43 (ví dụ đứt cảm biến)", "Vượt xa 25 mA: nguồn đi tắt qua transmitter (ngắn mạch)"],
      checks: ["Xem màn hình hoặc mã chẩn đoán của transmitter", "Đo điện trở của cảm biến (ví dụ Pt100) để tìm chỗ hở mạch"],
    },
    "r-ma-over": {
      title: "Đứng ở mức cao nhất — cài đặt thang đo hoặc giá trị thật",
      causes: ["Thang quy đổi trong PLC hẹp hơn thang của transmitter", "Giá trị quá trình vượt thang của transmitter (ví dụ 0–10 bar)", "Nhầm đơn vị (bar, psi, kPa)"],
      checks: ["Tính % từ số mA đo được rồi so với giá trị trong PLC", "Xem thang đo trên nhãn hoặc trong cài đặt của transmitter"],
    },
    "r-ma-noise": {
      title: "Nhiễu — chống nhiễu, nối đất hoặc đường đi cáp",
      causes: ["Cáp tín hiệu đi chung máng với cáp động lực", "Lớp chống nhiễu nối đất cả hai đầu tạo vòng đất (thường chỉ nối một đầu)", "Chênh lệch điện thế đất giữa transmitter và PLC"],
      checks: ["Đo điện áp giữa hai đất (dưới 1 V là bình thường)", "Ghi lại biên độ dao động theo mA; cân nhắc bộ cách ly tín hiệu", "Giảm dao động bằng hằng số thời gian lọc ngõ vào (lọc RC)"],
    },
    "r-ma-loadv": {
      title: "Điện áp vòng quá thấp — điện trở tải hoặc sụt áp nguồn",
      causes: ["Trong vòng có quá nhiều bộ thu, đồng hồ hiển thị hoặc barrier", "Dây dài hoặc nhỏ, nguồn 24 V bị sụt"],
      checks: ["Dùng công cụ tính tải vòng để xem điện áp transmitter ở 20 mA (hoặc 21 mA)", "Đo nguồn 24 V khi có tải (sụt từ 5 % trở xuống là thoải mái)"],
    },
    "r-ma-process": {
      title: "Dây và điện áp có vẻ ổn — giá trị quá trình thật sự biến động hoặc do giảm chấn",
      causes: ["Giá trị quá trình thật sự dao động (xung của bơm…)", "Thời gian giảm chấn của transmitter hoặc bộ lọc ngõ vào PLC quá ngắn"],
      checks: ["Ghi giá trị lên biểu đồ thời gian và tìm dạng lặp lại theo chu kỳ", "Kiểm tra cài đặt giảm chấn (damping) của transmitter"],
    },
    "r-ma-scale": {
      title: "Giá trị không khớp thực tế — quy đổi, đơn vị hoặc giá trị số",
      causes: ["Thang kỹ thuật (thấp/cao) khác với cài đặt của transmitter", "Sai dải giá trị số của PLC (0–27648, 0–4000, 0–32000)", "Nhầm đơn vị (bar/psi, áp suất tương đối/tuyệt đối)"],
      checks: ["Nhập số mA đo được vào công cụ tính 4-20 mA rồi so với giá trị và giá trị số dự kiến", "Kiểm tra giá trị PLC có tỉ lệ đúng ở 4, 12 và 20 mA không"],
    },
    // ⑥ Cảm biến NPN/PNP
    "sn-kind": { q: "Triệu chứng là gì?", opts: ["Ngõ vào không bao giờ ON", "Ngõ vào không bao giờ OFF (luôn ON)"] },
    "sn-led": { q: "Khi có vật, đèn LED báo của chính cảm biến có sáng không?" },
    "sn-power": { q: "Điện áp giữa dây nâu (+) và dây xanh dương (0 V) của cảm biến có gần bằng điện áp nguồn (thường 24 V) không?" },
    "sn-type": { q: "Loại cảm biến và COM ngõ vào PLC có khớp không — NPN thì COM ngõ vào nối +24 V, PNP thì nối 0 V?", hint: "Không chắc? Chọn «Không»" },
    "sn-vin": { q: "Khi cảm biến ON, giữa cực ngõ vào PLC và COM ngõ vào có từ 15 V trở lên không?" },
    "sn-plcled": { q: "Lúc đó đèn LED ngõ vào của PLC có sáng không?" },
    "r-sn-power": {
      title: "Cảm biến không có nguồn",
      causes: ["Đứt dây nguồn, tiếp xúc đầu nối hoặc cầu chì", "Màu dây khác quy ước (nâu +, xanh dương 0 V, đen ngõ ra)", "Sụt áp tới cảm biến ở xa"],
      checks: ["Đo điện áp nguồn tại cảm biến khi các tải đang bật — sụt hơn 15 % là có vấn đề", "Kiểm tra màu dây và dải nguồn trong datasheet của cảm biến"],
    },
    "r-sn-sense": {
      title: "Có nguồn nhưng không phát hiện — cài đặt cảm biến hoặc vật cần phát hiện",
      causes: ["Khoảng cách phát hiện hoặc độ nhạy, vật liệu của vật (khoảng cách của cảm biến tiệm cận tùy loại kim loại)", "Cảm biến quang lệch trục hoặc thấu kính bẩn", "Cảm biến hỏng"],
      checks: ["Đưa vật lại gần để xem LED sáng ở khoảng cách nào", "Thay bằng một cảm biến cùng loại"],
    },
    "r-sn-mismatch": {
      title: "Có thể NPN/PNP và cực tính COM ngõ vào không khớp",
      causes: ["Cảm biến NPN mà COM ngõ vào ở 0 V (hoặc PNP mà ở +24 V) — dòng không có đường đi", "Các hãng dùng «sink/source» theo nghĩa ngược nhau"],
      checks: ["Khi cảm biến ON, đen–xanh dương đo gần 0 V với NPN, gần điện áp nguồn với PNP", "Xem trong hình đấu ngõ vào của tài liệu PLC xem COM nối vào đâu"],
    },
    "r-sn-wire": {
      title: "Cảm biến ON nhưng điện áp không tới ngõ vào — đi dây",
      causes: ["Dây ngõ ra đấu vào ngõ vào khác, hoặc đứt ở cầu đấu trung gian", "Thiếu dây COM ngõ vào", "Điện áp dư của cảm biến cao, hoặc dòng ra quá nhỏ so với ngõ vào"],
      checks: ["Đo đen–xanh dương khi cảm biến ON và OFF rồi nhập cả hai vào công cụ kiểm tra", "Ngõ vào PLC so với COM: ON từ 15 V trở lên (loại 1), OFF từ 5 V trở xuống"],
    },
    "r-sn-input": {
      title: "Điện áp đã tới nhưng PLC không đọc ON — card ngõ vào",
      causes: ["Card ngõ vào mất nguồn hoặc hỏng, hoặc đang xem nhầm slot", "Điện áp ngõ vào gần ngưỡng (11–15 V) — ngõ vào loại 1 có thể vẫn OFF"],
      checks: ["Chuyển cảm biến sang kênh bên cạnh", "Xem điện áp và dòng ON trong tài liệu card ngõ vào"],
    },
    "r-sn-program": {
      title: "Ngõ vào có ON — địa chỉ, bộ lọc hoặc độ dài xung",
      causes: ["Chương trình đọc địa chỉ ngõ vào khác (đánh số X theo bát phân hay thập lục phân)", "Tín hiệu ngắn hơn thời gian lọc ngõ vào (vật di chuyển nhanh)", "Nếu đọc qua truyền thông, phép tính địa chỉ bit bị lệch"],
      checks: ["Theo dõi trực tiếp bit ngõ vào đó trên màn hình monitor của PLC", "Với giao thức MC, kiểm tra cách ghi số thiết bị (device)"],
    },
    "r-sn-stuck": {
      title: "Ngõ vào không bao giờ OFF — dòng rò, chập hoặc chế độ ngõ ra",
      causes: ["Dòng rò khi OFF của cảm biến 2 dây giữ ngõ vào ở ON", "Dây ngõ ra chập vào +24 V (PNP) hoặc 0 V (NPN)", "Chế độ ngõ ra của cảm biến (NO/NC, light-on/dark-on) bị ngược"],
      checks: ["Khi cảm biến OFF, ngõ vào PLC so với COM phải từ 5 V trở xuống", "Xem tháo dây ngõ ra thì ngõ vào có OFF không"],
    },
    // ⑦ Giao thức MC
    "mc-ping": { q: "PLC có trả lời ping từ PC không?", hint: "Chọn «Không» sẽ chuyển sang nhánh Ethernet (subnet IP)" },
    "mc-port": { q: "Trong cài đặt Ethernet của PLC đã mở kết nối giao thức MC (SLMP) chưa, và số cổng, TCP/UDP, binary/ASCII có khớp với chương trình không?" },
    "mc-endcode": { q: "Mã kết thúc trong phản hồi có khác 0 không (ví dụ C059)?" },
    "mc-noreply": { q: "Kết nối đã mở nhưng không bao giờ có phản hồi (timeout)?", hint: "«Không» = có phản hồi nhưng giá trị trông sai" },
    "r-mc-port": {
      title: "Cài đặt kết nối giao thức MC trên PLC",
      causes: ["Chưa cấu hình kết nối giao thức MC (SLMP), hoặc chưa ghi cài đặt xuống PLC và khởi động lại", "Số cổng, TCP/UDP hoặc mã (binary/ASCII) khác với chương trình", "Một chương trình khác đã dùng cùng kết nối TCP đó"],
      checks: ["Thử phía chương trình trước với PortDock PLC Simulator trên 127.0.0.1, không cần PLC", "Ghi cài đặt Ethernet trong phần mềm kỹ thuật cạnh giá trị của chương trình rồi so sánh"],
    },
    "r-mc-endcode": {
      title: "PLC từ chối lệnh hỏi bằng mã kết thúc",
      causes: ["Lệnh hoặc lệnh con không được model PLC hỗ trợ", "Mã hoặc số thiết bị (device) ngoài phạm vi, hoặc quá nhiều điểm", "Cài đặt phía PLC như chống ghi khi đang RUN"],
      checks: ["Dán phản hồi vào công cụ giải mã giao thức MC để xem ý nghĩa mã kết thúc", "Làm theo thứ tự kiểm tra trong hướng dẫn về mã kết thúc"],
    },
    "r-mc-frame": {
      title: "Định dạng khung không khớp nên PLC im lặng",
      causes: ["Khung 3E/4E hoặc binary/ASCII khác với cài đặt PLC", "Giá trị header (số mạng, số PC, module đích) hoặc độ dài dữ liệu sai", "Dùng UDP trong khi PLC chờ TCP (hoặc ngược lại)"],
      checks: ["Giải mã từng trường của các byte đã gửi bằng công cụ giải mã giao thức MC"],
    },
    "r-mc-values": {
      title: "Có phản hồi nhưng giá trị trông sai — số thiết bị hoặc đơn vị",
      causes: ["X và Y là thập lục phân nhưng lại nhập theo thập phân", "Nhầm giữa đọc theo đơn vị bit và đơn vị word", "Thứ tự word hoặc dấu của giá trị 32 bit"],
      checks: ["So với bảng cách ghi trong hướng dẫn về số thiết bị", "So dấu và HEX bằng công cụ chuyển đổi số nguyên"],
    },
    // ⑧ USB trên PC bị rớt
    "pu-know": { q: "Bạn có biết thiết bị nào đang bị rớt không?", hint: "Nếu chỉ nghe tiếng cắm/rút lặp lại, hãy chọn «Không»" },
    "pu-port": { q: "Cắm sang cổng USB khác (phía sau, không qua hub) vẫn bị rớt?" },
    "pu-cable": { q: "Đổi cáp khác vẫn bị rớt?" },
    "pu-suspend": { q: "Tắt tiết kiệm điện USB (selective suspend, «allow turn off») có làm giảm rớt không?", hint: "PortDock chỉ đọc các mục này — hãy tự thay đổi trong cài đặt Windows" },
    "r-pu-find": {
      title: "Trước hết tìm xem thiết bị nào bị rớt",
      causes: ["Chưa rõ — có thể là chuột, bàn phím, USB thu không dây, camera, bộ chuyển USB-serial hoặc hub"],
      checks: ["Dùng nhật ký cắm/rút USB của Hardware Tester (từ 0.10.0) để xem thời điểm, tên thiết bị và VID:PID", "Thiết bị rớt từ 3 lần trở lên trong 10 phút được đánh dấu «suspected repeated drops» (nghi rớt lặp lại) — sau đó đi lại nhánh này cho thiết bị đó"],
    },
    "r-pu-port": {
      title: "Cổng hoặc hub ban đầu",
      causes: ["Dây nối bên trong hoặc tiếp xúc của cổng mặt trước", "Hub lấy nguồn từ bus bị thiếu nguồn"],
      checks: ["Dùng cổng phía sau hoặc hub có nguồn riêng", "Xác nhận bằng nhật ký cắm/rút USB của Hardware Tester rằng sau khi đổi cổng thì hết rớt (từ 0.10.0)"],
    },
    "r-pu-cable": {
      title: "Cáp hoặc đầu nối",
      causes: ["Cáp đứt ngầm bên trong (lay là rớt), đầu nối lỏng", "Cáp USB hoặc cáp nối dài quá dài"],
      checks: ["Dùng cáp ngắn, chất lượng tốt"],
    },
    "r-pu-suspend": {
      title: "Tiết kiệm điện USB tắt thiết bị",
      causes: ["USB selective suspend, «allow the computer to turn off» trên thiết bị hoặc hub"],
      checks: ["Đọc USB selective suspend bằng «Read this PC's settings» (đọc cài đặt của PC này) trong Port Inspector", "Nếu là PC điều khiển thiết bị, xem lại cả cài đặt ngủ trong power plan"],
    },
    "r-pu-device": {
      title: "Thiết bị, driver hoặc môi trường xung quanh",
      causes: ["Bản thân thiết bị hoặc driver của nó", "Thiết bị USB 3 chạy ở tốc độ USB 2.0 (dấu hiệu lỗi cáp hoặc cổng)", "Với USB thu không dây, nhiễu 2,4 GHz gần cổng USB 3.0", "Chênh lệch đất hoặc nhiễu của thiết bị (nhà máy)"],
      checks: ["Xem trên PC khác có bị rớt không", "Tìm dấu «Worth a look» (nên xem lại) ở tốc độ USB trong Hardware Tester (từ 0.10.0)", "Đo điện áp giữa đất PC và đất thiết bị"],
    },
  },
} satisfies TreeText;
