// 이탈리아어 — 공용 창: 장비 프로필(DeviceDialog)·연결 점검(PortCheckDialog)·연결 시험(LoopbackPanel)·랜카드 주소 목록(NetIfaces)·
// 다른 앱 열기 알림(openApp)·닫기 확인(exitGuard)·예시 명령(examples). 원천은 영어판, 빠진 열쇠는 영어로 보인다.
import type { DeviceTextKey } from "../DeviceDialog.tsx";
import type { PortCheckTextKey } from "../PortCheckDialog.tsx";
import type { LoopTextKey } from "../LoopbackPanel.tsx";
import type { IfaceTextKey } from "../NetIfaces.tsx";
import type { OpenAppTextKey } from "../openApp.ts";

type It<K extends string> = Partial<Record<K, string>>;

export const IT_DEVICE: It<DeviceTextKey> = {
  masterTitle: "Carica profilo dispositivo",
  slaveTitle: "Carica emulazione dispositivo",
  search: "Cerca (produttore, modello, tipo)",
  none: "Nessun dispositivo corrispondente",
  close: "Chiudi",
  cancel: "Annulla",
  apply: "Carica",
  regs: "{n} registri",
  comm: "Comunicazione predefinita",
  commOpt: "Applica anche le impostazioni seriali (baud, dati, parità, stop)",
  commNone: "Nessuna impostazione di comunicazione predefinita confermata nel manuale",
  gapOpt: "Leggi in un’unica tabella registri con piccoli buchi (fino a {n} — disattiva se il dispositivo rifiuta indirizzi non usati)",
  masterPlan: "Aggiunge {n} tabelle di lettura ciclica (slave {u}): {a}",
  masterSkip: "{n} registri di sola scrittura non vengono letti",
  slavePlan: "Inserisce nomi, tipi e valori di esempio nello slave attuale {u}. Gli intervalli di risposta si allargano se serve.",
  slaveUnit: "L’indirizzo slave predefinito di questo dispositivo è {u}",
  sources: "Fonti",
  caution: "Dati presi dal manuale del produttore (nessun legame con il produttore). Possono cambiare con firmware o modello — controlla il manuale del dispositivo prima di scrivere.",
  thAddr: "Indirizzo (manuale)",
  thName: "Nome",
  thType: "Tipo",
  thUnit: "Unità",
  thRw: "L/S",
  notes: "Note",
  behaveOpt: "Aggiungi anche generatori di valori e regole di collegamento — oscillazione tensione/corrente, accumulo energia, comando di marcia → rampa della frequenza di uscita",
  guardOpt: "Rispetta sola lettura e sola scrittura",
  slaveNote: "Questi valori vengono dalle tabelle del manuale — il comportamento reale del dispositivo (tempi di rampa ecc.) può essere diverso.",
};

export const IT_PORTCHECK: It<PortCheckTextKey> = {
  title: "Controlla connessione",
  close: "Chiudi (Esc)",
  reading: "Lettura…",
  readFail: "Lettura non riuscita",
  device: "Dispositivo e driver",
  settings: "Impostazioni",
  power: "Risparmio energia",
  test: "Test di connessione",
  cannot: "Cosa il PC non vede",
  guides: "Guide:",
  name: "Nome",
  chip: "VID:PID · chip",
  driver: "Driver",
  problem: "Codice problema",
  action: "Cosa provare",
  latency: "Latency timer FTDI",
  suspend: "Sospensione selettiva USB",
  canOff: "Il PC può spegnerlo",
  on: "attivo",
  off: "disattivo",
  connected: "Disconnetti prima di eseguire il test (apre la porta da sé).",
  copy: "Copia testo",
  copied: "Copiato",
  more: "Per storico driver, numeri COM riservati e dispositivi nascosti usa PortDock Port Inspector.",
  readOnly: "Sola lettura, senza diritti di amministratore.",
};

