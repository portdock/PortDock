// PortDock PLC Simulator — 소개 쪽 글. MC 명령 이름은 이탈리아어 용어(lettura/scrittura in blocco …).
export default {
  seo: {
    title: "PortDock PLC Simulator: simulatore del protocollo MC (SLMP) gratis",
    desc: "Strumento gratis per Windows che prova i collegamenti del protocollo MC (3E/4E, binario/ASCII) senza PLC: tabelle di dispositivi (D, M, X …) e guasti.",
  },
  summary: "Il PC risponde alle richieste del protocollo MC (SLMP) come la porta Ethernet di un PLC. Metti valori nelle tabelle dei dispositivi e un HMI, un software di raccolta dati o di supervisione potrà leggerli e scriverli; ritardi e codici di fine di errore provocati apposta mettono alla prova la gestione degli errori. Segue i formati di messaggio dei manuali pubblici di Mitsubishi Electric (SLMP/MC); non è affiliato all’azienda e il comportamento può differire da quello di un PLC reale.",
  who: [
    "Team che preparano le schermate HMI e la comunicazione prima dell’arrivo del PLC",
    "Sviluppatori di software di raccolta dati o di supervisione che leggono i PLC con il protocollo MC",
  ],
  features: [
    {
      title: "3E/4E, binario/ASCII, TCP/UDP",
      body: "Ascolta come server TCP (più client) o su UDP. Le risposte 4E riportano il numero di serie della richiesta. Di default può connettersi solo questo PC (127.0.0.1); consentire altri PC è una tua scelta.",
    },
    {
      title: "Comandi implementati",
      body: "0401 lettura e 1401 scrittura (word e bit, sottocomandi 0000–0003), 0403 lettura casuale, 1402 scrittura casuale e 0619 test di loopback. Dalla 0.6.0 anche 0406/1406 lettura/scrittura di blocchi, 0801/0802 monitor, 1001–1006 RUN/STOP/PAUSE/azzeramento latch/reset remoti (solo stato simulato) e 0101 lettura del nome del modello (valori simulati). Gli altri comandi ricevono il codice di fine C059.",
    },
    {
      title: "Protocollo dedicato LS XGT (dalla 0.10.0)",
      body: "Imposta «Protocollo» su «XGT dedicato» e risponde al protocollo dedicato FEnet dei PLC XGT di LS ELECTRIC (intestazione «LSIS-XGT», di default TCP 2004 · UDP 2005): lettura h0054 e scrittura h0058, singole (%MX, %MB, %MW, %MD, %ML, fino a 16 blocchi) e continue (%MB byte, fino a 1.400 byte), dispositivi P, M, K, F, T, C, D, L, N, e risposte con codice di errore (1–6, h75–h78). Realizzato a partire dai manuali d’uso pubblici di LS ELECTRIC; non è affiliato all’azienda.",
    },
    {
      title: "Regole di condizione (dalla 0.6.0)",
      body: "Imita handshake come «quando il bit di richiesta si attiva, attiva il bit di completato 300 ms dopo»: condizione (bit ON/OFF/fronte, confronto di word, periodica) → ritardo (fisso o casuale) → azioni (scritture di bit e word). Non è un programma ladder.",
    },
    {
      title: "18 dispositivi",
      body: "X, Y, M, L, F, B, SM, D, W, R, ZR, SD, TS, TC, TN, CS, CC e CN. X, Y, B, W e ZR usano numeri esadecimali; ogni dispositivo ha una dimensione e le richieste oltre di essa ricevono C056. I dispositivi a bit si possono vedere come word da 16 punti; le celle possono essere a 32 bit, float, stringa o con nome.",
    },
    {
      title: "Iniezione di guasti",
      body: "Ritardo di risposta (con intervallo), mancata risposta o un codice di fine scelto, mirati per comando, dispositivo, ogni N richieste o probabilità.",
    },
    {
      title: "Traffico decodificato",
      body: "Ogni richiesta mostra il nome del comando, il dispositivo e i punti; ogni risposta il codice di fine e il suo significato. Le celle modificate da un client lampeggiano, con statistiche.",
    },
    {
      title: "Simulazione e stati salvati",
      body: "I valori possono cambiare da soli (incremento, casuale, sinusoide, rampa, commutazione), e i valori dei dispositivi e le impostazioni delle celle si salvano in un file JSON e si caricano da esso.",
    },
  ],
  steps: [
    "Fai corrispondere al client il frame (3E/4E), il codice dati (binario/ASCII) e la porta",
    "Scegli un dispositivo (D, M, X …) e inserisci i valori",
    "«Avvia»: le letture e le scritture del client ricevono risposta dalle tabelle",
  ],
  faq: [
    {
      q: "Si comporta esattamente come un PLC reale?",
      a: "No. Segue i formati di messaggio dei manuali pubblici e non è stato confrontato con hardware reale. Non viene eseguito alcun programma ladder, e codici di errore, tempi, limiti di connessione e intervalli di dispositivi dei singoli modelli possono differire.",
    },
    {
      q: "Come collego un HMI da un altro PC?",
      a: "Attiva «Consenti la connessione ad altri PC (0.0.0.0)» e consenti il programma in Windows Firewall. Non eseguirlo su una rete di stabilimento con lo stesso IP e la stessa porta di un PLC reale.",
    },
  ],
  similar: "Strumenti simili sono DummyPLC (gratis, codice chiuso) e HslCommunication (commerciale). PortDock PLC Simulator è gratis (GPL-3.0) e aggiunge iniezione di guasti, traffico decodificato e simulazione dei valori.",
};
