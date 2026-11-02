// PortDock TCP — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock TCP: client, server e relay TCP per i test (gratis)",
    desc: "Strumento gratis di test per socket TCP su Windows: client, server con più peer e relay (monitor), eco, riconnessione automatica e suddivisione Modbus TCP.",
  },
  summary: "Connettiti a un dispositivo Ethernet (client) o lascia che i dispositivi si colleghino al PC (server). Il server accetta più peer e può inviare a uno o a tutti; il relay si mette tra due dispositivi e registra entrambe le direzioni.",
  who: [
    "Sviluppatori di HMI, MES e software di supervisione",
    "Sviluppatori di firmware di dispositivi TCP",
  ],
  features: [
    {
      title: "Client e server",
      body: "Il server accetta fino a 64 peer; invia a uno o a tutti e scollegali singolarmente.",
    },
    {
      title: "Relay (monitoraggio)",
      body: "Si mette tra A (per esempio un HMI) e B (per esempio un PLC), lascia passare il traffico e registra entrambe le direzioni.",
    },
    {
      title: "Riconnessione automatica",
      body: "Il client si riconnette a intervalli fissi quando il collegamento cade.",
    },
    {
      title: "Eco",
      body: "Il server rimanda indietro ciò che arriva; l’eco si disattiva da solo oltre 200 al secondo per evitare cicli di eco.",
    },
    {
      title: "Suddivisione e checksum",
      body: "Dividi il flusso TCP per pausa, terminatore, lunghezza fissa o Modbus TCP (lunghezza MBAP) e verifica nove tipi di checksum o un CRC personalizzato.",
    },
    {
      title: "Indirizzo di ascolto 127.0.0.1 al primo avvio (dalla 0.10.0)",
      body: "L’«Indirizzo di ascolto» del server e l’«Indirizzo di questo PC a cui A si connette» del relay partono da 127.0.0.1 (solo questo PC). Perché si colleghi un altro PC o un HMI, scegli lì 0.0.0.0 (tutte le schede di rete) o l’indirizzo di una scheda. Le impostazioni salvate da versioni precedenti vengono mantenute.",
    },
  ],
  steps: [
    "Scegli «Client» o «Server», inserisci indirizzo e porta",
    "«Connetti» o «Ascolta»",
    "Digita e premi «Invia»",
  ],
  uses: [
    {
      title: "Dialogare con un dispositivo",
      body: "Se il dispositivo attende connessioni, usa «Client» con il suo IP e la sua porta, invia comandi e leggi le risposte in HEX o ASCII. Il client si riconnette a intervalli fissi se il collegamento cade.",
    },
    {
      title: "Quando è il dispositivo a collegarsi al PC",
      body: "Apri una porta con «Server» e possono collegarsi fino a 64 dispositivi. Invia a uno o a tutti e scollegali uno alla volta.",
    },
    {
      title: "Registrare il traffico HMI ⇄ PLC",
      body: "Con «Relay» il PC si mette tra due dispositivi; punta l’HMI a questo PC e vengono registrate entrambe le direzioni. I byte passano senza modifiche. Dalla 0.8.0 il relay può salvare un pcap e mostra coppie richiesta-risposta Modbus/MC e tempi di risposta.",
    },
    {
      title: "Leggere una volta un dispositivo Modbus TCP",
      body: "Connettiti alla porta 502 e compare una barra «Vedi come Modbus TCP». Separa richieste e risposte una per una e le decodifica nel pannello dei dettagli. Per un polling continuo è più comodo Modbus Master.",
    },
  ],
  faq: [
    {
      q: "Il client non riesce a connettersi (CONNECT FAIL)",
      a: "Controlla l’alimentazione e il cavo del dispositivo, l’IP e la porta, e che PC e dispositivo siano sulla stessa sottorete (per esempio 192.168.0.x).",
    },
    {
      q: "Ho avviato il server ma il dispositivo non riesce a collegarsi",
      a: "Assicurati di averlo consentito nell’avviso di Windows Firewall e che il dispositivo si colleghi all’IP di questo PC. Un errore di «già in uso» significa che un altro programma occupa la porta.",
    },
    {
      q: "I dati appaiono uniti o spezzati",
      a: "TCP non conserva i confini dei messaggi. Cambia la suddivisione in «Impostazioni di ricezione» su terminatore, lunghezza fissa o Modbus TCP (lunghezza MBAP), oppure regola la pausa.",
    },
    {
      q: "Il relay modifica il traffico?",
      a: "No. I byte vengono inoltrati come arrivano; suddivisione e controllo dei checksum servono solo per il log, e risposta automatica ed eco sono disattivati. Ai dispositivi arriva solo ciò che inietti tu, quindi fai attenzione.",
    },
  ],
  similar: "Uno strumento simile è Hercules SETUP utility (HW-group, freeware).",
};
