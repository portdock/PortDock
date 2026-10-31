// lib/subnet.ts 와 IP 서브넷 계산기 화면 스크립트 문구(영어 문장 → 스페인어)
export default {
  "Private (RFC 1918) — internal plant or office network": "Privada (RFC 1918): red interna de planta u oficina",
  "Public address": "Dirección pública",
  "Loopback (127.x) — this PC itself": "Loopback (127.x): este mismo PC",
  "Link-local (169.254.x) — what Windows assigns itself when DHCP fails": "Enlace local (169.254.x): la que se asigna Windows cuando falla el DHCP",
  "Carrier-grade NAT shared space (100.64/10, RFC 6598)": "Espacio compartido de CGNAT del operador (100.64/10, RFC 6598)",
  "Multicast (224–239) — not usable as a device address": "Multicast (224–239): no sirve como dirección de un equipo",
  "Limited broadcast (255.255.255.255)": "Broadcast limitado (255.255.255.255)",
  "0.0.0.0 — unspecified": "0.0.0.0: sin especificar",
  "Reserved — do not use as a device address": "Reservada: no la use como dirección de un equipo",
  "Both addresses are the same — an IP conflict; one of them will not communicate": "Las dos direcciones son iguales: conflicto de IP; uno de los dos no podrá comunicarse",
  "{} is the network address ({}) — not usable for a host": "{0} es la dirección de red ({1}): no sirve para un equipo",
  "{} is the broadcast address ({}) — not usable for a host": "{0} es la dirección de broadcast ({1}): no sirve para un equipo",
  "Same subnet both ways — they reach each other directly, no gateway needed": "Misma subred en ambos sentidos: se alcanzan directamente, sin puerta de enlace",
  "Only one side sees the other as local — with {}'s mask, {} is on another network, so {}'s replies go to its gateway (make the masks match)":
    "Solo un lado ve al otro como local: con la máscara de {0}, {1} está en otra red, así que las respuestas de {2} van a su puerta de enlace (iguale las máscaras)",
  "Different subnets — they cannot reach each other without a gateway (router). Adding a second address on the device's subnet to the PC is the usual fix":
    "Subredes distintas: no se alcanzan sin una puerta de enlace (router). Lo habitual es añadir al PC una segunda dirección en la subred del equipo",
  "Masks differ (/{} vs /{}) — these two work, but other hosts on the network may be reachable one way only": "Las máscaras son distintas (/{0} frente a /{1}): estos dos se comunican, pero con otros equipos de la red la comunicación puede funcionar en un solo sentido",
  "Gateway {} is outside A's subnet — a gateway must be on the same subnet": "La puerta de enlace {0} está fuera de la subred de A: debe estar en la misma subred",
  // 화면(views/SubnetPage.astro 스크립트)
  "Check A's address or mask (e.g. 192.168.1.200 · 255.255.255.0 or 24)": "Revise la dirección o la máscara de A (p. ej., 192.168.1.200 · 255.255.255.0 o 24)",
  "Check B's address/mask or the gateway": "Revise la dirección o máscara de B, o la puerta de enlace",
  "A {}, network {} → B is local": "A {0}, red {1} → B es local",
  "A {}, network {} → B is remote": "A {0}, red {1} → B es remota",
  "B {}, network {} → A is local": "B {0}, red {1} → A es local",
  "B {}, network {} → A is remote": "B {0}, red {1} → A es remota",
};
