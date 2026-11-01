// 독일어 — 공용 부품의 화면 글(설정 창·도움말 머리·문제 보고·AI 복사 창·첫 실행 카드·새 버전 알림·로그 찾기·화면 오류·사용 통계).
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

type De<K extends string> = Partial<Record<K, string>>;

export const DE_SETTINGS: De<SettingsTextKey> = {
  title: "Einstellungen",
  lang: "Sprache",
  theme: "Design",
  system: "Wie Windows",
  light: "Hell",
  dark: "Dunkel",
  fontSize: "Schriftgröße (px)",
  timeFormat: "Zeitstempel im Log",
  local: "hh:mm:ss.ms",
  localDate: "Datum + Uhrzeit",
  utc: "UTC",
  elapsed: "Seit Start vergangen (Leeren setzt zurück)",
  maxLines: "Zeilen auf dem Bildschirm",
  maxLinesHint: "Ältere Zeilen verschwinden nur vom Bildschirm (Dateilogs behalten alles).",
  autoScroll: "Bei neuen Zeilen automatisch scrollen (pausiert beim Hochscrollen)",
  alwaysOnTop: "Immer im Vordergrund — dieses Fenster über anderen halten (📌 in der Titelzeile)",
  expandAll: "Alles aufklappen (Expertenansicht) — eingeklappte Gruppen (erweiterte Verbindung, Empfangseinstellungen, Fehlereinspeisung, Statistik …) immer offen zeigen",
  autoLog: "Beim Verbinden in Datei aufzeichnen",
  logFolder: "Ordner für automatische Logs",
  choose: "Wählen",
  noFolder: "Ordner wählen",
  confirmExit: "Vor dem Schließen fragen, wenn verbunden oder aufzeichnend",
  lostAlert: "Taskleistensymbol blinken lassen, wenn die Verbindung abreißt (Fenster im Hintergrund)",
  keepAwake: "PC wach halten, solange verbunden oder aufzeichnend (Bildschirm darf ausgehen)",
  autoConnect: "Letzte Verbindung beim Start wieder öffnen",
  autoReport: "Automatische Fehlerberichte",
  arAsk: "Nach Absturz fragen",
  arOn: "Automatisch senden",
  arOff: "Nie senden",
  autoReportHint: "Sendet nur die Ursache von Programmfehlern (Ausnahmen, Abstürze) und die Programm-/Windows-Version. Datenverkehr, Befehle, Regeln und IP-Einstellungen werden nie gesendet. PCs ohne Internet versuchen es beim nächsten Mal erneut.",
  backup: "Sicherung",
  exportAll: "Einstellungen exportieren",
  importAll: "Einstellungen importieren",
  reset: "Auf Standard zurücksetzen",
  resetAsk: "Anzeigeeinstellungen auf Standard zurücksetzen? (Befehle und Regeln bleiben)",
  importAsk: "Der Import ersetzt alle aktuellen Einstellungen, Befehle und Regeln. Fortfahren?",
  importBusy: "Vor dem Import Verbindung und Aufzeichnung stoppen.",
  noFolderWarn: "Die automatische Aufzeichnung startet erst, wenn ein Ordner gewählt ist.",
  close: "Schließen",
  about: "Über",
  gpl: "Dieses Programm ist freie Software und wird unter der GNU GPL v3 verbreitet. Es gibt KEINERLEI GEWÄHRLEISTUNG.",
  license: "Lizenztext",
  source: "Quellcode",
  site: "Website",
  notices: "Hinweise zu Drittanbietern",
  sponsor: "Unterstützen",
  checkUpdate: "Nach Updates suchen",
  checkUpdateHint: "Öffnet die Seite des neuesten Release im Browser.",
  updateCheck: "Nach neuen Versionen suchen (einmal täglich)",
  updateCheckHint: "Wenn an, fragt einmal täglich bei GitHub (api.github.com) nur das neueste Release ab und zeigt unten im Fenster einen Hinweis, falls es eine neuere Version gibt. Es werden keine Daten gesendet; nichts wird heruntergeladen oder installiert.",
};

export const DE_HELP_UI: De<HelpUiKey> = {
  title: "Hilfe",
  search: "Suchen…",
  close: "Schließen",
  none: "Keine Treffer",
  enOnly: "Die Hilfe gibt es nur auf Englisch (die Oberfläche ist Deutsch).",
};

