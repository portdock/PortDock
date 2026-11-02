// PortDock Hardware Tester — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock Hardware Tester: registro delle cadute Wi-Fi e dei ping",
    desc: "Strumento gratis per Windows che registra le cadute del Wi-Fi: ping a gateway e Internet affiancati, tempo DNS, motivi di disconnessione di Windows e Bluetooth.",
  },
  summary: "Trasforma «il mio Wi-Fi continua a cadere» in una registrazione. Mentre registra, fa ping al tuo gateway (router) e a un indirizzo Internet affiancati, disegna latenza e perdite in un unico grafico con i motivi di disconnessione Wi-Fi che Windows registra sulla stessa linea temporale, e ti dice se guardare dal lato del router o oltre. Registra anche quando i dispositivi Bluetooth si collegano e si scollegano. Sola lettura, senza diritti di amministratore; non modifica alcuna impostazione.",
  who: [
    "Chi ha cadute del Wi-Fi e vuole sapere se è colpa del router o di Internet",
    "Chi vuole una registrazione di quando auricolari o tastiere Bluetooth si scollegano",
    "Tecnici di campo che documentano il collegamento wireless del PC di un dispositivo prima di una chiamata di assistenza",
  ],
  features: [
    {
      title: "Gateway contro Internet",
      body: "Fa ping al router e a un indirizzo Internet (1.1.1.1, 8.8.8.8 o il tuo) con lo stesso ritmo e mostra affiancati perdita, media, 95° percentile e jitter. Mai più di una volta al secondo; una registrazione si ferma dopo 24 ore.",
    },
    {
      title: "Motivi di disconnessione di Windows sullo stesso grafico",
      body: "Legge il log WLAN-AutoConfig (8001 connessione, 8003 disconnessione) e lo mostra come linee sul grafico e con la formulazione del motivo di Windows nell’elenco eventi. Il nome della rete Wi-Fi non viene letto.",
    },
    {
      title: "Tempo di risposta DNS",
      body: "Ogni 5 s un nome (di default example.com) viene risolto sul server DNS senza usare la cache, misurando risposte e fallimenti.",
    },
    {
      title: "Riepilogo di dove guardare e CSV",
      body: "Indica «lato del router» quando la perdita arriva al gateway e «oltre il router» quando solo la destinazione Internet perde risposte: dove guardare, non la causa. Le registrazioni si salvano come CSV.",
    },
    {
      title: "Log delle connessioni Bluetooth",
      body: "Ogni 2 s legge lo stato «Connesso» dei dispositivi associati e registra collegamenti e cadute. I nomi sono mostrati solo a schermo; il testo salvato e copiato usa «Dispositivo N».",
    },
    {
      title: "Log di collegamento/scollegamento USB (dalla 0.10.0)",
      body: "Trova quale dispositivo USB c’è dietro un suono ripetuto di collegamento/scollegamento. Registra gli orari di inserimento e rimozione con nome del dispositivo, VID:PID, porta dell’hub e velocità, segna come «sospette cadute ripetute» un dispositivo che cade 3 o più volte in 10 minuti e come «Da guardare» un dispositivo USB 3 che funziona a velocità USB 2.0. Legge anche gli ultimi orari di arrivo e rimozione precedenti all’avvio dell’app.",
    },
    {
      title: "Modalità audio Bluetooth e toni sinistro/destro",
      body: "Mostra se l’uscita predefinita è stereo (A2DP) o vivavoce per le chiamate, e riproduce toni di prova a sinistra, a destra e su entrambi i lati.",
    },
    {
      title: "Segnale e canale Wi-Fi (su richiesta)",
      body: "Solo mentre «Mostra segnale» è attivo: intensità del segnale, velocità del collegamento, banda, canale e quante reti vicine condividono ogni canale (senza nomi). Da Windows 11 24H2 serve il permesso di posizione (il resto funziona senza).",
    },
  ],
  steps: [
    "Scegli la destinazione Internet e l’intervallo, poi «Avvia registrazione»",
    "Lascialo andare finché le cadute avvengono: latenza di router e Internet e motivi di Windows in un unico grafico",
    "Leggi dove guardare in «Riepilogo», poi «Salva CSV…» o «Copia riepilogo»",
  ],
  faq: [
    {
      q: "Misura la velocità di Internet?",
      a: "No. Registra cadute, latenza e perdite, non la velocità di download o upload. Per quello usa un sito di speed test.",
    },
    {
      q: "Risolve il problema?",
      a: "No. Si limita a leggere e non modifica alcuna impostazione. Indica dove guardare (lato del router, oltre il router, DNS, motivi di disconnessione di Windows).",
    },
    {
      q: "Che cosa invia in rete?",
      a: "Solo i ping al gateway e all’indirizzo Internet scelto e una risoluzione DNS, durante la registrazione. Le destinazioni sono sempre mostrate e, dopo che ti fermi, non viene inviato nulla.",
    },
  ],
  similar: "Strumenti simili sono PingPlotter (commerciale, con edizione gratuita) e WifiHistoryView (gratis, cronologia di connessioni e disconnessioni). PortDock Hardware Tester è gratis (GPL-3.0) e mette in un unico grafico i ping a gateway e Internet e i motivi di disconnessione di Windows, insieme a un log delle connessioni Bluetooth.",
};
