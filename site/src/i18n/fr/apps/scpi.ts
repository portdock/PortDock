// PortDock SCPI — texte de présentation.
export default {
  seo: {
    title: "PortDock SCPI — terminal SCPI gratuit (LAN, RS-232, sans VISA)",
    desc: "Terminal d’instruments SCPI gratuit par socket LAN (5025) ou RS-232 sans VISA : *IDN?, file d’erreurs, attentes *OPC?, mesures répétées vers CSV.",
  },
  summary: "Envoyez des commandes à des instruments SCPI comme des alimentations, multimètres et oscilloscopes et lisez les réponses. Se connecte par socket LAN (TCP 5025) ou RS-232 sans installer VISA, identifie l’instrument avec *IDN?, vide la file d’erreurs et journalise des relevés numériques répétés en CSV.",
  who: [
    "Développeurs qui vérifient les commandes à la main avant d’écrire l’automatisation de test",
    "Techniciens de terrain qui veulent jeter un œil rapide à un instrument depuis un PC sans VISA",
  ],
  features: [
    {
      title: "Sans VISA",
      body: "Socket LAN (en général 5025) et RS-232 (vitesse, parité, contrôle de flux) avec fins de ligne LF, CR LF ou CR. VXI-11, HiSLIP et USBTMC ne sont pas encore pris en charge.",
    },
    {
      title: "Interroger, écrire, lire",
      body: "Les commandes se terminant par ? sont interrogées, les autres écrites. Temps de réponse, délais dépassés et réponses sans fin de ligne sont affichés. Historique des commandes, liste de commandes et complétion pour les commandes courantes.",
    },
    {
      title: "ID, file d’erreurs, *OPC?",
      body: "*IDN? découpé en fabricant, modèle, numéro de série et firmware ; SYST:ERR? interrogé jusqu’à 0 pour lister toutes les erreurs en file. Boutons pour *RST, *CLS et l’attente de *OPC?.",
    },
    {
      title: "Mesure répétée",
      body: "Répétez une requête comme MEAS:VOLT:DC? à intervalle réglé un nombre de fois donné, avec tableau de valeurs, tendance et statistiques (min, max, moyenne, écart type), enregistré en CSV.",
    },
    {
      title: "Données en bloc",
      body: "Les blocs IEEE 488.2 (#NXXXX…) sont lus d’après leur en-tête de longueur, de sorte que des octets LF dans des données binaires ne les coupent pas. Aperçu HEX et enregistrement dans un fichier (par ex. captures d’écran PNG).",
    },
  ],
  steps: [
    "LAN : IP de l’instrument et port 5025 ; série : port et vitesse comme sur l’instrument",
    "«Connecter» (F4) — *IDN? affiche le nom de l’instrument",
    "Saisissez une commande et appuyez sur Entrée ; vérifiez les erreurs avec «Vider la file d’erreurs»",
  ],
  uses: [
    {
      title: "Vérifier des commandes avant d’automatiser",
      body: "Saisissez des commandes à la main et voyez la réponse et le temps de réponse. Les commandes se terminant par ? sont des requêtes, les autres des écritures. Contrôlez les erreurs aussitôt avec «Vider la file d’erreurs».",
    },
    {
      title: "Atteindre un instrument depuis un PC sans VISA",
      body: "Connectez-vous directement par socket LAN (en général port 5025) ou RS-232. *IDN? est découpé en fabricant, modèle, numéro de série et firmware.",
    },
    {
      title: "Journaliser des relevés répétés en CSV",
      body: "Dans «Mesure répétée», lancez une requête comme MEAS:VOLT:DC? à intervalle réglé un nombre de fois donné, consultez le tableau, la tendance et les statistiques (min, max, moyenne, écart type) et enregistrez en CSV.",
    },
    {
      title: "Récupérer des données en bloc comme des captures d’écran",
      body: "Les blocs IEEE 488.2 (#N…) sont lus d’après leur en-tête de longueur, de sorte que des octets LF dans des données binaires ne les coupent pas. Aperçu en HEX et enregistrement dans un fichier (PNG, etc.).",
    },
  ],
  faq: [
    {
      q: "J’obtiens «connection refused»",
      a: "Le port est différent (vérifiez dans le manuel le «socket port» — tous les instruments n’utilisent pas 5025) ou l’interface socket est désactivée. Certains instruments refusent une nouvelle connexion tant qu’un autre programme (une session VISA) y est relié.",
    },
    {
      q: "J’obtiens «no response (timeout)»",
      a: "Une commande qui n’est pas une requête a été envoyée comme requête, la commande comporte une faute (consultez la file d’erreurs) ou l’instrument est occupé à mesurer. Allongez l’attente de réponse ou utilisez *OPC?. «Reply not finished» signifie que la fin de ligne (LF, CR LF, CR) diffère de celle de l’instrument.",
    },
    {
      q: "Qu’est-ce que -410 Query INTERRUPTED ?",
      a: "La commande suivante a été envoyée avant que la réponse soit lue. Si vous avez envoyé une requête avec «Écrire», récupérez d’abord la réponse avec «Lire».",
    },
    {
      q: "Prend-il en charge USBTMC, GPIB, VXI-11 ou HiSLIP ?",
      a: "Pas pour le moment. VXI-11 n’est pas pris en charge actuellement ; HiSLIP, USBTMC et GPIB exigent VISA ou des pilotes et sortent du cadre. La plupart des instruments LAN offrent aussi un socket (5025), et les instruments uniquement USB disposant du réglage «USB virtual COM» fonctionnent en série.",
    },
    {
      q: "Puis-je l’essayer sans instrument ?",
      a: "Lancez PortDock Simulator comme serveur TCP sur 5025 avec découpage LF et l’exemple [SCPI *IDN? reply], puis connectez-vous à 127.0.0.1:5025.",
    },
  ],
  similar: "Les outils de fabricants basés sur VISA (NI MAX, Keysight Connection Expert …) peuvent aussi envoyer des commandes. PortDock SCPI se connecte par socket LAN ou RS-232 sur des PC sans VISA.",
};
