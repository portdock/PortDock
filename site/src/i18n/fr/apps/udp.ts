// PortDock UDP — texte de présentation.
export default {
  seo: {
    title: "PortDock UDP — émetteur/récepteur UDP gratuit (broadcast)",
    desc: "Outil de test UDP gratuit pour Windows : réception et envoi de datagrammes, broadcast et multicast, réponse au dernier émetteur, écho et journaux horodatés.",
  },
  summary: "Recevez des datagrammes sur un port et répondez à une destination fixe ou au dernier émetteur. Conçu pour les appareils en broadcast et en multicast.",
  who: [
    "Toute personne qui travaille avec des appareils diffusant leur état en UDP",
    "Les équipes qui vérifient la réception multicast",
  ],
  features: [
    {
      title: "Liste des émetteurs",
      body: "Collecte les adresses des émetteurs ; un clic sur l’une d’elles la prend comme destination.",
    },
    {
      title: "Broadcast et multicast",
      body: "Autorisez le broadcast, rejoignez ou réadhérez à un groupe multicast, choisissez la carte réseau.",
    },
    {
      title: "Fonction écho",
      body: "Renvoie à l’émetteur ce qui arrive, avec une protection automatique contre les boucles.",
    },
  ],
  steps: [
    "Saisissez le port d’écoute et la destination",
    "Cliquez sur «Démarrer»",
    "Saisissez puis «Envoyer»",
  ],
  uses: [
    {
      title: "Recevoir des diffusions d’état",
      body: "Saisissez le port d’écoute et cliquez sur «Démarrer». Chaque datagramme donne une ligne de journal et les émetteurs s’accumulent dans la liste «Émetteurs» (jusqu’à 256).",
    },
    {
      title: "Quand vous ne connaissez pas l’adresse de l’appareil",
      body: "Mettez-vous à l’écoute sur le port vers lequel l’appareil émet et surveillez «Émetteurs». Cliquez sur «Prendre comme destination» à côté d’une adresse pour y répondre.",
    },
    {
      title: "Envoyer un broadcast",
      body: "Activez «Autoriser le broadcast» avant de démarrer, puis envoyez à 255.255.255.255 ou à une adresse comme 192.168.0.255. Un avertissement apparaît si l’option est désactivée.",
    },
    {
      title: "Vérifier la réception multicast",
      body: "Saisissez un groupe (224–239.x.x.x) et il est rejoint au démarrage. Avec plusieurs cartes réseau (réseau bureautique et réseau machine), choisissez la «Carte réseau multicast» côté machine. Le TTL par défaut de 1 reste sur le réseau local.",
    },
  ],
  faq: [
    {
      q: "Rien n’arrive",
      a: "Vérifiez l’IP et le port vers lesquels l’appareil émet, l’autorisation dans le pare-feu Windows et que les deux sont dans le même sous-réseau. Pour le multicast, vérifiez le groupe et la carte réseau et essayez «Réadhérer».",
    },
    {
      q: "Le démarrage échoue avec «address in use»",
      a: "Un autre programme occupe le port ; la ligne d’événement nomme ce programme et son PID. Utilisez un autre port ou fermez-le.",
    },
    {
      q: "Que signifie «ICMP port unreachable» ?",
      a: "Le système signale que rien n’écoute sur ce port à la destination. Vérifiez le numéro de port de l’appareil et son alimentation.",
    },
    {
      q: "Quelle quantité puis-je envoyer d’un coup ?",
      a: "Un envoi est un datagramme. Au-delà d’environ 64 Ko, le système le rejette.",
    },
  ],
};
