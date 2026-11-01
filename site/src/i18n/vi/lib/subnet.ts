// Văn bản từ lib/subnet.ts và script của công cụ tính subnet IP (câu tiếng Anh → tiếng Việt)
export default {
  "Private (RFC 1918) — internal plant or office network": "Địa chỉ riêng (RFC 1918) — mạng nội bộ nhà máy hoặc văn phòng",
  "Public address": "Địa chỉ công cộng",
  "Loopback (127.x) — this PC itself": "Loopback (127.x) — chính PC này",
  "Link-local (169.254.x) — what Windows assigns itself when DHCP fails": "Link-local (169.254.x) — Windows tự gán khi DHCP thất bại",
  "Carrier-grade NAT shared space (100.64/10, RFC 6598)": "Dải dùng chung cho Carrier-grade NAT (100.64/10, RFC 6598)",
  "Multicast (224–239) — not usable as a device address": "Multicast (224–239) — không dùng làm địa chỉ thiết bị được",
  "Limited broadcast (255.255.255.255)": "Broadcast giới hạn (255.255.255.255)",
  "0.0.0.0 — unspecified": "0.0.0.0 — chưa xác định",
  "Reserved — do not use as a device address": "Dành riêng — không dùng làm địa chỉ thiết bị",
  "Both addresses are the same — an IP conflict; one of them will not communicate": "Hai địa chỉ trùng nhau — xung đột IP; một trong hai sẽ không liên lạc được",
  "{} is the network address ({}) — not usable for a host": "{0} là địa chỉ mạng ({1}) — không dùng cho máy được",
  "{} is the broadcast address ({}) — not usable for a host": "{0} là địa chỉ broadcast ({1}) — không dùng cho máy được",
  "Same subnet both ways — they reach each other directly, no gateway needed": "Cùng subnet theo cả hai chiều — liên lạc trực tiếp, không cần gateway",
  "Only one side sees the other as local — with {}'s mask, {} is on another network, so {}'s replies go to its gateway (make the masks match)":
    "Chỉ một bên coi bên kia là cục bộ — theo mặt nạ của {0} thì {1} nằm ở mạng khác, nên phản hồi của {2} đi tới gateway của nó (hãy đặt mặt nạ giống nhau)",
  "Different subnets — they cannot reach each other without a gateway (router). Adding a second address on the device's subnet to the PC is the usual fix":
    "Khác subnet — không có gateway (router) thì không liên lạc được. Cách thường làm là thêm cho PC một địa chỉ thứ hai thuộc subnet của thiết bị",
  "Masks differ (/{} vs /{}) — these two work, but other hosts on the network may be reachable one way only": "Mặt nạ khác nhau (/{0} và /{1}) — hai máy này liên lạc được, nhưng với các máy khác trong mạng có thể chỉ thông một chiều",
  "Gateway {} is outside A's subnet — a gateway must be on the same subnet": "Gateway {0} nằm ngoài subnet của A — gateway phải cùng subnet",
  // Màn hình (script trong views/SubnetPage.astro)
  "Check A's address or mask (e.g. 192.168.1.200 · 255.255.255.0 or 24)": "Hãy kiểm tra địa chỉ hoặc mặt nạ của A (ví dụ 192.168.1.200 · 255.255.255.0 hoặc 24)",
  "Check B's address/mask or the gateway": "Hãy kiểm tra địa chỉ/mặt nạ của B hoặc gateway",
  "A {}, network {} → B is local": "A {0}, mạng {1} → B là cục bộ",
  "A {}, network {} → B is remote": "A {0}, mạng {1} → B ở mạng khác",
  "B {}, network {} → A is local": "B {0}, mạng {1} → A là cục bộ",
  "B {}, network {} → A is remote": "B {0}, mạng {1} → A ở mạng khác",
};
