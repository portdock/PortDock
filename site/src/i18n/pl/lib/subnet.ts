// lib/subnet.ts 와 IP 서브넷 계산기 화면 스크립트 문구(영어 문장 → 폴란드어)
export default {
  "Private (RFC 1918) — internal plant or office network": "Prywatny (RFC 1918) — wewnętrzna sieć zakładu lub biura",
  "Public address": "Adres publiczny",
  "Loopback (127.x) — this PC itself": "Pętla zwrotna (127.x) — ten sam komputer",
  "Link-local (169.254.x) — what Windows assigns itself when DHCP fails": "Adres lokalny łącza (169.254.x) — Windows nadaje go sobie, gdy DHCP zawiedzie",
  "Carrier-grade NAT shared space (100.64/10, RFC 6598)": "Pula współdzielona operatora, CGNAT (100.64/10, RFC 6598)",
  "Multicast (224–239) — not usable as a device address": "Multicast (224–239) — nie nadaje się na adres urządzenia",
  "Limited broadcast (255.255.255.255)": "Ograniczony broadcast (255.255.255.255)",
  "0.0.0.0 — unspecified": "0.0.0.0 — adres nieokreślony",
  "Reserved — do not use as a device address": "Zarezerwowany — nie używaj jako adresu urządzenia",
  "Both addresses are the same — an IP conflict; one of them will not communicate": "Oba adresy są takie same — konflikt IP; jedno z urządzeń nie będzie się komunikować",
  "{} is the network address ({}) — not usable for a host": "{0} to adres sieci ({1}) — nie można go nadać urządzeniu",
  "{} is the broadcast address ({}) — not usable for a host": "{0} to adres rozgłoszeniowy ({1}) — nie można go nadać urządzeniu",
  "Same subnet both ways — they reach each other directly, no gateway needed": "Ta sama podsieć w obu kierunkach — łączą się bezpośrednio, brama niepotrzebna",
  "Only one side sees the other as local — with {}'s mask, {} is on another network, so {}'s replies go to its gateway (make the masks match)":
    "Tylko jedna strona widzi drugą jako lokalną — według maski {0} urządzenie {1} jest w innej sieci, więc odpowiedzi {2} trafiają do bramy (ustaw takie same maski)",
  "Different subnets — they cannot reach each other without a gateway (router). Adding a second address on the device's subnet to the PC is the usual fix":
    "Różne podsieci — bez bramy (routera) się nie połączą. Zwykle dodaje się komputerowi drugi adres z podsieci urządzenia",
  "Masks differ (/{} vs /{}) — these two work, but other hosts on the network may be reachable one way only": "Maski się różnią (/{0} i /{1}) — te dwa urządzenia się połączą, ale z innymi w tej sieci łączność może działać tylko w jedną stronę",
  "Gateway {} is outside A's subnet — a gateway must be on the same subnet": "Brama {0} jest poza podsiecią A — brama musi być w tej samej podsieci",
  // 화면(views/SubnetPage.astro 스크립트)
  "Check A's address or mask (e.g. 192.168.1.200 · 255.255.255.0 or 24)": "Sprawdź adres lub maskę A (np. 192.168.1.200 · 255.255.255.0 lub 24)",
  "Check B's address/mask or the gateway": "Sprawdź adres/maskę B lub bramę",
  "A {}, network {} → B is local": "A {0}, sieć {1} → B jest w tej samej podsieci",
  "A {}, network {} → B is remote": "A {0}, sieć {1} → B jest w innej sieci",
  "B {}, network {} → A is local": "B {0}, sieć {1} → A jest w tej samej podsieci",
  "B {}, network {} → A is remote": "B {0}, sieć {1} → A jest w innej sieci",
};
