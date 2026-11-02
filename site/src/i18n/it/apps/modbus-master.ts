// PortDock Modbus Master — 소개 쪽 글. 내장 장비 수가 들어가는 글은 함수.
export default {
  seo: {
    title: "PortDock Modbus Master: strumento Modbus RTU/TCP gratis",
    desc: "Master Modbus RTU/TCP gratis (polling) per Windows: più tabelle, F32/U32, ordine dei byte, notazione 40001, scritture, scansione degli slave e log CSV.",
  },
  summary: "Chiedi dati ai dispositivi Modbus al posto di un PLC o di un HMI. Interroga più tabelle per indirizzo slave, funzione, indirizzo e intervallo, vedi F32/U32/stringhe con ordine dei byte e notazione 40001, e fai doppio clic su una cella per scrivere. Include HEX decodificato di richiesta/risposta, statistiche e registrazione dei valori in CSV.",
  who: [
    "Tecnici di campo che controllano la mappa Modbus di un azionamento o di un misuratore nuovo",
    "Sviluppatori che provano il firmware di dispositivi slave",
  ],
  features: [
    {
      title: "Più tabelle di polling",
      body: "Ogni tabella ha il proprio indirizzo slave, funzione (01–04), inizio, quantità e intervallo, con un conteggio degli errori nella sua scheda. RTU seriale, Modbus TCP e RTU su TCP.",
    },
    {
      title: "Valori tipizzati e ordine dei byte",
      body: "Da U16 a F64 e stringhe in ABCD/CDAB/BADC/DCBA, HEX/BIN e notazione 40001. Condivide con Modbus Slave il formato CSV della mappa dei registri.",
    },
    {
      title: "Scritture con anteprima",
      body: "Fai doppio clic per scrivere con 05/06/0F/10 e vedi in anteprima i byte esatti. L’opzione «sempre FC15/16» invia anche i valori singoli con 0F/10.",
    },
    {
      title: "Profili di dispositivo",
      body: (c: { nDevices: number }) => `Scegli uno dei ${c.nDevices} dispositivi inclusi (inverter, regolatori di temperatura, misuratori di potenza …) per aggiungere tabelle di polling con nomi (unità e scala), tipi, indirizzo slave e impostazioni seriali predefinite.`,
    },
    {
      title: "Scansione di indirizzi slave e di registri",
      body: "Scopri quali indirizzi slave (1–247) rispondono e quali intervalli di indirizzi sono leggibili, poi trasformali in tabelle.",
    },
    {
      title: "Trovare le impostazioni di linea (dalla 0.10.0)",
      body: "Quando baud rate, parità e indirizzo di un dispositivo sono sconosciuti, invia una breve lettura per ogni baud rate scelto (1200–115200) × parità/bit di stop × intervallo di indirizzi ed elenca le combinazioni che rispondono. Anche una risposta di eccezione significa «lì c’è un dispositivo». Con stima del tempo, pulsante di arresto e «Connetti con questa impostazione»; l’indirizzo 0 (broadcast) non viene mai usato. Non adatto a bus con un altro master.",
    },
    {
      title: "«Nessuna risposta»: cause possibili (dalla 0.10.0)",
      body: "Ordina i risultati recenti delle richieste in cause possibili e modi per verificarle: nessun byte (cablaggio, indirizzo, polarità A/B), solo la richiesta rimandata indietro (eco dell’adattatore a 2 fili), errori CRC (baud rate, parità, rumore, terminazione), frame troncati (timeout, latenza USB), che cosa significa ogni codice di eccezione, un altro indirizzo che risponde. Collegamenti a guide e all’assistente di diagnosi; copiabile come testo.",
    },
    {
      title: "Backup, confronto e ripristino delle impostazioni del dispositivo (dalla 0.10.0)",
      body: "Per la sostituzione e la manutenzione dei dispositivi. Legge più intervalli insieme (o li riempie da un profilo di dispositivo) in JSON e CSV — gli intervalli oltre 125 vengono divisi e quelli che falliscono sono elencati — e confronta con il dispositivo adesso o con un altro backup, mostrando solo le differenze. Il ripristino scrive solo le celle che scegli: anteprima (adesso e da scrivere), un secondo clic per scrivere, poi una lettura di verifica. I registri di ingresso e i registri di sola lettura del profilo sono bloccati.",
    },
    {
      title: "Timeout, nuovi tentativi, statistiche",
      body: "Imposta timeout, nuovi tentativi e ritardo; conta richieste, OK, timeout, errori CRC ed eccezioni con i tempi di risposta per tabella. Le eccezioni sono spiegate.",
    },
    {
      title: "Registro dei valori e andamenti",
      body: "Registra i valori in CSV a ogni polling o a ogni variazione e osserva le celle scelte come piccole linee di andamento.",
    },
    {
      title: "Sorveglianza dei valori e allarmi (dalla 0.10.0)",
      body: "Per cella: limiti minimo/massimo, nessuna variazione (bloccato) per N secondi e comunicazione persa per N secondi, con un margine di rientro (isteresi). Una cella scattata viene evidenziata, con un elenco di allarmi (attivato, rientrato, durata, riconoscimento), suono facoltativo, lampeggio della barra delle applicazioni e un log CSV degli allarmi. Un aiuto al monitoraggio, non un dispositivo di sicurezza.",
    },
  ],
  steps: [
    "Fai corrispondere connessione e porta (o IP) al dispositivo",
    "«Connetti» (F4), poi imposta indirizzo slave, funzione, inizio e quantità dal manuale",
    "Doppio clic su una cella per scrivere; clic destro per nome e tipo",
  ],
  similar: "Strumenti simili sono il Modbus Poll commerciale (Witte Software) e il QModMaster open source. PortDock Modbus Master è gratis (GPL-3.0) e senza limiti di tempo.",
};
