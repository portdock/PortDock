// Textos de lib/subnet.ts e do script da calculadora de sub-rede IP (frase em inglês → português)
export default {
  "Private (RFC 1918) — internal plant or office network": "Privado (RFC 1918) — rede interna da fábrica ou do escritório",
  "Public address": "Endereço público",
  "Loopback (127.x) — this PC itself": "Loopback (127.x) — o próprio PC",
  "Link-local (169.254.x) — what Windows assigns itself when DHCP fails": "Link-local (169.254.x) — o que o Windows atribui a si mesmo quando o DHCP falha",
  "Carrier-grade NAT shared space (100.64/10, RFC 6598)": "Espaço compartilhado de CGNAT da operadora (100.64/10, RFC 6598)",
  "Multicast (224–239) — not usable as a device address": "Multicast (224–239) — não serve como endereço de equipamento",
  "Limited broadcast (255.255.255.255)": "Broadcast limitado (255.255.255.255)",
  "0.0.0.0 — unspecified": "0.0.0.0 — não especificado",
  "Reserved — do not use as a device address": "Reservado — não use como endereço de equipamento",
  "Both addresses are the same — an IP conflict; one of them will not communicate": "Os dois endereços são iguais — conflito de IP; um deles não vai se comunicar",
  "{} is the network address ({}) — not usable for a host": "{0} é o endereço de rede ({1}) — não serve para um host",
  "{} is the broadcast address ({}) — not usable for a host": "{0} é o endereço de broadcast ({1}) — não serve para um host",
  "Same subnet both ways — they reach each other directly, no gateway needed": "Mesma sub-rede nos dois sentidos — eles se alcançam diretamente, sem gateway",
  "Only one side sees the other as local — with {}'s mask, {} is on another network, so {}'s replies go to its gateway (make the masks match)":
    "Só um lado vê o outro como local — pela máscara de {0}, {1} está em outra rede, então as respostas de {2} vão para o gateway (deixe as máscaras iguais)",
  "Different subnets — they cannot reach each other without a gateway (router). Adding a second address on the device's subnet to the PC is the usual fix":
    "Sub-redes diferentes — não se alcançam sem um gateway (roteador). O mais comum é adicionar ao PC um segundo endereço na sub-rede do equipamento",
  "Masks differ (/{} vs /{}) — these two work, but other hosts on the network may be reachable one way only": "As máscaras são diferentes (/{0} e /{1}) — estes dois se comunicam, mas outros hosts da rede podem ficar acessíveis num só sentido",
  "Gateway {} is outside A's subnet — a gateway must be on the same subnet": "O gateway {0} está fora da sub-rede de A — o gateway precisa estar na mesma sub-rede",
  // Tela (script de views/SubnetPage.astro)
  "Check A's address or mask (e.g. 192.168.1.200 · 255.255.255.0 or 24)": "Confira o endereço ou a máscara de A (ex.: 192.168.1.200 · 255.255.255.0 ou 24)",
  "Check B's address/mask or the gateway": "Confira o endereço/máscara de B ou o gateway",
  "A {}, network {} → B is local": "A {0}, rede {1} → B é local",
  "A {}, network {} → B is remote": "A {0}, rede {1} → B é remoto",
  "B {}, network {} → A is local": "B {0}, rede {1} → A é local",
  "B {}, network {} → A is remote": "B {0}, rede {1} → A é remoto",
};
