// lib/subnet.ts 와 IP 서브넷 계산기 화면 스크립트 문구(영어 문장 → 프랑스어)
export default {
  "Private (RFC 1918) — internal plant or office network": "Privée (RFC 1918) — réseau interne d’usine ou de bureau",
  "Public address": "Adresse publique",
  "Loopback (127.x) — this PC itself": "Bouclage (127.x) — ce PC lui-même",
  "Link-local (169.254.x) — what Windows assigns itself when DHCP fails": "Lien local (169.254.x) — adresse que Windows s’attribue quand le DHCP échoue",
  "Carrier-grade NAT shared space (100.64/10, RFC 6598)": "Espace partagé de NAT opérateur (100.64/10, RFC 6598)",
  "Multicast (224–239) — not usable as a device address": "Multicast (224–239) — inutilisable comme adresse d’appareil",
  "Limited broadcast (255.255.255.255)": "Broadcast limité (255.255.255.255)",
  "0.0.0.0 — unspecified": "0.0.0.0 — non spécifiée",
  "Reserved — do not use as a device address": "Réservée — ne pas utiliser comme adresse d’appareil",
  "Both addresses are the same — an IP conflict; one of them will not communicate": "Les deux adresses sont identiques — conflit d’adresse IP ; l’un des deux ne communiquera pas",
  "{} is the network address ({}) — not usable for a host": "{0} est l’adresse réseau ({1}) — inutilisable pour un hôte",
  "{} is the broadcast address ({}) — not usable for a host": "{0} est l’adresse de broadcast ({1}) — inutilisable pour un hôte",
  "Same subnet both ways — they reach each other directly, no gateway needed": "Même sous-réseau dans les deux sens — ils se joignent directement, sans passerelle",
  "Only one side sees the other as local — with {}'s mask, {} is on another network, so {}'s replies go to its gateway (make the masks match)":
    "Un seul côté voit l’autre comme local — avec le masque de {0}, {1} est sur un autre réseau, donc les réponses de {2} partent vers sa passerelle (harmonisez les masques)",
  "Different subnets — they cannot reach each other without a gateway (router). Adding a second address on the device's subnet to the PC is the usual fix":
    "Sous-réseaux différents — ils ne peuvent pas se joindre sans passerelle (routeur). La solution habituelle consiste à ajouter au PC une seconde adresse dans le sous-réseau de l’appareil",
  "Masks differ (/{} vs /{}) — these two work, but other hosts on the network may be reachable one way only": "Masques différents (/{0} et /{1}) — ces deux-là communiquent, mais d’autres hôtes du réseau risquent de n’être joignables que dans un sens",
  "Gateway {} is outside A's subnet — a gateway must be on the same subnet": "La passerelle {0} est hors du sous-réseau de A — une passerelle doit se trouver dans le même sous-réseau",
  // 화면(views/SubnetPage.astro 스크립트)
  "Check A's address or mask (e.g. 192.168.1.200 · 255.255.255.0 or 24)": "Vérifiez l’adresse ou le masque de A (ex. 192.168.1.200 · 255.255.255.0 ou 24)",
  "Check B's address/mask or the gateway": "Vérifiez l’adresse ou le masque de B, ou la passerelle",
  "A {}, network {} → B is local": "A {0}, réseau {1} → B est local",
  "A {}, network {} → B is remote": "A {0}, réseau {1} → B est distant",
  "B {}, network {} → A is local": "B {0}, réseau {1} → A est local",
  "B {}, network {} → A is remote": "B {0}, réseau {1} → A est distant",
};