export const DE_REPORT: De<ReportTextKey> = {
  button: "Problem melden — Fehler an den Entwickler senden",
  title: "Problem melden",
  intro: "Der Bericht wird auf diesem PC erstellt und unten angezeigt. Nichts wird automatisch gesendet. Prüfen Sie ihn und wählen Sie dann, wie er gesendet wird.",
  what: "Was ist passiert? (was Sie gerade taten, was Sie geklickt haben, erwartetes vs. tatsächliches Ergebnis)",
  whatPh: "z. B. Das Fenster fror ein, als sich eine dritte Gegenstelle mit dem TCP-Server verband.",
  env: "Programm- und Windows-Version (immer enthalten)",
  errors: "{n} Fehler in dieser Sitzung",
  crashes: "{n} Absturzeintrag/-einträge",
  dumps: "Dump-Datei enthalten ({n} KB)",
  dumpsSend: " — wird mit «Jetzt senden» hochgeladen",
  dumpManual: "Beim Senden per E-Mail oder GitHub die Dump-Datei bitte selbst anhängen (bleibt bis zum Senden oder Verwerfen erhalten): {a}",
  config: "Verbindungs- und Anzeigeeinstellungen (IP, Port, Baudrate … — Befehle und Regeln nicht enthalten)",
  log: "Letzte {n} Zeilen Datenverkehr",
  logWarn: "Der Datenverkehr kann Firmen- oder Gerätedaten enthalten. Nur beifügen, wenn das erlaubt ist.",
  preview: "Berichtsvorschau",
  copy: "Kopieren",
  copied: "Kopiert",
  saveFile: "In Datei speichern",
  saved: "Gespeichert: {a}",
  email: "Per E-Mail senden",
  emailHint: "Ihr Mailprogramm öffnet sich. Lange Berichte werden gekürzt, daher die Datei aus «In Datei speichern» anhängen.",
  issue: "GitHub-Issue öffnen",
  issueHint: "Wird öffentlich auf GitHub veröffentlicht (Konto nötig). Achten Sie darauf, dass keine Firmendaten enthalten sind.",
  offline: "Auf einem PC ohne Internet «In Datei speichern», per USB übertragen und von einem anderen PC senden.",
  close: "Schließen",
  crashTitle: "Das Programm ist letztes Mal abgestürzt",
  crashBody: "{a} wurde letztes Mal unerwartet beendet und hat einen Absturzeintrag hinterlassen. Ihn an den Entwickler zu senden, hilft sehr.",
  crashOpen: "Bericht ansehen",
  crashLater: "Später",
  crashDiscard: "Verwerfen ohne Senden",
  noTarget: "Noch kein Ziel eingerichtet. «In Datei speichern» verwenden.",
  sendNow: "Jetzt senden",
  sendNowHint: "Sendet die Vorschau oben direkt an den Entwickler (Internet nötig, kein Konto nötig).",
  sending: "Sende…",
  sentOk: "Gesendet. Vielen Dank!",
  sendFail: "Senden fehlgeschlagen (Internetverbindung prüfen). «In Datei speichern» und später senden.",
  crashSend: "Jetzt senden",
  crashAlways: "Künftig ohne Nachfrage automatisch senden",
};

export const DE_AI_UI: De<AiUiKey> = {
  button: "KI fragen — nur kopieren, nichts wird gesendet: die aktuelle Lage als Text für einen KI-Chat in die Zwischenablage",
  title: "Kopie für KI-Fragen",
  introLog: "Erstellt Text für einen KI-Chat (mit Fragevorlage): Programm, Verbindungseinstellungen, Fehler dieser Sitzung und letzter Datenverkehr.",
  introChecks: "Erstellt Text für einen KI-Chat (mit Fragevorlage): Programm, Fehler dieser Sitzung und Prüfergebnisse.",
  local: "PortDock sendet nichts — der Text kommt nur in die Zwischenablage.",
  warn: "Was Sie einfügen, geht an diesen KI-Dienst. Geräte- und Firmenangaben vor dem Einfügen prüfen.",
  hideIp: "Auch private IPs verbergen (öffentliche IPs sind immer verborgen)",
  incLog: "Letzten Datenverkehr beifügen",
  incChecks: "Prüfergebnisse beifügen",
  incFound: "Gefundene Geräte beifügen",
  introFound: "Erstellt Text für einen KI-Chat (mit Fragevorlage): Programm, Fehler dieser Sitzung und gefundene Geräte.",
  preview: "Einzufügender Text (Vorschau)",
  size: "{n} / {max} Zeichen",
  cut: " · {n} ältere Zeilen entfernt",
  cutText: " · langer Text gekürzt",
  copy: "Kopieren",
  copied: "Kopiert — in den KI-Chat einfügen (Strg+V) und «Situation» ausfüllen.",
  copyFail: "Kopieren fehlgeschlagen — ein anderes Programm belegt evtl. die Zwischenablage",
  close: "Schließen",
};

