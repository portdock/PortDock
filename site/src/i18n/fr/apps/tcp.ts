// PortDock TCP — texte de présentation.
export default {
  seo: {
    title: "PortDock TCP — client, serveur et relais TCP gratuits pour tests",
    desc: "Outil de test de sockets TCP gratuit pour Windows : client, serveur multi-connexions et relais (écoute), écho, reconnexion auto et découpage Modbus TCP.",
  },
  summary: "Connectez-vous à un appareil Ethernet (client) ou laissez les appareils se connecter au PC (serveur). Le serveur accepte plusieurs pairs et peut envoyer à un seul ou à tous ; le relais se place entre deux appareils et journalise les deux sens.",
  who: [
    "Développeurs d’IHM, de MES et de logiciels hôtes",
    "Développeurs de firmware d’appareils TCP",
  ],
  features: [
    {
      title: "Client et serveur",
      body: "Le serveur accepte jusqu’à 64 pairs ; envoyez à un seul ou à tous, et déconnectez-les individuellement.",
    },
    {
      title: "Relais (écoute)",
      body: "Se place entre A (par ex. une IHM) et B (par ex. un automate), laisse passer le trafic et journalise les deux sens.",
    },
    {
      title: "Reconnexion automatique",
      body: "Le client se reconnecte à intervalle réglé quand la liaison tombe.",
    },
    {
      title: "Fonction écho",
      body: "Le serveur renvoie ce qui arrive ; l’écho se coupe tout seul au-delà de 200 par seconde pour arrêter les boucles d’écho.",
    },
    {
      title: "Découpage et sommes de contrôle",
      body: "Découpez le flux TCP par silence, terminateur, longueur fixe ou Modbus TCP (longueur MBAP) et vérifiez neuf types de sommes de contrôle ou une CRC personnalisée.",
    },
    {
      title: "Adresse d’écoute 127.0.0.1 au premier démarrage (à partir de 0.10.0)",
      body: "L’«Adresse d’écoute» du serveur et l’«Adresse de ce PC à laquelle A se connecte» du relais démarrent à 127.0.0.1 (ce PC seulement). Pour qu’un autre PC ou une IHM se connecte, choisissez-y 0.0.0.0 (toutes les cartes) ou l’adresse d’une carte. Les réglages enregistrés par les versions précédentes sont conservés.",
    },
  ],
  steps: [
    "Choisissez «Client» ou «Serveur», saisissez l’adresse et le port",
    "«Connecter» ou «Écouter»",
    "Saisissez puis «Envoyer»",
  ],
  uses: [
    {
      title: "Dialoguer avec un appareil",
      body: "Si l’appareil attend des connexions, utilisez «Client» avec son IP et son port, envoyez des commandes et lisez les réponses en HEX ou en ASCII. Le client se reconnecte à intervalle réglé si la liaison tombe.",
    },
    {
      title: "Quand l’appareil se connecte au PC",
      body: "Ouvrez un port avec «Serveur» et jusqu’à 64 appareils peuvent se connecter. Envoyez à un seul ou à tous, et déconnectez-les un par un.",
    },
    {
      title: "Journaliser le trafic IHM ⇄ automate",
      body: "Avec «Relais», le PC se place entre deux appareils ; dirigez l’IHM vers ce PC et les deux sens sont journalisés. Les octets passent sans modification. À partir de 0.8.0, le relais peut enregistrer un pcap et affiche les paires requête–réponse Modbus/MC et les temps de réponse.",
    },
    {
      title: "Lire une fois un appareil Modbus TCP",
      body: "Connectez-vous au port 502 et une barre «Voir en Modbus TCP» apparaît. Elle sépare requêtes et réponses une à une et les décode dans le volet de détail. Pour une interrogation continue, Modbus Master est plus pratique.",
    },
  ],
  faq: [
    {
      q: "Le client n’arrive pas à se connecter (CONNECT FAIL)",
      a: "Vérifiez l’alimentation et le câble de l’appareil, l’IP et le port, et que le PC et l’appareil sont dans le même sous-réseau (par ex. 192.168.0.x).",
    },
    {
      q: "J’ai démarré le serveur mais l’appareil ne peut pas se connecter",
      a: "Assurez-vous d’avoir autorisé l’accès dans l’invite du pare-feu Windows et que l’appareil se connecte à l’IP de ce PC. Une erreur «already in use» signifie qu’un autre programme occupe le port.",
    },
    {
      q: "Les données semblent fusionnées ou coupées",
      a: "TCP ne conserve pas les limites de message. Passez le découpage dans «Réglages de réception» sur terminateur, longueur fixe ou Modbus TCP (longueur MBAP), ou ajustez le silence.",
    },
    {
      q: "Le relais modifie-t-il le trafic ?",
      a: "Non. Les octets sont transmis tels qu’ils arrivent ; le découpage et le contrôle de sommes ne servent qu’au journal, et la réponse automatique et l’écho sont désactivés. Seul ce que vous injectez vous-même atteint les appareils, soyez donc prudent.",
    },
  ],
  similar: "Parmi les outils similaires, le Hercules SETUP utility (HW-group, freeware).",
};
