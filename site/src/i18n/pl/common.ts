// 폴란드어 — 여러 쪽에서 쓰는 이름·한 줄 소개(프로그램·웹 도구·도구 묶음·«무엇을 하려나요?»·파일 크기). 원천은 영어판.
import type { Tool } from "../../data/tools";
import type { GroupId } from "../../data/webToolGroups";
import type { ScopePath } from "../scope";

/** 번역 범위의 웹 도구(scope.ts 의 tools/… 전부) */
type ScopeTool = Exclude<ScopePath, "" | "tools/" | "download/" | "safety/" | "privacy/">;

export default {
  /** 프로그램 한 줄 소개(tools.ts 의 tagline) */
  apps: {
    serial: "Terminal portu szeregowego (COM) z liniami sterującymi i automatycznym ponownym łączeniem",
    "modbus-slave": "Symulator urządzenia podrzędnego Modbus (RTU i TCP) z tabelami rejestrów i wstrzykiwaniem błędów",
    tcp: "Klient, serwer i przekaźnik TCP — wiele połączeń, echo, automatyczne ponowne łączenie",
    udp: "Wysyłanie i odbiór UDP — broadcast, multicast, echo",
    simulator: "Udawane urządzenie odpowiadające według reguł — port szeregowy, TCP, UDP",
    netscan: "Wyszukiwanie urządzeń w sieciach przemysłowych — porty przemysłowe, długotrwały ping",
    "modbus-master": "Master Modbus RTU/TCP (odpytywanie) — wartości z typem, zapis, skanowanie adresów urządzeń",
    scpi: "Terminal SCPI dla przyrządów pomiarowych — gniazdo LAN i RS-232, bez VISA",
    plot: "Wykresy na żywo z liczb przychodzących przez port szeregowy, TCP i UDP",
    "port-inspector": "Przegląd tylko do odczytu: porty COM, karty sieciowe, ustawienia komputera i łączność bezprzewodowa",
    "plc-simulator": "Symulator serwera protokołu MC (SLMP) — testy HMI i programów zbierających dane bez sterownika PLC",
    "hw-tester": "Rejestrator zaników i opóźnień Wi-Fi oraz internetu, z dziennikiem połączeń Bluetooth i USB (od 0.10.0)",
    mcp: "Serwer MCP dla klientów AI — odczyt portów, Modbus, MC i SCPI; zapis tylko do symulatorów na tym komputerze",
  } satisfies Record<Tool["id"], string>,

  /** 웹 도구 이름·한 줄 소개(webTools.ts 의 name·blurb) */
  webTools: {
    "tools/4-20ma/": { name: "Kalkulator skalowania 4–20 mA", blurb: "Prąd/napięcie ↔ wartość fizyczna ↔ % ↔ wartość cyfrowa PLC (0–27648 itd.). Tabela dla 4, 8, 12, 16 i 20 mA." },
    "tools/modbus/": { name: "Kreator zapytań Modbus RTU", blurb: "Adres urządzenia, funkcja, adres rejestru, liczba → bajty zapytania z CRC. Obsługuje zapis typu 40001." },
    "tools/modbus-decoder/": { name: "Dekoder ramek Modbus", blurb: "Wklej bajty RTU lub TCP, a zobaczysz adres urządzenia, funkcję, wartości, CRC, MBAP i kody wyjątków." },
    "tools/modbus-float/": { name: "Konwerter liczb zmiennoprzecinkowych Modbus", blurb: "2 lub 4 rejestry ↔ float32, float64, int32. Kolejności ABCD, CDAB, BADC i DCBA w jednej tabeli." },
    "tools/mc-decoder/": { name: "Dekoder ramek protokołu MC (SLMP)", blurb: "Ramki 3E/4E binarne lub ASCII → nagłówek, polecenie, urządzenia, wartości, kod zakończenia. Odpowiedź rozkładana razem z zapytaniem; tworzenie zapytań." },
    "tools/rs485/": { name: "Kalkulator terminacji i polaryzacji RS-485", blurb: "Rezystory podciągające i ściągające oraz terminujące 120/150 Ω → napięcie w stanie spoczynku wobec progu 200 mV, moc rezystorów, długość linii a prędkość." },
    "tools/serial-timing/": { name: "Kalkulator czasów transmisji szeregowej", blurb: "Prędkość i parzystość → czas znaku, Modbus RTU t3.5 i t1.5, czas zapytania i odpowiedzi, cykl odpytywania, minimalny timeout." },
    "tools/checksum/": { name: "Kalkulator CRC i sum kontrolnych", blurb: "CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8 i SUM16 naraz." },
    "tools/subnet/": { name: "Kalkulator podsieci IP", blurb: "Adres i maska (/24) → sieć, broadcast, zakres. Sprawdza obie maski: czy komputer i sterownik PLC są w tej samej podsieci?" },
    "tools/pinouts/": { name: "Wyprowadzenia złączy", blurb: "DB9/DB25 RS-232, RJ45 T568A/B i Ethernet, Modbus RJ45/DB9 (specyfikacja), M12 kodowanie A/D/X, M8, USB-A/B/C, oznaczenia zacisków RS-485 — widoki wtyku i gniazda, kolory żył, źródła, SVG." },
  } satisfies Record<ScopeTool, { name: string; blurb: string }>,

  /** 웹 도구 묶음(webToolGroups.ts) */
  groups: {
    comm: "Port szeregowy i Modbus",
    net: "Sieć",
    draw: "Okablowanie i schematy",
    diag: "Diagnostyka i przeglądy",
    field: "Narzędzia na obiekt",
    signal: "Sygnały i czujniki",
    elec: "Elektryka i silniki",
    mech: "Mechanika i pneumatyka",
    units: "Przeliczanie jednostek",
    hw: "Testy sprzętu PC",
    etc: "Inne narzędzia",
  } satisfies Record<GroupId, string>,

  /** «무엇을 하려나요?»(components/PickApp.astro) — 갈래 id 로 찾는다 */
  pick: {
    title: "Co chcesz zrobić?",
    q: {
      serial: "Komunikacja z urządzeniem na porcie szeregowym (COM) lub RS-485",
      modbus: "Odczyt i zapis urządzeń Modbus albo symulacja urządzenia",
      net: "Wyszukiwanie urządzeń w sieci, TCP i UDP",
      sim: "Testy HMI lub oprogramowania nadrzędnego bez sterownika PLC i urządzenia",
      scpi: "Sterowanie przyrządem pomiarowym (SCPI) i zapis odczytów",
      pc: "Problemy z połączeniem w komputerze — port COM, karta sieciowa, Wi-Fi, Bluetooth",
      mcp: "Odczyt urządzeń z klienta AI (MCP)",
    },
    hwTitle: "Test mikrofonu, klawiatury, myszy, kamery internetowej lub monitora",
    hwName: "Testy sprzętu PC",
    hwNote: (n: number) => `To nie program na Windows — działa w przeglądarce, bez instalacji (testy: ${n})`,
  },

  /** 파일 크기(release.ts 의 SIZE) */
  size: { setup: "ok. 4 MB", offline: "ok. 220 MB", portable: "ok. 3 MB" },
};