export const IT_LOOP: It<LoopTextKey> = {
  mode: "Test",
  loop: "Loopback — TX collegato a RX",
  loopHint: "Su un DB9 collega il pin 2 (RX) al pin 3 (TX); su un adattatore TTL collega TX a RX. Verifica che i byte tornino invariati a ogni velocità e misura l’andata e ritorno di 1 byte.",
  two: "Due porte — due adattatori collegati tra loro",
  twoHint: "Con due adattatori/cavi collegati tra loro, invia da questa porta → l’altra e dall’altra → questa a ogni velocità e confronta ciò che arriva. Utile per controllare adattatori RS-485.",
  peer: "Altra porta",
  peerNone: "Nessun’altra porta",
  pattern: "Schema",
  patRandom: "Byte misti",
  patRamp: "0x00–0xFF in ordine",
  patAlt: "0x55/0xAA alternati",
  length: "Lunghezza (byte)",
  wiring: "Come collegare",
  overall: "Complessivo",
  colDir: "Direzione",
  echo: "Eco RS-485 a 2 fili",
  echoHint: "Senza dispositivi sul bus, verifica se l’adattatore riceve i byte che invia.",
  bauds: "Velocità",
  more: "Altre velocità",
  start: "Avvia test",
  cancel: "Ferma",
  sure: "Il dispositivo è scollegato dalla linea/dal bus? I byte di test potrebbero arrivare a un dispositivo come comandi.",
  sureYes: "Scollegato — avvia",
  sureNo: "Annulla",
  running: "Test in corso",
  noPort: "Scegli prima una porta.",
  colBaud: "Velocità",
  colResult: "Risultato",
  colBytes: "Inviati · uguali · persi · cambiati",
  colRtt: "Andata e ritorno 1 byte ms (mediana · max)",
  colFlags: "Segnalazioni di errore",
  flagsNone: "nessuna",
  flagsUnread: "non letto",
  flagFrame: "framing",
  flagParity: "parità",
  flagOverrun: "overrun",
  flagRxOver: "overflow del buffer",
  flagsNote: "Le segnalazioni di errore compaiono solo quando il driver le alza — «nessuna» non garantisce che non ci siano stati errori. Il tempo di andata e ritorno include latenza USB, driver e tempo del programma.",
  echoBack: "Byte tornati",
  firstMs: "Primo byte dopo",
};

/** Schema di collegamento (in testo) */
export const IT_WIRING: Partial<Record<"loopback" | "two" | "echo", string>> = {
  loopback: ["RS-232 (DB9, maschio o femmina)", "  pin 2 (RX) ──┐", "  pin 3 (TX) ──┘   collega il pin 2 al pin 3", "", "Adattatore TTL", "  TX ──┐", "  RX ──┘   collega TX a RX", "", "L’RS-485 non fa loopback su una sola porta — scegli «Due porte»."].join("\n"),
  two: ["RS-232 (incrociato, null modem)", "  porta A        porta B", "  pin 2 RX ──── pin 3 TX", "  pin 3 TX ──── pin 2 RX", "  pin 5 GND ─── pin 5 GND", "", "RS-485 (2 fili)", "  A(D+) ─────── A(D+)", "  B(D−) ─────── B(D−)", "  GND ──────── GND"].join("\n"),
  echo: ["Un adattatore RS-485 — con il dispositivo staccato dal bus", "  A(D+)  B(D−)  niente collegato"].join("\n"),
};

export const IT_IFACE: It<IfaceTextKey> = {
  title: "Questo PC",
  all: "tutte le schede",
  local: "solo questo PC",
  down: "non connessa",
  none: "Impossibile leggere gli indirizzi delle schede",
  refresh: "Ricarica",
  use: "Usa questo indirizzo",
  gw: "gateway",
  notHere: "«{a}» non è un indirizzo di questo PC — l’avvio fallirà con «indirizzo non disponibile». Scegline uno dall’elenco qui sotto.",
  downHere: "La scheda di «{a}» ({b}) non è connessa (controlla cavo / Wi-Fi).",
};

export const IT_OPEN_APP: It<OpenAppTextKey> = {
  opened: "{a} aperto — {b}. Premi Connetti in quella finestra.",
  missing: "{a} non è stato trovato su questo PC, quindi «{b}» è stato copiato — incollalo lì.",
  get: "Pagina di download",
};

/** Conferma di chiusura (exitGuard.ts) */
export const IT_EXIT = "C’è una connessione o un log su file attivo. Chiudendo si disconnette e il log si ferma. Chiudere comunque?";

/** Comandi di esempio (examples.ts) — prefisso del nome e nome inglese → nome italiano */
export const IT_EXAMPLE_PREFIX = "es. ";
export const IT_EXAMPLES: Record<string, string> = {
  "AT (check reply)": "AT (verifica risposta)",
  "ATI (device info)": "ATI (info dispositivo)",
  "AT+GMR (firmware version)": "AT+GMR (versione firmware)",
  "Modbus Slave ID 1 read 40001–40010 (FC03)": "Modbus slave 1 leggi 40001–40010 (FC03)",
  "Modbus Slave ID 1 read 30001–30002 (FC04)": "Modbus slave 1 leggi 30001–30002 (FC04)",
  "*IDN? (SCPI instrument ID)": "*IDN? (identità dello strumento SCPI)",
  "Modbus TCP Slave ID 1 read 40001–40010 (FC03)": "Modbus TCP slave 1 leggi 40001–40010 (FC03)",
  "Modbus TCP Slave ID 1 read 30001–30002 (FC04)": "Modbus TCP slave 1 leggi 30001–30002 (FC04)",
  "HTTP request for the home page (port 80)": "HTTP richiesta della home page (porta 80)",
  "text hello": "testo hello",
  "HEX 01 02 03 04": "HEX 01 02 03 04",
  "*IDN? (instrument ID)": "*IDN? (identità dello strumento)",
  "MEAS:VOLT:DC? (DC voltage)": "MEAS:VOLT:DC? (tensione DC)",
  "SYST:ERR? (one error)": "SYST:ERR? (un errore)",
};
