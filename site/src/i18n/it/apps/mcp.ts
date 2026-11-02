// PortDock MCP — 소개 쪽 글. (hidden)·~·xx-… 는 결과에 실제로 나오는 글이라 그대로.
export default {
  seo: {
    title: "PortDock MCP: leggi porte COM e Modbus da client di IA",
    desc: "Server MCP gratis per far leggere a Claude Desktop e ad altre IA report delle porte COM e valori Modbus, MC e SCPI. Scrive solo su simulatori 127.0.0.1.",
  },
  summary: "Un server MCP senza finestra avviato dai client di IA (Claude Desktop, VS Code, Cursor …). L’IA legge le porte COM e le schede di rete di questo PC e legge valori Modbus, del protocollo MC e SCPI dai dispositivi che indichi. Gli strumenti di scrittura accettano solo l’indirizzo di questo PC (127.0.0.1) e sono pensati per i simulatori. Dalla 0.10.0 le scritture Modbus vanno solo a una destinazione che si identifica come PortDock. Le scritture MC sono controllate solo per indirizzo, quindi se un programma su questo PC inoltra a un altro dispositivo (un relay TCP, un gateway o un tunnel), una scrittura può arrivare a un dispositivo reale.",
  who: [
    "Chi vuole che un assistente IA lo aiuti a esaminare problemi di porte COM e adattatori USB",
    "Sviluppatori che vogliono leggere valori Modbus, MC o SCPI dentro una conversazione con un’IA",
    "Chi fa pratica con l’uso di strumenti da parte di un’IA su simulatori anziché su dispositivi reali",
  ],
  features: [
    {
      title: "Nove strumenti di lettura",
      body: "Elenco delle porte COM, report di Port Inspector, ascolto seriale (non invia nulla), letture Modbus (FC 01–04), lettura in blocco MC 3E, interrogazioni SCPI, ping, schede di rete e mappe dei registri dei dispositivi.",
    },
    {
      title: "Scritture solo su simulatori 127.0.0.1",
      body: "Fai pratica con «scrivi e rileggi» usando Modbus Slave o PLC Simulator su questo PC. Qualsiasi altro indirizzo viene rifiutato prima di connettersi. Dalla 0.10.0 le scritture Modbus richiedono inoltre che la destinazione si identifichi come «PortDock» (FC 2B/0E); le scritture MC sono controllate solo per indirizzo, quindi non usarle con un programma di relay in esecuzione.",
    },
    {
      title: "Solo interrogazioni SCPI",
      body: "Invia una sola interrogazione che termina con «?»; quelle che possono cambiare lo stato, come *TST?, *CAL? e *RST, sono rifiutate. READ? e MEAS…?, che avviano una nuova misura, sono rifiutate di default e inviate solo se le consenti con allow_measure (dalla 0.8.0). Usa FETC? per leggere solo l’ultimo valore.",
    },
    {
      title: "Log di sessione e limiti di frequenza",
      body: "Ogni chiamata viene conservata su questo PC come righe JSON e non viene mai inviata all’esterno. Alla stessa destinazione al massimo una volta ogni 100 ms e 120 chiamate al minuto.",
    },
    {
      title: "Dati personali oscurati",
      body: "I percorsi delle cartelle utente nei risultati diventano «~», gli indirizzi MAC «xx-…» e i nomi di rete «(hidden)».",
    },
    {
      title: "Un solo file da installare",
      body: "Senza Python, Node né Docker: un .mcpb (si apre in Claude Desktop) o un singolo exe in uno zip.",
    },
  ],
  steps: [
    "Apri PortDock-MCP.mcpb in Claude Desktop (altri client: inserisci nelle loro impostazioni il percorso dell’exe dello zip)",
    "Chiedi all’IA qualcosa come «elenca le mie porte COM»: il client ti chiede conferma prima di ogni chiamata a uno strumento",
    "Indica indirizzo, porta e indirizzo slave per leggere un dispositivo. Fai pratica con Modbus Slave o PLC Simulator su 127.0.0.1",
  ],
  faq: [
    {
      q: "L’IA può cambiare le impostazioni di un dispositivo?",
      a: "I due strumenti di scrittura funzionano solo quando la destinazione è 127.0.0.1 o localhost (questo PC); qualsiasi altro indirizzo viene rifiutato prima di connettersi. Dalla 0.10.0 modbus_write_sim scrive solo quando la destinazione risponde all’identificazione del dispositivo (FC 2B/0E) con un nome di produttore che inizia con «PortDock», quindi non scrive su dispositivi reali dietro il gateway Modbus TCP ↔ RTU di PortDock Serial (127.0.0.1:502 di default). mc_write_sim è controllato solo per indirizzo, quindi se un programma su questo PC inoltra a un altro dispositivo (un relay TCP, un gateway del produttore, un tunnel SSH …), una scrittura può arrivare a un dispositivo reale: non usare gli strumenti di scrittura mentre un programma simile è in esecuzione.",
    },
    {
      q: "Che cosa invia in rete?",
      a: "PortDock MCP stesso parla solo con gli indirizzi e le porte dei dispositivi che indichi, e il log di sessione resta su questo PC. I risultati degli strumenti vanno al client di IA che usi, quindi da lì vale la politica di quel client.",
    },
  ],
};
