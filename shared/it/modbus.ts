// 이탈리아어 — Modbus 요청 만들기 창(ModbusBuilder.tsx)·요청과 짝 값(MbValues.tsx)·MBAP 풀이(MbapDetail.tsx)·요청 검사 문구(modbusBuild.ts).
// 원천은 영어판, 빠진 열쇠는 영어로 보인다. 용어는 사이트 it 와 같게(slave·holding register·ingresso discreto·coil).
import type { MbBuilderTextKey } from "../ModbusBuilder.tsx";
import type { MbValuesTextKey } from "../MbValues.tsx";
import type { MbapTextKey } from "../MbapDetail.tsx";
import type { MbBuildText } from "../modbusBuild.ts";

type It<K extends string> = Partial<Record<K, string>>;

export const IT_MB_BUILDER: It<MbBuilderTextKey> = {
  title: "Crea richiesta Modbus",
  titleTcp: "Crea richiesta Modbus TCP",
  slave: "Indirizzo slave",
  slaveHint: "1–247 (scritture: 0 = broadcast, nessuna risposta)",
  unitHint: "0–255 — va nel campo Unit ID dell’MBAP. Di solito 1; l’indirizzo slave RTU dietro un gateway; qualsiasi valore se il dispositivo lo ignora",
  tid: "ID transazione",
  tidHint: "0–65535 — la risposta lo ripete. Con «ID transazione MBAP automatico» attivo nella barra di invio cambia a ogni invio",
  func: "Funzione",
  addr: "Indirizzo iniziale",
  zero: "base 0",
  plc: "notazione {a}",
  qty: "Quantità",
  qtyHint: "1–{a}",
  values: "Valori",
  valuesHint: "Separati da virgola/spazio. Decimale o hex 0x; negativi ammessi",
  coilsHint: "1 (ON) / 0 (OFF), separati da virgola/spazio — il primo valore è l’indirizzo iniziale",
  coil: "Valore",
  on: "ON (FF 00)",
  off: "OFF (00 00)",
  nVals: "{n} valori",
  preview: "Richiesta (prima del CRC)",
  previewTcp: "Richiesta (intestazione MBAP + PDU)",
  crcNote: "+ il CRC16 Modbus di 2 byte lo aggiunge la barra di invio",
  tcpNote: "Modbus TCP non ha CRC — inviato così com’è, senza checksum",
  put: "Metti nell’input",
  send: "Invia",
  sendTip: "Invia ora questa richiesta (HEX, con CRC16 Modbus, senza fine riga). Invio in questa finestra fa lo stesso",
  toPlc: "Passa alla notazione {a}",
  putTip: "Imposta la barra di invio su HEX, checksum CRC16 Modbus, senza fine riga, e inserisce questi byte",
  putTipTcp: "Imposta la barra di invio su HEX, senza checksum, senza fine riga, e inserisce questi byte",
  add: "Salva nell’elenco",
  added: "«{a}» aggiunto all’elenco comandi",
  close: "Chiudi",
  bcast: "Lo slave 0 scrive su tutti i dispositivi; nessuno risponde.",
  help: "Prima volta?",
  helpLink: "Mostra la guida passo passo",
  helpTip: "Apre la guida passo passo Modbus nell’Aiuto (questa finestra si chiude)",
};

export const IT_MB_VALUES: It<Exclude<MbValuesTextKey, "fmts">> = {
  head: "Abbinato alla richiesta",
  from: "Slave {u} · {f} · {a} ({n})",
  tid: "transazione {t}",
  fmt: "Formato valori",
  notation: "Indirizzi",
  zero: "base 0",
  plc: "notazione {a}",
  write: "OK — il dispositivo ha accettato la scrittura",
  exc: "Eccezione {a}",
};

export const IT_MBAP: It<MbapTextKey> = {
  tid: "ID transazione",
  len: "Campo lunghezza",
  lenBad: "il campo lunghezza non corrisponde",
  unit: "Unit ID (slave)",
  values: "Valori",
  head: "Modbus TCP",
};

export const IT_MB_BUILD: Partial<MbBuildText> = {
  slave: "L’indirizzo slave va da 1 a 247 (0 = broadcast per le funzioni di scrittura — nessuna risposta).",
  slaveRead: "Le funzioni di lettura non possono usare lo slave 0 (broadcast) — non arriverebbe risposta. Usa 1–247.",
  func: "Funzione non supportata.",
  addrEmpty: "Inserisci un indirizzo.",
  addrNum: "L’indirizzo deve essere un numero (decimale; hex 0x ammesso in base 0).",
  addrZero: "L’indirizzo in base 0 va da 0 a 65535.",
  addrPlcLen: "La notazione PLC ha 5 cifre (es. 40001) o 6 cifre (es. 400001).",
  addrPlcOff: "La notazione PLC conta da 1 (5 cifre 0001–9999, 6 cifre 00001–65536).",
  addrPrefix: "«{a}» è in notazione {b}. Questa funzione usa {c}.",
  addrBadPrefix: "La cifra iniziale {a} non è una notazione Modbus (0 coil, 1 ingresso discreto, 3 input register, 4 holding register).",
  addrPlcNote: "{a} → base 0 {b} (0x{c})",
  addrLooksPlc: "«{a}» sembra in notazione {p}xxxx. Così come digitato è l’indirizzo {a} in base 0 (0x{c}) — in notazione {p}xxxx è l’indirizzo {b}.",
  qty: "La quantità va da 1 a {a} (limite del protocollo).",
  overflow: "L’indirizzo finale supera 65535 (inizio {a} + quantità {b}).",
  valEmpty: "Inserisci il valore o i valori da scrivere.",
  valBad: "«{a}» non è un valore — usa decimale o hex 0x.",
  valReg: "Il valore di registro «{a}» deve essere tra -32768 e 65535 (i negativi vanno in complemento a due).",
  valCoil: "Il valore di coil «{a}» deve essere 1 (ON) o 0 (OFF).",
  valOne: "Questa funzione scrive un solo valore.",
  valCount: "{n} valori — questa funzione ne accetta da 1 a {a}.",
  plcNames: { "0": "0xxxx (coil)", "1": "1xxxx (ingresso discreto, FC02)", "3": "3xxxx (input register, FC04)", "4": "4xxxx (holding register, FC03/06/10)" },
};
