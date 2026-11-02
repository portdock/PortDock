// PortDock Modbus Slave — 소개 쪽 글. 내장 장비 수가 들어가는 글은 함수.
export default {
  seo: {
    title: "PortDock Modbus Slave: simulatore di slave Modbus gratis",
    desc: "Simulatore gratis di slave Modbus RTU/TCP per Windows: prova un PLC, un HMI o un master senza il dispositivo, con tabelle, iniezione di guasti e profili.",
  },
  summary: "Trasforma il PC in uno slave Modbus (RTU seriale, o server Modbus TCP o RTU su TCP) per provare un master (PLC, HMI, software di supervisione) senza il dispositivo reale, compresi ritardi ed errori provocati apposta.",
  who: [
    "Sviluppatori che scrivono un master Modbus",
    "Team che preparano le schermate HMI prima dell’arrivo del dispositivo",
  ],
  features: [
    {
      title: "Tre mezzi di trasporto",
      body: "Seriale (RTU), server TCP (Modbus TCP) e server TCP (RTU su TCP: un dispositivo dietro un device server seriale).",
    },
    {
      title: "Quattro tabelle",
      body: "Bobine, ingressi discreti, registri di mantenimento e registri di ingresso. Vedi una tabella come U16, S16, HEX o BIN, imposta per cella i tipi U32, S32, F32, F64 o stringa con l’ordine dei byte, e lascia che i valori cambino da soli (incremento, casuale, sinusoide …).",
    },
    {
      title: "Più indirizzi slave",
      body: "Esegui più indirizzi slave (1–247), ciascuno con i propri valori.",
    },
    {
      title: "Iniezione di guasti",
      body: "Ritardo, mancata risposta, CRC errato, lunghezza MBAP sbagliata o eccezioni forzate, mirati per indirizzo slave, funzione, indirizzo, ogni N richieste o probabilità, per provare i timeout e i nuovi tentativi del master.",
    },
    {
      title: "Ogni scrittura in evidenza",
      body: "Le celle scritte dal master lampeggiano, con log del traffico e statistiche.",
    },
    {
      title: "Profili di dispositivo, tabelle salvate",
      body: (c: { nDevices: number }) => `Carica nomi e tipi dei registri di ${c.nDevices} dispositivi inclusi (inverter, regolatori di temperatura, misuratori di potenza …) con valori d’esempio. Esporta e importa le tabelle come mappe di registri CSV (stesso formato di Modbus Master) o JSON.`,
    },
    {
      title: "Emulare con un profilo di dispositivo: valori in tempo reale (dalla 0.10.0)",
      body: "Prova SCADA, HMI o il tuo programma senza un inverter o un misuratore di potenza reali. Scrivendo il comando di marcia, la frequenza di uscita sale fino all’impostazione di frequenza (e scende se è 0), con corrente, tensione e potenza che la seguono; i misuratori di potenza fanno oscillare un poco tensione e corrente e accumulano energia. Le «regole di collegamento» modificabili (segui, proporzionale, accumula) collegano le celle. Le celle di sola lettura e di sola scrittura della mappa del dispositivo vengono rispettate (eccezione 02 o 03, a scelta), gli indirizzi non mappati restituiscono l’eccezione 02, e tutto funziona insieme all’iniezione di guasti. I valori derivano dalle tabelle del manuale, quindi il comportamento reale del dispositivo (tempi di rampa ecc.) può differire.",
    },
    {
      title: "Indirizzo di ascolto 127.0.0.1 al primo avvio (dalla 0.10.0)",
      body: "L’«Indirizzo di ascolto» del server TCP parte da 127.0.0.1 (solo questo PC). Per un master su un altro PC, scegli lì 0.0.0.0 (tutte le schede) o l’indirizzo di una scheda. Le impostazioni salvate da versioni precedenti vengono mantenute.",
    },
  ],
  steps: [
    "Scegli il trasporto (seriale o TCP) e la porta e il baud rate (o l’indirizzo e la porta); aggiungi indirizzi slave se serve",
    "Scegli una tabella, imposta inizio e quantità e inserisci i valori",
    "«Connetti» («Avvia» per TCP): le richieste del master ricevono risposta dalla tabella",
  ],
  similar: "Strumenti simili sono il Modbus Slave commerciale (Witte Software) e il ModRSsim2 open source. PortDock Modbus Slave è gratis (GPL-3.0) e senza limiti di tempo.",
};
