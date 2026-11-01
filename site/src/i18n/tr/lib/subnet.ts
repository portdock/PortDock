// lib/subnet.ts ve IP alt ağ hesaplayıcısının betiği metinleri (İngilizce cümle → Türkçe)
export default {
  "Private (RFC 1918) — internal plant or office network": "Özel (RFC 1918) — fabrika veya ofis iç ağı",
  "Public address": "Genel (public) adres",
  "Loopback (127.x) — this PC itself": "Loopback (127.x) — bu PC’nin kendisi",
  "Link-local (169.254.x) — what Windows assigns itself when DHCP fails": "Link-local (169.254.x) — DHCP başarısız olunca Windows’un kendine verdiği adres",
  "Carrier-grade NAT shared space (100.64/10, RFC 6598)": "Operatör sınıfı NAT (CGNAT) için ortak adres alanı (100.64/10, RFC 6598)",
  "Multicast (224–239) — not usable as a device address": "Multicast (224–239) — cihaz adresi olarak kullanılamaz",
  "Limited broadcast (255.255.255.255)": "Sınırlı broadcast (255.255.255.255)",
  "0.0.0.0 — unspecified": "0.0.0.0 — belirtilmemiş",
  "Reserved — do not use as a device address": "Ayrılmış — cihaz adresi olarak kullanmayın",
  "Both addresses are the same — an IP conflict; one of them will not communicate": "İki adres aynı — IP çakışması; biri haberleşemez",
  "{} is the network address ({}) — not usable for a host": "{0} ağ adresidir ({1}) — bir cihaza verilemez",
  "{} is the broadcast address ({}) — not usable for a host": "{0} broadcast adresidir ({1}) — bir cihaza verilemez",
  "Same subnet both ways — they reach each other directly, no gateway needed": "İki yönden de aynı alt ağ — birbirlerine doğrudan ulaşırlar, ağ geçidi gerekmez",
  "Only one side sees the other as local — with {}'s mask, {} is on another network, so {}'s replies go to its gateway (make the masks match)":
    "Yalnızca bir taraf diğerini yerel görüyor — {0} maskesine göre {1} başka bir ağda, bu yüzden {2} yanıtlarını ağ geçidine gönderir (maskeleri eşitleyin)",
  "Different subnets — they cannot reach each other without a gateway (router). Adding a second address on the device's subnet to the PC is the usual fix":
    "Farklı alt ağlar — ağ geçidi (yönlendirici) olmadan birbirlerine ulaşamazlar. Genellikle PC’ye cihazın alt ağından ikinci bir adres eklenir",
  "Masks differ (/{} vs /{}) — these two work, but other hosts on the network may be reachable one way only": "Maskeler farklı (/{0} ve /{1}) — bu ikisi haberleşir, ancak ağdaki başka cihazlara yalnızca tek yönden ulaşılabilir",
  "Gateway {} is outside A's subnet — a gateway must be on the same subnet": "Ağ geçidi {0}, A’nın alt ağının dışında — ağ geçidi aynı alt ağda olmalıdır",
  // Görünüm (views/SubnetPage.astro içindeki betik)
  "Check A's address or mask (e.g. 192.168.1.200 · 255.255.255.0 or 24)": "A’nın adresini veya maskesini kontrol edin (ör. 192.168.1.200 · 255.255.255.0 ya da 24)",
  "Check B's address/mask or the gateway": "B’nin adresini/maskesini veya ağ geçidini kontrol edin",
  "A {}, network {} → B is local": "A {0}, ağ {1} → B yerel",
  "A {}, network {} → B is remote": "A {0}, ağ {1} → B uzak",
  "B {}, network {} → A is local": "B {0}, ağ {1} → A yerel",
  "B {}, network {} → A is remote": "B {0}, ağ {1} → A uzak",
};
