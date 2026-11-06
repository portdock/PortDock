// 고장 원인 찾기 도우미의 질문 나무 글(프랑스어) — 나무 모양(id·다음 노드·링크)은 data/troubleshoot.ts 하나를 함께 쓰고, 여기는 노드 id 로 찾는 글만.
// 질문: q·hint(나무에 힌트가 있을 때만)·opts(예/아니오가 아닌 답만, 답 순서대로). 결과: title·causes·checks(나무와 같은 수·순서).
// 빠진 id·수가 다른 줄은 lib/troubleshoot.ts 의 checkText() 가 잡는다(i18n.test.ts). 문구는 «causes possibles» — 확정하지 않는다.
import type { TreeText } from "../../lib/troubleshoot.ts";

export default {
  yes: "Oui",
  no: "Non",
  symptoms: {
    rs485: "RS-485 / Modbus RTU : pas de réponse ou réponses corrompues",
    rs232: "La liaison RS-232 ne communique pas",
    tcp: "Impossible de se connecter à un appareil Modbus TCP / Ethernet",
    usb: "Adaptateur USB-série non détecté ou qui décroche",
    ma: "La mesure 4–20 mA semble fausse",
    sensor: "L’entrée d’un capteur NPN/PNP ne réagit pas",
    mc: "Impossible de se connecter en protocole MC (Mitsubishi)",
    pcusb: "Un périphérique USB du PC se déconnecte sans cesse",
  },
  nodes: {
    // ① RS-485 · Modbus RTU
    "rs485-any": { q: "N’y a-t-il aucune réponse du tout ?", hint: "« Non » = des réponses arrivent parfois, ou arrivent avec des octets corrompus" },
    "rs485-txled": { q: "La LED TX de l’adaptateur clignote-t-elle quand une requête est envoyée ?", hint: "Pas de LED ? Vérifiez plutôt que les octets envoyés apparaissent dans le journal de PortDock Serial" },
    "rs485-settings": { q: "Avez-vous comparé un à un le débit, la parité, les bits de stop et l’adresse esclave avec l’écran de réglage de l’appareil (ou sa notice) ?" },
    "rs485-swap": { q: "Si vous permutez les fils A et B (D+/D−), une réponse arrive-t-elle ?", hint: "Les permuter n’endommage pas les appareils" },
    "rs485-single": { q: "Avec un seul appareil relié directement à l’adaptateur par un câble court, répond-il ?" },
    "rs485-garbled": { q: "Les octets reçus semblent-ils corrompus (erreurs CRC, caractères bizarres) ?", hint: "« Non » = les octets semblent corrects mais des réponses manquent parfois (délais dépassés)" },
    "rs485-slower": { q: "Baisser le débit ou raccourcir le câble réduit-il la corruption ?" },
    "rs485-timeout": { q: "Un délai de réponse plus long (par ex. 1000 ms) réduit-il les réponses manquantes ?" },
    "r-rs485-port": {
      title: "La requête ne sort jamais du PC — côté port ou pilote",
      causes: [
        "Le mauvais numéro de COM est ouvert (il change quand l’adaptateur passe sur un autre port USB)",
        "Un autre programme (SCADA, un terminal ouvert avant) occupe encore le port",
        "Problème de pilote (point d’exclamation ou code d’erreur dans le Gestionnaire de périphériques)",
        "L’adaptateur ne commute pas automatiquement le sens émission/réception en RS-485 2 fils",
      ],
      checks: [
        "Trouvez le numéro de COM de l’adaptateur sous « Ports (COM et LPT) » dans le Gestionnaire de périphériques et accordez le réglage du programme",
        "Lisez le pilote et le code d’erreur du port dans Port Inspector, et lancez le test d’écho RS-485 2 fils pour voir si quelque chose est émis",
        "Avec un multimètre (V⎓) entre A et B, des requêtes envoyées en boucle doivent faire bouger la mesure — si elle reste fixe, rien n’est émis",
      ],
    },
    "r-rs485-settings": {
      title: "Les réglages de communication diffèrent probablement",
      causes: [
        "Le débit ou la parité diffère (par ex. appareil en 8E1, programme en 8N1)",
        "L’adresse esclave diffère, ou 0 (diffusion) est utilisé — une diffusion ne reçoit pas de réponse",
        "Le protocole de l’appareil n’est pas Modbus RTU (protocole constructeur ou ASCII), ou les réglages ont été modifiés sans enregistrement ni redémarrage",
      ],
      checks: [
        "Notez les paramètres de communication affichés par l’appareil et comparez-les ligne à ligne avec le programme",
        "Pour un variateur, vérifiez aussi les paramètres « source de la commande de marche » et « choix du protocole »",
        "Si le débit est inconnu, balayez avec Modbus Master — recherche d’adresses esclaves, et débit/parité avec « recherche des réglages de ligne » (à partir de 0.10.0)",
      ],
    },
    "r-rs485-polarity": {
      title: "Le marquage A/B (+/−) était inversé",
      causes: ["Les fabricants ne s’accordent pas sur lequel de A/B est le + (la spécification Modbus dit D1 = B = +, D0 = A = −)", "Seuls certains appareils sont peut-être inversés — si d’autres ne répondent plus après la permutation, vérifiez leur marquage"],
      checks: ["Sous tension, scrutation arrêtée : rouge sur B (D1·+), noir sur A (D0·−), la mesure doit être de +200 mV ou plus si une polarisation est présente", "Notez la permutation sur le schéma de câblage pour que personne ne la défasse"],
    },
    "r-rs485-bus": {
      title: "Un appareil seul fonctionne mais pas sur le bus — câblage ou topologie du bus",
      causes: [
        "Trois terminaisons ou plus (commutateur activé sur un appareil du milieu), ou aucune",
        "Deux appareils partagent une adresse esclave et répondent en même temps, se corrompant mutuellement",
        "Longues dérivations ou câblage en étoile, ou coupure à une borne intermédiaire",
        "Pas de fil SG (commun), ce qui pousse les appareils éloignés hors de la plage de mode commun",
      ],
      checks: [
        "Tout hors tension, résistance A–B : env. 60 Ω (deux extrémités), env. 120 Ω (une extrémité), quelques centaines d’Ω à plusieurs kΩ ou plus (aucune — beaucoup d’appareils ou des résistances de polarisation visibles la font descendre vers 1 kΩ), 40 Ω ou moins (trop). La terminaison RC (1 nF + 120 Ω) est invisible en continu et se lit comme « aucune »",
        "Sous tension : A–SG et B–SG entre −7 et +12 V",
        "Remettez les appareils un par un pour voir à partir duquel cela échoue ; listez toutes les adresses esclaves",
      ],
    },
    "r-rs485-device": {
      title: "Échec même avec un seul appareil — réglages de l’appareil, port de communication ou adaptateur",
      causes: [
        "Réglages de l’appareil non enregistrés, ou appliqués seulement après redémarrage",
        "La communication passe par une carte option ou des bornes séparées, ou un réglage de mode 2 fils/4 fils",
        "Adaptateur défaillant, ou câblé sur des bornes RS-422/RS-232 au lieu de RS-485",
      ],
      checks: [
        "Testez l’adaptateur seul avec le test d’écho RS-485 2 fils de Port Inspector",
        "Essayez le même appareil avec un autre adaptateur ou un autre PC",
        "Cherchez dans la notice de l’appareil les numéros des bornes de communication et le moment où les nouveaux réglages prennent effet",
      ],
    },
    "r-rs485-signal": {
      title: "Qualité du signal — réflexions, bruit, longueur",
      causes: [
        "Pas de terminaison, ou à une seule extrémité — réflexions sur les lignes longues et rapides",
        "Câble trop long pour le débit (environ débit × mètres ≤ 10^8)",
        "Pas de paire torsadée, câble posé le long de câbles de puissance, ou blindage non relié à la terre",
      ],
      checks: [
        "Hors tension : A–B env. 60 Ω",
        "Mode commun A–SG et B–SG entre −7 et +12 V, y compris moteurs en marche",
        "Vérifiez la longueur limite pour ce débit dans le calculateur RS-485",
      ],
    },
    "r-rs485-framing": {
      title: "Trames décalées — réglages, écho ou découpage",
      causes: [
        "Débit ou parité légèrement faux (certains octets peuvent quand même sembler corrects)",
        "Un adaptateur 2 fils renvoie l’écho de la requête, qui apparaît devant la réponse",
        "La latence USB coupe une réponse en deux et le récepteur analyse les morceaux séparément",
      ],
      checks: ["Collez les octets reçus dans le décodeur de trames Modbus et vérifiez adresse, fonction et CRC", "Vérifiez l’écho de l’adaptateur et le latency timer FTDI dans Port Inspector"],
    },
    "r-rs485-timing": {
      title: "Temporisation trop serrée — délai d’attente, intervalle de scrutation, latence USB",
      causes: [
        "Délai d’attente plus court que le temps de réponse de l’appareil (variateurs et compteurs peuvent prendre des dizaines à des centaines de ms)",
        "Requête suivante envoyée trop tôt, chevauchant la réponse précédente",
        "Le latency timer de l’adaptateur USB (16 ms par défaut chez FTDI) s’ajoute à chaque trame courte",
      ],
      checks: ["Calculez la durée requête/réponse et le délai d’attente minimal avec le calculateur de temps de transmission série", "Lisez la valeur du latency timer avec Port Inspector"],
    },
    "r-rs485-idle": {
      title: "Ligne flottante au repos, ou réponses en collision — polarisation ou adresses",
      causes: [
        "Pas de résistances de polarisation (fail-safe) : le bruit au repos est lu comme des octets",
        "Deux appareils de même adresse entrent parfois en collision",
        "Bruit uniquement quand les moteurs ou variateurs tournent (blindage, masse)",
      ],
      checks: [
        "Sous tension, scrutation arrêtée : tension différentielle B–A de +200 mV ou plus",
        "Reportez tous les appareils et leurs adresses sur un schéma du système pour repérer les doublons",
        "Comparez les moments où les réponses manquent avec ceux où les moteurs tournent",
      ],
    },

    // ② RS-232
    "rs232-seen": { q: "Le port COM apparaît-il dans le Gestionnaire de périphériques du PC ?", hint: "Pour un adaptateur USB-RS232, « Non » enchaîne sur la branche de détection de l’adaptateur" },
    "rs232-loop": { q: "Avec les broches 2 (RXD) et 3 (TXD) de la DB9 côté PC reliées (rebouclage), les caractères envoyés reviennent-ils ?" },
    "rs232-cross": {
      q: "Le TX de l’appareil est-il relié au RX du PC (broche 2) et le TX du PC (broche 3) au RX de l’appareil — en croisé ?",
      hint: "Pas sûr ? Choisissez « Non » pour voir comment vérifier",
    },
    "rs232-flow": { q: "Le contrôle de flux est-il réglé sur « Aucun » à la fois dans le programme et sur l’appareil ?" },
    "r-rs232-pc": {
      title: "Bloqué au port du PC ou à l’adaptateur",
      causes: ["Un autre programme occupe le port, ou le mauvais numéro de COM est ouvert", "Adaptateur ou port défaillant, problème de pilote", "Mauvaises broches reliées (le rebouclage se fait entre les broches 2 et 3)"],
      checks: [
        "Au repos, broche 3 (TXD) par rapport à la broche 5 (GND) : −5 à −15 V (−3 à −5 V est faible — à surveiller)",
        "Lancez le test de rebouclage de Port Inspector et vérifiez que les octets reviennent à chaque débit",
      ],
    },
    "r-rs232-cross": {
      title: "TX relié à TX peut-être — câble croisé ou droit",
      causes: [
        "Le PC et l’appareil sont tous deux DTE mais un câble droit (TX–TX) est utilisé — il faut un câble null modem (croisé)",
        "Ou l’appareil est DCE et un câble croisé est utilisé",
      ],
      checks: [
        "Sur chaque connecteur, la broche qui affiche −5 à −15 V au repos (−3 à −5 V si faible) est le TX de ce côté — si les deux TX sont sur le même fil, ils se heurtent",
        "En mode continuité, contrôlez le câble pour voir si 2↔3 sont croisés",
      ],
    },
    "r-rs232-flow": {
      title: "Contrôle de flux incompatible",
      causes: [
        "Le contrôle de flux matériel (RTS/CTS) est activé mais CTS n’est pas câblé : le PC attend indéfiniment",
        "L’appareil a besoin de DTR/DSR actifs mais seul un câble 3 fils est utilisé",
      ],
      checks: [
        "Réglez le contrôle de flux sur « Aucun » dans le programme et testez à nouveau",
        "Si l’appareil exige une poignée de main, reliez RTS–CTS (7–8) et DTR–DSR–DCD (4–6–1) dans le connecteur, ou utilisez un câble à poignée de main complète",
      ],
    },
    "r-rs232-settings": {
      title: "Le câblage semble correct — réglages, format des commandes ou niveau du signal",
      causes: [
        "Débit, bits de données, parité ou bits de stop différents",
        "Fin de ligne (CR, LF, CR LF) ou somme de contrôle différente de ce qu’attend l’appareil",
        "Le port de l’appareil est une UART TTL (3,3/5 V), pas du RS-232",
      ],
      checks: [
        "Si le TX de l’appareil est à +3,3 ou +5 V au repos, c’est du TTL — ne le reliez pas directement à un port RS-232",
        "Émettez et recevez en HEX et comparez octet par octet fins de ligne et sommes de contrôle",
      ],
    },

    // ③ Modbus TCP · 이더넷
    "tcp-ping": { q: "L’appareil répond-il au ping depuis le PC ?" },
    "tcp-subnet": { q: "Les IP du PC et de l’appareil sont-elles dans le même sous-réseau ? (par ex. 192.168.0.10/24 et 192.168.0.50)" },
    "tcp-link": { q: "Les LED de liaison sont-elles allumées sur les ports réseau du PC et de l’appareil (ou du switch) ?" },
    "tcp-502": {
      q: "Pouvez-vous ouvrir une connexion TCP sur le port 502 (ou celui de la notice) ?",
      hint: "Essayez de vous connecter avec PortDock TCP, ou avec PowerShell Test-NetConnection <IP> -Port 502",
    },
    "tcp-reply": { q: "Une fois connecté, une requête obtient-elle une réponse ?" },
    "tcp-exception": { q: "La réponse est-elle une exception (code fonction + 0x80, par ex. 83 02) ?", hint: "« Non » = des réponses arrivent mais les valeurs semblent fausses" },
    "r-tcp-subnet": {
      title: "Sous-réseaux IP différents",
      causes: ["Les parties réseau diffèrent : ils ne peuvent pas se joindre sans passerelle", "L’IP de l’appareil est inconnue (réglage d’usine ou DHCP)"],
      checks: [
        "Saisissez les deux IP et masques dans le calculateur de sous-réseau pour voir s’ils partagent un sous-réseau",
        "Ajoutez à la carte réseau du PC une seconde IP dans le sous-réseau de l’appareil (par ex. 192.168.0.200/24)",
        "Si l’IP est inconnue, trouvez-la avec Net Scan",
      ],
    },
    "r-tcp-link": {
      title: "Pas de liaison physique — câble, port ou switch",
      causes: ["Câble ou connecteur cassé, ou branché sur un autre port", "Switch non alimenté ou port désactivé, ou port réseau de l’appareil désactivé"],
      checks: ["Changez de câble et de port de switch", "Lisez liaison, vitesse et duplex avec « Read adapters » de Port Inspector"],
    },
    "r-tcp-noping": {
      title: "La liaison est établie mais pas de ping",
      causes: [
        "L’appareil est réglé pour ne pas répondre au ping (ICMP) — testez directement la connexion au port 502",
        "Deux appareils ont la même IP (conflit d’adresses)",
        "Une autre carte réseau du PC (Wi-Fi par ex.) est dans le même sous-réseau et le trafic sort par là ; pare-feu",
      ],
      checks: [
        "Débranchez l’appareil et faites un ping — une réponse signifie qu’un autre appareil a cette IP",
        "Balayez le sous-réseau avec Net Scan pour les IP et MAC ; repérez les IP en double sur un schéma du système",
        "Désactivez temporairement les autres cartes réseau et réessayez",
      ],
    },
    "r-tcp-port": {
      title: "Le ping passe mais le port 502 refuse",
      causes: [
        "Modbus TCP est désactivé sur l’appareil ou est une option (carte ou licence à part)",
        "Le port n’est pas 502",
        "Le nombre maximal de connexions est atteint (SCADA ou IHM déjà connecté)",
      ],
      checks: ["Vérifiez dans la notice le réglage Modbus TCP, le port et le nombre maximal de connexions", "Déconnectez brièvement les autres clients et reconnectez-vous"],
    },
    "r-tcp-unitid": {
      title: "Connecté mais pas de réponse — identifiant d’unité ou passerelle",
      causes: [
        "Mauvais identifiant d’unité — derrière une passerelle il doit égaler l’adresse esclave RTU ; pour un appareil en direct, prenez la valeur de la notice (1 ou 255 sont courants)",
        "Le côté RTU de la passerelle (débit, câblage) échoue — elle abandonne la requête ou renvoie l’exception 0B",
        "Un code fonction que l’appareil ne prend pas en charge",
      ],
      checks: [
        "Décodez les octets échangés dans le décodeur de trames Modbus pour voir le MBAP et l’identifiant d’unité",
      ],
    },
    "r-tcp-exception": {
      title: "L’appareil répond par une exception — adresse, fonction ou quantité",
      causes: [
        "Exception 02 : adresse inexistante — notation 40001 non convertie en adresse à base 0 (décalage d’une unité)",
        "Exception 01 : fonction non prise en charge (par ex. lecture de registres d’entrée avec 03)",
        "Exception 03 : quantité supérieure à 125 ou à la limite de l’appareil",
      ],
      checks: ["Collez la réponse dans le décodeur de trames Modbus pour le sens de l’exception", "Vérifiez si la table des registres utilise des adresses à base 0 ou 1"],
    },
    "r-tcp-values": {
      title: "La communication fonctionne mais les valeurs semblent fausses — format, ordre ou échelle",
      causes: [
        "L’ordre des mots des valeurs 32 bits (float, int32) diffère (ABCD, CDAB …)",
        "Échelle (×0,1, ×0,01), signe (int16/uint16) ou rapport de TC non appliqués",
        "Adresse décalée d’une unité (base 0 ou 1)",
      ],
      checks: ["Placez les deux registres dans le convertisseur de flottants Modbus et comparez les quatre ordres", "Comparez signé et non signé avec le convertisseur d’entiers"],
    },

    // ④ USB-시리얼 변환기
    "usb-sound": { q: "Quand vous branchez l’adaptateur, Windows joue-t-il le son de connexion ou le Gestionnaire de périphériques change-t-il ?" },
    "usb-com": { q: "Apparaît-il sous « Ports (COM et LPT) » avec un numéro de COM ?", hint: "« Non » = il apparaît sous « Autres périphériques », avec un point d’exclamation ou comme inconnu" },
    "usb-drops": { q: "Décroche-t-il en cours d’utilisation (le port disparaît puis revient) ?" },
    "usb-motor": { q: "Décroche-t-il quand de grosses charges comme des moteurs, variateurs ou postes de soudage démarrent ou tournent ?" },
    "usb-comnum": {
      q: "Le numéro de COM change-t-il à chaque branchement, ou monte-t-il haut comme COM15 ?",
      hint: "« Non » = détecté et connecté, mais la communication est lente ou les réponses sont coupées",
    },
    "r-usb-none": {
      title: "Pas du tout vu comme périphérique USB — câble, port ou adaptateur",
      causes: ["Un câble USB de charge seule (sans fils de données)", "Problème de liaison ou d’alimentation du port en façade ou du hub", "Adaptateur défaillant"],
      checks: [
        "Branchez directement sur un port arrière, sans hub, avec un autre câble",
        "Voyez si un autre PC se comporte de la même façon",
        "Vérifiez si le branchement est enregistré dans le journal de connexions/déconnexions USB de Hardware Tester (à partir de 0.10.0)",
      ],
    },
    "r-usb-driver": {
      title: "Pilote manquant ou le périphérique ne peut pas démarrer",
      causes: ["Aucun pilote installé pour la puce (FTDI, CH34x, CP210x, PL2303)", "Le pilote refuse la puce (code 10, etc.) — fréquent avec les anciens PL2303"],
      checks: [
        "Lisez le VID:PID, le nom de la puce et le code d’erreur avec sa signification dans Port Inspector",
        "Utilisez le pilote du site du fabricant de la puce (demandez au service informatique si des droits administrateur sont nécessaires)",
      ],
    },
    "r-usb-emi": {
      title: "Bruit ou différence de masse qui atteint l’USB",
      causes: ["Avec un adaptateur non isolé, la différence de potentiel entre la masse de l’appareil et celle du PC réinitialise l’USB", "Le câble de communication ou USB passe à côté de câbles de puissance"],
      checks: [
        "Tension entre le blindage USB du PC et le SG/PE de l’appareil (V⎓ et V~) : moins de 1 V est courant ; 7 V ou plus est un problème",
        "Essayez un adaptateur isolé, un câble USB plus court ou des ferrites",
        "Comparez les heures de décrochage USB de Hardware Tester avec les heures de marche des moteurs (à partir de 0.10.0)",
      ],
    },
    "r-usb-power": {
      title: "Économie d’énergie, alimentation ou contact",
      causes: ["Suspension sélective USB, ou « Autoriser l’ordinateur à éteindre ce périphérique pour économiser l’énergie »", "Un hub alimenté par le bus qui manque de puissance, ou un connecteur desserré"],
      checks: [
        "Lisez les réglages d’économie d’énergie et l’historique récent des branchements avec Port Inspector (lecture seule — modifiez-les vous-même dans Windows)",
        "Voyez si bouger le câble provoque un décrochage",
      ],
    },
    "r-usb-comnum": {
      title: "Le numéro de COM change — emplacement du port, numéro de série, réservations",
      causes: ["Les puces sans numéro de série (CH34x, etc.) reçoivent un nouveau numéro sur chaque port USB", "Les périphériques déjà branchés gardent des numéros réservés (ComDB)"],
      checks: ["Utilisez toujours le même port USB", "Consultez les réservations de numéros de COM dans Port Inspector", "PortDock Serial rouvre le même périphérique même si son numéro change"],
    },
    "r-usb-latency": {
      title: "Connecté mais lent, ou réponses coupées — latence USB",
      causes: [
        "Le latency timer FTDI (16 ms par défaut) ajoute un délai à chaque trame courte",
        "Le programme traite chaque fragment comme une réponse séparée",
        "S’il n’y a aucune communication, poursuivez avec la branche RS-485 ou RS-232",
      ],
      checks: ["Vérifiez le latency timer et le temps d’aller-retour en rebouclage dans Port Inspector", "Comparez avec le temps de réponse attendu donné par le calculateur de temps de transmission série"],
    },

    // ⑤ 4–20 mA
    "ma-kind": { q: "En quoi la valeur semble-t-elle fausse ?", opts: ["Bloquée à 0 (ou au minimum)", "Bloquée au maximum", "Elle fluctue ou saute", "Elle bouge, mais ne correspond pas à la réalité"] },
    "ma-flow": { q: "Avec un multimètre (mA) en série dans la boucle, circule-t-il plus de 3,6 mA ?" },
    "ma-volt": { q: "Y a-t-il une tension (en général 10 V ou plus) entre les bornes + et − du transmetteur ?" },
    "ma-high": { q: "Le courant mesuré est-il de 21 mA ou plus ?" },
    "ma-motor": { q: "La fluctuation augmente-t-elle quand les moteurs ou variateurs tournent ?" },
    "ma-loopv": { q: "Vers 20 mA, la tension aux bornes du transmetteur reste-t-elle au-dessus de la tension de fonctionnement minimale de sa notice ?" },
    "r-ma-open": {
      title: "Ni courant ni tension dans la boucle — circuit ouvert ou alimentation",
      causes: [
        "Fil coupé, borne desserrée ou fusible",
        "Alimentation de boucle (24 V) coupée ou câblée ailleurs",
        "Un transmetteur 4 fils (alimentation séparée) câblé comme un 2 fils, donc non alimenté",
      ],
      checks: ["Mesurez le 24 V à l’alimentation, puis au transmetteur, pour trouver où il disparaît", "Comparez le câblage réel avec les schémas 2/3/4 fils"],
    },
    "r-ma-tx": {
      title: "Tension présente mais pas de courant — transmetteur ou polarité",
      causes: ["Polarité inversée en 2 fils (+ et − permutés)", "L’entrée de réception est réglée en tension, ce qui ouvre de fait la boucle", "Transmetteur défaillant"],
      checks: ["Revérifiez le + et le − du transmetteur d’après le schéma de la notice", "Vérifiez le réglage ou le cavalier du type de voie (courant/tension) de la carte d’entrées"],
    },
    "r-ma-input": {
      title: "Le courant circule mais la valeur est 0 — réglage ou échelle côté réception",
      causes: [
        "Plage d’entrée réglée autrement (0–20 mA, 1–5 V, 0–10 V)",
        "Vous regardez une autre voie, ou la mise à l’échelle est à 0",
        "À 3,6 mA ou moins, le transmetteur signale un défaut NE 43 (3,6–3,8 mA est sous l’échelle, pas un signal de défaut)",
      ],
      checks: ["Saisissez les mA mesurés dans l’outil de contrôle des mesures pour le % et la zone NE 43", "Comparez avec la valeur numérique attendue (par ex. 0–27648) dans le calculateur 4–20 mA"],
    },
    "r-ma-fault-high": {
      title: "21 mA ou plus — signal de défaut ou court-circuit",
      causes: ["Le transmetteur émet le signal de défaut haut NE 43 (sonde coupée par ex.)", "Bien au-dessus de 25 mA : l’alimentation contourne le transmetteur (court-circuit)"],
      checks: ["Consultez l’afficheur ou le diagnostic du transmetteur", "Mesurez la résistance de la sonde (Pt100 par ex.) pour détecter un circuit ouvert"],
    },
    "r-ma-over": {
      title: "Bloquée au maximum — réglage d’échelle ou valeur réelle",
      causes: [
        "Plage de mise à l’échelle de l’automate plus étroite que celle du transmetteur",
        "La grandeur mesurée dépasse l’échelle du transmetteur (par ex. 0–10 bar)",
        "Confusion d’unités (bar, psi, kPa)",
      ],
      checks: ["Calculez le % à partir des mA mesurés et comparez avec la valeur de l’automate", "Vérifiez l’échelle sur la plaque signalétique ou dans les réglages du transmetteur"],
    },
    "r-ma-noise": {
      title: "Bruit — blindage, masse ou cheminement du câble",
      causes: [
        "Le câble de signal partage une goulotte avec des câbles de puissance",
        "Blindage relié à la terre aux deux extrémités, formant une boucle de masse (en général une seule extrémité)",
        "Différence de potentiel de masse entre le transmetteur et l’automate",
      ],
      checks: [
        "Mesurez la tension entre les deux masses (moins de 1 V est courant)",
        "Notez l’amplitude de la fluctuation en mA ; envisagez un isolateur de signal",
        "Réduisez la fluctuation avec la constante de temps du filtre d’entrée (filtre RC)",
      ],
    },
    "r-ma-loadv": {
      title: "Tension de boucle trop basse — résistance de charge ou chute de l’alimentation",
      causes: ["Trop de récepteurs, indicateurs ou barrières dans la boucle", "Câblage long ou fin, chute de l’alimentation 24 V"],
      checks: [
        "Calculez avec le calculateur de charge de boucle la tension du transmetteur à 20 mA (ou 21 mA)",
        "Mesurez l’alimentation 24 V en charge (une chute de 5 % ou moins laisse de la marge)",
      ],
    },
    "r-ma-process": {
      title: "Câblage et tension semblent corrects — variation réelle du procédé ou amortissement",
      causes: ["La grandeur mesurée fluctue vraiment (pulsations de pompe, etc.)", "Amortissement du transmetteur ou filtre d’entrée de l’automate trop court"],
      checks: ["Enregistrez la valeur sur une courbe dans le temps et cherchez des motifs périodiques", "Vérifiez le réglage d’amortissement du transmetteur"],
    },
    "r-ma-scale": {
      title: "La valeur ne correspond pas à la réalité — mise à l’échelle, unités ou valeurs numériques",
      causes: [
        "La plage physique (basse/haute) diffère du réglage du transmetteur",
        "Mauvaise plage de valeurs numériques de l’automate (0–27648, 0–4000, 0–32000)",
        "Confusion d’unités (bar/psi, relative/absolue)",
      ],
      checks: [
        "Saisissez les mA mesurés dans le calculateur 4–20 mA et comparez avec la valeur et la valeur numérique attendues",
        "Vérifiez que la valeur de l’automate est proportionnelle à 4, 12 et 20 mA",
      ],
    },

    // ⑥ NPN/PNP 센서
    "sn-kind": { q: "Quel est le symptôme ?", opts: ["L’entrée ne passe jamais à ON", "L’entrée ne repasse jamais à OFF (toujours ON)"] },
    "sn-led": { q: "La LED témoin du capteur lui-même s’allume-t-elle quand une cible est présente ?" },
    "sn-power": { q: "La tension entre le marron (+) et le bleu (0 V) du capteur est-elle proche de l’alimentation (en général 24 V) ?" },
    "sn-type": {
      q: "Le type de capteur et le COM des entrées de l’automate correspondent-ils — COM au +24 V pour un NPN, au 0 V pour un PNP ?",
      hint: "Pas sûr ? Choisissez « Non »",
    },
    "sn-vin": { q: "Capteur actif, y a-t-il 15 V ou plus entre la borne d’entrée de l’automate et le COM des entrées ?" },
    "sn-plcled": { q: "La LED d’entrée de l’automate s’allume-t-elle à ce moment-là ?" },
    "r-sn-power": {
      title: "Le capteur n’est pas alimenté",
      causes: [
        "Fil d’alimentation coupé, contact du connecteur ou fusible",
        "Couleurs des fils différentes de la convention (marron +, bleu 0 V, noir sortie)",
        "Chute de tension jusqu’à un capteur éloigné",
      ],
      checks: [
        "Mesurez la tension d’alimentation au capteur, charges en marche — une chute de plus de 15 % est un problème",
        "Vérifiez les couleurs des fils et la plage d’alimentation dans la fiche technique du capteur",
      ],
    },
    "r-sn-sense": {
      title: "Alimenté mais ne détecte pas — réglage du capteur ou cible",
      causes: [
        "Distance de détection ou sensibilité, matériau de la cible (la portée d’un détecteur de proximité dépend du métal)",
        "Cellule photoélectrique désalignée ou optique sale",
        "Capteur défaillant",
      ],
      checks: ["Approchez la cible pour voir à quelle distance la LED s’allume", "Remplacez par un capteur du même type"],
    },
    "r-sn-mismatch": {
      title: "NPN/PNP et polarité du COM des entrées ne correspondent peut-être pas",
      causes: ["Capteur NPN avec le COM des entrées au 0 V (ou PNP au +24 V) — le courant n’a pas de chemin", "Les fabricants emploient « sink/source » dans des sens opposés"],
      checks: [
        "Capteur actif, noir–bleu se lit proche de 0 V pour un NPN, proche de l’alimentation pour un PNP",
        "Vérifiez sur le schéma de câblage des entrées de la notice de l’automate où va le COM",
      ],
    },
    "r-sn-wire": {
      title: "Le capteur s’active mais aucune tension n’atteint l’entrée — câblage",
      causes: [
        "Fil de sortie raccordé sur une autre entrée, ou coupé à un bornier intermédiaire",
        "Fil du COM des entrées manquant",
        "Tension résiduelle du capteur élevée, ou courant de sortie trop faible pour l’entrée",
      ],
      checks: [
        "Mesurez noir–bleu capteur actif et inactif et saisissez les deux dans l’outil de contrôle des mesures",
        "Entrée de l’automate par rapport au COM : ON à 15 V ou plus (type 1), OFF à 5 V ou moins",
      ],
    },
    "r-sn-input": {
      title: "La tension arrive mais l’automate ne lit pas ON — carte d’entrées",
      causes: [
        "Alimentation ou défaut de la carte d’entrées, ou vous regardez un autre emplacement",
        "Tension d’entrée proche du seuil (11–15 V) — une entrée de type 1 peut rester à OFF",
      ],
      checks: ["Déplacez le capteur sur une voie voisine", "Vérifiez la tension et le courant ON dans la notice de la carte d’entrées"],
    },
    "r-sn-program": {
      title: "L’entrée passe bien à ON — adresse, filtre ou durée d’impulsion",
      causes: [
        "Le programme lit une autre adresse d’entrée (numérotation X en octal ou en hexadécimal)",
        "Signal plus court que le temps de filtrage de l’entrée (cible rapide)",
        "En lecture par communication, le calcul de l’adresse du bit est faux",
      ],
      checks: ["Surveillez directement ce bit d’entrée dans le moniteur de l’automate", "En protocole MC, vérifiez la notation du numéro d’opérande"],
    },
    "r-sn-stuck": {
      title: "L’entrée ne repasse jamais à OFF — fuite, court-circuit ou mode de sortie",
      causes: [
        "Le courant de fuite à l’état bloqué d’un capteur 2 fils maintient l’entrée à ON",
        "Fil de sortie en court-circuit avec le +24 V (PNP) ou le 0 V (NPN)",
        "Mode de sortie du capteur (NO/NF, commutation claire/sombre) inversé",
      ],
      checks: ["Capteur inactif, l’entrée de l’automate par rapport au COM doit être à 5 V ou moins", "Voyez si l’entrée repasse à OFF quand le fil de sortie est débranché"],
    },

    // ⑦ MC 프로토콜
    "mc-ping": { q: "L’automate répond-il au ping depuis le PC ?", hint: "« Non » enchaîne sur la branche Ethernet (sous-réseau IP)" },
    "mc-port": {
      q: "Une connexion protocole MC (SLMP) est-elle ouverte dans les réglages Ethernet de l’automate, avec le numéro de port, TCP/UDP et binaire/ASCII identiques au programme ?",
    },
    "mc-endcode": { q: "Le code de fin de la réponse est-il différent de zéro (par ex. C059) ?" },
    "mc-noreply": { q: "La connexion est-elle ouverte mais aucune réponse n’arrive jamais (délai dépassé) ?", hint: "« Non » = des réponses arrivent mais les valeurs semblent fausses" },
    "r-mc-port": {
      title: "Réglages de connexion protocole MC de l’automate",
      causes: [
        "Aucune connexion protocole MC (SLMP) configurée, ou les réglages n’ont pas été écrits dans l’automate puis redémarrés",
        "Numéro de port, TCP/UDP ou code (binaire/ASCII) différent du programme",
        "Un autre programme utilise déjà la même connexion TCP",
      ],
      checks: [
        "Testez d’abord le côté programme avec PortDock PLC Simulator sur 127.0.0.1, sans automate",
        "Notez les réglages Ethernet de l’outil de programmation à côté des valeurs du programme et comparez",
      ],
    },
    "r-mc-endcode": {
      title: "L’automate refuse la requête avec un code de fin",
      causes: [
        "Commande ou sous-commande non prise en charge par le modèle d’automate",
        "Code ou numéro d’opérande hors plage, ou trop de points",
        "Réglages côté automate, comme l’interdiction d’écriture en RUN",
      ],
      checks: ["Collez la réponse dans le décodeur de protocole MC pour le sens du code de fin", "Suivez l’ordre de vérification du guide des codes de fin"],
    },
    "r-mc-frame": {
      title: "Format de trame incompatible : l’automate reste muet",
      causes: [
        "Trame 3E/4E ou binaire/ASCII différente du réglage de l’automate",
        "Valeurs d’en-tête (n° de réseau, n° de PC, module destinataire) ou longueur des données erronées",
        "UDP utilisé alors que l’automate attend du TCP (ou l’inverse)",
      ],
      checks: [
        "Décodez champ par champ les octets envoyés dans le décodeur de protocole MC",
      ],
    },
    "r-mc-values": {
      title: "Des réponses arrivent mais les valeurs semblent fausses — numéros d’opérandes ou unités",
      causes: ["X et Y sont en hexadécimal mais saisis en décimal", "Confusion entre lecture par bits et lecture par mots", "Ordre des mots ou signe des valeurs 32 bits"],
      checks: ["Comparez avec le tableau des notations du guide des numéros d’opérandes", "Comparez signe et hexadécimal dans le convertisseur d’entiers"],
    },

    // ⑧ PC 의 USB 장치
    "pu-know": { q: "Savez-vous quel périphérique décroche ?", hint: "Si vous entendez seulement le son de connexion/déconnexion se répéter, choisissez « Non »" },
    "pu-port": { q: "Décroche-t-il encore sur un autre port USB (panneau arrière, sans hub) ?" },
    "pu-cable": { q: "Décroche-t-il encore avec un autre câble ?" },
    "pu-suspend": {
      q: "Désactiver l’économie d’énergie USB (suspension sélective, « autoriser l’arrêt ») réduit-il le problème ?",
      hint: "PortDock ne fait que lire ces réglages — modifiez-les vous-même dans les paramètres de Windows",
    },
    "r-pu-find": {
      title: "D’abord, trouver quel périphérique décroche",
      causes: ["Encore inconnu — souris, clavier, dongle sans fil, caméra, adaptateur USB-série ou hub"],
      checks: [
        "Utilisez le journal de connexions/déconnexions USB de Hardware Tester (à partir de 0.10.0) pour les heures, le nom du périphérique et le VID:PID",
        "Un périphérique qui décroche 3 fois ou plus en 10 minutes est marqué « décrochages répétés suspects » — reprenez alors cette branche pour lui",
      ],
    },
    "r-pu-port": {
      title: "Le port ou le hub d’origine",
      causes: ["Liaison interne ou contact du port en façade", "Hub alimenté par le bus qui manque de puissance"],
      checks: [
        "Utilisez un port arrière ou un hub auto-alimenté",
        "Confirmez avec le journal de connexions/déconnexions USB de Hardware Tester que les décrochages ont cessé après le changement de port (à partir de 0.10.0)",
      ],
    },
    "r-pu-cable": {
      title: "Câble ou connecteur",
      causes: ["Coupure interne dans le câble (décroche quand on le bouge), connecteur desserré", "Câble USB ou rallonge trop long"],
      checks: ["Utilisez un câble court et de bonne qualité"],
    },
    "r-pu-suspend": {
      title: "L’économie d’énergie USB éteint le périphérique",
      causes: ["Suspension sélective USB, « autoriser l’ordinateur à éteindre » sur le périphérique ou le hub"],
      checks: ["Lisez la suspension sélective USB avec « Read this PC's settings » de Port Inspector", "Sur un PC d’équipement, revoyez aussi la mise en veille du mode de gestion de l’alimentation"],
    },
    "r-pu-device": {
      title: "Périphérique, pilote ou environnement",
      causes: [
        "Le périphérique lui-même ou son pilote",
        "Un périphérique USB 3 fonctionnant à la vitesse USB 2.0 (signe d’un problème de câble ou de port)",
        "Pour les dongles sans fil, interférences 2,4 GHz près des ports USB 3.0",
        "Différence de masse ou bruit de l’équipement (sites industriels)",
      ],
      checks: [
        "Voyez s’il décroche sur un autre PC",
        "Cherchez les marques « Worth a look » sur la vitesse USB dans Hardware Tester (à partir de 0.10.0)",
        "Mesurez la tension entre la masse du PC et celle de l’équipement",
      ],
    },
  },
} satisfies TreeText;
