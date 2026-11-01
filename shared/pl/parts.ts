// 폴란드어 — 공용 부품의 화면 글(설정 창·도움말 머리·문제 보고·AI 복사 창·첫 실행 카드·새 버전 알림·로그 찾기·화면 오류·사용 통계).
// 원천은 각 부품의 영어판. 빠진 열쇠는 영어로 보인다. 단추 글은 좁은 창에 맞게 짧게.
import type { SettingsTextKey } from "../SettingsDialog.tsx";
import type { HelpUiKey } from "../HelpDialog.tsx";
import type { ReportTextKey } from "../ReportDialog.tsx";
import type { AiUiKey } from "../AiCopyButton.tsx";
import type { FirstTextKey } from "../FirstCard.tsx";
import type { UpdateTextKey } from "../UpdateNotice.tsx";
import type { FilterTextKey } from "../LogFilter.tsx";
import type { BoundaryTextKey } from "../Boundary.tsx";
import type { UsageText } from "../usageText.ts";

type Pl<K extends string> = Partial<Record<K, string>>;

export const PL_SETTINGS: Pl<SettingsTextKey> = {
  title: "Ustawienia",
  lang: "Język",
  theme: "Motyw",
  system: "Jak w Windows",
  light: "Jasny",
  dark: "Ciemny",
  fontSize: "Rozmiar czcionki (px)",
  timeFormat: "Znacznik czasu w logu",
  local: "gg:mm:ss.ms",
  localDate: "Data + godzina",
  utc: "UTC",
  elapsed: "Czas od startu («Wyczyść» zeruje)",
  maxLines: "Linie na ekranie",
  maxLinesHint: "Starsze linie znikają tylko z ekranu (logi w pliku zachowują wszystko).",
  autoScroll: "Przewijaj przy nowych liniach (wstrzymane po przewinięciu w górę)",
  alwaysOnTop: "Zawsze na wierzchu — trzymaj to okno nad innymi (📌 w nagłówku)",
  expandAll: "Rozwiń wszystko (widok eksperta) — zawsze pokazuj zwinięte grupy (zaawansowane połączenie, ustawienia odbioru, wstrzykiwanie błędów, statystyki …) otwarte",
  autoLog: "Zapisuj do pliku po połączeniu",
  logFolder: "Folder automatycznego logu",
  choose: "Wybierz",
  noFolder: "Wybierz folder",
  confirmExit: "Pytaj przed zamknięciem, gdy połączono lub trwa zapis",
  lostAlert: "Migaj przyciskiem na pasku zadań przy zerwaniu połączenia (gdy okno jest w tle)",
  keepAwake: "Nie usypiaj PC, gdy połączono lub trwa zapis (ekran może się wyłączyć)",
  autoConnect: "Przy starcie otwórz ostatnie połączenie",
  autoReport: "Automatyczne raporty błędów",
  arAsk: "Pytaj po awarii",
  arOn: "Wysyłaj automatycznie",
  arOff: "Nigdy nie wysyłaj",
  autoReportHint: "Wysyła tylko przyczynę błędów programu (wyjątki, awarie) oraz wersję programu/Windows. Ruch, polecenia, reguły i ustawienia IP nigdy nie są wysyłane. PC bez internetu ponawiają następnym razem.",
  backup: "Kopia zapasowa",
  exportAll: "Eksportuj ustawienia",
  importAll: "Importuj ustawienia",
  reset: "Przywróć domyślne",
  resetAsk: "Przywrócić domyślne ustawienia wyświetlania? (polecenia i reguły zostają)",
  importAsk: "Import zastąpi wszystkie bieżące ustawienia, polecenia i reguły. Kontynuować?",
  importBusy: "Przed importem zatrzymaj połączenie i zapis.",
  noFolderWarn: "Automatyczny zapis nie ruszy, dopóki nie wybierzesz folderu.",
  close: "Zamknij",
  about: "O programie",
  gpl: "Ten program jest wolnym oprogramowaniem rozpowszechnianym na licencji GNU GPL v3. NIE MA ŻADNEJ GWARANCJI.",
  license: "Tekst licencji",
  source: "Kod źródłowy",
  site: "Strona WWW",
  notices: "Informacje o stronach trzecich",
  sponsor: "Wesprzyj",
  checkUpdate: "Sprawdź aktualizacje",
  checkUpdateHint: "Otwiera w przeglądarce stronę najnowszego wydania.",
  updateCheck: "Sprawdzaj nowe wersje (raz dziennie)",
  updateCheckHint: "Gdy włączone, raz dziennie pyta GitHub (api.github.com) tylko o najnowsze wydanie i pokazuje informację na dole okna, jeśli jest nowsza wersja. Nie są wysyłane żadne dane; nic nie jest pobierane ani instalowane.",
};

