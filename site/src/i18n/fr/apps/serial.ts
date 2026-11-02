// PortDock Serial — texte de présentation (structure de data/tools.ts ; noms, commandes et versions inchangés).
export default {
  seo: {
    title: "PortDock Serial — terminal série gratuit pour Windows (RS-232/485)",
    desc: "Terminal série gratuit pour Windows (RS-232, RS-485, COM USB) : HEX/ASCII, reconnexion auto, neuf sommes de contrôle, décodage Modbus RTU, journaux horodatés.",
  },
  summary: "Échangez des données avec des appareils RS-232, RS-485 et série USB et gardez un journal de test horodaté. Si vous débranchez et rebranchez un adaptateur USB, le programme se reconnecte au même appareil.",
  who: [
    "Techniciens de terrain qui mettent en service un nouvel appareil",
    "Développeurs de firmware qui testent un protocole UART",
    "Toute personne qui doit lire des trames Modbus RTU",
  ],
  features: [
    {
      title: "Des ports reconnaissables",
      body: "Affiche à côté de chaque port le nom de l’appareil, le VID:PID USB et le numéro de série, et se met à jour au branchement et au débranchement.",
    },
    {
      title: "Survit aux déconnexions",
      body: "Rouvre le même appareil après un rebranchement même si le numéro COM a changé, et consigne chaque coupure et chaque reconnexion.",
    },
    {
      title: "Quatre modes de découpage",
      body: "Silence, terminateur, longueur fixe ou Modbus RTU — pour qu’un message tienne sur une ligne.",
    },
    {
      title: "Neuf sommes de contrôle et CRC personnalisée",
      body: "Ajoutez à l’envoi CRC16 Modbus/CCITT/XMODEM, CRC8, LRC, BCC, SUM8, SUM16, CRC-32 ou une CRC personnalisée, et vérifiez-les à la réception.",
    },
    {
      title: "Décodage Modbus RTU",
      body: "Décode les requêtes, réponses et exceptions en adresse, fonction et valeurs.",
    },
    {
      title: "Lignes de signal",
      body: "Basculez DTR/RTS et surveillez CTS/DSR/RI/CD sur des voyants et dans le journal.",
    },
    {
      title: "Journaux de test",
      body: "Horodatage à la milliseconde, liste de commandes, envoi répété et journalisation continue dans un fichier.",
    },
    {
      title: "Vérifier la connexion…",
      body: "Lit sans droits d’administrateur l’appareil, le pilote, le code de problème, le minuteur de latence FTDI et l’économie d’énergie USB du port choisi, et lance un test de bouclage ou d’écho RS-485 2 fils. À partir de 0.10.0 aussi un test à deux ports (deux adaptateurs reliés entre eux), des motifs (0x00–0xFF, 0x55/0xAA) et un schéma de câblage. Rien n’est modifié.",
    },
    {
      title: "Partage de port — COM ↔ TCP (à partir de 0.10.0)",
      body: "Expose le port COM ouvert comme serveur TCP afin que d’autres programmes, WSL2, Docker ou un autre PC utilisent le même port. Brut ou RFC 2217 (changement distant de vitesse/parité) ; les données reçues vont à tous les clients et le client émetteur est repéré dans le journal. Uniquement ce PC (127.0.0.1) par défaut ; d’autres PC seulement si vous l’autorisez. Pas de pilote COM virtuel, pas de droits d’administrateur.",
    },
    {
      title: "Passerelle Modbus TCP ↔ RTU (à partir de 0.10.0)",
      body: "Transforme le PC en passerelle — un SCADA, une IHM ou un programme PC se connecte en Modbus TCP (port 502 par défaut), les requêtes partent vers les appareils RS-485 en trames RTU et les réponses reviennent en MBAP. Une requête à la fois, pas de réponse → exception 0B, pas de route → 0A, statistiques de requêtes/réponses/délais dépassés et lignes de journal comme «TCP #1 → RTU unité 3 FC03».",
    },
    {
      title: "Écoute Modbus RTU sans émettre (à partir de 0.10.0)",
      body: "Écoute le trafic maître–esclave par un adaptateur sur le bus RS-485 sans rien envoyer. Les trames sont découpées par CRC (avec resynchronisation quand les silences se brouillent), avec paires requête/réponse, temps de réponse, absences de réponse, exceptions et statistiques. Pour RS-232, deux ports sur un câble en Y se fondent sur une seule ligne de temps. Journalisation dans des fichiers, CSV compris.",
    },
  ],
  steps: [
    "Choisissez le port, la vitesse et la parité, puis «Connecter»",
    "Saisissez du HEX ou de l’ASCII ; ajoutez au besoin une somme de contrôle ou une fin de ligne",
    "«Envoyer» — les lignes reçues s’affichent en RX ◀, les envoyées en TX ▶",
  ],
  similar: "Parmi les outils similaires, Tera Term et PuTTY (terminaux open source). PortDock Serial réunit sur un seul écran des fonctions de test d’appareil — reconnexion USB, découpage, contrôle de sommes, décodage Modbus RTU.",
};
