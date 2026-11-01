// Italiano — nomi e descrizioni brevi usati in più pagine (programmi, strumenti web, gruppi, «Che cosa volete fare?», dimensioni dei file).
import type { Tool } from "../../data/tools";
import type { GroupId } from "../../data/webToolGroups";
import type { ScopePath } from "../scope";

/** 번역 범위의 웹 도구(scope.ts 의 tools/… 전부) */
type ScopeTool = Exclude<ScopePath, "" | "tools/" | "download/" | "safety/" | "privacy/">;

export default {
  /** Descrizione breve dei programmi (tagline in tools.ts) */
  apps: {
    serial: "Terminale seriale (COM) con linee di controllo e riconnessione automatica",
    "modbus-slave": "Simulatore di slave Modbus (RTU e TCP) con tabelle dei registri e iniezione di guasti",
    tcp: "Client, server e relay TCP con più connessioni, eco e riconnessione automatica",
    udp: "Invio e ricezione UDP — broadcast, multicast, eco",
    simulator: "Dispositivo fittizio che risponde secondo regole, via seriale, TCP e UDP",
    netscan: "Trovare i dispositivi nelle reti industriali — porte industriali, ping di lunga durata",
    "modbus-master": "Master Modbus RTU/TCP (polling) — valori tipizzati, scritture, scansione degli indirizzi slave",
    scpi: "Terminale SCPI per strumenti di misura — socket LAN e RS-232, senza VISA",
    plot: "Grafici in tempo reale dei numeri da seriale, TCP e UDP",
    "port-inspector": "Ispezione in sola lettura di porte COM, schede di rete, impostazioni del PC e wireless (Wi-Fi, Bluetooth)",
    "plc-simulator": "Simulatore di server con protocollo MC (SLMP) — collaudare HMI e raccolta dati senza PLC",
    "hw-tester": "Registra disconnessioni e latenza di Wi-Fi e Internet, con log delle connessioni Bluetooth e USB (dalla 0.10.0)",
    mcp: "Server MCP per client di IA — legge porte, Modbus, MC e SCPI; scrive solo nei simulatori di questo PC",
  } satisfies Record<Tool["id"], string>,

  /** Nome e descrizione breve degli strumenti web (name, blurb in webTools.ts) */
  webTools: {
    "tools/4-20ma/": { name: "Calcolatore di scalatura 4–20 mA", blurb: "Corrente/tensione ↔ valore ingegneristico ↔ % ↔ conteggi del PLC (0–27648 ecc.). Tabella per 4, 8, 12, 16 e 20 mA." },
    "tools/modbus/": { name: "Generatore di richieste Modbus RTU", blurb: "Indirizzo slave, funzione, indirizzo, quantità → byte della richiesta con CRC. Accetta anche la notazione 40001." },
    "tools/modbus-decoder/": { name: "Decodificatore di frame Modbus", blurb: "Incollate byte RTU o TCP: indirizzo slave, funzione, valori, CRC, MBAP e codici di eccezione vengono decodificati." },
    "tools/modbus-float/": { name: "Convertitore float Modbus", blurb: "2 o 4 registri ↔ float32, float64, int32. Gli ordini di parola ABCD, CDAB, BADC e DCBA in un'unica tabella." },
    "tools/mc-decoder/": { name: "Decodificatore di frame del protocollo MC (SLMP)", blurb: "Frame 3E/4E binari o ASCII → intestazione, comando, dispositivo, valori e codice di fine. Abbina la risposta alla sua richiesta; crea richieste." },
    "tools/rs485/": { name: "Calcolatore di terminazione e polarizzazione RS-485", blurb: "Pull-up/pull-down e terminazione da 120 o 150 Ω → tensione a riposo rispetto alla soglia di 200 mV, potenza dei resistori, lunghezza per baud rate." },
    "tools/serial-timing/": { name: "Calcolatore dei tempi di trasmissione seriale", blurb: "Baud rate e parità → tempo di carattere, Modbus RTU t3.5 e t1.5, tempi di richiesta e risposta, ciclo di polling, timeout minimo." },
    "tools/checksum/": { name: "Calcolatore di CRC e checksum", blurb: "CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8 e SUM16 in un colpo solo." },
    "tools/subnet/": { name: "Calcolatore di subnet IP", blurb: "Indirizzo e maschera (/24) → rete, broadcast, intervallo. Verifica con entrambe le maschere se PC e PLC sono nella stessa subnet." },
    "tools/pinouts/": { name: "Piedinature dei connettori", blurb: "DB9/DB25 RS-232, RJ45 T568A/B ed Ethernet, Modbus RJ45/DB9 (specifica), M12 codifica A/D/X, M8, USB-A/B/C, nomi dei morsetti RS-485 — viste frontali maschio/femmina, colori dei fili, fonti, SVG." },
  } satisfies Record<ScopeTool, { name: string; blurb: string }>,

  /** Gruppi degli strumenti web (webToolGroups.ts) */
  groups: {
    comm: "Seriale e Modbus",
    net: "Rete",
    draw: "Cablaggio e schemi",
    diag: "Ricerca guasti e verifiche",
    field: "Strumenti da cantiere",
    signal: "Segnali e sensori",
    elec: "Impianti elettrici e motori",
    mech: "Meccanica e pneumatica",
    units: "Conversione di unità",
    hw: "Test dell'hardware del PC",
    etc: "Altri strumenti",
  } satisfies Record<GroupId, string>,

  /** «Che cosa volete fare?» (components/PickApp.astro) — per ID del percorso */
  pick: {
    title: "Che cosa volete fare?",
    q: {
      serial: "Comunicare con un dispositivo seriale (COM) o RS-485",
      modbus: "Leggere e scrivere dispositivi Modbus o simularne uno",
      net: "Trovare i dispositivi in rete, TCP e UDP",
      sim: "Collaudare HMI o software di supervisione senza PLC o dispositivo",
      scpi: "Comandare uno strumento di misura (SCPI) e registrare le misure",
      pc: "Problemi di connessione del PC — porta COM, scheda di rete, Wi-Fi, Bluetooth",
      mcp: "Leggere i dispositivi da un client di IA (MCP)",
      pcap: "Analizzare una cattura del traffico (pcap) — tempi di risposta, risposte mancanti",
    },
    notes: {
      "pcap:tcp": "Inserirlo come relay tra HMI e PLC e salvare un pcap — senza Wireshark",
    },
    pcapName: "Analizzatore pcap (in inglese)",
    pcapNote: "Catture di Wireshark o pktmon direttamente nel browser, senza installazione — coppie richiesta/risposta per Modbus TCP e MC",
    hwTitle: "Provare microfono, tastiera, mouse, webcam o monitor",
    hwName: "Test dell'hardware del PC",
    hwNote: (n: number) => `Non è un programma Windows: funziona nel browser, senza installazione (${n} test)`,
  },

  /** Dimensioni dei file (SIZE in release.ts) */
  size: { setup: "circa 4 MB", offline: "circa 220 MB", portable: "circa 3 MB" },
};
