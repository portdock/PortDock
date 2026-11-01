// 이탈리아어 — 공용 부품의 화면 글(설정 창·도움말 머리·문제 보고·AI 복사 창·첫 실행 카드·새 버전 알림·로그 찾기·화면 오류·사용 통계).
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

type It<K extends string> = Partial<Record<K, string>>;

export const IT_SETTINGS: It<SettingsTextKey> = {
  title: "Impostazioni",
  lang: "Lingua",
  theme: "Tema",
  system: "Segui Windows",
  light: "Chiaro",
  dark: "Scuro",
  fontSize: "Dimensione testo (px)",
  timeFormat: "Ora nel log",
  local: "hh:mm:ss.ms",
  localDate: "Data + ora",
  utc: "UTC",
  elapsed: "Tempo dall’avvio (Cancella azzera)",
  maxLines: "Righe mantenute a schermo",
  maxLinesHint: "Le righe più vecchie vengono tolte solo dallo schermo (i log su file conservano tutto).",
  autoScroll: "Scorrimento auto sulle nuove righe (pausa quando scorri in su)",
  alwaysOnTop: "Sempre in primo piano — tieni questa finestra sopra le altre (📌 nell’intestazione)",
  expandAll: "Espandi tutto (vista esperta) — mostra sempre aperti i gruppi chiusi (connessione avanzata, impostazioni di ricezione, iniezione di guasti, statistiche …)",
  autoLog: "Avvia il log su file alla connessione",
  logFolder: "Cartella del log automatico",
  choose: "Scegli",
  noFolder: "Scegli una cartella",
  confirmExit: "Chiedi prima di chiudere durante una connessione o un log",
  lostAlert: "Fai lampeggiare il pulsante sulla barra delle applicazioni quando la connessione cade (con la finestra in secondo piano)",
  keepAwake: "Tieni sveglio il PC durante una connessione o un log (lo schermo può spegnersi)",
  autoConnect: "Riapri l’ultima connessione all’avvio",
  autoReport: "Segnalazioni automatiche di errori",
  arAsk: "Chiedi dopo un arresto anomalo",
  arOn: "Invia automaticamente",
  arOff: "Non inviare mai",
  autoReportHint: "Invia solo la causa degli errori del programma (eccezioni, arresti anomali) e la versione del programma/di Windows. Traffico, comandi, regole e impostazioni IP non vengono mai inviati. I PC offline riprovano la volta successiva.",
  backup: "Backup",
  exportAll: "Esporta impostazioni",
  importAll: "Importa impostazioni",
  reset: "Ripristina predefiniti",
  resetAsk: "Ripristinare le impostazioni di visualizzazione predefinite? (comandi e regole restano)",
  importAsk: "L’importazione sostituisce tutte le impostazioni, i comandi e le regole attuali. Continuare?",
  importBusy: "Ferma connessione e log prima di importare.",
  noFolderWarn: "Il log automatico non parte finché non si sceglie una cartella.",
  close: "Chiudi",
  about: "Informazioni",
  gpl: "Questo programma è software libero, distribuito sotto GNU GPL v3. Viene fornito SENZA ALCUNA GARANZIA.",
  license: "Testo della licenza",
  source: "Codice sorgente",
  site: "Sito web",
  notices: "Note di terze parti",
  sponsor: "Sostieni",
  checkUpdate: "Cerca aggiornamenti",
  checkUpdateHint: "Apre nel browser la pagina dell’ultima versione.",
  updateCheck: "Cerca nuove versioni (una volta al giorno)",
  updateCheckHint: "Se attivo, chiede a GitHub (api.github.com) una volta al giorno solo l’ultima versione e mostra un avviso in fondo alla finestra se ne esiste una più recente. Non viene inviato alcun dato; nulla viene scaricato né installato.",
};

export const IT_HELP_UI: It<HelpUiKey> = {
  title: "Guida",
  search: "Cerca…",
  close: "Chiudi",
  none: "Nessun risultato",
  enOnly: "La guida è solo in inglese (schermo in italiano).",
};

