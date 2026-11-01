// 폴란드어 — Modbus 요청 만들기 창(ModbusBuilder.tsx)·요청과 짝 값(MbValues.tsx)·MBAP 풀이(MbapDetail.tsx)·요청 검사 문구(modbusBuild.ts).
// 원천은 영어판, 빠진 열쇠는 영어로 보인다. 용어는 사이트 pl 와 같게(adres Slave·rejestr Holding·wejście dyskretne·cewka).
import type { MbBuilderTextKey } from "../ModbusBuilder.tsx";
import type { MbValuesTextKey } from "../MbValues.tsx";
import type { MbapTextKey } from "../MbapDetail.tsx";
import type { MbBuildText } from "../modbusBuild.ts";

type Pl<K extends string> = Partial<Record<K, string>>;

export const PL_MB_BUILDER: Pl<MbBuilderTextKey> = {
  title: "Zbuduj zapytanie Modbus",
  titleTcp: "Zbuduj zapytanie Modbus TCP",
  slave: "Adres Slave",
  slaveHint: "1–247 (zapis: 0 = broadcast, brak odpowiedzi)",
  unitHint: "0–255 — trafia do pola Unit ID w MBAP. Zwykle 1; adres Slave RTU za bramą; dowolna wartość, jeśli urządzenie ją ignoruje",
  tid: "ID transakcji",
  tidHint: "0–65535 — odpowiedź go powtarza. Przy włączonym «Auto ID transakcji» na pasku wysyłania zmienia się przy każdym wysłaniu",
  func: "Funkcja",
  addr: "Adres początkowy",
  zero: "od 0",
  plc: "zapis {a}",
  qty: "Liczba",
  qtyHint: "1–{a}",
  values: "Wartości",
  valuesHint: "Rozdzielone przecinkiem/spacją. Dziesiętnie lub hex 0x; wartości ujemne dozwolone",
  coilsHint: "1 (ON) / 0 (OFF), rozdzielone przecinkiem/spacją — pierwsza wartość to adres początkowy",
  coil: "Wartość",
  on: "ON (FF 00)",
  off: "OFF (00 00)",
  nVals: "Wartości: {n}",
  preview: "Zapytanie (przed CRC)",
  previewTcp: "Zapytanie (nagłówek MBAP + PDU)",
  crcNote: "+ 2 bajty CRC16 Modbus dodaje pasek wysyłania",
  tcpNote: "Modbus TCP nie ma CRC — wysyłane bez zmian, bez sumy kontrolnej",
  put: "Wstaw do pola",
  send: "Wyślij",
  sendTip: "Wysyła to zapytanie teraz (HEX, z CRC16 Modbus, bez końca wiersza). Enter w tym oknie robi to samo",
  toPlc: "Przełącz na zapis {a}",
  putTip: "Ustawia pasek wysyłania na HEX, sumę kontrolną CRC16 Modbus, bez końca wiersza, i wpisuje te bajty",
  putTipTcp: "Ustawia pasek wysyłania na HEX, bez sumy kontrolnej, bez końca wiersza, i wpisuje te bajty",
  add: "Zapisz na liście",
  added: "Dodano «{a}» do listy poleceń",
  close: "Zamknij",
  bcast: "Adres Slave 0 zapisuje do każdego urządzenia; żadne nie odpowiada.",
  help: "Pierwszy raz?",
  helpLink: "Pokaż przewodnik",
  helpTip: "Otwiera przewodnik Modbus w Pomocy (to okno się zamknie)",
};

export const PL_MB_VALUES: Pl<Exclude<MbValuesTextKey, "fmts">> = {
  head: "Do zapytania",
  from: "Adres Slave {u} · {f} · {a} ({n})",
  tid: "transakcja {t}",
  fmt: "Format wartości",
  notation: "Adresy",
  zero: "od 0",
  plc: "zapis {a}",
  write: "OK — urządzenie przyjęło zapis",
  exc: "Wyjątek {a}",
};

export const PL_MBAP: Pl<MbapTextKey> = {
  tid: "ID transakcji",
  len: "Pole długości",
  lenBad: "pole długości się nie zgadza",
  unit: "Unit ID (adres Slave)",
  values: "Wartości",
  head: "Modbus TCP",
};

export const PL_MB_BUILD: Partial<MbBuildText> = {
  slave: "Adres Slave to 1–247 (0 = broadcast dla funkcji zapisu — brak odpowiedzi).",
  slaveRead: "Funkcje odczytu nie mogą użyć adresu Slave 0 (broadcast) — nie przyszłaby odpowiedź. Użyj 1–247.",
  func: "Nieobsługiwana funkcja.",
  addrEmpty: "Wpisz adres.",
  addrNum: "Adres musi być liczbą (dziesiętnie; hex 0x dozwolony dla adresów od 0).",
  addrZero: "Adres od 0 to 0–65535.",
  addrPlcLen: "Zapis PLC ma 5 cyfr (np. 40001) lub 6 cyfr (np. 400001).",
  addrPlcOff: "Zapis PLC liczy od 1 (5 cyfr 0001–9999, 6 cyfr 00001–65536).",
  addrPrefix: "«{a}» to zapis {b}. Ta funkcja używa {c}.",
  addrBadPrefix: "Pierwsza cyfra {a} nie jest zapisem Modbus (0 cewka, 1 wejście dyskretne, 3 rejestr Input, 4 rejestr Holding).",
  addrPlcNote: "{a} → od 0 {b} (0x{c})",
  addrLooksPlc: "«{a}» wygląda na zapis {p}xxxx. Tak jak wpisano, to adres od 0 {a} (0x{c}) — w zapisie {p}xxxx to adres {b}.",
  qty: "Liczba to 1–{a} (limit protokołu).",
  overflow: "Adres końcowy przekracza 65535 (start {a} + liczba {b}).",
  valEmpty: "Wpisz wartość(i) do zapisu.",
  valBad: "«{a}» nie jest wartością — użyj zapisu dziesiętnego lub hex 0x.",
  valReg: "Wartość rejestru «{a}» musi mieścić się w -32768–65535 (ujemne są wysyłane w kodzie uzupełnień do dwóch).",
  valCoil: "Wartość cewki «{a}» musi być 1 (ON) lub 0 (OFF).",
  valOne: "Ta funkcja zapisuje jedną wartość.",
  valCount: "Wartości: {n} — ta funkcja przyjmuje 1–{a}.",
  plcNames: { "0": "0xxxx (cewka)", "1": "1xxxx (wejście dyskretne, FC02)", "3": "3xxxx (rejestr Input, FC04)", "4": "4xxxx (rejestr Holding, FC03/06/10)" },
};
