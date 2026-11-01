// 폴란드어 — 공용 창: 장비 프로필(DeviceDialog)·연결 점검(PortCheckDialog)·연결 시험(LoopbackPanel)·랜카드 주소 목록(NetIfaces)·
// 다른 앱 열기 알림(openApp)·닫기 확인(exitGuard)·예시 명령(examples). 원천은 영어판, 빠진 열쇠는 영어로 보인다.
import type { DeviceTextKey } from "../DeviceDialog.tsx";
import type { PortCheckTextKey } from "../PortCheckDialog.tsx";
import type { LoopTextKey } from "../LoopbackPanel.tsx";
import type { IfaceTextKey } from "../NetIfaces.tsx";
import type { OpenAppTextKey } from "../openApp.ts";

type Pl<K extends string> = Partial<Record<K, string>>;

export const PL_DEVICE: Pl<DeviceTextKey> = {
  masterTitle: "Wczytaj profil urządzenia",
  slaveTitle: "Wczytaj emulację urządzenia",
  search: "Szukaj (producent, model, typ)",
  none: "Brak pasującego urządzenia",
  close: "Zamknij",
  cancel: "Anuluj",
  apply: "Wczytaj",
  regs: "Rejestry: {n}",
  comm: "Domyślna komunikacja",
  commOpt: "Ustaw też parametry portu (prędkość, dane, parzystość, stop)",
  commNone: "Brak domyślnych ustawień komunikacji potwierdzonych w instrukcji",
  gapOpt: "Czytaj rejestry z małymi lukami w jednej tabeli (do {n} — wyłącz, jeśli urządzenie odrzuca nieużywane adresy)",
  masterPlan: "Dodaje tabele odpytywania ({n}) (adres Slave {u}): {a}",
  masterSkip: "Rejestry tylko do zapisu ({n}) nie są odpytywane",
  slavePlan: "Wpisuje nazwy, typy i przykładowe wartości do bieżącego adresu Slave {u}. Zakresy odpowiedzi rosną w razie potrzeby.",
  slaveUnit: "Domyślny adres Slave tego urządzenia to {u}",
  sources: "Źródła",
  caution: "Fakty z instrukcji producenta (bez związku z producentem). Mogą się różnić zależnie od firmware'u lub modelu — przed zapisem sprawdź instrukcję urządzenia.",
  thAddr: "Adres (instrukcja)",
  thName: "Nazwa",
  thType: "Typ",
  thUnit: "Jedn.",
  thRw: "R/W",
  notes: "Uwagi",
  behaveOpt: "Dodaj też generatory wartości i reguły powiązań — wahania napięcia/prądu, sumowanie energii, polecenie startu → rampa częstotliwości wyjściowej",
  guardOpt: "Wymuszaj tylko odczyt i tylko zapis",
  slaveNote: "Te wartości pochodzą z tabel instrukcji — rzeczywiste zachowanie urządzenia (czasy rampy itp.) może być inne.",
};

export const PL_PORTCHECK: Pl<PortCheckTextKey> = {
  title: "Sprawdź połączenie",
  close: "Zamknij (Esc)",
  reading: "Odczyt…",
  readFail: "Nie udało się odczytać",
  device: "Urządzenie i sterownik",
  settings: "Ustawienia",
  power: "Oszczędzanie energii",
  test: "Test połączenia",
  cannot: "Czego PC nie widzi",
  guides: "Poradniki:",
  name: "Nazwa",
  chip: "VID:PID · układ",
  driver: "Sterownik",
  problem: "Kod problemu",
  action: "Co spróbować",
  latency: "Timer opóźnienia FTDI",
  suspend: "Selektywne wstrzymywanie USB",
  canOff: "PC może je wyłączyć",
  on: "wł.",
  off: "wył.",
  connected: "Najpierw się rozłącz, aby uruchomić test (test sam otwiera port).",
  copy: "Kopiuj tekst",
  copied: "Skopiowano",
  more: "Historię sterowników, rezerwacje numerów COM i ukryte urządzenia pokazuje PortDock Port Inspector.",
  readOnly: "Tylko odczyt, bez uprawnień administratora.",
};