export const PL_HELP_UI: Pl<HelpUiKey> = {
  title: "Pomoc",
  search: "Szukaj…",
  close: "Zamknij",
  none: "Brak wyników",
  enOnly: "Pomoc jest tylko po angielsku (ekran jest po polsku).",
};

export const PL_REPORT: Pl<ReportTextKey> = {
  button: "Zgłoś problem — wyślij błędy do autora",
  title: "Zgłoś problem",
  intro: "Raport powstaje na tym PC i jest pokazany poniżej. Nic nie jest wysyłane automatycznie. Przejrzyj go, a potem wybierz sposób wysłania.",
  what: "Co się stało? (co robiłeś, co kliknąłeś, oczekiwany a rzeczywisty wynik)",
  whatPh: "np. Okno zawiesiło się, gdy trzeci klient połączył się z serwerem TCP.",
  env: "Wersja programu i Windows (zawsze dołączana)",
  errors: "Błędy w tej sesji: {n}",
  crashes: "Zapisy awarii: {n}",
  dumps: "Dołączono plik zrzutu ({n} KB)",
  dumpsSend: " — wysyłany razem z «Wyślij teraz»",
  dumpManual: "Wysyłając e-mailem lub przez GitHub, dołącz plik zrzutu samodzielnie (zostaje do wysłania lub odrzucenia): {a}",
  config: "Ustawienia połączenia i wyświetlania (IP, port, prędkość … — bez poleceń i reguł)",
  log: "Ostatnie {n} linii ruchu",
  logWarn: "Ruch może zawierać dane firmy lub urządzenia. Dołącz go tylko, jeśli to dozwolone.",
  preview: "Podgląd raportu",
  copy: "Kopiuj",
  copied: "Skopiowano",
  saveFile: "Zapisz do pliku",
  saved: "Zapisano: {a}",
  email: "Wyślij e-mailem",
  emailHint: "Otworzy się program pocztowy. Długie raporty są ucinane, więc dołącz plik z «Zapisz do pliku».",
  issue: "Otwórz zgłoszenie na GitHubie",
  issueHint: "Publikowane publicznie na GitHubie (wymagane konto). Upewnij się, że nie ma tam danych firmy.",
  offline: "Na PC bez internetu użyj «Zapisz do pliku», przenieś plik na USB i wyślij z innego PC.",
  close: "Zamknij",
  crashTitle: "Program ostatnio uległ awarii",
  crashBody: "{a} ostatnio nieoczekiwanie się zamknął i zostawił zapis awarii. Wysłanie go autorowi bardzo pomaga.",
  crashOpen: "Zobacz raport",
  crashLater: "Później",
  crashDiscard: "Odrzuć bez wysyłania",
  noTarget: "Nie skonfigurowano jeszcze odbiorcy. Użyj «Zapisz do pliku».",
  sendNow: "Wyślij teraz",
  sendNowHint: "Wysyła powyższy podgląd bezpośrednio do autora (wymagany internet, konto niepotrzebne).",
  sending: "Wysyłanie…",
  sentOk: "Wysłano. Dziękujemy!",
  sendFail: "Nie udało się wysłać (sprawdź połączenie z internetem). Użyj «Zapisz do pliku» i wyślij później.",
  crashSend: "Wyślij teraz",
  crashAlways: "Odtąd wysyłaj automatycznie bez pytania",
};

