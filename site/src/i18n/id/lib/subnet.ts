// Teks dari lib/subnet.ts dan skrip kalkulator subnet IP (kalimat bahasa Inggris → bahasa Indonesia)
export default {
  "Private (RFC 1918) — internal plant or office network": "Privat (RFC 1918) — jaringan internal pabrik atau kantor",
  "Public address": "Alamat publik",
  "Loopback (127.x) — this PC itself": "Loopback (127.x) — PC ini sendiri",
  "Link-local (169.254.x) — what Windows assigns itself when DHCP fails": "Link-local (169.254.x) — alamat yang diberikan Windows sendiri saat DHCP gagal",
  "Carrier-grade NAT shared space (100.64/10, RFC 6598)": "Ruang alamat bersama carrier-grade NAT (100.64/10, RFC 6598)",
  "Multicast (224–239) — not usable as a device address": "Multicast (224–239) — tidak bisa dipakai sebagai alamat perangkat",
  "Limited broadcast (255.255.255.255)": "Broadcast terbatas (255.255.255.255)",
  "0.0.0.0 — unspecified": "0.0.0.0 — tidak ditentukan",
  "Reserved — do not use as a device address": "Dicadangkan — jangan dipakai sebagai alamat perangkat",
  "Both addresses are the same — an IP conflict; one of them will not communicate": "Kedua alamat sama — konflik IP; salah satunya tidak akan bisa berkomunikasi",
  "{} is the network address ({}) — not usable for a host": "{0} adalah alamat jaringan ({1}) — tidak bisa dipakai untuk host",
  "{} is the broadcast address ({}) — not usable for a host": "{0} adalah alamat broadcast ({1}) — tidak bisa dipakai untuk host",
  "Same subnet both ways — they reach each other directly, no gateway needed": "Satu subnet dari kedua arah — saling menjangkau langsung, tanpa perlu gateway",
  "Only one side sees the other as local — with {}'s mask, {} is on another network, so {}'s replies go to its gateway (make the masks match)":
    "Hanya satu sisi yang menganggap sisi lain lokal — dengan mask {0}, {1} berada di jaringan lain, jadi jawaban {2} dikirim ke gateway-nya (samakan mask-nya)",
  "Different subnets — they cannot reach each other without a gateway (router). Adding a second address on the device's subnet to the PC is the usual fix":
    "Subnet berbeda — keduanya tidak bisa saling menjangkau tanpa gateway (router). Cara yang biasa adalah menambahkan alamat kedua di subnet perangkat ke PC",
  "Masks differ (/{} vs /{}) — these two work, but other hosts on the network may be reachable one way only": "Mask berbeda (/{0} dan /{1}) — keduanya bisa berkomunikasi, tetapi host lain di jaringan mungkin hanya terjangkau satu arah",
  "Gateway {} is outside A's subnet — a gateway must be on the same subnet": "Gateway {0} berada di luar subnet A — gateway harus berada di subnet yang sama",
  // Tampilan (skrip di views/SubnetPage.astro)
  "Check A's address or mask (e.g. 192.168.1.200 · 255.255.255.0 or 24)": "Periksa alamat atau mask A (mis. 192.168.1.200 · 255.255.255.0 atau 24)",
  "Check B's address/mask or the gateway": "Periksa alamat/mask B atau gateway",
  "A {}, network {} → B is local": "A {0}, jaringan {1} → B lokal",
  "A {}, network {} → B is remote": "A {0}, jaringan {1} → B jauh (di jaringan lain)",
  "B {}, network {} → A is local": "B {0}, jaringan {1} → A lokal",
  "B {}, network {} → A is remote": "B {0}, jaringan {1} → A jauh (di jaringan lain)",
};
