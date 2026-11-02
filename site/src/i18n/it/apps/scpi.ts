// PortDock SCPI — 소개 쪽 글. *IDN? 등 명령 이름은 그대로.
export default {
  seo: {
    title: "PortDock SCPI: terminale SCPI gratis (LAN, RS-232, senza VISA)",
    desc: "Terminale gratis per strumenti SCPI via socket LAN (5025) o RS-232 senza VISA: *IDN?, coda errori, attese con *OPC? e misure ripetute in CSV.",
  },
  summary: "Invia comandi a strumenti SCPI come alimentatori, multimetri e oscilloscopi e leggi le risposte. Si connette via socket LAN (TCP 5025) o RS-232 senza installare VISA, identifica lo strumento con *IDN?, svuota la coda errori e registra in CSV letture numeriche ripetute.",
  who: [
    "Sviluppatori che controllano i comandi a mano prima di scrivere l’automazione dei test",
    "Tecnici di campo che hanno bisogno di dare un’occhiata rapida a uno strumento da un PC senza VISA",
  ],
  features: [
    {
      title: "Senza VISA",
      body: "Socket LAN (di solito 5025) e RS-232 (baud rate, parità, controllo di flusso) con fine riga LF, CR LF o CR. VXI-11, HiSLIP e USBTMC non sono ancora supportati.",
    },
    {
      title: "Interrogazione, scrittura, lettura",
      body: "I comandi che terminano con ? vengono interrogati, gli altri scritti. Vengono mostrati tempi di risposta, timeout e risposte senza fine riga. Cronologia dei comandi, elenco dei comandi e completamento dei comandi comuni.",
    },
    {
      title: "ID, coda errori, *OPC?",
      body: "*IDN? suddiviso in produttore, modello, numero di serie e firmware; SYST:ERR? ripetuto fino a 0 per elencare tutti gli errori in coda. Pulsanti per *RST, *CLS e per attendere con *OPC?.",
    },
    {
      title: "Misura ripetuta",
      body: "Ripeti un’interrogazione come MEAS:VOLT:DC? a intervalli per un certo numero di volte, con tabella dei valori, andamento e statistiche (min, max, media, deviazione standard), salvata come CSV.",
    },
    {
      title: "Dati a blocchi",
      body: "I blocchi IEEE 488.2 (#NXXXX…) vengono letti in base all’intestazione di lunghezza, così i byte LF dentro i dati binari non li interrompono. Anteprima HEX e salvataggio su file (per esempio schermate PNG).",
    },
  ],
  steps: [
    "LAN: IP dello strumento e porta 5025; seriale: porta e baud rate come sullo strumento",
    "«Connetti» (F4): *IDN? mostra il nome dello strumento",
    "Digita un comando e premi Invio; controlla gli errori con «Svuota coda errori»",
  ],
  uses: [
    {
      title: "Controllare i comandi prima di scrivere l’automazione",
      body: "Digita i comandi a mano e guarda risposta e tempo di risposta. I comandi che terminano con ? sono interrogazioni, gli altri sono scritture. Controlla subito gli errori con «Svuota coda errori».",
    },
    {
      title: "Raggiungere uno strumento da un PC senza VISA",
      body: "Connettiti direttamente via socket LAN (di solito porta 5025) o RS-232. *IDN? viene suddiviso in produttore, modello, numero di serie e firmware.",
    },
    {
      title: "Registrare letture ripetute in CSV",
      body: "In «Misura ripetuta», esegui un’interrogazione come MEAS:VOLT:DC? a intervalli per un certo numero di volte, guarda tabella, andamento e statistiche (min, max, media, deviazione standard) e salva come CSV.",
    },
    {
      title: "Ottenere dati a blocchi, come le schermate",
      body: "I blocchi IEEE 488.2 (#N…) vengono letti in base all’intestazione di lunghezza, così i byte LF dentro i dati binari non li interrompono. Anteprima in HEX e salvataggio su file (PNG e simili).",
    },
  ],
  faq: [
    {
      q: "Ottengo «connection refused»",
      a: "La porta è diversa (controlla la «porta socket» del manuale: non tutti gli strumenti usano la 5025) oppure l’interfaccia socket è disattivata. Alcuni strumenti rifiutano una nuova connessione mentre un altro programma (una sessione VISA) è collegato.",
    },
    {
      q: "Ottengo «no response (timeout)»",
      a: "Qualcosa che non è un’interrogazione è stato inviato come tale, il comando è scritto male (controlla la coda errori) oppure lo strumento è occupato a misurare. Aumenta l’attesa della risposta o usa *OPC?. «Reply not finished» significa che il fine riga (LF, CR LF, CR) è diverso da quello dello strumento.",
    },
    {
      q: "Che cos’è -410 Query INTERRUPTED?",
      a: "Il comando successivo è stato inviato prima di leggere la risposta. Se hai inviato un’interrogazione con «Scrivi», recupera prima la risposta con «Leggi».",
    },
    {
      q: "Supporta USBTMC, GPIB, VXI-11 o HiSLIP?",
      a: "Per ora no. VXI-11 al momento non è supportato; HiSLIP, USBTMC e GPIB richiedono VISA o driver e restano fuori ambito. La maggior parte degli strumenti LAN offre anche un socket (5025), e gli strumenti solo USB con l’opzione «COM virtuale USB» funzionano via seriale.",
    },
    {
      q: "Posso provarlo senza uno strumento?",
      a: "Esegui PortDock Simulator come server TCP sulla 5025 con suddivisione LF e l’esempio [SCPI *IDN? reply], poi connettiti a 127.0.0.1:5025.",
    },
  ],
  similar: "Anche gli strumenti dei produttori basati su VISA (NI MAX, Keysight Connection Expert …) possono inviare comandi. PortDock SCPI si connette via socket LAN o RS-232 su PC senza VISA.",
};
