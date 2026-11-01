// Testi da lib/subnet.ts e dallo script del calcolatore di subnet IP (frase inglese → italiano)
export default {
  "Private (RFC 1918) — internal plant or office network": "Privato (RFC 1918) — rete interna di stabilimento o d'ufficio",
  "Public address": "Indirizzo pubblico",
  "Loopback (127.x) — this PC itself": "Loopback (127.x) — questo stesso PC",
  "Link-local (169.254.x) — what Windows assigns itself when DHCP fails": "Link-local (169.254.x) — Windows se lo assegna da solo quando il DHCP non risponde",
  "Carrier-grade NAT shared space (100.64/10, RFC 6598)": "Spazio condiviso per il NAT carrier-grade (100.64/10, RFC 6598)",
  "Multicast (224–239) — not usable as a device address": "Multicast (224–239) — non utilizzabile come indirizzo di un dispositivo",
  "Limited broadcast (255.255.255.255)": "Broadcast limitato (255.255.255.255)",
  "0.0.0.0 — unspecified": "0.0.0.0 — non specificato",
  "Reserved — do not use as a device address": "Riservato — da non usare come indirizzo di un dispositivo",
  "Both addresses are the same — an IP conflict; one of them will not communicate": "I due indirizzi sono uguali — conflitto IP; uno dei due non comunicherà",
  "{} is the network address ({}) — not usable for a host": "{0} è l'indirizzo di rete ({1}) — non utilizzabile per un host",
  "{} is the broadcast address ({}) — not usable for a host": "{0} è l'indirizzo di broadcast ({1}) — non utilizzabile per un host",
  "Same subnet both ways — they reach each other directly, no gateway needed": "Stessa subnet in entrambi i sensi — si raggiungono direttamente, senza gateway",
  "Only one side sees the other as local — with {}'s mask, {} is on another network, so {}'s replies go to its gateway (make the masks match)":
    "Solo un lato vede l'altro come locale — con la maschera di {0}, {1} è su un'altra rete, quindi le risposte di {2} vanno al suo gateway (uniformate le maschere)",
  "Different subnets — they cannot reach each other without a gateway (router). Adding a second address on the device's subnet to the PC is the usual fix":
    "Subnet diverse — senza gateway (router) non si raggiungono. La soluzione abituale è aggiungere al PC un secondo indirizzo nella subnet del dispositivo",
  "Masks differ (/{} vs /{}) — these two work, but other hosts on the network may be reachable one way only": "Le maschere sono diverse (/{0} e /{1}) — questi due comunicano, ma altri host della rete potrebbero essere raggiungibili in un solo senso",
  "Gateway {} is outside A's subnet — a gateway must be on the same subnet": "Il gateway {0} è fuori dalla subnet di A — un gateway deve stare nella stessa subnet",
  // Vista (script in views/SubnetPage.astro)
  "Check A's address or mask (e.g. 192.168.1.200 · 255.255.255.0 or 24)": "Controllate indirizzo o maschera di A (es. 192.168.1.200 · 255.255.255.0 o 24)",
  "Check B's address/mask or the gateway": "Controllate indirizzo/maschera di B o il gateway",
  "A {}, network {} → B is local": "A {0}, rete {1} → B è locale",
  "A {}, network {} → B is remote": "A {0}, rete {1} → B è remoto",
  "B {}, network {} → A is local": "B {0}, rete {1} → A è locale",
  "B {}, network {} → A is remote": "B {0}, rete {1} → A è remoto",
};
