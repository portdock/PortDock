// Français — 여러 쪽에서 쓰는 이름·한 줄 소개(프로그램·웹 도구·도구 묶음·«무엇을 하려나요?»·파일 크기).
import type { Tool } from "../../data/tools";
import type { GroupId } from "../../data/webToolGroups";
import type { ScopePath } from "../scope";

/** 번역 범위의 웹 도구(scope.ts 의 tools/… 전부) */
type ScopeTool = Exclude<ScopePath, "" | "tools/" | "download/" | "safety/" | "privacy/">;

export default {
  /** 프로그램 한 줄 소개(tools.ts 의 tagline) */
  apps: {
    serial: "Terminal série (COM) avec lignes de contrôle et reconnexion automatique",
    "modbus-slave": "Simulateur d’esclave Modbus (RTU et TCP) avec tables de registres et injection de défauts",
    tcp: "Client, serveur et relais TCP — plusieurs connexions, écho, reconnexion automatique",
    udp: "Émission et réception UDP — broadcast, multicast et écho",
    simulator: "Faux appareil qui répond selon des règles — série, TCP et UDP",
    netscan: "Recherche des adresses IP sur un réseau industriel — ports industriels, ping de longue durée",
    "modbus-master": "Maître Modbus RTU/TCP (scrutation) — valeurs typées, écritures, recherche d’adresses esclaves",
    scpi: "Terminal pour instruments SCPI — socket LAN et RS-232, sans VISA",
    plot: "Graphes en temps réel des nombres reçus en série, TCP et UDP",
    "port-inspector": "Contrôle en lecture seule des ports COM, cartes réseau, réglages du PC et liaisons sans fil",
    "plc-simulator": "Simulateur de serveur protocole MC (SLMP) — tester un IHM ou un logiciel de collecte sans automate",
    "hw-tester": "Journal des coupures et de la latence Wi-Fi et Internet, des connexions Bluetooth et USB (à partir de 0.10.0)",
    mcp: "Serveur MCP pour clients IA — lit ports, Modbus, MC et SCPI ; n’écrit que dans les simulateurs de ce PC",
  } satisfies Record<Tool["id"], string>,

  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/4-20ma/": { name: "Calculateur de mise à l’échelle 4–20 mA", blurb: "Courant ou tension ↔ grandeur physique ↔ % ↔ valeur numérique de l’automate (0–27648…). Table 4, 8, 12, 16 et 20 mA." },
    "tools/modbus/": { name: "Générateur de requêtes Modbus RTU", blurb: "Adresse esclave, code fonction, adresse, quantité → octets de la requête avec CRC. Accepte la notation 40001." },
    "tools/modbus-decoder/": { name: "Décodeur de trames Modbus", blurb: "Collez des octets RTU ou TCP : adresse esclave, fonction, valeurs, CRC, en-tête MBAP et codes d’exception décodés." },
    "tools/modbus-float/": { name: "Convertisseur de flottants Modbus", blurb: "2 ou 4 registres ↔ float32, float64, int32. Les ordres ABCD, CDAB, BADC et DCBA dans un même tableau." },
    "tools/mc-decoder/": { name: "Décodeur de trames protocole MC (SLMP)", blurb: "Trames 3E et 4E binaires ou ASCII → en-tête, commande, opérande, valeurs, code de fin. Réponse décodée avec sa requête ; création de requêtes." },
    "tools/rs485/": { name: "Calcul de terminaison et polarisation RS-485", blurb: "Résistances de rappel haut et bas, terminaison 120 ou 150 Ω → tension différentielle au repos face au seuil de 200 mV, puissance des résistances, longueur selon le débit." },
    "tools/serial-timing/": { name: "Calculateur de temps de transmission série", blurb: "Débit et parité → durée d’un caractère, t3,5 et t1,5 en Modbus RTU, durée requête/réponse, cycle de scrutation, délai d’attente minimal." },
    "tools/checksum/": { name: "Calculateur de CRC et somme de contrôle", blurb: "CRC16 Modbus, CCITT, XMODEM, CRC8, LRC, BCC, SUM8 et SUM16 en une seule fois." },
    "tools/subnet/": { name: "Calculateur de sous-réseau IP", blurb: "Adresse et masque (/24) → réseau, broadcast, plage. Vérifie avec les deux masques si le PC et l’automate sont dans le même sous-réseau." },
    "tools/pinouts/": { name: "Brochages des connecteurs", blurb: "DB9 et DB25 RS-232, RJ45 T568A/B et Ethernet, Modbus RJ45/DB9 (spécification), M12 codage A, D et X, M8, USB-A/B/C, bornes RS-485 — vues de face mâle et femelle, couleurs des fils, sources, export SVG." },
  } satisfies Record<ScopeTool, { name: string; blurb: string }>,

  /** 웹 도구 묶음(webToolGroups.ts) */
  groups: {
    comm: "Série et Modbus",
    net: "Réseau",
    draw: "Câblage et schémas",
    diag: "Dépannage et contrôles",
    field: "Outils de terrain",
    signal: "Signaux et capteurs",
    elec: "Électricité et moteurs",
    mech: "Mécanique et pneumatique",
    units: "Conversion d’unités",
    hw: "Tests du matériel PC",
    etc: "Autres outils",
  } satisfies Record<GroupId, string>,

  /** «무엇을 하려나요?»(components/PickApp.astro) — 갈래 id 로 찾는다 */
  pick: {
    title: "Que voulez-vous faire ?",
    q: {
      serial: "Dialoguer avec un appareil série (COM) ou RS-485",
      modbus: "Lire et écrire dans des appareils Modbus, ou en simuler un",
      net: "Trouver les appareils sur le réseau, communiquer en TCP et UDP",
      sim: "Tester un IHM ou un logiciel de supervision sans automate ni appareil",
      scpi: "Piloter un instrument (SCPI) et enregistrer les mesures",
      pc: "Problèmes de connexion du PC — port COM, carte réseau, Wi-Fi, Bluetooth",
      mcp: "Lire des appareils depuis un client IA (MCP)",
      pcap: "Analyser une capture de trafic (pcap) — temps de réponse, réponses manquantes",
    },
    notes: {
      "pcap:tcp": "S’intercale en relais entre l’IHM et l’automate et enregistre un pcap — sans Wireshark",
    },
    pcapName: "Analyseur pcap (en anglais)",
    pcapNote: "Captures Wireshark ou pktmon directement dans le navigateur, sans installation — paires requête/réponse Modbus TCP et MC",
    hwTitle: "Tester un micro, un clavier, une souris, une webcam ou un écran",
    hwName: "Tests du matériel PC",
    hwNote: (n: number) => `Pas un logiciel Windows : fonctionne dans le navigateur, sans installation (${n} tests)`,
  },

  /** 파일 크기(release.ts 의 SIZE) */
  size: { setup: "env. 4 Mo", offline: "env. 220 Mo", portable: "env. 3 Mo" },
};
