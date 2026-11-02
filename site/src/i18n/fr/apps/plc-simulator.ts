// PortDock PLC Simulator — texte de présentation. Noms des commandes MC d’après les manuels SLMP de Mitsubishi Electric en français.
export default {
  seo: {
    title: "PortDock PLC Simulator — simulateur gratuit du protocole MC (SLMP)",
    desc: "Outil Windows gratuit pour tester le protocole MC (3E/4E, binaire/ASCII) sans automate : tables d’équipements (D, M, X, Y …), lecture/écriture, défauts.",
  },
  summary: "Le PC répond aux requêtes du protocole MC (SLMP) comme le port Ethernet d’un automate. Placez des valeurs dans les tables d’équipements et un logiciel d’IHM, de collecte de données ou hôte peut les lire et les écrire ; des retards et des codes de fin d’erreur volontaires testent sa gestion d’erreurs. Il suit les formats de message des manuels publics de Mitsubishi Electric (SLMP/MC) ; il n’est pas affilié à la société, et le comportement peut différer d’un vrai automate.",
  who: [
    "Équipes qui préparent écrans d’IHM et communication avant l’arrivée de l’automate",
    "Développeurs de logiciels de collecte de données ou hôtes qui lisent des automates par le protocole MC",
  ],
  features: [
    {
      title: "3E/4E, binaire/ASCII, TCP/UDP",
      body: "Écoute comme serveur TCP (plusieurs clients) ou en UDP. Les réponses 4E reprennent le numéro de série de la requête. Par défaut seul ce PC (127.0.0.1) peut se connecter ; autoriser d’autres PC est votre choix.",
    },
    {
      title: "Commandes implémentées",
      body: "0401 lecture par lot et 1401 écriture par lot (mots et bits, sous-commandes 0000–0003), 0403 lecture aléatoire, 1402 écriture aléatoire et 0619 test de bouclage. À partir de 0.6.0 aussi 0406/1406 lecture/écriture de bloc, 0801/0802 surveillance, 1001–1006 RUN/STOP/PAUSE/effacement du verrou/réinitialisation à distance (état simulé seulement) et 0101 lecture du nom de type (valeurs simulées). Les autres commandes reçoivent le code de fin C059.",
    },
    {
      title: "Protocole dédié LS XGT (à partir de 0.10.0)",
      body: "Passez «Protocole» sur «XGT dédié» et il répond au protocole dédié FEnet des automates LS ELECTRIC XGT (en-tête «LSIS-XGT», par défaut TCP 2004 · UDP 2005) : lecture h0054 et écriture h0058, individuelles (%MX, %MB, %MW, %MD, %ML, jusqu’à 16 blocs) et continues (octets %MB, jusqu’à 1 400 octets), équipements P, M, K, F, T, C, D, L, N, et réponses avec code d’erreur (1–6, h75–h78). Construit d’après les manuels d’utilisation publics de LS ELECTRIC — non affilié.",
    },
    {
      title: "Règles conditionnelles (à partir de 0.6.0)",
      body: "Imitez des échanges comme «quand le bit de demande passe à 1, mettre le bit de fin à 1 300 ms plus tard» : condition (bit ON/OFF/front, comparaison de mots, périodique) → retard (fixe ou aléatoire) → actions (écritures de bits et de mots). Ce n’est pas un programme à contacts.",
    },
    {
      title: "18 équipements",
      body: "X, Y, M, L, F, B, SM, D, W, R, ZR, SD, TS, TC, TN, CS, CC et CN. X, Y, B, W et ZR utilisent des numéros hexadécimaux ; chaque équipement a une taille et les requêtes au-delà reçoivent C056. Les équipements à bits peuvent être vus comme des mots de 16 points ; les cellules peuvent être en 32 bits, flottant, chaîne ou nommées.",
    },
    {
      title: "Injection de défauts",
      body: "Retard de réponse (avec plage), pas de réponse ou code de fin choisi — ciblés par commande, équipement, une requête sur N ou probabilité.",
    },
    {
      title: "Trafic décodé",
      body: "Chaque requête affiche le nom de la commande, l’équipement et les points ; chaque réponse le code de fin et sa signification. Les cellules modifiées par un client clignotent, avec des statistiques.",
    },
    {
      title: "Simulation et états enregistrés",
      body: "Les valeurs peuvent évoluer d’elles-mêmes (incrément, aléatoire, sinus, rampe, bascule), et les valeurs d’équipements et les réglages de cellules s’enregistrent dans un fichier JSON et s’en rechargent.",
    },
  ],
  steps: [
    "Accordez la trame (3E/4E), le code de données (binaire/ASCII) et le port avec le client",
    "Choisissez un équipement (D, M, X …) et saisissez des valeurs",
    "«Démarrer» — les lectures et écritures du client reçoivent leur réponse depuis les tables",
  ],
  faq: [
    {
      q: "Se comporte-t-il exactement comme un vrai automate ?",
      a: "Non. Il suit les formats de message des manuels publics et n’a pas été comparé à du vrai matériel. Aucun programme à contacts ne s’exécute, et les codes d’erreur, les temps, les limites de connexion et les plages d’équipements par modèle peuvent différer.",
    },
    {
      q: "Comment connecter une IHM sur un autre PC ?",
      a: "Activez «Autoriser d’autres PC à se connecter (0.0.0.0)» et autorisez le programme dans le pare-feu Windows. Ne l’exécutez pas sur un réseau d’usine avec la même IP et le même port qu’un vrai automate.",
    },
  ],
  similar: "Parmi les outils similaires, DummyPLC (gratuit, code fermé) et HslCommunication (commercial). PortDock PLC Simulator est gratuit (GPL-3.0) et ajoute l’injection de défauts, le trafic décodé et la simulation de valeurs.",
};
