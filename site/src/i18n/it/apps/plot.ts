// PortDock Plot — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock Plot: plotter seriale gratis in tempo reale e CSV",
    desc: "Plotter gratis in tempo reale per numeri da seriale, TCP o UDP: nome:valore in stile Arduino, frame binari, fino a 32 canali, cursori e registrazione CSV.",
  },
  summary: "Guarda come grafico in tempo reale i numeri inviati da un Arduino, da un sensore o da un dispositivo. Legge testo separato da virgole, spazi, tabulazioni o punti e virgola, «nome:valore» in stile Arduino e frame binari, con colore e asse per canale, pausa, zoom e differenze tra due punti, e registra CSV mentre riceve.",
  who: [
    "Sviluppatori che mettono a punto il firmware osservando i valori di un sensore o di una scheda",
    "Tecnici di campo che registrano per ore l’uscita di un dispositivo per trovare anomalie",
  ],
  features: [
    {
      title: "Seriale, TCP, UDP",
      body: "Porte COM (baud rate, bit di dati, parità, bit di stop — 8N1 di default — e DTR), un client TCP che si connette al dispositivo e ricezione UDP (anche multicast). Si riconnette dopo aver scollegato e ricollegato.",
    },
    {
      title: "Testo, nome:valore, binario",
      body: "Virgola, spazio, tabulazione o punto e virgola rilevati automaticamente, valori con nome come temp:23.1 hum:40, righe di intestazione e frame con byte di inizio, u8–f64, endianness e checksum. Le righe che falliscono compaiono in rosso con il motivo.",
    },
    {
      title: "Visualizzare e misurare",
      body: "Fino a 32 canali sugli assi sinistro/destro, ultimi N punti o secondi, Y automatico/fisso, pausa (continua a ricevere), lettura con cursore, Δt e Δvalore tra due marcatori, zoom con la rotellina e trascinamento per spostare.",
    },
    {
      title: "Sorveglianza dei canali e allarmi (dalla 0.10.0)",
      body: "Imposta per canale limiti minimo/massimo, bloccato per N secondi e dati persi per N secondi: le righe scattate vengono evidenziate, con un elenco di allarmi, suono facoltativo e un log CSV degli allarmi. Un aiuto al monitoraggio, non un dispositivo di sicurezza.",
    },
    {
      title: "Sta al passo",
      body: "L’analisi gira in Rust; il disegno avviene una volta per frame su un canvas con minimo/massimo per pixel: migliaia di righe al secondo senza perdere i picchi.",
    },
    {
      title: "Registrare e salvare",
      body: "Ogni valore in CSV durante la ricezione (adatto a Excel), l’intervallo visibile come CSV, il grafico come PNG. Tabella dell’ultimo valore più minimo, massimo e media dell’intervallo visibile.",
    },
  ],
  steps: [
    "Fai stampare al dispositivo i numeri riga per riga (per esempio 23.1,40 o temp:23.1 hum:40)",
    "Scegli la sorgente (porta seriale e baud rate, TCP, UDP) e «Avvia» (F4)",
    "Clicca sul grafico per misurare; «● Registra CSV» per conservarlo",
  ],
  similar: "Strumenti simili sono il Serial Plotter dell’IDE Arduino e il SerialPlot open source. PortDock Plot accetta anche ingressi TCP e UDP e frame binari, e registra CSV mentre riceve.",
};