export const IT_REPORT: It<ReportTextKey> = {
  button: "Segnala un problema — invia errori e bug allo sviluppatore",
  title: "Segnala un problema",
  intro: "Un rapporto viene preparato su questo PC e mostrato sotto. Nulla viene inviato automaticamente. Controllalo, poi scegli come inviarlo.",
  what: "Cosa è successo? (cosa stavi facendo, cosa hai cliccato, risultato atteso e reale)",
  whatPh: "es. La finestra si è bloccata quando un terzo peer si è connesso al server TCP.",
  env: "Versione del programma e di Windows (sempre inclusa)",
  errors: "{n} errori in questa sessione",
  crashes: "{n} arresti anomali registrati",
  dumps: "File dump incluso ({n} KB)",
  dumpsSend: " — caricato con «Invia ora»",
  dumpManual: "Allega tu il file dump quando invii via e-mail o GitHub (conservato fino all’invio o all’eliminazione): {a}",
  config: "Impostazioni di connessione e visualizzazione (IP, porta, baud … — comandi e regole non inclusi)",
  log: "Ultime {n} righe di traffico",
  logWarn: "Il traffico può contenere dati aziendali o del dispositivo. Includilo solo se è consentito.",
  preview: "Anteprima del rapporto",
  copy: "Copia",
  copied: "Copiato",
  saveFile: "Salva su file",
  saved: "Salvato: {a}",
  email: "Invia via e-mail",
  emailHint: "Si apre il programma di posta. I rapporti lunghi vengono tagliati, quindi allega il file creato con «Salva su file».",
  issue: "Apri una issue su GitHub",
  issueHint: "Pubblicato pubblicamente su GitHub (account richiesto). Assicurati che non contenga dati aziendali.",
  offline: "Su un PC offline, «Salva su file», spostalo via USB e invialo da un altro PC.",
  close: "Chiudi",
  crashTitle: "L’ultima volta il programma si è chiuso in modo anomalo",
  crashBody: "{a} l’ultima volta si è chiuso inaspettatamente e ha lasciato un registro dell’arresto. Inviarlo allo sviluppatore aiuta molto.",
  crashOpen: "Vedi rapporto",
  crashLater: "Più tardi",
  crashDiscard: "Elimina senza inviare",
  noTarget: "Nessuna destinazione è ancora configurata. Usa «Salva su file».",
  sendNow: "Invia ora",
  sendNowHint: "Invia direttamente allo sviluppatore l’anteprima sopra (serve Internet, nessun account).",
  sending: "Invio…",
  sentOk: "Inviato. Grazie!",
  sendFail: "Invio non riuscito (controlla la connessione Internet). «Salva su file» e invialo più tardi.",
  crashSend: "Invia ora",
  crashAlways: "D’ora in poi invia automaticamente senza chiedere",
};

export const IT_AI_UI: It<AiUiKey> = {
  button: "Chiedi all’IA — solo copia, nulla viene inviato: la situazione attuale come testo per una chat IA, negli appunti",
  title: "Copia per chiedere all’IA",
  introLog: "Prepara un testo per una chat IA (con un modello di domanda): programma, impostazioni di connessione, errori di questa sessione e traffico recente.",
  introChecks: "Prepara un testo per una chat IA (con un modello di domanda): programma, errori di questa sessione e risultati del controllo.",
  local: "PortDock non invia nulla da nessuna parte — va solo negli appunti.",
  warn: "Ciò che incolli va a quel servizio di IA. Controlla i dettagli su dispositivo e azienda prima di incollare.",
  hideIp: "Nascondi anche gli IP privati (gli IP pubblici sono sempre nascosti)",
  incLog: "Includi traffico recente",
  incChecks: "Includi risultati del controllo",
  incFound: "Includi dispositivi trovati",
  introFound: "Prepara un testo per una chat IA (con un modello di domanda): programma, errori di questa sessione e dispositivi trovati.",
  preview: "Testo da incollare (anteprima)",
  size: "{n} / {max} caratteri",
  cut: " · {n} righe vecchie rimosse",
  cutText: " · testo lungo tagliato",
  copy: "Copia",
  copied: "Copiato — incollalo nella chat IA (Ctrl+V) e compila «Situazione».",
  copyFail: "Copia non riuscita — un altro programma potrebbe tenere occupati gli appunti",
  close: "Chiudi",
};