export const PL_LOOP: Pl<LoopTextKey> = {
  mode: "Test",
  loop: "Pętla — TX połączony z RX",
  loopHint: "W DB9 połącz pin 2 (RX) z pinem 3 (TX); w konwerterze TTL połącz TX z RX. Sprawdza przy każdej prędkości, czy bajty wracają bez zmian, i mierzy czas obiegu 1 bajtu.",
  two: "Dwa porty — dwa konwertery połączone ze sobą",
  twoHint: "Przy dwóch konwerterach/kablach połączonych ze sobą wysyła przy każdej prędkości z tego portu → do drugiego i z drugiego → do tego, po czym porównuje to, co dotarło. Przydatne do sprawdzania konwerterów RS-485.",
  peer: "Drugi port",
  peerNone: "Brak innego portu",
  pattern: "Wzór",
  patRandom: "Mieszane bajty",
  patRamp: "0x00–0xFF po kolei",
  patAlt: "0x55/0xAA na przemian",
  length: "Długość (bajty)",
  wiring: "Jak połączyć",
  overall: "Ogółem",
  colDir: "Kierunek",
  echo: "Echo RS-485 2-przewodowego",
  echoHint: "Bez urządzenia na magistrali sprawdza, czy konwerter odbiera bajty, które sam wysyła.",
  bauds: "Prędkości",
  more: "Więcej",
  start: "Start testu",
  cancel: "Stop",
  sure: "Czy urządzenie jest odłączone od linii/magistrali? Bajty testowe mogłyby dotrzeć do urządzenia jako polecenia.",
  sureYes: "Odłączone — start",
  sureNo: "Anuluj",
  running: "Testowanie",
  noPort: "Najpierw wybierz port.",
  colBaud: "Prędkość",
  colResult: "Wynik",
  colBytes: "Wysł. · zgodne · utracone · zmienione",
  colRtt: "Obieg 1 bajtu ms (mediana · maks.)",
  colFlags: "Flagi błędów",
  flagsNone: "brak",
  flagsUnread: "nie odczytano",
  flagFrame: "ramka",
  flagParity: "parzystość",
  flagOverrun: "przepełnienie",
  flagRxOver: "przepełnienie bufora",
  flagsNote: "Flagi błędów widać tylko, gdy zgłosi je sterownik — «brak» nie gwarantuje, że błędów nie było. Czas obiegu obejmuje opóźnienie USB, sterownika i programu.",
  echoBack: "Wróciło",
  firstMs: "Pierwszy bajt po",
};

/** Schemat połączeń (tekstem) */
export const PL_WIRING: Partial<Record<"loopback" | "two" | "echo", string>> = {
  loopback: ["RS-232 (DB9, męskie lub żeńskie)", "  pin 2 (RX) ──┐", "  pin 3 (TX) ──┘   połącz pin 2 z pinem 3", "", "Konwerter TTL", "  TX ──┐", "  RX ──┘   połącz TX z RX", "", "RS-485 nie da się zapętlić na jednym porcie — wybierz «Dwa porty»."].join("\n"),
  two: ["RS-232 (skrzyżowane, null modem)", "  port A        port B", "  pin 2 RX ──── pin 3 TX", "  pin 3 TX ──── pin 2 RX", "  pin 5 GND ─── pin 5 GND", "", "RS-485 (2-przewodowe)", "  A(D+) ─────── A(D+)", "  B(D−) ─────── B(D−)", "  GND ──────── GND"].join("\n"),
  echo: ["Jeden konwerter RS-485 — urządzenie odłączone od magistrali", "  A(D+)  B(D−)  nic nie podłączone"].join("\n"),
};

export const PL_IFACE: Pl<IfaceTextKey> = {
  title: "Ten PC",
  all: "wszystkie karty",
  local: "tylko ten PC",
  down: "niepodłączona",
  none: "Nie udało się odczytać adresów kart sieciowych",
  refresh: "Odśwież",
  use: "Użyj tego adresu",
  gw: "brama",
  notHere: "«{a}» nie jest adresem tego PC — start zakończy się błędem «adres niedostępny». Wybierz adres z listy poniżej.",
  downHere: "Karta dla «{a}» ({b}) nie jest podłączona (sprawdź kabel / Wi-Fi).",
};

export const PL_OPEN_APP: Pl<OpenAppTextKey> = {
  opened: "Otwarto {a} — {b}. Naciśnij połącz w tamtym oknie.",
  missing: "Nie znaleziono {a} na tym PC, więc skopiowano «{b}» — wklej to tam.",
  get: "Strona pobierania",
};

/** Potwierdzenie zamknięcia (exitGuard.ts) */
export const PL_EXIT = "Trwa połączenie lub zapis do pliku. Zamknięcie rozłączy i zatrzyma zapis. Zamknąć mimo to?";

/** Przykładowe polecenia (examples.ts) — początek nazwy i nazwa angielska → polska */
export const PL_EXAMPLE_PREFIX = "np. ";
export const PL_EXAMPLES: Record<string, string> = {
  "AT (check reply)": "AT (sprawdź odpowiedź)",
  "ATI (device info)": "ATI (info o urządzeniu)",
  "AT+GMR (firmware version)": "AT+GMR (wersja firmware'u)",
  "Modbus Slave ID 1 read 40001–40010 (FC03)": "Modbus adres Slave 1 odczyt 40001–40010 (FC03)",
  "Modbus Slave ID 1 read 30001–30002 (FC04)": "Modbus adres Slave 1 odczyt 30001–30002 (FC04)",
  "*IDN? (SCPI instrument ID)": "*IDN? (identyfikator przyrządu SCPI)",
  "Modbus TCP Slave ID 1 read 40001–40010 (FC03)": "Modbus TCP adres Slave 1 odczyt 40001–40010 (FC03)",
  "Modbus TCP Slave ID 1 read 30001–30002 (FC04)": "Modbus TCP adres Slave 1 odczyt 30001–30002 (FC04)",
  "HTTP request for the home page (port 80)": "Żądanie HTTP strony głównej (port 80)",
  "text hello": "tekst hello",
  "HEX 01 02 03 04": "HEX 01 02 03 04",
  "*IDN? (instrument ID)": "*IDN? (identyfikator przyrządu)",
  "MEAS:VOLT:DC? (DC voltage)": "MEAS:VOLT:DC? (napięcie DC)",
  "SYST:ERR? (one error)": "SYST:ERR? (jeden błąd)",
};
