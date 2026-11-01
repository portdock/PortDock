// Teksty drzewa pytań kreatora diagnozy usterek (polski) — kształt drzewa (ID, następne węzły, linki) wszystkie języki biorą z data/troubleshoot.ts, tu są tylko teksty według ID węzła.
// Pytania: q, hint (tylko gdy drzewo ma podpowiedź), opts (tylko odpowiedzi inne niż tak/nie, w kolejności). Wyniki: title, causes, checks (ta sama liczba i kolejność co w drzewie).
// Brakujące ID i różną liczbę pozycji wyłapuje checkText() z lib/troubleshoot.ts (i18n.test.ts). Słownictwo „możliwa przyczyna” — nic nie jest przesądzane.
import type { TreeText } from "../../lib/troubleshoot.ts";

export default {
  yes: "Tak",
  no: "Nie",
  symptoms: {
    rs485: "RS-485 / Modbus RTU: brak odpowiedzi lub przekłamania",
    rs232: "RS-232 nie komunikuje się",
    tcp: "Nie można połączyć się z urządzeniem Modbus TCP / Ethernet",
    usb: "Konwerter USB-serial niewykrywany lub zrywa połączenie",
    ma: "Odczyt 4–20 mA wygląda źle",
    sensor: "Wejście czujnika NPN/PNP nie reaguje",
    mc: "Protokół MC (Mitsubishi) nie łączy się",
    pcusb: "Urządzenie USB w komputerze ciągle się rozłącza",
  },
  nodes: {
    // ① RS-485 · Modbus RTU
    "rs485-any": { q: "Czy w ogóle nie ma odpowiedzi?", hint: "„Nie” = odpowiedzi przychodzą czasem albo z przekłamanymi bajtami" },
    "rs485-txled": { q: "Czy dioda TX konwertera miga przy wysyłaniu zapytania?", hint: "Brak diody? Sprawdź zamiast tego, czy wysłane bajty pojawiają się w dzienniku PortDock Serial" },
    "rs485-settings": { q: "Czy prędkość, parzystość, bity stopu i adres urządzenia porównano po kolei z ekranem ustawień urządzenia (lub instrukcją)?" },
    "rs485-swap": { q: "Czy po zamianie żył A i B (D+/D−) przychodzi odpowiedź?", hint: "Zamiana nie uszkadza urządzeń" },
    "rs485-single": { q: "Czy odpowiada jedno urządzenie podłączone krótkim kablem bezpośrednio do konwertera?" },
    "rs485-garbled": { q: "Czy odebrane bajty wyglądają na uszkodzone (błędy CRC, dziwne znaki)?", hint: "„Nie” = bajty wyglądają dobrze, ale odpowiedzi czasem brakuje (przekroczenia czasu)" },
    "rs485-slower": { q: "Czy zmniejszenie prędkości lub skrócenie kabla ogranicza przekłamania?" },
    "rs485-timeout": { q: "Czy dłuższy czas oczekiwania na odpowiedź (np. 1000 ms) zmniejsza liczbę brakujących odpowiedzi?" },
    "r-rs485-port": {
      title: "Zapytanie nie wychodzi z komputera — port lub sterownik",
      causes: [
        "Otwarty jest zły numer COM (zmienia się po przełożeniu konwertera do innego portu USB)",
        "Inny program (SCADA, wcześniej używany terminal) wciąż trzyma port",
        "Problem ze sterownikiem (znak ostrzeżenia lub kod problemu w Menedżerze urządzeń)",
        "Konwerter nie przełącza kierunku automatycznie dla 2-przewodowej RS-485",
      ],
      checks: [
        "Znajdź numer COM konwertera w Menedżerze urządzeń w „Porty (COM i LPT)” i ustaw taki sam w programie",
        "Odczytaj sterownik i kod problemu portu w Port Inspector i uruchom test echa 2-przewodowej RS-485, aby zobaczyć, czy cokolwiek jest nadawane",
        "Z miernikiem (V⎓) na A–B wysyłanie kolejnych zapytań powinno powodować skoki odczytu — jeśli stoi w miejscu, nic nie jest nadawane",
      ],
    },
    "r-rs485-settings": {
      title: "Ustawienia komunikacji najpewniej się różnią",
      causes: [
        "Różni się prędkość lub parzystość (np. urządzenie 8E1, program 8N1)",
        "Inny adres urządzenia albo użyto 0 (broadcast) — na broadcast nikt nie odpowiada",
        "Protokół urządzenia to nie Modbus RTU (protokół producenta lub ASCII) albo ustawienia zmieniono bez zapisu i restartu",
      ],
      checks: [
        "Spisz parametry komunikacji z ekranu urządzenia i porównaj wiersz po wierszu z programem",
        "W falownikach sprawdź też parametry „źródło polecenia startu” i „wybór protokołu”",
        "Gdy prędkość jest nieznana, przeszukaj ją w Modbus Master — skan adresów, a prędkość/parzystość funkcją „wyszukiwanie ustawień linii” (od 0.10.0)",
      ],
    },
    "r-rs485-polarity": {
      title: "Oznaczenie A/B (+/−) było odwrócone",
      causes: ["Producenci nie zgadzają się, które z A/B to + (specyfikacja Modbus: D1 = B = +, D0 = A = −)", "Odwrócone mogą być tylko niektóre urządzenia — jeśli po zamianie inne przestają odpowiadać, sprawdź ich oznaczenia"],
      checks: ["Zasilanie włączone, odpytywanie zatrzymane: czerwona sonda na B (D1·+), czarna na A (D0·−) przy polaryzacji powinna pokazać +200 mV lub więcej", "Zapisz zamieniony stan na schemacie połączeń, żeby nikt go nie odwrócił z powrotem"],
    },
    "r-rs485-bus": {
      title: "Jedno urządzenie działa samo, ale nie na magistrali — okablowanie lub układ magistrali",
      causes: [
        "Trzy lub więcej terminacji (włączony przełącznik w urządzeniu w środku) albo żadnej",
        "Dwa urządzenia mają ten sam adres i odpowiadają naraz, psując sobie odpowiedzi",
        "Długie odgałęzienia lub gwiazda albo przerwa na pośrednim zacisku",
        "Brak żyły SG (common), przez co odległe urządzenia wypadają z zakresu współbieżnego",
      ],
      checks: [
        "Całe zasilanie wyłączone, rezystancja A–B: ok. 60 Ω (oba końce), ok. 120 Ω (jeden koniec), setki Ω do kilku kΩ lub więcej (brak — wiele urządzeń lub widoczne rezystory polaryzujące obniżają ją do ok. 1 kΩ), 40 Ω lub mniej (za dużo). Terminacja RC (1 nF + 120 Ω) jest niewidoczna dla prądu stałego i wygląda jak „brak”",
        "Zasilanie włączone: A–SG i B–SG w granicach −7 do +12 V",
        "Podłączaj urządzenia z powrotem po jednym, aby zobaczyć, gdzie przestaje działać; spisz wszystkie adresy",
      ],
    },
    "r-rs485-device": {
      title: "Nie działa nawet z jednym urządzeniem — ustawienia, port komunikacyjny lub konwerter",
      causes: ["Ustawienia urządzenia niezapisane albo działają dopiero po restarcie", "Komunikacja jest na karcie rozszerzeń lub osobnych zaciskach albo ustawiono tryb 2/4-przewodowy", "Uszkodzony konwerter albo podłączenie do zacisków RS-422/RS-232 zamiast RS-485"],
      checks: ["Sprawdź sam konwerter testem echa 2-przewodowej RS-485 w Port Inspector", "Spróbuj tego samego urządzenia z innym konwerterem lub komputerem", "Sprawdź w instrukcji urządzenia numery zacisków komunikacji i to, kiedy nowe ustawienia zaczynają działać"],
    },
    "r-rs485-signal": {
      title: "Jakość sygnału — odbicia, zakłócenia, długość",
      causes: ["Brak terminacji lub tylko na jednym końcu — odbicia na długich, szybkich liniach", "Kabel za długi dla prędkości (mniej więcej prędkość × metry ≤ 10^8)", "Kabel nie jest skrętką, biegnie obok kabli zasilających albo ekran nie jest uziemiony"],
      checks: ["Bez zasilania: A–B ok. 60 Ω", "Napięcie współbieżne A–SG i B–SG w granicach −7 do +12 V, także przy pracujących silnikach", "Sprawdź limit długości dla tej prędkości w kalkulatorze RS-485"],
    },
    "r-rs485-framing": {
      title: "Ramki przesunięte — ustawienia, echo lub dzielenie",
      causes: ["Prędkość lub parzystość lekko niezgodna (część bajtów może wyglądać dobrze)", "Konwerter 2-przewodowy odsyła echo zapytania, które pojawia się przed odpowiedzią", "Opóźnienie USB dzieli jedną odpowiedź na dwie, a odbiornik analizuje je osobno"],
      checks: ["Wklej odebrane bajty do dekodera ramek Modbus i sprawdź adres, funkcję i CRC", "Sprawdź echo konwertera i latency timer FTDI w Port Inspector"],
    },
    "r-rs485-timing": {
      title: "Za ciasne czasy — limit czasu, interwał odpytywania, opóźnienie USB",
      causes: ["Limit czasu krótszy niż czas odpowiedzi urządzenia (falowniki i liczniki potrzebują od kilkudziesięciu do kilkuset ms)", "Następne zapytanie wysłane za wcześnie, nakłada się na poprzednią odpowiedź", "Latency timer konwertera USB (domyślnie 16 ms w FTDI) dochodzi do każdej krótkiej ramki"],
      checks: ["Wyznacz czas zapytania/odpowiedzi i minimalny limit czasu kalkulatorem czasów transmisji szeregowej", "Odczytaj wartość latency timera w Port Inspector"],
    },
    "r-rs485-idle": {
      title: "Linia pływa w spoczynku lub odpowiedzi kolidują — polaryzacja lub adresy",
      causes: ["Brak rezystorów polaryzujących (fail-safe), więc zakłócenia w spoczynku są czytane jako bajty", "Dwa urządzenia z tym samym adresem czasem kolidują", "Zakłócenia tylko przy pracy silników lub falowników (ekran, uziemienie)"],
      checks: ["Zasilanie włączone, odpytywanie zatrzymane: napięcie różnicowe B–A +200 mV lub więcej", "Spisz wszystkie urządzenia i adresy na schemacie systemu, aby wychwycić duplikaty", "Porównaj, kiedy brakuje odpowiedzi, z tym, kiedy pracują silniki"],
    },

    // ② RS-232
    "rs232-seen": { q: "Czy port COM widać w Menedżerze urządzeń komputera?", hint: "Dla konwertera USB-RS232 „Nie” prowadzi do gałęzi wykrywania konwertera" },
    "rs232-loop": { q: "Czy po zwarciu pinów 2 (RXD) i 3 (TXD) złącza DB9 po stronie PC (pętla zwrotna) wysłane znaki wracają?" },
    "rs232-cross": { q: "Czy TX urządzenia jest połączony z RX komputera (pin 2), a TX komputera (pin 3) z RX urządzenia — czyli skrosowane?", hint: "Nie wiesz? Wybierz „Nie”, aby zobaczyć, jak to sprawdzić" },
    "rs232-flow": { q: "Czy sterowanie przepływem jest ustawione na „Brak” w programie i w urządzeniu?" },
    "r-rs232-pc": {
      title: "Blokada na porcie komputera lub w konwerterze",
      causes: ["Inny program trzyma port albo otwarty jest zły numer COM", "Uszkodzony konwerter lub port, problem ze sterownikiem", "Zwarte złe piny (pętla zwrotna to piny 2–3)"],
      checks: ["W spoczynku pin 3 (TXD) względem pinu 5 (GND) pokazuje −5 do −15 V (−3 do −5 V to słaby poziom — warto sprawdzić)", "Uruchom test pętli zwrotnej w Port Inspector i sprawdź, czy bajty wracają przy każdej prędkości"],
    },
    "r-rs232-cross": {
      title: "TX może być połączony z TX — kabel skrosowany czy prosty",
      causes: ["Komputer i urządzenie są DTE, a użyto kabla prostego (TX–TX) — potrzebny jest kabel null-modem (skrosowany)", "Albo urządzenie jest DCE, a użyto kabla skrosowanego"],
      checks: ["Na każdym złączu pin z −5 do −15 V w spoczynku (−3 do −5 V przy słabym nadajniku) to TX tej strony — jeśli oba piny TX są na jednej żyle, zderzają się", "Sprawdź przejście przez kabel testerem ciągłości, aby zobaczyć, czy 2↔3 są skrzyżowane"],
    },
    "r-rs232-flow": {
      title: "Niezgodne sterowanie przepływem",
      causes: ["Włączone jest sprzętowe sterowanie przepływem (RTS/CTS), ale CTS nie jest podłączony, więc komputer czeka bez końca", "Urządzenie wymaga aktywnych DTR/DSR, a użyto tylko kabla 3-żyłowego"],
      checks: ["Ustaw w programie sterowanie przepływem na „Brak” i przetestuj ponownie", "Jeśli urządzenie wymaga handshake, zewrzyj w złączu RTS–CTS (7–8) i DTR–DSR–DCD (4–6–1) albo użyj kabla z pełnym handshake"],
    },
    "r-rs232-settings": {
      title: "Okablowanie wygląda dobrze — ustawienia, format poleceń lub poziom sygnału",
      causes: ["Różni się prędkość, bity danych, parzystość lub bity stopu", "Zakończenie wiersza (CR, LF, CR LF) lub suma kontrolna różnią się od oczekiwanych przez urządzenie", "Port urządzenia to UART TTL (3,3/5 V), a nie RS-232"],
      checks: ["Jeśli TX urządzenia w spoczynku ma +3,3 lub +5 V, to TTL — nie podłączaj go bezpośrednio do portu RS-232", "Wysyłaj i odbieraj w HEX i porównuj zakończenia wierszy oraz sumy kontrolne bajt po bajcie"],
    },

    // ③ Modbus TCP · Ethernet
    "tcp-ping": { q: "Czy urządzenie odpowiada na ping z komputera?" },
    "tcp-subnet": { q: "Czy adresy IP komputera i urządzenia są w tej samej podsieci? (np. 192.168.0.10/24 i 192.168.0.50)" },
    "tcp-link": { q: "Czy diody link na portach LAN komputera i urządzenia (lub switcha) świecą?" },
    "tcp-502": { q: "Czy da się otworzyć połączenie TCP z portem 502 (lub portem z instrukcji)?", hint: "Spróbuj połączyć się przez PortDock TCP albo w PowerShell: Test-NetConnection <IP> -Port 502" },
    "tcp-reply": { q: "Czy po połączeniu zapytanie dostaje odpowiedź?" },
    "tcp-exception": { q: "Czy odpowiedź to wyjątek (kod funkcji + 0x80, np. 83 02)?", hint: "„Nie” = odpowiedzi przychodzą, ale wartości wyglądają źle" },
    "r-tcp-subnet": {
      title: "Różne podsieci IP",
      causes: ["Części sieciowe adresów się różnią, więc bez bramy urządzenia się nie widzą", "Adres IP urządzenia jest nieznany (fabryczny lub z DHCP)"],
      checks: ["Wpisz oba adresy IP i maski do kalkulatora podsieci, aby sprawdzić, czy są w jednej podsieci", "Dodaj do karty sieciowej komputera drugi adres IP w podsieci urządzenia (np. 192.168.0.200/24)", "Jeśli adres IP jest nieznany, znajdź go programem Net Scan"],
    },
    "r-tcp-link": {
      title: "Brak połączenia fizycznego — kabel, port lub switch",
      causes: ["Uszkodzony kabel lub wtyk albo podłączenie do innego portu", "Switch bez zasilania lub port wyłączony albo wyłączony port LAN urządzenia"],
      checks: ["Wymień kabel i port switcha", "Odczytaj link, prędkość i dupleks funkcją „Odczytaj karty sieciowe” w Port Inspector"],
    },
    "r-tcp-noping": {
      title: "Link jest, ale ping nie przechodzi",
      causes: ["Urządzenie ma wyłączone odpowiadanie na ping (ICMP) — sprawdź od razu połączenie z portem 502", "Dwa urządzenia mają ten sam adres IP (konflikt adresów)", "Inna karta sieciowa komputera (np. Wi-Fi) jest w tej samej podsieci i ruch wychodzi tamtędy; zapora"],
      checks: ["Odłącz urządzenie i wyślij ping — jeśli jest odpowiedź, ten adres IP ma inne urządzenie", "Przeskanuj podsieć programem Net Scan pod kątem adresów IP i MAC; sprawdź duplikaty IP na schemacie systemu", "Tymczasowo wyłącz inne karty sieciowe i spróbuj ponownie"],
    },
    "r-tcp-port": {
      title: "Ping działa, ale port 502 odmawia",
      causes: ["Modbus TCP jest wyłączony w urządzeniu albo jest opcją (osobna karta lub licencja)", "Port to nie 502", "Limit połączeń jest wyczerpany (podłączona już SCADA lub HMI)"],
      checks: ["Sprawdź w instrukcji ustawienie Modbus TCP, port i maksymalną liczbę połączeń", "Na chwilę rozłącz innych klientów i połącz ponownie"],
    },
    "r-tcp-unitid": {
      title: "Połączono, ale brak odpowiedzi — identyfikator jednostki lub bramka",
      causes: ["Zły identyfikator jednostki — za bramką musi być równy adresowi urządzenia RTU; dla urządzeń podłączonych bezpośrednio użyj wartości z instrukcji (często 1 lub 255)", "Strona RTU bramki (prędkość, okablowanie) zawodzi — bramka odrzuca zapytanie lub zwraca wyjątek 0B", "Kod funkcji nieobsługiwany przez urządzenie"],
      checks: ["Zdekoduj wymieniane bajty w dekoderze ramek Modbus, aby zobaczyć MBAP i identyfikator jednostki", "Przechwyć ruch Wiresharkiem lub pktmon i sprawdź odpowiedzi i czasy w analizatorze pcap"],
    },
    "r-tcp-exception": {
      title: "Urządzenie odpowiada wyjątkiem — adres, funkcja lub liczba",
      causes: ["Wyjątek 02: nie ma takiego adresu — zapis 40001 nieprzeliczony na adres od 0 (przesunięcie o jeden)", "Wyjątek 01: funkcja nieobsługiwana (np. odczyt rejestrów wejściowych funkcją 03)", "Wyjątek 03: liczba ponad 125 lub ponad limit urządzenia"],
      checks: ["Wklej odpowiedź do dekodera ramek Modbus, aby zobaczyć znaczenie wyjątku", "Sprawdź, czy mapa rejestrów używa adresów od 0, czy od 1"],
    },
    "r-tcp-values": {
      title: "Komunikacja działa, ale wartości wyglądają źle — format, kolejność lub skala",
      causes: ["Inna kolejność słów wartości 32-bitowych (float, int32) (ABCD, CDAB …)", "Nieuwzględniona skala (×0,1, ×0,01), znak (int16/uint16) lub przekładnia przekładnika", "Adres przesunięty o jeden (od 0 lub od 1)"],
      checks: ["Wpisz oba rejestry do konwertera liczb zmiennoprzecinkowych Modbus i porównaj wszystkie cztery kolejności", "Porównaj wartości ze znakiem i bez znaku w konwerterze liczb całkowitych"],
    },

    // ④ Konwerter USB-serial
    "usb-sound": { q: "Czy po podłączeniu konwertera Windows odtwarza dźwięk podłączenia albo zmienia się Menedżer urządzeń?" },
    "usb-com": { q: "Czy pojawia się w „Porty (COM i LPT)” z numerem COM?", hint: "„Nie” = jest w „Inne urządzenia”, ze znakiem ostrzeżenia lub jako nieznane" },
    "usb-drops": { q: "Czy rozłącza się w trakcie pracy (port znika i wraca)?" },
    "usb-motor": { q: "Czy rozłącza się, gdy ruszają lub pracują duże obciążenia, np. silniki, falowniki, spawarki?" },
    "usb-comnum": { q: "Czy numer COM zmienia się przy każdym podłączeniu albo skacze wysoko, np. do COM15?", hint: "„Nie” = wykryty i połączony, ale komunikacja jest wolna lub odpowiedzi się dzielą" },
    "r-usb-none": {
      title: "W ogóle niewidoczny jako urządzenie USB — kabel, port lub konwerter",
      causes: ["Kabel USB tylko do ładowania (bez żył danych)", "Problem z portem na przednim panelu lub hubem, połączeniem albo zasilaniem", "Uszkodzony konwerter"],
      checks: ["Podłącz bezpośrednio do tylnego portu, bez huba i innym kablem", "Sprawdź, czy inny komputer zachowuje się tak samo", "Sprawdź, czy podłączenie zapisuje się w dzienniku podłączeń USB programu Hardware Tester (od 0.10.0)"],
    },
    "r-usb-driver": {
      title: "Brak sterownika albo urządzenie nie może się uruchomić",
      causes: ["Brak zainstalowanego sterownika dla układu (FTDI, CH34x, CP210x, PL2303)", "Sterownik odrzuca układ (kod 10 itp.) — częste przy starszych układach PL2303"],
      checks: ["Odczytaj VID:PID, nazwę układu i kod problemu z objaśnieniem w Port Inspector", "Użyj sterownika ze strony producenta układu (jeśli potrzebne są uprawnienia administratora, poproś dział IT)"],
    },
    "r-usb-emi": {
      title: "Zakłócenia lub różnica mas trafiają do USB",
      causes: ["Przy nieizolowanym konwerterze różnica potencjałów między masą urządzenia a masą komputera resetuje USB", "Kabel komunikacyjny lub USB biegnie obok kabli zasilających"],
      checks: ["Napięcie między obudową USB komputera a SG/PE urządzenia (V⎓ i V~): typowo poniżej 1 V; 7 V lub więcej to problem", "Wypróbuj izolowany konwerter, krótszy kabel USB lub rdzenie ferrytowe", "Porównaj czasy zerwań USB w Hardware Tester z czasami pracy silników (od 0.10.0)"],
    },
    "r-usb-power": {
      title: "Oszczędzanie energii, zasilanie lub styk",
      causes: ["Selektywne wstrzymywanie USB lub „Zezwalaj komputerowi na wyłączanie tego urządzenia w celu oszczędzania energii”", "Hub zasilany z magistrali z niedoborem prądu albo luźne złącze"],
      checks: ["Odczytaj ustawienia oszczędzania energii i ostatnią historię podłączeń w Port Inspector (tylko odczyt — zmień je samodzielnie w Windows)", "Sprawdź, czy poruszenie kablem powoduje zerwanie"],
    },
    "r-usb-comnum": {
      title: "Numer COM się zmienia — miejsce portu, numer seryjny, rezerwacje",
      causes: ["Układy bez numeru seryjnego (CH34x itp.) dostają nowy numer w każdym porcie USB", "Wcześniej podłączane urządzenia trzymają zarezerwowane numery (ComDB)"],
      checks: ["Używaj zawsze tego samego portu USB", "Przejrzyj rezerwacje numerów COM w Port Inspector", "PortDock Serial otwiera ponownie to samo urządzenie, nawet gdy zmieni się jego numer"],
    },
    "r-usb-latency": {
      title: "Połączono, ale wolno lub odpowiedzi się dzielą — opóźnienie USB",
      causes: ["Latency timer FTDI (domyślnie 16 ms) dodaje opóźnienie do każdej krótkiej ramki", "Program traktuje każdy fragment jako osobną odpowiedź", "Jeśli komunikacji nie ma wcale, przejdź do gałęzi RS-485 lub RS-232"],
      checks: ["Sprawdź latency timer i czas obiegu pętli zwrotnej w Port Inspector", "Porównaj z oczekiwanym czasem odpowiedzi z kalkulatora czasów transmisji szeregowej"],
    },

    // ⑤ 4–20 mA
    "ma-kind": { q: "Jak źle wygląda wartość?", opts: ["Stoi na 0 (lub minimum)", "Stoi na maksimum", "Waha się lub skacze", "Zmienia się, ale nie zgadza z rzeczywistością"] },
    "ma-flow": { q: "Czy z miernikiem (mA) włączonym szeregowo w pętlę płynie więcej niż 3,6 mA?" },
    "ma-volt": { q: "Czy na zaciskach + i − przetwornika jest napięcie (zwykle 10 V lub więcej)?" },
    "ma-high": { q: "Czy zmierzony prąd wynosi 21 mA lub więcej?" },
    "ma-motor": { q: "Czy wahania rosną, gdy pracują silniki lub falowniki?" },
    "ma-loopv": { q: "Czy przy ok. 20 mA napięcie na zaciskach przetwornika jest wciąż powyżej minimalnego napięcia pracy z jego instrukcji?" },
    "r-ma-open": {
      title: "Brak prądu i napięcia w pętli — przerwa lub zasilanie",
      causes: ["Przerwany przewód, luźny zacisk lub bezpiecznik", "Zasilanie pętli (24 V) wyłączone lub podłączone gdzie indziej", "Przetwornik 4-przewodowy (osobno zasilany) podłączony jak 2-przewodowy, więc nie ma zasilania"],
      checks: ["Zmierz 24 V na zasilaczu, a potem na przetworniku, aby znaleźć, gdzie znika", "Porównaj rzeczywiste okablowanie ze schematami 2/3/4-przewodowymi"],
    },
    "r-ma-tx": {
      title: "Jest napięcie, ale brak prądu — przetwornik lub polaryzacja",
      causes: ["Odwrócona polaryzacja w układzie 2-przewodowym (zamienione + i −)", "Wejście odbiorcze ustawione na napięcie, co praktycznie otwiera pętlę", "Uszkodzony przetwornik"],
      checks: ["Ponownie porównaj + i − przetwornika ze schematem w instrukcji", "Sprawdź typ kanału (prąd/napięcie) modułu wejść w ustawieniach lub zworkach"],
    },
    "r-ma-input": {
      title: "Prąd płynie, ale wartość to 0 — ustawienia lub skala po stronie odbiorczej",
      causes: ["Inaczej ustawiony zakres wejścia (0–20 mA, 1–5 V, 0–10 V)", "Oglądany jest inny kanał albo skalowanie ustawiono na 0", "Przy 3,6 mA lub mniej przetwornik sygnalizuje awarię wg NE 43 (3,6–3,8 mA to przekroczenie zakresu w dół, a nie sygnał awarii)"],
      checks: ["Wpisz zmierzone mA do narzędzia sprawdzania odczytów, aby zobaczyć % i strefę NE 43", "Porównaj z oczekiwaną wartością surową (np. 0–27648) w kalkulatorze 4–20 mA"],
    },
    "r-ma-fault-high": {
      title: "21 mA lub więcej — sygnał awarii lub zwarcie",
      causes: ["Przetwornik podaje górny sygnał awarii wg NE 43 (np. przerwany czujnik)", "Znacznie powyżej 25 mA: zasilanie omija przetwornik (zwarcie)"],
      checks: ["Sprawdź wyświetlacz lub diagnostykę przetwornika", "Zmierz rezystancję czujnika (np. Pt100), szukając przerwy"],
    },
    "r-ma-over": {
      title: "Stoi na maksimum — ustawienie zakresu lub rzeczywista wartość",
      causes: ["Zakres skalowania w PLC węższy niż zakres przetwornika", "Wartość procesowa przekracza zakres przetwornika (np. 0–10 bar)", "Pomylone jednostki (bar, psi, kPa)"],
      checks: ["Wylicz % ze zmierzonych mA i porównaj z wartością w PLC", "Sprawdź zakres na tabliczce znamionowej lub w ustawieniach przetwornika"],
    },
    "r-ma-noise": {
      title: "Zakłócenia — ekran, uziemienie lub trasa kabla",
      causes: ["Kabel sygnałowy w jednym korycie z kablami zasilającymi", "Ekran uziemiony na obu końcach tworzy pętlę masy (zwykle tylko na jednym)", "Różnica potencjałów masy między przetwornikiem a PLC"],
      checks: ["Zmierz napięcie między obiema masami (typowo poniżej 1 V)", "Zanotuj wahania w mA; rozważ separator sygnału", "Zmniejsz wahania stałą czasową filtra wejściowego (filtr RC)"],
    },
    "r-ma-loadv": {
      title: "Za niskie napięcie pętli — rezystancja obciążenia lub spadek zasilania",
      causes: ["Zbyt wiele odbiorników, wskaźników lub barier w pętli", "Długie lub cienkie przewody, spadek zasilania 24 V"],
      checks: ["Kalkulatorem obciążenia pętli wyznacz napięcie na przetworniku przy 20 mA (lub 21 mA)", "Zmierz zasilanie 24 V pod obciążeniem (spadek do 5 % jest bezpieczny)"],
    },
    "r-ma-process": {
      title: "Okablowanie i napięcie wyglądają dobrze — rzeczywiste wahania procesu lub tłumienie",
      causes: ["Wartość procesowa naprawdę się waha (np. pulsacja pompy)", "Krótkie tłumienie przetwornika lub filtr wejściowy PLC"],
      checks: ["Zapisz wartość na wykresie czasowym i szukaj okresowych wzorców", "Sprawdź ustawienie tłumienia przetwornika"],
    },
    "r-ma-scale": {
      title: "Wartość nie zgadza się z rzeczywistością — skalowanie, jednostki lub wartości surowe",
      causes: ["Zakres inżynierski (początek/koniec) różni się od ustawienia przetwornika", "Zły zakres wartości surowych w PLC (0–27648, 0–4000, 0–32000)", "Pomylone jednostki (bar/psi, nadciśnienie/absolutne)"],
      checks: ["Wpisz zmierzone mA do kalkulatora 4–20 mA i porównaj z oczekiwaną wartością i wartością surową", "Sprawdź, czy wartość w PLC jest proporcjonalna przy 4, 12 i 20 mA"],
    },

    // ⑥ Czujniki NPN/PNP
    "sn-kind": { q: "Jaki jest objaw?", opts: ["Wejście nigdy się nie załącza", "Wejście nigdy się nie wyłącza (zawsze załączone)"] },
    "sn-led": { q: "Czy własna dioda LED czujnika świeci, gdy obiekt jest obecny?" },
    "sn-power": { q: "Czy napięcie między brązową (+) a niebieską (0 V) żyłą czujnika jest bliskie zasilaniu (zwykle 24 V)?" },
    "sn-type": { q: "Czy typ czujnika pasuje do COM wejść PLC — COM do +24 V dla NPN, do 0 V dla PNP?", hint: "Nie wiesz? Wybierz „Nie”" },
    "sn-vin": { q: "Czy przy załączonym czujniku między zaciskiem wejścia PLC a COM wejść jest 15 V lub więcej?" },
    "sn-plcled": { q: "Czy w tym momencie świeci dioda LED wejścia PLC?" },
    "r-sn-power": {
      title: "Brak zasilania czujnika",
      causes: ["Przerwana żyła zasilania, styk w złączu lub bezpiecznik", "Kolory żył odbiegają od konwencji (brązowy +, niebieski 0 V, czarny wyjście)", "Spadek napięcia do odległego czujnika"],
      checks: ["Zmierz napięcie zasilania przy czujniku przy włączonych obciążeniach — spadek ponad 15 % to problem", "Sprawdź kolory żył i zakres zasilania w karcie katalogowej czujnika"],
    },
    "r-sn-sense": {
      title: "Zasilony, ale nie wykrywa — ustawienie czujnika lub obiekt",
      causes: ["Zasięg lub czułość, materiał obiektu (zasięg czujnika zbliżeniowego zależy od rodzaju metalu)", "Rozregulowany czujnik optyczny lub brudna soczewka", "Uszkodzony czujnik"],
      checks: ["Zbliżaj obiekt, aby zobaczyć, przy jakiej odległości zapala się LED", "Wstaw czujnik tego samego typu"],
    },
    "r-sn-mismatch": {
      title: "NPN/PNP i polaryzacja COM wejść mogą do siebie nie pasować",
      causes: ["Czujnik NPN z COM wejść na 0 V (lub PNP z +24 V) — prąd nie ma drogi", "Producenci używają „sink/source” w przeciwnych znaczeniach"],
      checks: ["Przy załączonym czujniku czarny–niebieski pokazuje dla NPN blisko 0 V, dla PNP blisko zasilania", "Sprawdź na schemacie wejść w instrukcji PLC, gdzie podłącza się COM"],
    },
    "r-sn-wire": {
      title: "Czujnik się załącza, ale napięcie nie dochodzi do wejścia — okablowanie",
      causes: ["Żyła wyjściowa podłączona do innego wejścia albo przerwana na pośredniej listwie zaciskowej", "Brak żyły COM wejść", "Duże napięcie resztkowe czujnika albo prąd wyjściowy za mały dla wejścia"],
      checks: ["Zmierz czarny–niebieski przy czujniku ZAŁ i WYŁ i wpisz obie wartości do narzędzia sprawdzania", "Wejście PLC względem COM: ZAŁ 15 V lub więcej (typ 1), WYŁ 5 V lub mniej"],
    },
    "r-sn-input": {
      title: "Napięcie dochodzi, ale PLC nie czyta ZAŁ — moduł wejść",
      causes: ["Zasilanie lub usterka modułu wejść albo oglądane jest inne gniazdo", "Napięcie wejścia blisko progu (11–15 V) — wejście typu 1 może pozostać wyłączone"],
      checks: ["Przepnij czujnik na sąsiedni kanał", "Sprawdź napięcie i prąd załączenia w instrukcji modułu wejść"],
    },
    "r-sn-program": {
      title: "Wejście jednak się załącza — adres, filtr lub długość impulsu",
      causes: ["Program czyta inny adres wejścia (numeracja X ósemkowa czy szesnastkowa)", "Sygnał krótszy niż czas filtra wejściowego (szybko poruszający się obiekt)", "Przy odczycie przez komunikację błędnie wyliczony adres bitu"],
      checks: ["Obserwuj ten bit wejścia bezpośrednio w podglądzie PLC", "Dla protokołu MC sprawdź zapis numeru obszaru pamięci"],
    },
    "r-sn-stuck": {
      title: "Wejście nigdy się nie wyłącza — upływ, zwarcie lub tryb wyjścia",
      causes: ["Prąd upływu czujnika 2-przewodowego w stanie wyłączonym utrzymuje wejście załączone", "Żyła wyjściowa zwarta z +24 V (PNP) lub 0 V (NPN)", "Odwrócony tryb wyjścia czujnika (NO/NC, jasno/ciemno-załączający)"],
      checks: ["Przy wyłączonym czujniku wejście PLC względem COM powinno mieć 5 V lub mniej", "Sprawdź, czy wejście się wyłącza po odłączeniu żyły wyjściowej"],
    },

    // ⑦ Protokół MC (Mitsubishi)
    "mc-ping": { q: "Czy PLC odpowiada na ping z komputera?", hint: "„Nie” prowadzi do gałęzi Ethernet (podsieć IP)" },
    "mc-port": { q: "Czy w ustawieniach Ethernet PLC jest skonfigurowane połączenie dla protokołu MC (SLMP), a numer portu, TCP/UDP i kod binarny/ASCII zgadzają się z programem?" },
    "mc-endcode": { q: "Czy kod zakończenia w odpowiedzi jest różny od zera (np. C059)?" },
    "mc-noreply": { q: "Czy połączenie jest otwarte, ale odpowiedź nigdy nie przychodzi (przekroczenie czasu)?", hint: "„Nie” = odpowiedzi przychodzą, ale wartości wyglądają źle" },
    "r-mc-port": {
      title: "Ustawienia połączenia protokołu MC w PLC",
      causes: ["Nie skonfigurowano połączenia dla protokołu MC (SLMP) albo ustawień nie zapisano do PLC i nie zrestartowano go", "Numer portu, TCP/UDP lub kod (binarny/ASCII) różni się od programu", "Inny program używa już tego samego połączenia TCP"],
      checks: ["Najpierw sprawdź stronę programu z PortDock PLC Simulator na 127.0.0.1, bez PLC", "Wypisz ustawienia Ethernet z narzędzia inżynierskiego obok wartości z programu i porównaj"],
    },
    "r-mc-endcode": {
      title: "PLC odrzuca zapytanie kodem zakończenia",
      causes: ["Polecenie lub podpolecenie nieobsługiwane przez dany model PLC", "Kod lub numer obszaru pamięci poza zakresem albo za dużo punktów", "Ustawienia w PLC, np. ochrona przed zapisem w trybie RUN"],
      checks: ["Wklej odpowiedź do dekodera ramek protokołu MC, aby zobaczyć znaczenie kodu zakończenia", "Postępuj według kolejności sprawdzania z poradnika o kodach zakończenia"],
    },
    "r-mc-frame": {
      title: "Niezgodny format ramki, więc PLC milczy",
      causes: ["Ramka 3E/4E lub kod binarny/ASCII różni się od ustawienia PLC", "Błędne wartości nagłówka (nr sieci, nr PC, moduł docelowy) lub długość danych", "Użyto UDP, a PLC oczekuje TCP (lub odwrotnie)"],
      checks: ["Zdekoduj wysłane bajty pole po polu w dekoderze ramek protokołu MC", "Przechwyć ruch Wiresharkiem lub pktmon i sprawdź pary zapytanie/odpowiedź w analizatorze pcap"],
    },
    "r-mc-values": {
      title: "Odpowiedzi przychodzą, ale wartości wyglądają źle — numery obszarów lub jednostki",
      causes: ["X i Y są szesnastkowe, a wpisano je dziesiętnie", "Pomylony odczyt w jednostkach bitowych i słowowych", "Kolejność słów lub znak wartości 32-bitowych"],
      checks: ["Porównaj z tabelą zapisu w poradniku o numerach obszarów pamięci", "Porównaj znak i HEX w konwerterze liczb całkowitych"],
    },

    // ⑧ Urządzenia USB w komputerze
    "pu-know": { q: "Czy wiesz, które urządzenie się rozłącza?", hint: "Jeśli słyszysz tylko powtarzający się dźwięk podłączania/odłączania, wybierz „Nie”" },
    "pu-port": { q: "Czy rozłącza się także w innym porcie USB (z tyłu, bez huba)?" },
    "pu-cable": { q: "Czy rozłącza się także z innym kablem?" },
    "pu-suspend": { q: "Czy wyłączenie oszczędzania energii USB (selektywne wstrzymywanie, „zezwalaj na wyłączanie”) zmniejsza problem?", hint: "PortDock tylko odczytuje te ustawienia — zmień je samodzielnie w ustawieniach Windows" },
    "r-pu-find": {
      title: "Najpierw ustal, które urządzenie się rozłącza",
      causes: ["Jeszcze nieznane — może to być mysz, klawiatura, odbiornik bezprzewodowy, kamera, konwerter USB-serial lub hub"],
      checks: ["Użyj dziennika podłączeń USB w Hardware Tester (od 0.10.0), aby zobaczyć czasy, nazwę urządzenia i VID:PID", "Urządzenie rozłączające się 3 lub więcej razy w 10 minut jest oznaczane jako „podejrzenie powtarzających się zerwań” — wtedy przejdź tę gałąź ponownie dla niego"],
    },
    "r-pu-port": {
      title: "Pierwotny port lub hub",
      causes: ["Wewnętrzny przewód lub styk portu na przednim panelu", "Hub zasilany z magistrali z niedoborem prądu"],
      checks: ["Użyj tylnego portu lub huba z własnym zasilaczem", "Potwierdź w dzienniku podłączeń USB w Hardware Tester, że po zmianie portu zerwania ustały (od 0.10.0)"],
    },
    "r-pu-cable": {
      title: "Kabel lub złącze",
      causes: ["Wewnętrzna przerwa w kablu (zrywa przy ruchu), luźne złącze", "Za długi kabel USB lub przedłużacz"],
      checks: ["Użyj krótkiego kabla dobrej jakości"],
    },
    "r-pu-suspend": {
      title: "Oszczędzanie energii USB wyłącza urządzenie",
      causes: ["Selektywne wstrzymywanie USB, „zezwalaj komputerowi na wyłączanie” w urządzeniu lub hubie"],
      checks: ["Odczytaj selektywne wstrzymywanie USB funkcją „Odczytaj ustawienia tego komputera” w Port Inspector", "W komputerze przy maszynie przejrzyj też ustawienia uśpienia w planie zasilania"],
    },
    "r-pu-device": {
      title: "Urządzenie, sterownik lub otoczenie",
      causes: ["Samo urządzenie lub jego sterownik", "Urządzenie USB 3 pracuje z prędkością USB 2.0 (znak problemu z kablem lub portem)", "Przy odbiornikach bezprzewodowych zakłócenia 2,4 GHz w pobliżu portów USB 3.0", "Różnica mas lub zakłócenia instalacji (środowisko przemysłowe)"],
      checks: ["Sprawdź, czy rozłącza się w innym komputerze", "Szukaj oznaczeń „Warto sprawdzić” przy prędkości USB w Hardware Tester (od 0.10.0)", "Zmierz napięcie między masą komputera a masą instalacji"],
    },
  },
} satisfies TreeText;
