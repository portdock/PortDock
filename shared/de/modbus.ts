// 독일어 — Modbus 요청 만들기 창(ModbusBuilder.tsx)·요청과 짝 값(MbValues.tsx)·MBAP 풀이(MbapDetail.tsx)·요청 검사 문구(modbusBuild.ts).
// 원천은 영어판, 빠진 열쇠는 영어로 보인다. 용어는 사이트 de 와 같게(Slave-Adresse·Holding-Register·Discrete Input).
import type { MbBuilderTextKey } from "../ModbusBuilder.tsx";
import type { MbValuesTextKey } from "../MbValues.tsx";
import type { MbapTextKey } from "../MbapDetail.tsx";
import type { MbBuildText } from "../modbusBuild.ts";

type De<K extends string> = Partial<Record<K, string>>;

export const DE_MB_BUILDER: De<MbBuilderTextKey> = {
  title: "Modbus-Anfrage erstellen",
  titleTcp: "Modbus-TCP-Anfrage erstellen",
  slave: "Slave-Adresse",
  slaveHint: "1–247 (Schreiben: 0 = Broadcast, keine Antwort)",
  unitHint: "0–255 — kommt in das Unit-ID-Feld des MBAP. Meist 1; die RTU-Slave-Adresse hinter einem Gateway; beliebig, wenn das Gerät es ignoriert",
  tid: "Transaktions-ID",
  tidHint: "0–65535 — die Antwort wiederholt sie. Mit «Transaktions-ID automatisch» in der Sendeleiste ändert sie sich bei jedem Senden",
  func: "Funktion",
  addr: "Startadresse",
  zero: "0-basiert",
  plc: "{a}-Schreibweise",
  qty: "Anzahl",
  qtyHint: "1–{a}",
  values: "Werte",
  valuesHint: "Durch Komma/Leerzeichen getrennt. Dezimal oder 0x-Hex; negative Werte erlaubt",
  coilsHint: "1 (ON) / 0 (OFF), durch Komma/Leerzeichen getrennt — der erste Wert ist die Startadresse",
  coil: "Wert",
  on: "ON (FF 00)",
  off: "OFF (00 00)",
  nVals: "{n} Werte",
  preview: "Anfrage (vor CRC)",
  previewTcp: "Anfrage (MBAP-Kopf + PDU)",
  crcNote: "+ 2 Byte CRC16 Modbus hängt die Sendeleiste an",
  tcpNote: "Modbus TCP hat keine CRC — wird unverändert ohne Prüfsumme gesendet",
  put: "In Eingabe",
  send: "Senden",
  sendTip: "Sendet diese Anfrage jetzt (HEX, CRC16 Modbus angehängt, kein Zeilenende). Enter in diesem Dialog macht dasselbe",
  toPlc: "Zur {a}-Schreibweise",
  putTip: "Stellt die Sendeleiste auf HEX, Prüfsumme CRC16 Modbus, kein Zeilenende, und trägt diese Bytes ein",
  putTipTcp: "Stellt die Sendeleiste auf HEX, keine Prüfsumme, kein Zeilenende, und trägt diese Bytes ein",
  add: "In Liste speichern",
  added: "«{a}» zur Befehlsliste hinzugefügt",
  close: "Schließen",
  bcast: "Slave-Adresse 0 schreibt in jedes Gerät; keines antwortet.",
  help: "Zum ersten Mal?",
  helpLink: "Anleitung zeigen",
  helpTip: "Öffnet die Modbus-Anleitung in der Hilfe (dieser Dialog schließt sich)",
};

export const DE_MB_VALUES: De<Exclude<MbValuesTextKey, "fmts">> = {
  head: "Zur Anfrage",
  from: "Slave-Adresse {u} · {f} · {a} ({n})",
  tid: "Transaktion {t}",
  fmt: "Wertformat",
  notation: "Adressen",
  zero: "0-basiert",
  plc: "{a}-Schreibweise",
  write: "OK — das Gerät hat das Schreiben angenommen",
  exc: "Exception {a}",
};

export const DE_MBAP: De<MbapTextKey> = {
  tid: "Transaktions-ID",
  len: "Längenfeld",
  lenBad: "Längenfeld passt nicht",
  unit: "Unit-ID (Slave-Adresse)",
  values: "Werte",
  head: "Modbus TCP",
};

export const DE_MB_BUILD: Partial<MbBuildText> = {
  slave: "Die Slave-Adresse ist 1–247 (0 = Broadcast bei Schreibfunktionen — keine Antwort).",
  slaveRead: "Lesefunktionen können Slave-Adresse 0 (Broadcast) nicht verwenden — es käme keine Antwort. 1–247 verwenden.",
  func: "Nicht unterstützte Funktion.",
  addrEmpty: "Eine Adresse eingeben.",
  addrNum: "Die Adresse muss eine Zahl sein (dezimal; 0x-Hex ist bei 0-basiert erlaubt).",
  addrZero: "Die 0-basierte Adresse ist 0–65535.",
  addrPlcLen: "Die SPS-Schreibweise hat 5 Stellen (z. B. 40001) oder 6 Stellen (z. B. 400001).",
  addrPlcOff: "Die SPS-Schreibweise zählt ab 1 (5 Stellen 0001–9999, 6 Stellen 00001–65536).",
  addrPrefix: "«{a}» ist {b}-Schreibweise. Diese Funktion verwendet {c}.",
  addrBadPrefix: "Die führende Ziffer {a} ist keine Modbus-Schreibweise (0 Coil, 1 Discrete Input, 3 Input-Register, 4 Holding-Register).",
  addrPlcNote: "{a} → 0-basiert {b} (0x{c})",
  addrLooksPlc: "«{a}» sieht nach {p}xxxx-Schreibweise aus. Wie eingegeben ist es die 0-basierte Adresse {a} (0x{c}) — in {p}xxxx-Schreibweise ist es Adresse {b}.",
  qty: "Die Anzahl ist 1–{a} (Protokollgrenze).",
  overflow: "Die Endadresse überschreitet 65535 (Start {a} + Anzahl {b}).",
  valEmpty: "Den/die zu schreibenden Wert(e) eingeben.",
  valBad: "«{a}» ist kein Wert — dezimal oder 0x-Hex verwenden.",
  valReg: "Der Registerwert «{a}» muss -32768–65535 sein (negative Werte werden als Zweierkomplement gesendet).",
  valCoil: "Der Coil-Wert «{a}» muss 1 (ON) oder 0 (OFF) sein.",
  valOne: "Diese Funktion schreibt einen einzelnen Wert.",
  valCount: "{n} Werte — diese Funktion nimmt 1–{a}.",
  plcNames: { "0": "0xxxx (Coil)", "1": "1xxxx (Discrete Input, FC02)", "3": "3xxxx (Input-Register, FC04)", "4": "4xxxx (Holding-Register, FC03/06/10)" },
};
