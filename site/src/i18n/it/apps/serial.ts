// PortDock Serial — 소개 쪽 글(en 원문과 같은 열쇠·순서). 이름·명령·버전은 그대로.
export default {
  seo: {
    title: "PortDock Serial: terminale seriale gratis per Windows (RS-232/485)",
    desc: "Terminale seriale gratis per Windows con RS-232, RS-485 e porte COM USB: HEX/ASCII, riconnessione automatica, nove checksum, Modbus RTU e log con orario.",
  },
  summary: "Scambia dati con dispositivi RS-232, RS-485 e seriali USB e conserva un log dei test con data e ora. Se scolleghi e ricolleghi un adattatore USB, si riconnette allo stesso dispositivo.",
  who: [
    "Tecnici di campo che mettono in servizio un dispositivo nuovo",
    "Sviluppatori di firmware che provano un protocollo UART",
    "Chi deve leggere il traffico Modbus RTU",
  ],
  features: [
    {
      title: "Porte facili da riconoscere",
      body: "Mostra accanto a ogni porta il nome del dispositivo, il VID:PID USB e il numero di serie, e si aggiorna a ogni collegamento e scollegamento.",
    },
    {
      title: "Regge le disconnessioni",
      body: "Riapre lo stesso dispositivo dopo un nuovo collegamento anche se il numero COM è cambiato, e registra ogni caduta e ogni riconnessione.",
    },
    {
      title: "Quattro modalità di suddivisione",
      body: "Pausa tra i byte, terminatore, lunghezza fissa o Modbus RTU, così un messaggio corrisponde a una riga.",
    },
    {
      title: "Nove checksum e CRC personalizzato",
      body: "In invio aggiungi CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8, SUM16, CRC-32 o un CRC personalizzato, e in ricezione li verifichi.",
    },
    {
      title: "Decodifica Modbus RTU",
      body: "Decodifica richieste, risposte ed eccezioni in indirizzo, funzione e valori.",
    },
    {
      title: "Linee di segnale",
      body: "Attiva o disattiva DTR/RTS e osserva CTS/DSR/RI/CD negli indicatori e nel log.",
    },
    {
      title: "Log di test",
      body: "Marcature orarie al millisecondo, elenco di comandi, invio ripetuto e registrazione continua su file.",
    },
    {
      title: "Verifica connessione…",
      body: "Legge, senza diritti di amministratore, dispositivo, driver, codice di problema, timer di latenza FTDI e risparmio energetico USB della porta scelta, ed esegue un test di loopback o di eco RS-485 a 2 fili. Dalla 0.10.0 anche un test a due porte (due adattatori collegati tra loro), schemi di prova (0x00–0xFF, 0x55/0xAA) e uno schema di cablaggio. Non viene modificato nulla.",
    },
    {
      title: "Condivisione della porta: COM ↔ TCP (dalla 0.10.0)",
      body: "Espone la porta COM aperta come server TCP, così altri programmi, WSL2, Docker o un altro PC possono usare la stessa porta. Grezzo o RFC 2217 (cambio remoto di baud rate/parità); i dati ricevuti vanno a tutti i client e il client che invia è indicato nel log. Di default solo questo PC (127.0.0.1); altri PC solo se lo consenti. Nessun driver COM virtuale e nessun diritto di amministratore.",
    },
    {
      title: "Gateway Modbus TCP ↔ RTU (dalla 0.10.0)",
      body: "Trasforma il PC in un gateway: SCADA, un HMI o un programma del PC si connette via Modbus TCP (porta 502 di default) e le richieste arrivano ai dispositivi RS-485 come frame RTU, con le risposte che tornano in MBAP. Una richiesta alla volta; nessuna risposta, eccezione 0B; nessun percorso, 0A; statistiche di richieste, risposte e timeout e righe di log come «TCP #1 → RTU slave 3 FC03».",
    },
    {
      title: "Ascolto passivo Modbus RTU (dalla 0.10.0)",
      body: "Ascolta il traffico master–slave tramite un adattatore sul bus RS-485 senza inviare nulla. I frame vengono separati per CRC (risincronizzando quando le pause si confondono), con coppie richiesta/risposta, tempi di risposta, mancate risposte, eccezioni e statistiche. In RS-232, due porte con un cavo a Y confluiscono in un’unica linea temporale. Registra su file, anche CSV.",
    },
  ],
  steps: [
    "Scegli porta, baud rate e parità, poi «Connetti»",
    "Digita HEX o ASCII; aggiungi un checksum o un fine riga se serve",
    "«Invia»: le righe ricevute compaiono come RX ◀ e quelle inviate come TX ▶",
  ],
  similar: "Strumenti simili sono Tera Term e PuTTY (terminali open source). PortDock Serial riunisce in una sola schermata funzioni per provare i dispositivi: riconnessione USB, suddivisione dei frame, controllo dei checksum e decodifica Modbus RTU.",
};
