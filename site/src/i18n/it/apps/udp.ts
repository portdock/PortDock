// PortDock UDP — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock UDP: invio/ricezione UDP gratis (broadcast, multicast)",
    desc: "Strumento gratis di test UDP per Windows: ricevi e invia datagrammi, broadcast e multicast, rispondi all’ultimo mittente, eco e log con orario.",
  },
  summary: "Ricevi datagrammi su una porta e rispondi a una destinazione fissa o all’ultimo mittente. Pensato per dispositivi che usano broadcast e multicast.",
  who: [
    "Chi lavora con dispositivi che trasmettono il proprio stato via UDP",
    "Team che verificano la ricezione multicast",
  ],
  features: [
    {
      title: "Elenco dei mittenti",
      body: "Raccoglie gli indirizzi dei mittenti; clicca su uno per usarlo come destinazione.",
    },
    {
      title: "Broadcast e multicast",
      body: "Consenti il broadcast, aderisci a un gruppo multicast o aderisci di nuovo, e scegli la scheda di rete.",
    },
    {
      title: "Eco",
      body: "Rimanda i dati al mittente, con protezione automatica dai cicli.",
    },
  ],
  steps: [
    "Inserisci la porta di ascolto e la destinazione",
    "«Avvia»",
    "Digita e premi «Invia»",
  ],
  uses: [
    {
      title: "Ricevere trasmissioni di stato",
      body: "Inserisci la porta di ascolto e premi «Avvia». Ogni datagramma è una riga di log, e i mittenti si raccolgono nell’elenco «Mittenti» (fino a 256).",
    },
    {
      title: "Quando non conosci l’indirizzo del dispositivo",
      body: "Inizia ad ascoltare sulla porta a cui il dispositivo invia e osserva «Mittenti». Clicca su «Usa come destinazione» accanto a un indirizzo per rispondere a quell’indirizzo.",
    },
    {
      title: "Inviare un broadcast",
      body: "Attiva «Consenti broadcast» prima di avviare, poi invia a 255.255.255.255 o a un indirizzo come 192.168.0.255. Se è disattivato, ricevi un avviso.",
    },
    {
      title: "Verificare la ricezione multicast",
      body: "Inserisci un gruppo (224–239.x.x.x) e all’avvio vi si aderisce. Con più schede di rete (rete d’ufficio e di macchina) scegli la «Scheda di rete multicast» lato macchina. Il TTL predefinito di 1 resta nella rete locale.",
    },
  ],
  faq: [
    {
      q: "Non arriva nulla",
      a: "Controlla l’IP e la porta a cui invia il dispositivo, il permesso in Windows Firewall e che siano sulla stessa sottorete. Per il multicast controlla gruppo e scheda di rete e prova «Riadesione».",
    },
    {
      q: "L’avvio fallisce con «indirizzo già in uso»",
      a: "Un altro programma occupa la porta; la riga degli eventi indica quel programma e il suo PID. Usa un’altra porta o chiudilo.",
    },
    {
      q: "Che cosa significa «ICMP port unreachable»?",
      a: "Il sistema operativo segnala che nulla è in ascolto su quella porta alla destinazione. Controlla il numero di porta e l’alimentazione del dispositivo.",
    },
    {
      q: "Quanto posso inviare in una volta?",
      a: "Un invio è un datagramma. Oltre circa 64 KB il sistema operativo lo rifiuta.",
    },
  ],
};
