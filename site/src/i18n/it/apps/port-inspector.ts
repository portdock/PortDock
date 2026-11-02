// PortDock Port Inspector — 소개 쪽 글. Windows 화면 이름은 이탈리아어 Windows 표기.
export default {
  seo: {
    title: "PortDock Port Inspector: ispettore di porte COM gratis",
    desc: "Ispettore gratis di porte COM per Windows: driver USB seriale, codice di problema di Gestione dispositivi, latenza FTDI e COM fantasma. Sola lettura.",
  },
  summary: "Scegli una porta COM e vedi in un solo posto ciò che altrimenti dovresti cercare in Gestione dispositivi, nel Visualizzatore eventi e nel registro di sistema: il driver, il codice di problema e il suo significato, il chip USB, impostazioni del dispositivo come il timer di latenza FTDI, il risparmio energetico USB, la cronologia recente dei collegamenti e le prenotazioni dei numeri COM. Legge soltanto, senza diritti di amministratore, e con TX collegato a RX misura il tempo di andata e ritorno a ogni baud rate. Altre schede leggono allo stesso modo le schede di rete di questo PC, le sue impostazioni di Windows come PC di macchina, e il Wi-Fi e il Bluetooth.",
  who: [
    "Tecnici di campo il cui adattatore USB seriale non viene rilevato o ogni tanto cade",
    "Chi cerca il motivo per cui le risposte Modbus RTU sembrano in ritardo (timer di latenza FTDI)",
    "Chi deve allegare i dettagli della porta del PC a una richiesta di assistenza o a una issue",
  ],
  features: [
    {
      title: "Dispositivo, driver, codice di problema",
      body: "Nome, numero COM, posizione, ID istanza e produttore; fornitore, versione e data del driver, INF e servizio; stato e codice di problema di Gestione dispositivi con il suo significato e che cosa provare; ultimo collegamento e rimozione.",
    },
    {
      title: "Chip USB e impostazioni del dispositivo",
      body: "Nome del chip da una tabella VID/PID (FTDI, Prolific PL2303, WCH CH34x, Silicon Labs CP210x …), i valori predefiniti di Windows per la porta e i parametri del dispositivo del driver, con il timer di latenza FTDI (LatencyTimer) spiegato.",
    },
    {
      title: "Risparmio energetico e cronologia",
      body: "Sospensione selettiva USB dalle opzioni risparmio energia, «Consenti al computer di spegnere il dispositivo per risparmiare energia» per il dispositivo e i dispositivi USB a monte, ed eventi di collegamento e di driver dai registri eventi (7, 30 o 90 giorni).",
    },
    {
      title: "Prenotazioni dei numeri COM",
      body: "Numeri che Windows tiene riservati (ComDB), numeri occupati da dispositivi non collegati ora, numeri orfani e numeri occupati da più di un dispositivo: perché un adattatore nuovo finisce su COM15.",
    },
    {
      title: "Test di connessione",
      body: "Un loopback TX–RX per ogni baud rate: byte uguali, persi e alterati, andata e ritorno di 1 byte in ms (mediana e massimo) e flag di errore del driver (ClearCommError). Dice anche se un adattatore RS-485 a 2 fili rimanda l’eco.",
    },
    {
      title: "Test a due porte e schemi di prova (dalla 0.10.0)",
      body: "Con due adattatori collegati tra loro, invia nei due sensi a ogni velocità e confronta ciò che arriva (per controllare gli adattatori RS-485). Schemi: byte misti, 0x00–0xFF, 0x55/0xAA; lunghezza da 64 a 4096 byte. Schema di cablaggio in testo e un verdetto complessivo «Nessun problema trovato (in questo test) / Da guardare / Problema». Lo stesso in «Verifica connessione…» di Serial.",
    },
    {
      title: "Schede di rete di questo PC",
      body: "«Leggi schede» mostra, per ogni scheda, collegamento, velocità, duplex, IPv4 e gateway più i valori di «Avanzate» di Gestione dispositivi (jumbo frame, buffer di ricezione, moderazione degli interrupt, EEE …), risparmio energetico, errori di ricezione, profilo di rete e se il suo firewall è attivo. Lo scopo «Telecamera GigE» mostra i valori pubblicati dai produttori di telecamere con le fonti accanto.",
    },
    {
      title: "Questo PC: impostazioni di PC di macchina",
      body: "«Leggi le impostazioni di questo PC» legge avvio rapido, sospensione, sospensione selettiva USB, criterio di riavvio degli aggiornamenti, salvaschermo, sincronizzazione dell’ora e gli ultimi arresti imprevisti ed errori hardware. Con lo scopo «PC di macchina», i valori che possono causare arresti o riavvii sono segnati come «Da guardare».",
    },
    {
      title: "Questo PC: schermate blu, salute dell’SSD, origini del risveglio (dalla 0.10.0)",
      body: "La stessa scheda «Questo PC» legge i codici di arresto delle schermate blu con i loro nomi (per esempio 0x50 PAGE_FAULT_IN_NONPAGED_AREA) e gli orari degli arresti improvvisi, la temperatura dell’SSD NVMe, la percentuale usata, la riserva, le ore di accensione e gli errori del supporto, che cosa ha risvegliato il PC dalla sospensione, e la capacità della batteria di un portatile rispetto al progetto e il numero di cicli, senza diritti di amministratore. I file di dump vengono solo elencati; i numeri di serie dei dischi non vengono letti.",
    },
    {
      title: "Confronto con la volta scorsa: controlli salvati (dalla 0.10.0)",
      body: "Salva il controllo attuale (elenco delle porte COM, nome/versione/data del driver, posizione USB, impostazioni delle schede di rete, impostazioni di Questo PC, registrazioni delle schermate blu) e alla manutenzione successiva rileggi per vedere solo ciò che è cambiato: per esempio COM3 → COM7, una nuova versione del driver (Windows Update?), jumbo frame disattivati, un’impostazione di alimentazione cambiata, una nuova schermata blu. Non vengono salvati numeri di serie dei dispositivi, nome del PC né cartella utente. Conserva il risultato come testo o CSV.",
    },
    {
      title: "Wireless: Wi-Fi e Bluetooth",
      body: "La scheda «Wireless» legge l’adattatore Wi-Fi, il driver, il risparmio energetico e le registrazioni di disconnessione che Windows conserva (contate per motivo), oltre all’adattatore Bluetooth, allo stato del servizio, agli eventi di errore e a se l’audio Bluetooth è in modalità vivavoce (chiamate), senza diritti di amministratore né permesso di posizione. Non invia ping, e le esportazioni oscurano i nomi dei dispositivi.",
    },
    {
      title: "Sola lettura, risultati chiari",
      body: "Non modifica mai impostazioni né driver (la guida spiega le correzioni manuali). Ogni scheda è segnata «Nessun problema trovato (in ciò che è stato letto) / Da guardare / Problema / Lettura impossibile»; ciò che il PC non può vedere (inversione A/B, terminazione, polarizzazione, massa) viene sempre elencato; le esportazioni in testo e JSON oscurano i percorsi delle cartelle utente.",
    },
  ],
  steps: [
    "Clicca su una porta nell’elenco «Porte COM» a sinistra",
    "Leggi risultato e motivo di ogni scheda; se serve, cambia da solo ciò che occorre in Windows come spiega la guida",
    "Collega TX a RX per il «Test di connessione»; usa «Copia testo» per allegare il risultato a una domanda",
  ],
  similar: "Strumenti simili sono Gestione dispositivi di Windows, USBDeview di NirSoft (freeware), USB Device Tree Viewer di Uwe Sieber (freeware) e FT_PROG di FTDI per i chip FTDI (gratis). PortDock Port Inspector riunisce in un solo posto driver, codice di problema, risparmio energetico, cronologia dei collegamenti e prenotazioni dei numeri COM di una porta COM, e aggiunge un test di connessione con loopback.",
};
