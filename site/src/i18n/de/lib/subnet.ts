// Texte aus lib/subnet.ts und dem Skript des IP-Subnetzrechners (englischer Satz → Deutsch)
export default {
  "Private (RFC 1918) — internal plant or office network": "Privat (RFC 1918) — internes Werks- oder Büronetz",
  "Public address": "Öffentliche Adresse",
  "Loopback (127.x) — this PC itself": "Loopback (127.x) — dieser PC selbst",
  "Link-local (169.254.x) — what Windows assigns itself when DHCP fails": "Link-Local (169.254.x) — vergibt Windows sich selbst, wenn DHCP fehlschlägt",
  "Carrier-grade NAT shared space (100.64/10, RFC 6598)": "Gemeinsamer Adressraum für Carrier-Grade-NAT (100.64/10, RFC 6598)",
  "Multicast (224–239) — not usable as a device address": "Multicast (224–239) — nicht als Geräteadresse nutzbar",
  "Limited broadcast (255.255.255.255)": "Begrenzter Broadcast (255.255.255.255)",
  "0.0.0.0 — unspecified": "0.0.0.0 — nicht festgelegt",
  "Reserved — do not use as a device address": "Reserviert — nicht als Geräteadresse verwenden",
  "Both addresses are the same — an IP conflict; one of them will not communicate": "Beide Adressen sind gleich — ein IP-Konflikt; einer der beiden wird nicht kommunizieren",
  "{} is the network address ({}) — not usable for a host": "{0} ist die Netzadresse ({1}) — nicht für einen Teilnehmer nutzbar",
  "{} is the broadcast address ({}) — not usable for a host": "{0} ist die Broadcast-Adresse ({1}) — nicht für einen Teilnehmer nutzbar",
  "Same subnet both ways — they reach each other directly, no gateway needed": "In beide Richtungen dasselbe Subnetz — sie erreichen sich direkt, ohne Gateway",
  "Only one side sees the other as local — with {}'s mask, {} is on another network, so {}'s replies go to its gateway (make the masks match)":
    "Nur eine Seite hält die andere für lokal — mit der Maske von {0} liegt {1} in einem anderen Netz, daher gehen die Antworten von {2} an sein Gateway (Masken angleichen)",
  "Different subnets — they cannot reach each other without a gateway (router). Adding a second address on the device's subnet to the PC is the usual fix":
    "Verschiedene Subnetze — ohne Gateway (Router) erreichen sie sich nicht. Üblich ist, dem PC eine zweite Adresse im Subnetz des Geräts zu geben",
  "Masks differ (/{} vs /{}) — these two work, but other hosts on the network may be reachable one way only": "Die Masken unterscheiden sich (/{0} und /{1}) — diese beiden kommunizieren, andere Teilnehmer im Netz sind aber unter Umständen nur in eine Richtung erreichbar",
  "Gateway {} is outside A's subnet — a gateway must be on the same subnet": "Das Gateway {0} liegt außerhalb des Subnetzes von A — ein Gateway muss im selben Subnetz liegen",
  // Ansicht (Skript in views/SubnetPage.astro)
  "Check A's address or mask (e.g. 192.168.1.200 · 255.255.255.0 or 24)": "Adresse oder Maske von A prüfen (z. B. 192.168.1.200 · 255.255.255.0 oder 24)",
  "Check B's address/mask or the gateway": "Adresse/Maske von B oder das Gateway prüfen",
  "A {}, network {} → B is local": "A {0}, Netz {1} → B ist lokal",
  "A {}, network {} → B is remote": "A {0}, Netz {1} → B ist entfernt",
  "B {}, network {} → A is local": "B {0}, Netz {1} → A ist lokal",
  "B {}, network {} → A is remote": "B {0}, Netz {1} → A ist entfernt",
};
