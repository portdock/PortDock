// PortDock Net Scan — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock Net Scan: scanner IP gratis per reti industriali",
    desc: "Scanner IP gratis per reti industriali: scansione ping e ARP, produttore dal MAC, porte industriali (Modbus 502, MC, XGT, S7 …) e monitor ping a lungo termine.",
  },
  summary: "Scansiona la sottorete di una scheda di rete per trovare i dispositivi e identificali dal produttore del MAC e dalle porte industriali aperte (Modbus 502, MC, XGT, S7, EtherNet/IP, OPC UA …). I dispositivi che bloccano il ping si trovano comunque via ARP sulla stessa sottorete.",
  who: [
    "Tecnici di campo che non conoscono l’IP di un dispositivo nuovo",
    "Chi deve tenere d’occhio una rete di dispositivi durante la notte",
  ],
  features: [
    {
      title: "Scansione ping + ARP",
      body: "L’ARP sulla stessa sottorete trova i dispositivi che bloccano il ping; mostra tempo di risposta, nome, questo PC e il gateway. Non servono diritti di amministratore.",
    },
    {
      title: "Controllo delle porte industriali",
      body: "Controlla solo un elenco di porte (di default 502, 2004, 5000–5010, 102, 44818, 4840 …; modificabile, fino a 32), senza scansione generale delle porte, e chiede ai dispositivi Modbus produttore e modello (FC 2B/0E).",
    },
    {
      title: "Avvisi di esposizione (dalla 0.10.0)",
      body: "Se tra le porte già controllate ci sono Modbus 502, MC 5006/5007, EtherNet/IP 44818, S7 102, OPC UA 4840, Telnet 23 o HTTP 80, aggiunge un avviso come «Protocollo industriale aperto: chiunque sulla stessa rete può leggere e scrivere (nessuna autenticazione); verifica la separazione delle reti». Non scansiona porte aggiuntive e non modifica le impostazioni di alcun dispositivo.",
    },
    {
      title: "Rilevamento via broadcast: EtherNet/IP, BACnet (dalla 0.11.0)",
      body: "Solo quando lo premi, invia EtherNet/IP ListIdentity (UDP 44818) e BACnet Who-Is (UDP 47808) all’indirizzo di broadcast dell’adattatore selezionato e inserisce nella tabella produttore, tipo di dispositivo, nome del prodotto e revisione (più istanza del dispositivo e ID del produttore BACnet) dei dispositivi di cui non conosci l’IP. Sono richieste di sola lettura; i numeri di serie non vengono mostrati.",
    },
    {
      title: "Produttore dal MAC",
      body: "L’elenco IEEE incorporato mostra il produttore senza accesso a Internet.",
    },
    {
      title: "Monitor ping a lungo termine",
      body: "Registra in CSV perdite, latenza e interruzioni di più dispositivi e fa lampeggiare la barra delle applicazioni quando c’è una caduta.",
    },
    {
      title: "Nuovi / mancanti",
      body: "Confronta con la scansione precedente per segnare i dispositivi nuovi e quelli mancanti. Esporta in CSV.",
    },
    {
      title: "Riferimenti: confronto con la volta scorsa (dalla 0.10.0)",
      body: "Salva l’elenco dei dispositivi come riferimenti con nome (più d’uno, anche come file JSON) e confronta con uno di essi la scansione successiva: nuovi (aggiunti?), mancanti (rimossi o spenti?), MAC cambiato (un altro dispositivo con lo stesso IP, sostituito?), IP cambiato (lo stesso dispositivo con un altro IP, DHCP?) e porte aperte cambiate, con colori. CSV di confronto e copia per «AI» (ultimi 3 byte del MAC nascosti). I file di riferimento contengono indirizzi MAC: fai attenzione quando li condividi.",
    },
    {
      title: "Wake-on-LAN, apri la pagina web",
      body: "Per dispositivo: apri la sua pagina web, copia IP/MAC, invia un magic packet.",
    },
  ],
  steps: [
    "Scegli una scheda di rete: la sua sottorete diventa l’intervallo (il /24 in cui si trova, se è più ampia)",
    "«Scansiona» (F4)",
    "Controlla le colonne dei servizi e del produttore; clicca su un dispositivo per aprire la sua pagina web, copiarne l’IP, svegliarlo o «Aggiungi al monitor ping»",
  ],
  similar: "Strumenti simili sono Angry IP Scanner (open source) e Advanced IP Scanner (freeware). PortDock Net Scan aggiunge il controllo delle porte industriali (Modbus 502, MC, XGT, S7 …) e il monitor ping a lungo termine.",
};
