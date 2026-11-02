// PortDock Hardware Tester — texte de présentation.
export default {
  seo: {
    title: "PortDock Hardware Tester — coupures Wi-Fi et journal ping",
    desc: "Outil Windows gratuit qui journalise les coupures Wi-Fi : ping passerelle et Internet côte à côte, temps DNS, motifs de déconnexion Windows, journal Bluetooth.",
  },
  summary: "Transforme «mon Wi-Fi n’arrête pas de couper» en relevé. Pendant l’enregistrement, il envoie des pings à votre passerelle (routeur) et à une adresse Internet côte à côte, trace latence et pertes sur un seul graphique avec les motifs de déconnexion Wi-Fi consignés par Windows sur la même ligne de temps, et vous dit s’il faut chercher du côté du routeur ou au-delà. Il journalise aussi les connexions et déconnexions des appareils Bluetooth. Lecture seule, sans droits d’administrateur ; il ne modifie aucun réglage.",
  who: [
    "Toute personne dont le Wi-Fi coupe sans cesse et qui veut savoir si c’est le routeur ou Internet",
    "Les personnes qui veulent une trace du moment où des écouteurs ou claviers Bluetooth se déconnectent",
    "Techniciens de terrain qui documentent la liaison sans fil d’un PC d’appareil avant un appel au support",
  ],
  features: [
    {
      title: "Passerelle contre Internet",
      body: "Envoie des pings au routeur et à une adresse Internet (1.1.1.1, 8.8.8.8 ou la vôtre) au même rythme et affiche pertes, moyenne, 95e centile et gigue côte à côte. Jamais plus d’un par seconde ; un enregistrement s’arrête au bout de 24 heures.",
    },
    {
      title: "Motifs de déconnexion de Windows sur le même graphique",
      body: "Lit le journal WLAN-AutoConfig (8001 connexion, 8003 déconnexion) et l’affiche sous forme de lignes sur le graphique et avec la formulation de Windows dans la liste d’événements. Le nom du réseau Wi-Fi n’est pas lu.",
    },
    {
      title: "Temps de réponse DNS",
      body: "Toutes les 5 s, un nom (example.com par défaut) est interrogé auprès du serveur DNS sans le cache, avec mesure des temps de réponse et des échecs.",
    },
    {
      title: "Résumé «où chercher» et CSV",
      body: "Dit «côté routeur» quand les pertes atteignent la passerelle et «au-delà du routeur» quand seule la cible Internet perd des réponses — où chercher, pas la cause. Les enregistrements s’exportent en CSV.",
    },
    {
      title: "Journal des connexions Bluetooth",
      body: "Lit toutes les 2 s l’état «Connecté» des appareils appairés et journalise connexions et coupures. Les noms ne s’affichent qu’à l’écran ; le texte enregistré et copié utilise «Appareil N».",
    },
    {
      title: "Journal des connexions/déconnexions USB (à partir de 0.10.0)",
      body: "Trouve quel appareil USB est derrière un son de connexion/déconnexion qui se répète. Journalise les heures de branchement et de retrait avec nom de l’appareil, VID:PID, port du concentrateur et vitesse, marque comme «coupures répétées suspectées» un appareil qui décroche 3 fois ou plus en 10 minutes et comme «À examiner» un appareil USB 3 qui fonctionne à la vitesse USB 2.0. Il lit aussi les dernières heures d’arrivée/retrait d’avant le démarrage de l’appli.",
    },
    {
      title: "Mode audio Bluetooth et sons gauche/droite",
      body: "Indique si la sortie par défaut est en stéréo (A2DP) ou en mains libres pour les appels, et joue des sons de test à gauche, à droite et des deux côtés.",
    },
    {
      title: "Signal Wi-Fi et canal (sur demande)",
      body: "Seulement tant que «Afficher le signal» est activé : puissance du signal, vitesse de liaison, bande, canal et nombre de réseaux voisins sur chaque canal (sans noms). À partir de Windows 11 24H2, cela exige l’autorisation de localisation (le reste fonctionne sans).",
    },
  ],
  steps: [
    "Choisissez la cible Internet et l’intervalle, puis «Démarrer l’enregistrement»",
    "Laissez tourner jusqu’aux coupures — latence du routeur et d’Internet et motifs de Windows sur un seul graphique",
    "Lisez où chercher dans «Résumé», puis «Enregistrer CSV…» ou «Copier le résumé»",
  ],
  faq: [
    {
      q: "Mesure-t-il le débit Internet ?",
      a: "Non. Il enregistre coupures, latence et pertes, pas le débit descendant ou montant. Utilisez pour cela un site de test de débit.",
    },
    {
      q: "Corrige-t-il le problème ?",
      a: "Non. Il ne fait que lire et ne modifie aucun réglage. Il indique où chercher (côté routeur, au-delà du routeur, DNS, motifs de déconnexion de Windows).",
    },
    {
      q: "Qu’envoie-t-il vers l’extérieur ?",
      a: "Seulement les pings vers la passerelle et l’adresse Internet choisie et une résolution DNS, pendant l’enregistrement. Les cibles sont toujours affichées, et rien n’est envoyé après l’arrêt.",
    },
  ],
  similar: "Parmi les outils similaires, PingPlotter (commercial, avec édition gratuite) et WifiHistoryView (gratuit, historique des connexions/déconnexions). PortDock Hardware Tester est gratuit (GPL-3.0) et réunit sur un seul graphique pings passerelle et Internet et motifs de déconnexion de Windows, avec un journal des connexions Bluetooth.",
};
