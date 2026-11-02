// PortDock Simulator — 소개 쪽 글.
export default {
  seo: {
    title: "PortDock Simulator: simulatore di dispositivi seriale, TCP e UDP",
    desc: "Simulatore gratis di dispositivi a regole: «quando arriva questo, rispondi quello» via seriale, TCP e UDP. Sviluppa senza hardware e prova ritardi e perdite.",
  },
  summary: "Imita qualsiasi dispositivo con regole «quando arriva questo → rispondi quello». Sviluppa software di supervisione senza hardware e prova la gestione degli errori con ritardi, risposte scartate (ogni N o a caso) e risposte a rotazione.",
  who: [
    "Sviluppatori di software di supervisione che non hanno ancora l’hardware",
    "Team che costruiscono banchi di prova automatici",
  ],
  features: [
    {
      title: "Regole con caratteri jolly",
      body: "In HEX, ?? (qualsiasi byte) e ** (zero o più). L’ASCII corrisponde letteralmente per impostazione predefinita; attiva «Caratteri jolly» in una regola per usare ? e *. Corrispondenza esatta o contiene.",
    },
    {
      title: "Risposte su misura",
      body: "Checksum e fine riga automatici, ritardo di risposta e conteggio dei riscontri per regola.",
    },
    {
      title: "Messaggi inviati dal dispositivo",
      body: "Invia heartbeat o rapporti di stato a intervalli.",
    },
    {
      title: "Quattro mezzi di trasporto",
      body: "Seriale, server TCP, client TCP, UDP. Salva e carica le regole insieme alle impostazioni di connessione e di suddivisione in un unico file JSON.",
    },
    {
      title: "Indirizzo 127.0.0.1 al primo avvio (dalla 0.10.0)",
      body: "L’«Host» del server TCP e di UDP parte da 127.0.0.1 (solo questo PC). Per un software di supervisione su un altro PC, scegli 0.0.0.0 (tutte le schede) o l’indirizzo di una scheda. Le impostazioni salvate da versioni precedenti vengono mantenute.",
    },
  ],
  steps: [
    "Scegli un trasporto e inserisci porta o indirizzo",
    "«+ Aggiungi regola»: Quando / Rispondi",
    "«Avvia»: invia una richiesta dal tuo software di supervisione",
  ],
  uses: [
    {
      title: "Sviluppare software prima dell’arrivo dell’hardware",
      body: "Trasforma le coppie richiesta/risposta del manuale del dispositivo in regole «quando → rispondi» e collega il tuo HMI o programma di prova senza il dispositivo reale.",
    },
    {
      title: "Provare timeout e gestione degli errori",
      body: "Ritardi di risposta (con variazione), nessuna risposta ogni N volte o a caso e risposte a rotazione mostrano come se la cava il tuo software con risposte in ritardo o assenti.",
    },
    {
      title: "Fare pratica con SCPI senza strumento",
      body: "Esegui un server TCP sulla 5025 con l’esempio [SCPI *IDN? reply] e collega PortDock SCPI a 127.0.0.1. Risposte come «+1.2{rand 0..9}E+00» cambiano a ogni richiesta.",
    },
    {
      title: "Imitare heartbeat e rapporti di stato",
      body: "I «Messaggi inviati dal dispositivo» partono senza richiesta a intervalli fissi. I segnaposto {counter}, {rand} e {time} vengono riempiti a ogni invio.",
    },
  ],
  faq: [
    {
      q: "Le richieste arrivano ma non esce nessuna risposta",
      a: "Controlla che la regola sia attiva, che tipo di pattern (HEX/ASCII) ed «esatta/contiene» corrispondano, e che nessuna regola «**» sia sopra di essa. Con «Registra le richieste senza regola» attivo compare una riga «NO MATCH»; cliccaci con il tasto destro per creare una regola da essa.",
    },
    {
      q: "Le richieste arrivano spezzate o unite",
      a: "Le regole confrontano frame interi. Regola la «Suddivisione» (pausa o terminatore) e la pausa in ms. UDP non richiede suddivisione: un datagramma è un frame.",
    },
    {
      q: "Come collego un programma sullo stesso PC?",
      a: "Con TCP, avvia un server e fai collegare il programma a 127.0.0.1. Con la seriale, usa una coppia di COM virtuali (com0com o simili).",
    },
    {
      q: "La mia regola «*IDN?» risponde a richieste non correlate",
      a: "Con «Caratteri jolly» attivo, ? e * in una regola ASCII corrispondono a qualsiasi carattere. Tieni disattivati i caratteri jolly nelle regole SCPI (è l’impostazione predefinita delle regole nuove).",
    },
    {
      q: "Posso portare le regole su un altro PC?",
      a: "«Salva regole» conserva le regole insieme a trasporto, porta, indirizzo, suddivisione e messaggi inviati dal dispositivo in un unico file JSON: tienine uno per dispositivo o per prova.",
    },
  ],
};
