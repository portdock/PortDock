// 고장 원인 찾기 도우미의 질문 나무 글(이탈리아어) — 나무 모양(id·다음 노드·링크)은 data/troubleshoot.ts 하나를 함께 쓰고, 여기는 노드 id 로 찾는 글만.
// 질문: q·hint(나무에 힌트가 있을 때만)·opts(예/아니오가 아닌 답만, 답 순서대로). 결과: title·causes·checks(나무와 같은 수·순서).
// 빠진 id·수가 다른 줄은 lib/troubleshoot.ts 의 checkText() 가 잡는다(i18n.test.ts). 문구는 «cause possibili» — 확정하지 않는다.
import type { TreeText } from "../../lib/troubleshoot.ts";

export default {
  yes: "Sì",
  no: "No",
  symptoms: {
    rs485: "RS-485 / Modbus RTU: nessuna risposta o risposte corrotte",
    rs232: "L'RS-232 non comunica",
    tcp: "Un dispositivo Modbus TCP / Ethernet non si connette",
    usb: "Adattatore USB-seriale non rilevato o che si disconnette",
    ma: "La lettura 4–20 mA sembra sbagliata",
    sensor: "L'ingresso di un sensore NPN/PNP non viene visto",
    mc: "Il protocollo MC (Mitsubishi) non si connette",
    pcusb: "Un dispositivo USB del PC continua a disconnettersi",
  },
  nodes: {
    // ① RS-485 · Modbus RTU
    "rs485-any": { q: "Non arriva nessuna risposta?", hint: "«No» = le risposte arrivano a volte, oppure arrivano con byte corrotti" },
    "rs485-txled": { q: "Il LED TX dell'adattatore lampeggia quando si invia una richiesta?", hint: "Niente LED? Verificate invece che i byte inviati compaiano nel log di PortDock Serial" },
    "rs485-settings": { q: "Avete confrontato uno per uno baud rate, parità, bit di stop e indirizzo slave con la schermata di impostazione del dispositivo (o il manuale)?" },
    "rs485-swap": { q: "Se scambiate i fili A e B (D+/D−), arriva una risposta?", hint: "Scambiarli non danneggia i dispositivi" },
    "rs485-single": { q: "Con un solo dispositivo collegato direttamente all'adattatore con un cavo corto, risponde?" },
    "rs485-garbled": { q: "I byte ricevuti sembrano corrotti (errori CRC, caratteri strani)?", hint: "«No» = i byte sembrano corretti ma a volte mancano risposte (timeout)" },
    "rs485-slower": { q: "Abbassando il baud rate o accorciando il cavo la corruzione diminuisce?" },
    "rs485-timeout": { q: "Un timeout di risposta più lungo (es. 1000 ms) riduce le risposte mancanti?" },
    "r-rs485-port": {
      title: "La richiesta non esce mai dal PC — lato porta o driver",
      causes: [
        "È aperto il numero COM sbagliato (cambia quando l'adattatore passa a un'altra porta USB)",
        "Un altro programma (SCADA, un terminale aperto prima) tiene ancora occupata la porta",
        "Problema del driver (simbolo di avviso o codice di problema in Gestione dispositivi)",
        "L'adattatore non commuta automaticamente la direzione per l'RS-485 a 2 fili",
      ],
      checks: [
        "Trovate il numero COM dell'adattatore sotto «Porte (COM e LPT)» in Gestione dispositivi e allineate l'impostazione del programma",
        "Leggete driver e codice di problema della porta in Port Inspector, ed eseguite il test di eco RS-485 a 2 fili per vedere se viene trasmesso qualcosa",
        "Con un multimetro (V⎓) tra A e B, inviando richieste in continuazione la lettura deve saltare — se resta ferma, non viene trasmesso nulla",
      ],
    },
    "r-rs485-settings": {
      title: "Le impostazioni di comunicazione probabilmente differiscono",
      causes: [
        "Baud rate o parità diversi (es. dispositivo 8E1, programma 8N1)",
        "Indirizzo slave diverso, oppure si usa 0 (broadcast) — al broadcast non arriva risposta",
        "Il protocollo del dispositivo non è Modbus RTU (protocollo proprietario o ASCII), oppure le impostazioni sono state cambiate senza salvare e riavviare",
      ],
      checks: [
        "Annotate i parametri di comunicazione dalla schermata del dispositivo e confrontateli riga per riga con il programma",
        "Per gli inverter controllate anche i parametri «sorgente del comando di marcia» e «selezione protocollo»",
        "Se il baud rate non è noto, scansionate con Modbus Master — scansione degli indirizzi slave, e baud/parità con «ricerca impostazioni di linea» (dalla 0.10.0)",
      ],
    },
    "r-rs485-polarity": {
      title: "L'etichettatura A/B (+/−) era invertita",
      causes: ["I produttori non concordano su quale tra A/B sia il + (la specifica Modbus dice D1 = B = +, D0 = A = −)", "Solo alcuni dispositivi potrebbero essere invertiti — se altri smettono di rispondere dopo lo scambio, controllate le loro etichette"],
      checks: ["Dispositivi alimentati, polling fermo: rosso su B (D1·+), nero su A (D0·−) deve leggere +200 mV o più se c'è polarizzazione", "Annotate lo scambio sullo schema di cablaggio così nessuno lo rimette com'era"],
    },
    "r-rs485-bus": {
      title: "Un dispositivo da solo funziona ma non sul bus — cablaggio o topologia del bus",
      causes: [
        "Tre o più terminazioni (selettore attivo su un dispositivo intermedio), oppure nessuna",
        "Due dispositivi condividono un indirizzo slave e rispondono insieme, corrompendosi a vicenda",
        "Derivazioni lunghe o cablaggio a stella, oppure un'interruzione su un morsetto intermedio",
        "Manca il filo SG (comune), spingendo i dispositivi lontani fuori dal campo di modo comune",
      ],
      checks: [
        "Tutto spento, resistenza A–B: circa 60 Ω (entrambe le estremità), circa 120 Ω (una estremità), da centinaia di Ω a diversi kΩ o più (nessuna — molti dispositivi o resistenze di polarizzazione visibili la abbassano verso 1 kΩ), 40 Ω o meno (troppe). La terminazione RC (1 nF + 120 Ω) è invisibile in continua e si legge come «nessuna»",
        "Dispositivi alimentati: A–SG e B–SG entro −7…+12 V",
        "Ricollegate i dispositivi uno alla volta per vedere dove fallisce; elencate tutti gli indirizzi slave",
      ],
    },
    "r-rs485-device": {
      title: "Non funziona nemmeno con un solo dispositivo — impostazioni del dispositivo, porta di comunicazione o adattatore",
      causes: [
        "Impostazioni del dispositivo non salvate, o applicate solo dopo un riavvio",
        "La comunicazione passa da una scheda opzionale o morsetti separati, oppure c'è un'impostazione di modalità 2 fili/4 fili",
        "Adattatore guasto, oppure collegato ai morsetti RS-422/RS-232 invece che RS-485",
      ],
      checks: [
        "Provate l'adattatore da solo con il test di eco RS-485 a 2 fili di Port Inspector",
        "Provate lo stesso dispositivo con un altro adattatore o un altro PC",
        "Cercate nel manuale del dispositivo i numeri dei morsetti di comunicazione e quando le nuove impostazioni diventano effettive",
      ],
    },
    "r-rs485-signal": {
      title: "Qualità del segnale — riflessioni, rumore, lunghezza",
      causes: [
        "Nessuna terminazione o solo a un'estremità — riflessioni su linee lunghe e veloci",
        "Cavo troppo lungo per il baud rate (circa baud × metri ≤ 10^8)",
        "Cavo non a doppino intrecciato, posato accanto a cavi di potenza, o schermo non a terra",
      ],
      checks: [
        "A dispositivi spenti: A–B circa 60 Ω",
        "Modo comune A–SG e B–SG entro −7…+12 V, anche con i motori in funzione",
        "Verificate il limite di lunghezza per questo baud rate nel calcolatore RS-485",
      ],
    },
    "r-rs485-framing": {
      title: "Frame disallineati — impostazioni, eco o suddivisione",
      causes: [
        "Baud rate o parità leggermente diversi (alcuni byte possono comunque sembrare giusti)",
        "Un adattatore a 2 fili restituisce l'eco della richiesta, che compare davanti alla risposta",
        "La latenza USB divide una risposta in due e il ricevitore le analizza separatamente",
      ],
      checks: ["Incollate i byte ricevuti nel decodificatore di frame Modbus e verificate ID, funzione e CRC", "Controllate l'eco dell'adattatore e il latency timer FTDI in Port Inspector"],
    },
    "r-rs485-timing": {
      title: "Tempi troppo stretti — timeout, intervallo di polling, latenza USB",
      causes: [
        "Timeout più breve del tempo di risposta del dispositivo (inverter e contatori possono impiegare da decine a centinaia di ms)",
        "Richiesta successiva inviata troppo presto, sovrapposta alla risposta precedente",
        "Il latency timer dell'adattatore USB (16 ms di default su FTDI) si aggiunge a ogni frame breve",
      ],
      checks: ["Calcolate tempi di richiesta/risposta e timeout minimo con il calcolatore dei tempi di trasmissione seriale", "Leggete il valore del latency timer con Port Inspector"],
    },
    "r-rs485-idle": {
      title: "Linea flottante a riposo, o risposte che collidono — polarizzazione o indirizzi",
      causes: [
        "Mancano le resistenze di polarizzazione (failsafe), quindi il rumore a riposo viene letto come byte",
        "Due dispositivi con lo stesso indirizzo a volte collidono",
        "Rumore solo quando girano motori o inverter (schermo, massa)",
      ],
      checks: [
        "Dispositivi alimentati, polling fermo: differenziale B–A di +200 mV o più",
        "Riportate tutti i dispositivi e gli indirizzi su uno schema di sistema per individuare i duplicati",
        "Confrontate quando mancano le risposte con quando girano i motori",
      ],
    },

    // ② RS-232
    "rs232-seen": { q: "La porta COM compare in Gestione dispositivi del PC?", hint: "Per un adattatore USB-RS232, «No» prosegue con il ramo sul rilevamento dell'adattatore" },
    "rs232-loop": { q: "Con i pin 2 (RXD) e 3 (TXD) del DB9 lato PC collegati tra loro (loopback), i caratteri inviati tornano indietro?" },
    "rs232-cross": {
      q: "Il TX del dispositivo è collegato all'RX del PC (pin 2) e il TX del PC (pin 3) all'RX del dispositivo — incrociati?",
      hint: "Non siete sicuri? Scegliete «No» per vedere come verificarlo",
    },
    "rs232-flow": { q: "Il controllo di flusso è impostato su «Nessuno» sia nel programma sia nel dispositivo?" },
    "r-rs232-pc": {
      title: "Bloccato alla porta del PC o all'adattatore",
      causes: ["Un altro programma tiene la porta, oppure è aperto il numero COM sbagliato", "Adattatore o porta guasti, problema del driver", "Collegati i pin sbagliati (il loopback è tra i pin 2 e 3)"],
      checks: [
        "A riposo, pin 3 (TXD) verso pin 5 (GND) legge −5…−15 V (−3…−5 V è debole — da controllare)",
        "Eseguite il test di loopback di Port Inspector e verificate che i byte tornino a ogni baud rate",
      ],
    },
    "r-rs232-cross": {
      title: "TX forse collegato a TX — cavo incrociato o diritto",
      causes: [
        "PC e dispositivo sono entrambi DTE ma si usa un cavo diritto (TX–TX) — serve un cavo null modem (incrociato)",
        "Oppure il dispositivo è DCE e si usa un cavo incrociato",
      ],
      checks: [
        "Su ogni connettore, il pin che a riposo mostra −5…−15 V (−3…−5 V se debole) è il TX di quel lato — se i due TX sono sullo stesso filo, si scontrano",
        "Con la prova di continuità sul cavo verificate se 2↔3 sono incrociati",
      ],
    },
    "r-rs232-flow": {
      title: "Controllo di flusso non corrispondente",
      causes: [
        "Il controllo di flusso hardware (RTS/CTS) è attivo ma CTS non è collegato, quindi il PC aspetta all'infinito",
        "Il dispositivo richiede DTR/DSR attivi ma si usa solo un cavo a 3 fili",
      ],
      checks: [
        "Impostate il controllo di flusso su «Nessuno» nel programma e riprovate",
        "Se il dispositivo richiede l'handshake, collegate RTS–CTS (7–8) e DTR–DSR–DCD (4–6–1) dentro il connettore, oppure usate un cavo con handshake completo",
      ],
    },
    "r-rs232-settings": {
      title: "Il cablaggio sembra corretto — impostazioni, formato dei comandi o livello del segnale",
      causes: [
        "Baud rate, bit di dati, parità o bit di stop diversi",
        "Terminatore di riga (CR, LF, CR LF) o checksum diversi da quanto si aspetta il dispositivo",
        "La porta del dispositivo è una UART TTL (3,3/5 V), non RS-232",
      ],
      checks: [
        "Se il TX del dispositivo a riposo è a +3,3 o +5 V è TTL — non collegatelo direttamente a una porta RS-232",
        "Inviate e ricevete in HEX e confrontate byte per byte terminatori di riga e checksum",
      ],
    },

    // ③ Modbus TCP · 이더넷
    "tcp-ping": { q: "Il dispositivo risponde al ping dal PC?" },
    "tcp-subnet": { q: "Gli IP del PC e del dispositivo sono nella stessa subnet? (es. 192.168.0.10/24 e 192.168.0.50)" },
    "tcp-link": { q: "I LED di link sono accesi sulle porte LAN del PC e del dispositivo (o dello switch)?" },
    "tcp-502": {
      q: "Riuscite ad aprire una connessione TCP sulla porta 502 (o su quella del manuale)?",
      hint: "Provate a connettervi con PortDock TCP, oppure con PowerShell Test-NetConnection <IP> -Port 502",
    },
    "tcp-reply": { q: "Una volta connessi, una richiesta riceve risposta?" },
    "tcp-exception": { q: "La risposta è un'eccezione (codice funzione + 0x80, es. 83 02)?", hint: "«No» = le risposte arrivano ma i valori sembrano sbagliati" },
    "r-tcp-subnet": {
      title: "Subnet IP diverse",
      causes: ["Le parti di rete differiscono, quindi non si raggiungono senza un gateway", "L'IP del dispositivo è sconosciuto (default di fabbrica o DHCP)"],
      checks: [
        "Inserite entrambi gli IP e le maschere nel calcolatore di subnet per vedere se condividono la subnet",
        "Aggiungete alla scheda di rete del PC un secondo IP nella subnet del dispositivo (es. 192.168.0.200/24)",
        "Se l'IP è sconosciuto, trovatelo con Net Scan",
      ],
    },
    "r-tcp-link": {
      title: "Nessun collegamento fisico — cavo, porta o switch",
      causes: ["Cavo o connettore rotto, oppure collegato a un'altra porta", "Switch spento o porta disattivata, oppure porta LAN del dispositivo disabilitata"],
      checks: ["Cambiate cavo e porta dello switch", "Leggete link, velocità e duplex con «Read adapters» di Port Inspector"],
    },
    "r-tcp-noping": {
      title: "Il link è attivo ma il ping no",
      causes: [
        "Il dispositivo è impostato per non rispondere al ping (ICMP) — provate direttamente la connessione alla 502",
        "Due dispositivi hanno lo stesso IP (conflitto di indirizzi)",
        "Un'altra scheda di rete del PC (es. Wi-Fi) è nella stessa subnet e il traffico esce da lì; firewall",
      ],
      checks: [
        "Scollegate il dispositivo e fate un ping — se arriva una risposta, un altro dispositivo ha quell'IP",
        "Scansionate la subnet con Net Scan per IP e MAC; cercate IP duplicati su uno schema di sistema",
        "Disattivate temporaneamente le altre schede di rete e riprovate",
      ],
    },
    "r-tcp-port": {
      title: "Il ping funziona ma la porta 502 rifiuta",
      causes: [
        "Modbus TCP è disattivato sul dispositivo o è un'opzione (scheda o licenza a parte)",
        "La porta non è la 502",
        "Il limite di connessioni è pieno (SCADA o HMI già connessi)",
      ],
      checks: ["Verificate nel manuale l'impostazione Modbus TCP, la porta e il numero massimo di connessioni", "Disconnettete per un momento gli altri client e riconnettetevi"],
    },
    "r-tcp-unitid": {
      title: "Connessi ma nessuna risposta — Unit ID o gateway",
      causes: [
        "Unit ID errato — dietro un gateway deve essere uguale all'indirizzo slave RTU; per dispositivi diretti usate il valore del manuale (1 o 255 sono comuni)",
        "Il lato RTU del gateway (baud rate, cablaggio) non funziona — scarta la richiesta o restituisce l'eccezione 0B",
        "Un codice funzione che il dispositivo non supporta",
      ],
      checks: [
        "Decodificate i byte scambiati nel decodificatore di frame Modbus per vedere MBAP e Unit ID",
        "Catturate con Wireshark o pktmon e controllate risposte e tempi con l'analizzatore pcap",
      ],
    },
    "r-tcp-exception": {
      title: "Il dispositivo risponde con un'eccezione — indirizzo, funzione o quantità",
      causes: [
        "Eccezione 02: indirizzo inesistente — notazione 40001 non convertita in indirizzo a base 0 (sfasato di uno)",
        "Eccezione 01: funzione non supportata (es. lettura di input register con la 03)",
        "Eccezione 03: quantità oltre 125 o oltre il limite del dispositivo",
      ],
      checks: ["Incollate la risposta nel decodificatore di frame Modbus per il significato dell'eccezione", "Verificate se la mappa dei registri usa indirizzi a base 0 o a base 1"],
    },
    "r-tcp-values": {
      title: "La comunicazione funziona ma i valori sembrano sbagliati — formato, ordine o scala",
      causes: [
        "L'ordine delle parole dei valori a 32 bit (float, int32) è diverso (ABCD, CDAB …)",
        "Scala (×0,1, ×0,01), segno (int16/uint16) o rapporto del TA non applicati",
        "Indirizzo sfasato di uno (base 0 o base 1)",
      ],
      checks: ["Mettete i due registri nel convertitore float Modbus e confrontate i quattro ordini", "Confrontate con segno e senza segno nel convertitore di interi"],
    },

    // ④ USB-시리얼 변환기
    "usb-sound": { q: "Quando collegate l'adattatore, Windows emette il suono di connessione o Gestione dispositivi cambia?" },
    "usb-com": { q: "Compare sotto «Porte (COM e LPT)» con un numero COM?", hint: "«No» = compare sotto «Altri dispositivi», con un simbolo di avviso o come sconosciuto" },
    "usb-drops": { q: "Si disconnette durante l'uso (la porta scompare e ricompare)?" },
    "usb-motor": { q: "Si disconnette quando grandi carichi come motori, inverter o saldatrici si avviano o sono in funzione?" },
    "usb-comnum": {
      q: "Il numero COM cambia a ogni collegamento, o sale molto, tipo COM15?",
      hint: "«No» = rilevato e connesso, ma la comunicazione è lenta o le risposte arrivano spezzate",
    },
    "r-usb-none": {
      title: "Non visto affatto come dispositivo USB — cavo, porta o adattatore",
      causes: ["Un cavo USB di sola ricarica (senza fili dati)", "Problema di collegamento o alimentazione della porta frontale o dell'hub", "Adattatore guasto"],
      checks: [
        "Collegate direttamente a una porta posteriore senza hub, con un altro cavo",
        "Verificate se un altro PC si comporta allo stesso modo",
        "Controllate se il collegamento compare nel log di connessioni/disconnessioni USB di Hardware Tester (dalla 0.10.0)",
      ],
    },
    "r-usb-driver": {
      title: "Driver mancante o il dispositivo non si avvia",
      causes: ["Nessun driver installato per il chip (FTDI, CH34x, CP210x, PL2303)", "Il driver rifiuta il chip (codice 10 ecc.) — frequente con i vecchi PL2303"],
      checks: [
        "Leggete VID:PID, nome del chip e codice di problema con il suo significato in Port Inspector",
        "Usate il driver dal sito del produttore del chip (chiedete all'IT se servono diritti di amministratore)",
      ],
    },
    "r-usb-emi": {
      title: "Rumore o differenza di massa che entra nell'USB",
      causes: ["Con un adattatore non isolato, la differenza di potenziale tra la massa del dispositivo e quella del PC resetta l'USB", "Il cavo di comunicazione o USB corre accanto a cavi di potenza"],
      checks: [
        "Tensione tra lo schermo USB del PC e SG/PE del dispositivo (V⎓ e V~): sotto 1 V è normale; 7 V o più è un problema",
        "Provate un adattatore isolato, un cavo USB più corto o ferriti",
        "Confrontate gli orari delle disconnessioni USB in Hardware Tester con quelli di funzionamento dei motori (dalla 0.10.0)",
      ],
    },
    "r-usb-power": {
      title: "Risparmio energetico, alimentazione o contatto",
      causes: ["Sospensione selettiva USB, oppure «Consenti al computer di spegnere il dispositivo per risparmiare energia»", "Un hub alimentato dal bus che resta senza potenza, o un connettore allentato"],
      checks: [
        "Leggete le impostazioni di risparmio energetico e la cronologia recente dei collegamenti con Port Inspector (sola lettura — modificatele voi in Windows)",
        "Verificate se muovendo il cavo si provoca una disconnessione",
      ],
    },
    "r-usb-comnum": {
      title: "Il numero COM cambia — posizione della porta, numero di serie, prenotazioni",
      causes: ["I chip senza numero di serie (CH34x ecc.) ricevono un nuovo numero su ogni porta USB", "I dispositivi collegati in passato mantengono numeri prenotati (ComDB)"],
      checks: ["Usate sempre la stessa porta USB", "Guardate le prenotazioni dei numeri COM in Port Inspector", "PortDock Serial riapre lo stesso dispositivo anche se il numero cambia"],
    },
    "r-usb-latency": {
      title: "Connesso ma lento o risposte spezzate — latenza USB",
      causes: [
        "Il latency timer FTDI (16 ms di default) aggiunge ritardo a ogni frame breve",
        "Il programma tratta ogni frammento come una risposta separata",
        "Se non c'è alcuna comunicazione, proseguite con il ramo RS-485 o RS-232",
      ],
      checks: ["Controllate latency timer e tempo di andata e ritorno in loopback in Port Inspector", "Confrontate con il tempo di risposta atteso dal calcolatore dei tempi di trasmissione seriale"],
    },

    // ⑤ 4–20 mA
    "ma-kind": { q: "In che modo il valore sembra sbagliato?", opts: ["Fermo a 0 (o al minimo)", "Fermo al massimo", "Oscilla o salta", "Si muove, ma non corrisponde alla realtà"] },
    "ma-flow": { q: "Con un multimetro (mA) in serie nel loop, scorrono più di 3,6 mA?" },
    "ma-volt": { q: "C'è tensione (di solito 10 V o più) tra i morsetti + e − del trasmettitore?" },
    "ma-high": { q: "La corrente misurata è di 21 mA o più?" },
    "ma-motor": { q: "L'oscillazione aumenta quando girano motori o inverter?" },
    "ma-loopv": { q: "Vicino a 20 mA, la tensione ai morsetti del trasmettitore resta sopra la tensione minima di funzionamento del suo manuale?" },
    "r-ma-open": {
      title: "Né corrente né tensione nel loop — circuito aperto o alimentazione",
      causes: [
        "Filo interrotto, morsetto allentato o fusibile",
        "Alimentazione del loop (24 V) spenta o collegata altrove",
        "Un trasmettitore a 4 fili (alimentazione separata) cablato come un 2 fili, quindi non alimentato",
      ],
      checks: ["Misurate i 24 V all'alimentatore, poi al trasmettitore, per trovare dove spariscono", "Confrontate il cablaggio reale con gli schemi a 2/3/4 fili"],
    },
    "r-ma-tx": {
      title: "Tensione presente ma nessuna corrente — trasmettitore o polarità",
      causes: ["Polarità invertita nel 2 fili (+ e − scambiati)", "L'ingresso di ricezione è impostato in tensione, aprendo di fatto il loop", "Trasmettitore guasto"],
      checks: ["Ricontrollate + e − del trasmettitore sul disegno del manuale", "Verificate l'impostazione o il ponticello del tipo di canale (corrente/tensione) della scheda di ingresso"],
    },
    "r-ma-input": {
      title: "La corrente scorre ma il valore è 0 — impostazione o scala lato ricezione",
      causes: [
        "Campo d'ingresso impostato diversamente (0–20 mA, 1–5 V, 0–10 V)",
        "State guardando un altro canale, oppure la scalatura è a 0",
        "A 3,6 mA o meno il trasmettitore segnala un guasto NE 43 (3,6–3,8 mA è sotto scala, non un segnale di guasto)",
      ],
      checks: ["Inserite i mA misurati nel controllo delle letture del multimetro per la % e la zona NE 43", "Confrontate con i conteggi attesi (es. 0–27648) nel calcolatore 4–20 mA"],
    },
    "r-ma-fault-high": {
      title: "21 mA o più — segnale di guasto o cortocircuito",
      causes: ["Il trasmettitore emette il segnale di guasto alto NE 43 (es. sensore interrotto)", "Ben sopra 25 mA: l'alimentazione scavalca il trasmettitore (cortocircuito)"],
      checks: ["Controllate il display o la diagnostica del trasmettitore", "Misurate la resistenza del sensore (es. Pt100) per un circuito aperto"],
    },
    "r-ma-over": {
      title: "Fermo al massimo — impostazione del campo o valore reale",
      causes: [
        "Campo di scalatura del PLC più stretto di quello del trasmettitore",
        "Il valore di processo supera il campo del trasmettitore (es. 0–10 bar)",
        "Confusione di unità (bar, psi, kPa)",
      ],
      checks: ["Calcolate la % dai mA misurati e confrontatela con il valore del PLC", "Verificate il campo sulla targhetta o nelle impostazioni del trasmettitore"],
    },
    "r-ma-noise": {
      title: "Rumore — schermo, massa o percorso del cavo",
      causes: [
        "Il cavo di segnale condivide la canalina con cavi di potenza",
        "Schermo a terra da entrambi i lati, che forma un anello di massa (di solito un solo lato)",
        "Differenza di potenziale di massa tra trasmettitore e PLC",
      ],
      checks: [
        "Misurate la tensione tra le due masse (sotto 1 V è normale)",
        "Annotate l'oscillazione in mA; valutate un isolatore di segnale",
        "Riducete l'oscillazione con la costante di tempo del filtro d'ingresso (filtro RC)",
      ],
    },
    "r-ma-loadv": {
      title: "Tensione del loop troppo bassa — resistenza di carico o caduta dell'alimentazione",
      causes: ["Troppi ricevitori, indicatori o barriere nel loop", "Cablaggio lungo o sottile, caduta dell'alimentazione 24 V"],
      checks: [
        "Usate il calcolatore del carico del loop per la tensione del trasmettitore a 20 mA (o 21 mA)",
        "Misurate l'alimentazione 24 V sotto carico (una caduta del 5 % o meno lascia margine)",
      ],
    },
    "r-ma-process": {
      title: "Cablaggio e tensione sembrano a posto — variazione reale del processo o smorzamento",
      causes: ["Il valore di processo oscilla davvero (pulsazioni della pompa ecc.)", "Smorzamento del trasmettitore o filtro d'ingresso del PLC troppo brevi"],
      checks: ["Registrate il valore su un grafico nel tempo e cercate andamenti periodici", "Controllate l'impostazione di smorzamento del trasmettitore"],
    },
    "r-ma-scale": {
      title: "Il valore non corrisponde alla realtà — scalatura, unità o conteggi",
      causes: [
        "Campo ingegneristico (basso/alto) diverso dall'impostazione del trasmettitore",
        "Campo di conteggi del PLC sbagliato (0–27648, 0–4000, 0–32000)",
        "Confusione di unità (bar/psi, relativa/assoluta)",
      ],
      checks: [
        "Inserite i mA misurati nel calcolatore 4–20 mA e confrontate con valore e conteggi attesi",
        "Verificate che il valore del PLC sia proporzionale a 4, 12 e 20 mA",
      ],
    },

    // ⑥ NPN/PNP 센서
    "sn-kind": { q: "Qual è il sintomo?", opts: ["L'ingresso non si attiva mai", "L'ingresso non si disattiva mai (sempre attivo)"] },
    "sn-led": { q: "Il LED indicatore del sensore stesso si accende quando c'è un oggetto?" },
    "sn-power": { q: "La tensione tra il marrone (+) e il blu (0 V) del sensore è vicina all'alimentazione (di solito 24 V)?" },
    "sn-type": {
      q: "Tipo di sensore e COM degli ingressi del PLC corrispondono — COM a +24 V per NPN, a 0 V per PNP?",
      hint: "Non siete sicuri? Scegliete «No»",
    },
    "sn-vin": { q: "Con il sensore attivo, ci sono 15 V o più tra il morsetto d'ingresso del PLC e il COM degli ingressi?" },
    "sn-plcled": { q: "In quel momento si accende il LED dell'ingresso del PLC?" },
    "r-sn-power": {
      title: "Il sensore non è alimentato",
      causes: [
        "Filo di alimentazione interrotto, contatto del connettore o fusibile",
        "Colori dei fili diversi dalla convenzione (marrone +, blu 0 V, nero uscita)",
        "Caduta di tensione fino a un sensore lontano",
      ],
      checks: [
        "Misurate la tensione di alimentazione al sensore con i carichi inseriti — una caduta oltre il 15 % è un problema",
        "Verificate colori dei fili e campo di alimentazione nel datasheet del sensore",
      ],
    },
    "r-sn-sense": {
      title: "Alimentato ma non rileva — impostazione del sensore o oggetto",
      causes: [
        "Distanza di rilevamento o sensibilità, materiale dell'oggetto (la portata di un sensore di prossimità dipende dal tipo di metallo)",
        "Fotocellula disallineata o lente sporca",
        "Sensore guasto",
      ],
      checks: ["Avvicinate l'oggetto per vedere a quale distanza si accende il LED", "Sostituite con un sensore dello stesso tipo"],
    },
    "r-sn-mismatch": {
      title: "NPN/PNP e polarità del COM degli ingressi potrebbero non corrispondere",
      causes: ["Sensore NPN con il COM degli ingressi a 0 V (o PNP con +24 V) — la corrente non ha un percorso", "I produttori usano «sink/source» in senso opposto"],
      checks: [
        "Con il sensore attivo, nero–blu legge vicino a 0 V per NPN, vicino all'alimentazione per PNP",
        "Verificate nello schema di cablaggio degli ingressi del manuale del PLC dove va il COM",
      ],
    },
    "r-sn-wire": {
      title: "Il sensore si attiva ma all'ingresso non arriva tensione — cablaggio",
      causes: [
        "Filo di uscita portato su un altro ingresso, o interrotto su una morsettiera intermedia",
        "Manca il filo del COM degli ingressi",
        "Tensione residua del sensore alta, oppure corrente di uscita troppo bassa per l'ingresso",
      ],
      checks: [
        "Misurate nero–blu con il sensore attivo e spento e inserite entrambi i valori nel controllo delle letture",
        "Ingresso del PLC verso COM: ON a 15 V o più (tipo 1), OFF a 5 V o meno",
      ],
    },
    "r-sn-input": {
      title: "La tensione arriva ma il PLC non legge ON — scheda di ingresso",
      causes: [
        "Alimentazione o guasto della scheda di ingresso, oppure state guardando un altro slot",
        "Tensione d'ingresso vicina alla soglia (11–15 V) — un ingresso di tipo 1 può restare OFF",
      ],
      checks: ["Spostate il sensore su un canale vicino", "Verificate tensione e corrente di ON nel manuale della scheda di ingresso"],
    },
    "r-sn-program": {
      title: "L'ingresso si attiva — indirizzo, filtro o durata dell'impulso",
      causes: [
        "Il programma legge un altro indirizzo d'ingresso (numerazione X ottale o esadecimale)",
        "Segnale più breve del tempo di filtro dell'ingresso (oggetto veloce)",
        "Se letto via comunicazione, il calcolo dell'indirizzo del bit è sbagliato",
      ],
      checks: ["Osservate direttamente quel bit d'ingresso nel monitor del PLC", "Per il protocollo MC, verificate la notazione del numero di dispositivo"],
    },
    "r-sn-stuck": {
      title: "L'ingresso non si disattiva mai — dispersione, cortocircuito o modalità di uscita",
      causes: [
        "La corrente di dispersione a sensore spento di un sensore a 2 fili tiene attivo l'ingresso",
        "Filo di uscita in cortocircuito con +24 V (PNP) o 0 V (NPN)",
        "Modalità di uscita del sensore (NA/NC, light-on/dark-on) invertita",
      ],
      checks: ["Con il sensore spento, ingresso del PLC verso COM deve essere a 5 V o meno", "Verificate se l'ingresso si disattiva staccando il filo di uscita"],
    },

    // ⑦ MC 프로토콜
    "mc-ping": { q: "Il PLC risponde al ping dal PC?", hint: "«No» prosegue con il ramo Ethernet (subnet IP)" },
    "mc-port": {
      q: "Nelle impostazioni Ethernet del PLC è aperta una connessione protocollo MC (SLMP), con numero di porta, TCP/UDP e binario/ASCII uguali al programma?",
    },
    "mc-endcode": { q: "Il codice di fine della risposta è diverso da zero (es. C059)?" },
    "mc-noreply": { q: "La connessione è aperta ma non arriva mai una risposta (timeout)?", hint: "«No» = le risposte arrivano ma i valori sembrano sbagliati" },
    "r-mc-port": {
      title: "Impostazioni di connessione protocollo MC sul PLC",
      causes: [
        "Nessuna connessione protocollo MC (SLMP) configurata, oppure le impostazioni non sono state scritte nel PLC e riavviate",
        "Numero di porta, TCP/UDP o codice (binario/ASCII) diversi dal programma",
        "Un altro programma usa già la stessa connessione TCP",
      ],
      checks: [
        "Provate prima il lato programma con PortDock PLC Simulator su 127.0.0.1, senza PLC",
        "Scrivete le impostazioni Ethernet del software di programmazione accanto ai valori del programma e confrontatele",
      ],
    },
    "r-mc-endcode": {
      title: "Il PLC rifiuta la richiesta con un codice di fine",
      causes: [
        "Comando o sottocomando non supportato dal modello di PLC",
        "Codice o numero di dispositivo fuori campo, oppure troppi punti",
        "Impostazioni lato PLC come la protezione da scrittura in RUN",
      ],
      checks: ["Incollate la risposta nel decodificatore del protocollo MC per il significato del codice di fine", "Seguite l'ordine di verifica della guida ai codici di fine"],
    },
    "r-mc-frame": {
      title: "Formato del frame non corrispondente, quindi il PLC tace",
      causes: [
        "Frame 3E/4E o binario/ASCII diverso dall'impostazione del PLC",
        "Valori dell'intestazione (n° di rete, n° di PC, modulo di destinazione) o lunghezza dei dati errati",
        "Si usa UDP mentre il PLC si aspetta TCP (o viceversa)",
      ],
      checks: [
        "Decodificate campo per campo i byte inviati nel decodificatore del protocollo MC",
        "Catturate con Wireshark o pktmon e controllate le coppie richiesta/risposta nell'analizzatore pcap",
      ],
    },
    "r-mc-values": {
      title: "Le risposte arrivano ma i valori sembrano sbagliati — numeri di dispositivo o unità",
      causes: ["X e Y sono esadecimali ma inseriti come decimali", "Confusione tra lettura a bit e lettura a word", "Ordine delle parole o segno dei valori a 32 bit"],
      checks: ["Confrontate con la tabella delle notazioni nella guida ai numeri di dispositivo", "Confrontate segno ed esadecimale nel convertitore di interi"],
    },

    // ⑧ PC 의 USB 장치
    "pu-know": { q: "Sapete quale dispositivo si disconnette?", hint: "Se sentite solo ripetersi il suono di connessione/disconnessione, scegliete «No»" },
    "pu-port": { q: "Si disconnette ancora su un'altra porta USB (pannello posteriore, senza hub)?" },
    "pu-cable": { q: "Si disconnette ancora con un altro cavo?" },
    "pu-suspend": {
      q: "Disattivare il risparmio energetico USB (sospensione selettiva, «consenti di spegnere») riduce il problema?",
      hint: "PortDock le legge soltanto — modificatele voi nelle impostazioni di Windows",
    },
    "r-pu-find": {
      title: "Prima trovate quale dispositivo si disconnette",
      causes: ["Ancora sconosciuto — potrebbe essere mouse, tastiera, dongle wireless, webcam, adattatore USB-seriale o hub"],
      checks: [
        "Usate il log di connessioni/disconnessioni USB di Hardware Tester (dalla 0.10.0) per orari, nome del dispositivo e VID:PID",
        "Un dispositivo che si disconnette 3 o più volte in 10 minuti viene segnato «sospette disconnessioni ripetute» — poi ripercorrete questo ramo per quel dispositivo",
      ],
    },
    "r-pu-port": {
      title: "La porta o l'hub originali",
      causes: ["Collegamento interno o contatto della porta frontale", "Hub alimentato dal bus che resta senza potenza"],
      checks: [
        "Usate una porta posteriore o un hub autoalimentato",
        "Confermate con il log di connessioni/disconnessioni USB di Hardware Tester che le disconnessioni sono cessate dopo il cambio di porta (dalla 0.10.0)",
      ],
    },
    "r-pu-cable": {
      title: "Cavo o connettore",
      causes: ["Interruzione interna del cavo (si disconnette quando lo si muove), connettore allentato", "Cavo USB o prolunga troppo lunghi"],
      checks: ["Usate un cavo corto e di buona qualità"],
    },
    "r-pu-suspend": {
      title: "Il risparmio energetico USB spegne il dispositivo",
      causes: ["Sospensione selettiva USB, «consenti al computer di spegnere» sul dispositivo o sull'hub"],
      checks: ["Leggete la sospensione selettiva USB con «Read this PC's settings» di Port Inspector", "Su un PC di macchina, rivedete anche le impostazioni di sospensione della combinazione per il risparmio di energia"],
    },
    "r-pu-device": {
      title: "Dispositivo, driver o ambiente",
      causes: [
        "Il dispositivo stesso o il suo driver",
        "Un dispositivo USB 3 che funziona alla velocità USB 2.0 (segno di problemi di cavo o porta)",
        "Per i dongle wireless, interferenze a 2,4 GHz vicino alle porte USB 3.0",
        "Differenza di massa o rumore dell'impianto (siti industriali)",
      ],
      checks: [
        "Verificate se si disconnette su un altro PC",
        "Cercate i segni «Worth a look» sulla velocità USB in Hardware Tester (dalla 0.10.0)",
        "Misurate la tensione tra la massa del PC e quella dell'impianto",
      ],
    },
  },
} satisfies TreeText;