export const IT_FIRST: It<FirstTextKey> = {
  hide: "Non mostrare più",
  help: "Guida:",
  narrow: "La finestra è stretta, quindi il pannello sinistro è chiuso — «a sinistra» qui sotto indica il pannello dietro il pulsante «⚙ {b}» in alto a sinistra.",
  open: "Apri il pannello sinistro",
};

export const IT_UPDATE: It<UpdateTextKey> = {
  msg: "È disponibile la versione {a} (hai la {b}).",
  open: "Pagina della versione",
  later: "Non ricordarmi più questa versione",
  close: "Chiudi (mostrato di nuovo al prossimo avvio)",
};

export const IT_FILTER: It<FilterTextKey> = {
  find: "Cerca (Ctrl+F) — 01 03 o testo",
  auto: "Auto",
  hex: "HEX",
  text: "Testo",
  prev: "Precedente (Maiusc+Invio)",
  next: "Successivo (Invio)",
  hitsOnly: "Solo corrispondenze",
  failOnly: "Solo ERRORE",
  all: "Tutto",
  off: "Togli filtro (Esc)",
  badHex: "non è HEX",
  none: "nessuno",
  shown: "{a}/{b} righe",
};

export const IT_BOUNDARY: It<BoundaryTextKey> = {
  title: "Lo schermo ha avuto un errore",
  body: "Inviare questo allo sviluppatore aiuta a correggerlo. Riaprire il programma di solito basta a ripristinare.",
  report: "Segnala un problema",
  reload: "Ricarica",
  resetTip: "Se anche ricaricando si ripete l’errore — cancella le impostazioni dello schermo salvate (inclusi elenchi comandi e regole)",
  resetArm: "Ripristina davvero — clicca di nuovo",
  reset: "Ripristina impostazioni",
};

export const IT_USAGE: Partial<UsageText> = {
  title: "Inviare statistiche d’uso?",
  why: "Sapere quali funzioni vengono usate aiuta a decidere cosa migliorare. Se lo attivi, gli elementi sotto vengono inviati in forma anonima, una volta, alla chiusura della finestra.",
  sendsTitle: "Inviato",
  sends: ["Nome e versione del programma, versione di Windows (10/11), lingua dello schermo", "Minuti in cui il programma è rimasto aperto", "Quante volte è stata usata ogni funzione (connessione, invio, lettura … — solo conteggi)", "Edizione installata o portatile"],
  neverTitle: "Mai inviato",
  never: ["Contenuto del traffico", "Indirizzi IP, porte, nomi COM", "Percorsi dei file", "Nomi del PC, dell’utente e dei dispositivi", "Qualsiasi ID che identifichi l’installazione o il PC"],
  where: "Destinatario: Aptabase (UE). Se offline o se l’invio fallisce, i dati vengono scartati. La tua risposta diventa anche il valore iniziale per le altre app PortDock su questo PC (non chiederanno di nuovo), e ogni app può cambiarlo in qualsiasi momento nelle Impostazioni (⚙).",
  yes: "Invia",
  no: "Non inviare",
  setting: "Invia statistiche d’uso (anonime, alla chiusura)",
  hint: "Invia solo conteggi d’uso delle funzioni, minuti di apertura, versione del programma/di Windows, lingua dello schermo ed edizione installata/portatile. Traffico, indirizzi IP, porte, nomi COM, percorsi dei file e nomi di PC/utente/dispositivi non vengono mai inviati. Destinatario: Aptabase (UE).",
};
