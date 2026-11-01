// Türkçe — birden çok sayfada kullanılan adlar ve kısa açıklamalar (programlar, web araçları, gruplar, “Ne yapmak istiyorsunuz?”, dosya boyutları).
import type { Tool } from "../../data/tools";
import type { GroupId } from "../../data/webToolGroups";
import type { ScopePath } from "../scope";

/** 번역 범위의 웹 도구(scope.ts 의 tools/… 전부) */
type ScopeTool = Exclude<ScopePath, "" | "tools/" | "download/" | "safety/" | "privacy/">;

export default {
  /** Programların kısa açıklaması (tools.ts içindeki tagline) */
  apps: {
    serial: "Sinyal hatları ve otomatik yeniden bağlanma özellikli seri port (COM) terminali",
    "modbus-slave": "Register tabloları ve hata enjeksiyonu olan Modbus slave simülatörü (RTU ve TCP)",
    tcp: "Çoklu bağlantı, yankı (echo) ve otomatik yeniden bağlanma özellikli TCP istemci, sunucu ve aktarıcı (relay)",
    udp: "UDP gönderme ve alma — broadcast, multicast ve yankı (echo)",
    simulator: "Seri port, TCP ve UDP üzerinden kurallara göre yanıt veren sanal cihaz",
    netscan: "Endüstriyel ağlarda cihaz bulma — endüstriyel portları tanıma, uzun süreli ping",
    "modbus-master": "Modbus RTU/TCP master (yoklama aracı) — veri tipli değerler, yazma, slave adresi taraması",
    scpi: "Ölçü aletleri için SCPI terminali — LAN soketi ve RS-232, VISA gerekmez",
    plot: "Seri port, TCP ve UDP’den gelen sayıları canlı grafiğe döker",
    "port-inspector": "COM portları, ağ bağdaştırıcıları, PC ayarları ve kablosuz bağlantılar (Wi-Fi, Bluetooth) için salt okunur denetim",
    "plc-simulator": "MC protokolü (SLMP) sunucu simülatörü — HMI ve veri toplama yazılımını PLC olmadan test edin",
    "hw-tester": "Wi-Fi ve internet kopmalarını ve gecikmeyi kaydeder; Bluetooth ve USB bağlantı kayıtları da tutar (0.10.0 sürümünden itibaren)",
    mcp: "Yapay zekâ istemcileri için MCP sunucusu — portları, Modbus, MC ve SCPI’yi okur; yalnızca bu PC’deki simülatörlere yazar",
  } satisfies Record<Tool["id"], string>,

  /** Web araçlarının adı ve kısa açıklaması (webTools.ts içindeki name, blurb) */
  webTools: {
    "tools/4-20ma/": { name: "4–20 mA ölçekleme hesaplayıcı", blurb: "Akım/gerilim ↔ mühendislik birimi ↔ % ↔ PLC ham değeri (0–27648 vb.). 4, 8, 12, 16 ve 20 mA için tablo." },
    "tools/modbus/": { name: "Modbus RTU istek oluşturucu", blurb: "Slave adresi, fonksiyon, adres, adet → CRC eklenmiş istek baytları. 40001 yazımını da anlar." },
    "tools/modbus-decoder/": { name: "Modbus çerçeve çözücü", blurb: "RTU veya TCP baytlarını yapıştırın: slave adresi, fonksiyon, değerler, CRC, MBAP ve istisna kodları çözülür." },
    "tools/modbus-float/": { name: "Modbus float dönüştürücü", blurb: "2 veya 4 register ↔ float32, float64, int32. ABCD, CDAB, BADC ve DCBA sıralamaları tek tabloda." },
    "tools/mc-decoder/": { name: "MC protokolü (SLMP) çerçeve çözücü", blurb: "3E/4E, binary veya ASCII çerçeveler → başlık, komut, cihaz, değerler ve bitiş kodu. Yanıtı isteğiyle eşleştirip çözer, istek oluşturur." },
    "tools/rs485/": { name: "RS-485 sonlandırma ve bias hesaplayıcı", blurb: "Pull-up/pull-down ve 120 ya da 150 Ω sonlandırma → 200 mV eşiğine göre boşta gerilim, direnç gücü, baud hızına göre hat uzunluğu." },
    "tools/serial-timing/": { name: "Seri haberleşme zamanlama hesaplayıcı", blurb: "Baud hızı ve parite → karakter süresi, Modbus RTU t3.5 ve t1.5, istek ve yanıt süresi, yoklama döngüsü, en kısa zaman aşımı." },
    "tools/checksum/": { name: "CRC ve sağlama toplamı hesaplayıcı", blurb: "CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8 ve SUM16 tek seferde." },
    "tools/subnet/": { name: "IP alt ağ hesaplayıcı", blurb: "Adres ve maske (/24) → ağ, broadcast, aralık. İki maskeyle de PC ile PLC’nin aynı alt ağda olup olmadığını denetler." },
    "tools/pinouts/": { name: "Konnektör pin dizilimleri", blurb: "DB9/DB25 RS-232, RJ45 T568A/B ve Ethernet, Modbus RJ45/DB9 (şartname), M12 A/D/X kodlu, M8, USB-A/B/C, RS-485 klemens adları — erkek/dişi önden görünüm, kablo renkleri, kaynaklar, SVG." },
  } satisfies Record<ScopeTool, { name: string; blurb: string }>,

  /** Web aracı grupları (webToolGroups.ts) */
  groups: {
    comm: "Seri haberleşme ve Modbus",
    net: "Ağ",
    draw: "Kablolama ve şemalar",
    diag: "Arıza bulma ve kontroller",
    field: "Saha araçları",
    signal: "Sinyaller ve sensörler",
    elec: "Elektrik ve motorlar",
    mech: "Mekanik ve pnömatik",
    units: "Birim dönüştürme",
    hw: "PC donanım testleri",
    etc: "Diğer araçlar",
  } satisfies Record<GroupId, string>,

  /** “Ne yapmak istiyorsunuz?” (components/PickApp.astro) — yol kimliğine göre */
  pick: {
    title: "Ne yapmak istiyorsunuz?",
    q: {
      serial: "Seri port (COM) veya RS-485 cihazıyla haberleşmek",
      modbus: "Modbus cihazlarını okumak ve yazmak ya da bir cihazı taklit etmek",
      net: "Ağdaki cihazları bulmak, TCP ve UDP",
      sim: "HMI’yı veya üst sistem yazılımını PLC ya da cihaz olmadan test etmek",
      scpi: "Ölçü aletini (SCPI) kumanda etmek ve ölçümleri kaydetmek",
      pc: "PC bağlantı sorunları — COM port, ağ bağdaştırıcısı, Wi-Fi, Bluetooth",
      mcp: "Cihazları bir yapay zekâ istemcisinden okumak (MCP)",
      pcap: "Trafik kaydını (pcap) incelemek — yanıt süreleri, gelmeyen yanıtlar",
    },
    notes: {
      "pcap:tcp": "HMI ile PLC arasına aktarıcı (relay) olarak girip pcap kaydedin — Wireshark gerekmez",
    },
    pcapName: "pcap çözümleyici (İngilizce)",
    pcapNote: "Wireshark veya pktmon kayıtları doğrudan tarayıcıda, kurulum yok — Modbus TCP ve MC istek/yanıt çiftleri",
    hwTitle: "Mikrofon, klavye, fare, web kamerası veya monitör testi",
    hwName: "PC donanım testleri (İngilizce)",
    hwNote: (n: number) => `Windows programı değil, doğrudan tarayıcıda çalışır, kurulum yok (${n} test)`,
  },

  /** Dosya boyutları (release.ts içindeki SIZE) */
  size: { setup: "yaklaşık 4 MB", offline: "yaklaşık 220 MB", portable: "yaklaşık 3 MB" },
};