export const PL_AI_UI: Pl<AiUiKey> = {
  button: "Zapytaj AI — tylko kopiuje, nic nie wysyła: bieżąca sytuacja jako tekst do czatu AI w schowku",
  title: "Kopia do pytania AI",
  introLog: "Tworzy tekst do czatu AI (z szablonem pytania): program, ustawienia połączenia, błędy w tej sesji i ostatni ruch.",
  introChecks: "Tworzy tekst do czatu AI (z szablonem pytania): program, błędy w tej sesji i wyniki sprawdzenia.",
  local: "PortDock niczego nie wysyła — tekst trafia tylko do schowka.",
  warn: "To, co wkleisz, trafi do tej usługi AI. Przed wklejeniem sprawdź dane urządzeń i firmy.",
  hideIp: "Ukryj też prywatne IP (publiczne są zawsze ukryte)",
  incLog: "Dołącz ostatni ruch",
  incChecks: "Dołącz wyniki sprawdzenia",
  incFound: "Dołącz znalezione urządzenia",
  introFound: "Tworzy tekst do czatu AI (z szablonem pytania): program, błędy w tej sesji i znalezione urządzenia.",
  preview: "Tekst do wklejenia (podgląd)",
  size: "{n} / {max} znaków",
  cut: " · usunięto starszych linii: {n}",
  cutText: " · ucięto długi tekst",
  copy: "Kopiuj",
  copied: "Skopiowano — wklej do czatu AI (Ctrl+V) i uzupełnij «Sytuację».",
  copyFail: "Nie udało się skopiować — schowek może być zajęty przez inny program",
  close: "Zamknij",
};

export const PL_FIRST: Pl<FirstTextKey> = {
  hide: "Nie pokazuj więcej",
  help: "Pomoc:",
  narrow: "Okno jest wąskie, więc lewy panel jest zwinięty — «po lewej» poniżej oznacza panel pod przyciskiem «⚙ {b}» w lewym górnym rogu.",
  open: "Otwórz lewy panel",
};

export const PL_UPDATE: Pl<UpdateTextKey> = {
  msg: "Dostępna jest wersja {a} (masz {b}).",
  open: "Strona wydania",
  later: "Nie przypominaj o tej wersji",
  close: "Zamknij (pokaże się przy następnym starcie)",
};

export const PL_FILTER: Pl<FilterTextKey> = {
  find: "Szukaj (Ctrl+F) — 01 03 lub tekst",
  auto: "Auto",
  hex: "HEX",
  text: "Tekst",
  prev: "Poprzedni (Shift+Enter)",
  next: "Następny (Enter)",
  hitsOnly: "Tylko trafienia",
  failOnly: "Tylko FAIL",
  all: "Wszystko",
  off: "Wyczyść filtr (Esc)",
  badHex: "to nie HEX",
  none: "brak",
  shown: "{a}/{b} linii",
};

export const PL_BOUNDARY: Pl<BoundaryTextKey> = {
  title: "Ekran uległ awarii",
  body: "Wysłanie tego autorowi pomaga w naprawie. Ponowne otwarcie programu zwykle przywraca działanie.",
  report: "Zgłoś problem",
  reload: "Wczytaj ponownie",
  resetTip: "Jeśli po ponownym wczytaniu awaria się powtarza — czyści zapisane ustawienia ekranu (w tym listy poleceń i reguły)",
  resetArm: "Na pewno zresetować — kliknij jeszcze raz",
  reset: "Resetuj ustawienia",
};

export const PL_USAGE: Partial<UsageText> = {
  title: "Wysyłać statystyki użycia?",
  why: "Wiedza o tym, które funkcje są używane, pomaga wybrać, co ulepszyć w następnej kolejności. Po włączeniu poniższe elementy są wysyłane anonimowo, raz, przy zamykaniu okna.",
  sendsTitle: "Wysyłane",
  sends: ["Nazwa i wersja programu, wersja Windows (10/11), język ekranu", "Minuty, przez które program był otwarty", "Ile razy użyto każdej funkcji (połączenie, wysyłka, odczyt … — tylko liczby)", "Wersja instalowana czy przenośna"],
  neverTitle: "Nigdy nie wysyłane",
  never: ["Treść ruchu", "Adresy IP, porty, nazwy COM", "Ścieżki plików", "Nazwy PC, użytkowników i urządzeń", "Żaden identyfikator instalacji ani PC"],
  where: "Odbiorca: Aptabase (UE). Bez internetu lub przy błędzie wysyłki dane są odrzucane. Twoja odpowiedź staje się też wartością początkową dla innych programów PortDock na tym PC (nie zapytają ponownie), a każdy program może ją zmienić w dowolnej chwili w Ustawieniach (⚙).",
  yes: "Wysyłaj",
  no: "Nie wysyłaj",
  setting: "Wysyłaj statystyki użycia (anonimowo, przy zamknięciu)",
  hint: "Wysyła tylko liczby użyć funkcji, minuty działania, wersję programu/Windows, język ekranu i wersję instalowaną/przenośną. Ruch, adresy IP, porty, nazwy COM, ścieżki plików i nazwy PC/użytkowników/urządzeń nigdy nie są wysyłane. Odbiorca: Aptabase (UE).",
};
