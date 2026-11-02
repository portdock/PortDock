// PortDock Net Scan — texte de présentation.
export default {
  seo: {
    title: "PortDock Net Scan — scanner IP gratuit pour réseaux industriels",
    desc: "Scanner IP gratuit pour réseaux industriels : balayage ping et ARP, fabricant MAC, ports industriels (Modbus 502, MC, XGT, S7 …), ping longue durée.",
  },
  summary: "Balayez le sous-réseau d’une carte réseau pour trouver des appareils et identifiez-les par le fabricant de l’adresse MAC et leurs ports industriels ouverts (Modbus 502, MC, XGT, S7, EtherNet/IP, OPC UA …). Les appareils qui bloquent le ping sont tout de même trouvés par ARP sur le même sous-réseau.",
  who: [
    "Techniciens de terrain qui ne connaissent pas l’IP d’un nouvel appareil",
    "Toute personne qui doit surveiller un réseau d’appareils pendant la nuit",
  ],
  features: [
    {
      title: "Balayage ping + ARP",
      body: "L’ARP sur le même sous-réseau trouve les appareils qui bloquent le ping ; affiche le temps de réponse, le nom, ce PC et la passerelle. Aucun droit d’administrateur nécessaire.",
    },
    {
      title: "Vérification des ports industriels",
      body: "Ne vérifie qu’une liste de ports (par défaut 502, 2004, 5000–5010, 102, 44818, 4840 …; modifiable, jusqu’à 32) — pas de scan de ports général — et demande aux appareils Modbus leur fabricant/modèle (FC 2B/0E).",
    },
    {
      title: "Remarques d’exposition (à partir de 0.10.0)",
      body: "Si Modbus 502, MC 5006/5007, EtherNet/IP 44818, S7 102, OPC UA 4840, Telnet 23 ou HTTP 80 figure parmi les ports déjà vérifiés, ajoute une remarque du type «Protocole industriel ouvert — toute personne du même réseau peut lire et écrire (sans authentification) — vérifiez la séparation des réseaux». Ne scanne aucun port de plus et ne modifie aucun réglage d’appareil.",
    },
    {
      title: "Découverte par broadcast — EtherNet/IP, BACnet",
      body: "Seulement sur clic, envoie EtherNet/IP ListIdentity (UDP 44818) et BACnet Who-Is (UDP 47808) à l’adresse de broadcast de l’adaptateur choisi et fusionne dans le tableau le fabricant, le type d’appareil, le nom du produit et la révision — et pour BACnet l’instance d’appareil et l’ID du fabricant — des appareils dont vous ignorez l’IP. Requêtes en lecture seule ; les numéros de série ne sont pas affichés.",
    },
    {
      title: "Fabricant MAC",
      body: "La liste IEEE intégrée affiche le fabricant sans accès à Internet.",
    },
    {
      title: "Surveillance ping longue durée",
      body: "Consigne pertes, latence et coupures de plusieurs appareils dans un CSV et fait clignoter la barre des tâches en cas de coupure.",
    },
    {
      title: "Nouveaux / manquants",
      body: "Compare avec le balayage précédent pour marquer les appareils nouveaux et manquants. Export en CSV.",
    },
    {
      title: "Références — comparer avec la dernière fois (à partir de 0.10.0)",
      body: "Enregistrez la liste d’appareils comme références nommées (plusieurs, aussi en fichiers JSON) et comparez le balayage suivant avec l’une d’elles — nouveau (ajouté ?), manquant (retiré ou éteint ?), MAC modifiée (autre appareil sur la même IP, remplacé ?), IP modifiée (le même appareil sur une autre IP, DHCP ?) et ports ouverts modifiés, en couleurs. CSV de comparaison et copie «AI» (3 derniers octets de la MAC masqués). Les fichiers de référence contiennent des adresses MAC — prudence au partage.",
    },
    {
      title: "Wake-on-LAN, ouverture de la page web",
      body: "Par appareil : ouvrir sa page web, copier IP/MAC, envoyer un paquet magique.",
    },
  ],
  steps: [
    "Choisissez un adaptateur réseau — son sous-réseau devient la plage (le /24 où il se trouve, s’il est plus large)",
    "«Balayer» (F4)",
    "Vérifiez les colonnes des services et du fabricant ; cliquez sur un appareil pour ouvrir sa page web, copier son IP, le réveiller ou l’ajouter avec «Ajouter à la surveillance»",
  ],
  similar: "Parmi les outils similaires, Angry IP Scanner (open source) et Advanced IP Scanner (freeware). PortDock Net Scan ajoute la vérification des ports industriels (Modbus 502, MC, XGT, S7 …) et la surveillance ping longue durée.",
};
