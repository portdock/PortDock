// lib/subnet.ts 와 IP 서브넷 계산기 화면 스크립트 문구(영어 문장 → 일본어)
export default {
  "Private (RFC 1918) — internal plant or office network": "プライベートアドレス(RFC 1918)— 工場・事務所の内側のネットワーク",
  "Public address": "グローバルアドレス",
  "Loopback (127.x) — this PC itself": "ループバック(127.x)— この PC 自身",
  "Link-local (169.254.x) — what Windows assigns itself when DHCP fails": "リンクローカル(169.254.x)— DHCP で受け取れなかったとき Windows が自分で付けるアドレス",
  "Carrier-grade NAT shared space (100.64/10, RFC 6598)": "通信事業者の共有アドレス(100.64/10、RFC 6598)",
  "Multicast (224–239) — not usable as a device address": "マルチキャスト(224~239)— 機器のアドレスには使えない",
  "Limited broadcast (255.255.255.255)": "リミテッドブロードキャスト(255.255.255.255)",
  "0.0.0.0 — unspecified": "0.0.0.0 — 未指定",
  "Reserved — do not use as a device address": "予約アドレス — 機器のアドレスには使わない",
  "Both addresses are the same — an IP conflict; one of them will not communicate": "2 つのアドレスが同じです — IP の重複で、どちらか一方は通信できません",
  "{} is the network address ({}) — not usable for a host": "{0} がネットワークアドレス({1})です — 機器のアドレスには使えません",
  "{} is the broadcast address ({}) — not usable for a host": "{0} がブロードキャストアドレス({1})です — 機器のアドレスには使えません",
  "Same subnet both ways — they reach each other directly, no gateway needed": "互いに同じサブネット — ゲートウェイなしで直接届きます",
  "Only one side sees the other as local — with {}'s mask, {} is on another network, so {}'s replies go to its gateway (make the masks match)":
    "片方だけが相手を同じサブネットと見ています — {0} のマスクでは {1} が別のネットワークなので、{2} の応答はゲートウェイへ行ってしまいます(マスクをそろえてください)",
  "Different subnets — they cannot reach each other without a gateway (router). Adding a second address on the device's subnet to the PC is the usual fix":
    "別のサブネット — ゲートウェイ(ルーター)なしでは直接届きません。機器と同じセグメントのアドレスを PC にもう 1 つ追加する方法がよく使われます",
  "Masks differ (/{} vs /{}) — these two work, but other hosts on the network may be reachable one way only": "マスクが違います(/{0} と /{1})— この 2 台どうしは通信できますが、同じネットワークのほかの機器とは片方向しか届かないことがあります",
  "Gateway {} is outside A's subnet — a gateway must be on the same subnet": "ゲートウェイ {0} が A のサブネットの外にあります — ゲートウェイは同じサブネットの中に置く必要があります",
  // 화면(views/SubnetPage.astro 스크립트)
  "Check A's address or mask (e.g. 192.168.1.200 · 255.255.255.0 or 24)": "A のアドレスかマスクを確認してください(例: 192.168.1.200 · 255.255.255.0 または 24)",
  "Check B's address/mask or the gateway": "B のアドレス・マスクかゲートウェイを確認してください",
  "A {}, network {} → B is local": "A {0} のネットワーク {1} → B は同じサブネット",
  "A {}, network {} → B is remote": "A {0} のネットワーク {1} → B は別のネットワーク",
  "B {}, network {} → A is local": "B {0} のネットワーク {1} → A は同じサブネット",
  "B {}, network {} → A is remote": "B {0} のネットワーク {1} → A は別のネットワーク",
};