export const DE_FIRST: De<FirstTextKey> = {
  hide: "Nicht mehr zeigen",
  help: "Hilfe:",
  narrow: "Das Fenster ist schmal, daher ist die linke Leiste eingeklappt — «links» unten meint die Leiste hinter der Schaltfläche «⚙ {b}» oben links.",
  open: "Linke Leiste öffnen",
};

export const DE_UPDATE: De<UpdateTextKey> = {
  msg: "Version {a} ist verfügbar (installiert: {b}).",
  open: "Release-Seite",
  later: "Nicht mehr an diese Version erinnern",
  close: "Schließen (beim nächsten Start wieder)",
};

export const DE_FILTER: De<FilterTextKey> = {
  find: "Suchen (Strg+F) — 01 03 oder Text",
  auto: "Auto",
  hex: "HEX",
  text: "Text",
  prev: "Zurück (Umschalt+Enter)",
  next: "Weiter (Enter)",
  hitsOnly: "Nur Treffer",
  failOnly: "Nur FAIL",
  all: "Alle",
  off: "Filter aufheben (Esc)",
  badHex: "kein HEX",
  none: "keine",
  shown: "{a}/{b} Zeilen",
};

export const DE_BOUNDARY: De<BoundaryTextKey> = {
  title: "Die Oberfläche ist abgestürzt",
  body: "Dies an den Entwickler zu senden, hilft beim Beheben. Erneutes Öffnen des Programms stellt meist alles wieder her.",
  report: "Problem melden",
  reload: "Neu laden",
  resetTip: "Wenn auch nach dem Neuladen ein Absturz kommt — löscht gespeicherte Oberflächeneinstellungen (inkl. Befehlslisten und Regeln)",
  resetArm: "Wirklich zurücksetzen — nochmals klicken",
  reset: "Einstellungen zurücksetzen",
};

export const DE_USAGE: Partial<UsageText> = {
  title: "Nutzungsstatistik senden?",
  why: "Zu wissen, welche Funktionen genutzt werden, hilft bei der Wahl, was als Nächstes verbessert wird. Wenn Sie das einschalten, werden die Punkte unten anonym einmal beim Schließen des Fensters gesendet.",
  sendsTitle: "Gesendet",
  sends: ["Programmname und -version, Windows-Version (10/11), Anzeigesprache", "Minuten, die das Programm offen war", "Wie oft jede Funktion genutzt wurde (Verbinden, Senden, Lesen … — nur Anzahlen)", "Installierte oder portable Ausgabe"],
  neverTitle: "Nie gesendet",
  never: ["Inhalte des Datenverkehrs", "IP-Adressen, Ports, COM-Namen", "Dateipfade", "PC-, Benutzer- und Gerätenamen", "Jede ID, die Installation oder PC erkennbar macht"],
  where: "Empfänger: Aptabase (EU). Ohne Internet oder bei Sendefehler werden die Daten verworfen. Ihre Antwort gilt auch als Startwert für andere PortDock-Programme auf diesem PC (sie fragen nicht erneut), und jedes Programm kann sie jederzeit in den Einstellungen (⚙) ändern.",
  yes: "Senden",
  no: "Nicht senden",
  setting: "Nutzungsstatistik senden (anonym, beim Schließen)",
  hint: "Sendet nur Nutzungsanzahlen der Funktionen, Minuten offen, Programm-/Windows-Version, Anzeigesprache und installierte/portable Ausgabe. Datenverkehr, IP-Adressen, Ports, COM-Namen, Dateipfade und PC-/Benutzer-/Gerätenamen werden nie gesendet. Empfänger: Aptabase (EU).",
};
