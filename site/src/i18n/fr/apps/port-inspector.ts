// PortDock Port Inspector — texte de présentation. Noms d’écrans Windows comme dans Windows en français.
export default {
  seo: {
    title: "PortDock Port Inspector — diagnostic gratuit de ports COM (USB)",
    desc: "Diagnostic gratuit de ports COM pour Windows : pilote USB série, code du Gestionnaire de périphériques, latence FTDI, COM fantômes. Lecture seule, bouclage.",
  },
  summary: "Choisissez un port COM et voyez au même endroit ce que vous iriez sinon chercher dans le Gestionnaire de périphériques, l’Observateur d’événements et le registre : le pilote, le code de problème et sa signification, la puce USB, les réglages de l’appareil comme le minuteur de latence FTDI, l’économie d’énergie USB, l’historique récent des branchements et les réservations de numéros COM. Il ne fait que lire, sans droits d’administrateur, et avec TX relié à RX il mesure l’aller-retour à chaque vitesse. D’autres onglets lisent de la même façon les cartes réseau de ce PC, ses réglages Windows en tant que PC d’équipement, ainsi que le Wi-Fi et le Bluetooth.",
  who: [
    "Techniciens de terrain dont l’adaptateur USB-série n’est pas détecté ou décroche de temps en temps",
    "Toute personne qui cherche pourquoi les réponses Modbus RTU semblent tardives (minuteur de latence FTDI)",
    "Toute personne qui doit joindre à une demande de support ou à un ticket les détails du port côté PC",
  ],
  features: [
    {
      title: "Appareil, pilote, code de problème",
      body: "Nom, numéro COM, emplacement, ID d’instance et fabricant ; fournisseur du pilote, version, date, INF et service ; état et code de problème du Gestionnaire de périphériques avec sa signification et ce qu’il faut essayer ; dernier branchement et retrait.",
    },
    {
      title: "Puce USB et réglages de l’appareil",
      body: "Nom de la puce d’après une table VID/PID (FTDI, Prolific PL2303, WCH CH34x, Silicon Labs CP210x …), valeur par défaut Windows du port et paramètres de périphérique du pilote, avec explication du minuteur de latence FTDI (LatencyTimer).",
    },
    {
      title: "Économie d’énergie et historique",
      body: "Suspension sélective USB des options d’alimentation, «Autoriser l’ordinateur à éteindre ce périphérique pour économiser l’énergie» pour l’appareil et les appareils USB situés au-dessus, et événements de branchement et de pilote issus des journaux d’événements (7, 30 ou 90 jours).",
    },
    {
      title: "Réservations de numéros COM",
      body: "Numéros que Windows garde réservés (ComDB), numéros tenus par des appareils non connectés actuellement, numéros orphelins et numéros tenus par plusieurs appareils — pourquoi un nouvel adaptateur se retrouve sur COM15.",
    },
    {
      title: "Test de connexion",
      body: "Un bouclage TX–RX par vitesse : octets identiques, perdus et modifiés, aller-retour d’un octet en ms (médiane et maximum) et indicateurs d’erreur du pilote (ClearCommError). Indique aussi si un adaptateur RS-485 2 fils renvoie un écho.",
    },
    {
      title: "Test à deux ports et motifs (à partir de 0.10.0)",
      body: "Avec deux adaptateurs reliés entre eux, envoie dans les deux sens à chaque vitesse et compare ce qui arrive (pour vérifier des adaptateurs RS-485). Motifs : octets mêlés, 0x00–0xFF, 0x55/0xAA ; longueur 64–4096 octets. Schéma de câblage en texte et verdict global «Aucun problème trouvé (dans ce test) / À examiner / Problème». Identique dans Serial «Vérifier la connexion…».",
    },
    {
      title: "Cartes réseau de ce PC",
      body: "«Lire les cartes» affiche, pour chaque carte, lien, vitesse, duplex, IPv4 et passerelle ainsi que les valeurs «Avancé» du Gestionnaire de périphériques (trames jumbo, tampons de réception, modération des interruptions, EEE …), économie d’énergie, erreurs de réception, profil réseau et état de son pare-feu. L’usage «caméra GigE» affiche les valeurs publiées par les fabricants de caméras, avec les sources à côté.",
    },
    {
      title: "Ce PC — réglages d’un PC d’équipement",
      body: "«Lire les réglages de ce PC» lit le démarrage rapide, la mise en veille, la suspension sélective USB, la politique de redémarrage des mises à jour, l’écran de veille, la synchronisation de l’heure ainsi que les arrêts inattendus et erreurs matérielles récents. Avec l’usage «PC d’équipement», les valeurs pouvant entraîner des arrêts ou des redémarrages sont marquées «À examiner».",
    },
    {
      title: "Ce PC — écrans bleus, santé du SSD, sources de réveil (à partir de 0.10.0)",
      body: "La même carte «Ce PC» lit les codes d’arrêt des écrans bleus avec leurs noms (par ex. 0x50 PAGE_FAULT_IN_NONPAGED_AREA) et les heures d’arrêts brutaux, pour les SSD NVMe la température, le pourcentage utilisé, la réserve, les heures de fonctionnement et les erreurs de support, ce qui a réveillé le PC de la veille, et pour la batterie d’un portable sa capacité par rapport à la capacité nominale et le nombre de cycles — sans droits d’administrateur. Les fichiers de vidage sont seulement listés ; les numéros de série des disques ne sont pas lus.",
    },
    {
      title: "Comparer avec la dernière fois — vérifications enregistrées (à partir de 0.10.0)",
      body: "Enregistrez la vérification actuelle (liste des ports COM, nom/version/date du pilote, emplacement USB, réglages des cartes réseau, réglages de «Ce PC», enregistrements d’écrans bleus) et relisez à la maintenance suivante pour ne voir que ce qui a changé — par ex. COM3 → COM7, une nouvelle version de pilote (Windows Update ?), trames jumbo désactivées, un réglage d’alimentation modifié, un nouvel écran bleu. Aucun numéro de série d’appareil, nom de PC ni dossier utilisateur n’est enregistré. Gardez le résultat en texte ou CSV.",
    },
    {
      title: "Sans fil — Wi-Fi et Bluetooth",
      body: "L’onglet «Sans fil» lit l’adaptateur Wi-Fi, le pilote, l’économie d’énergie et les enregistrements de déconnexion que garde Windows (comptés par motif), plus l’adaptateur Bluetooth, l’état du service, les événements d’erreur et si l’audio Bluetooth est en mode mains libres (appels) — sans droits d’administrateur ni autorisation de localisation. Il n’envoie aucun ping, et les exports masquent les noms d’appareils.",
    },
    {
      title: "Lecture seule, résultats clairs",
      body: "Il ne modifie jamais réglages ni pilotes (l’aide explique les corrections manuelles). Chaque carte est marquée «Aucun problème trouvé (dans ce qui a été lu) / À examiner / Problème / Lecture impossible» ; ce que le PC ne peut pas voir — inversion A/B, terminaison, polarisation, masse — est toujours listé ; les exports texte et JSON masquent les chemins de dossiers utilisateur.",
    },
  ],
  steps: [
    "Cliquez sur un port dans la liste «Ports COM» à gauche",
    "Lisez le résultat et la raison de chaque carte ; si besoin, modifiez vous-même dans Windows comme l’explique l’aide",
    "Reliez TX à RX pour le «Test de connexion» ; utilisez «Copier le texte» pour joindre le résultat à une question",
  ],
  similar: "Parmi les outils similaires, le Gestionnaire de périphériques de Windows, NirSoft USBDeview (freeware), USB Device Tree Viewer d’Uwe Sieber (freeware) et FT_PROG de FTDI pour les puces FTDI (gratuit). PortDock Port Inspector réunit au même endroit le pilote, le code de problème, l’économie d’énergie, l’historique des branchements et les réservations de numéros COM d’un port COM, et ajoute un test de connexion en bouclage.",
};
