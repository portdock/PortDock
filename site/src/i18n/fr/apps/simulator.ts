// PortDock Simulator — texte de présentation.
export default {
  seo: {
    title: "PortDock Simulator — simulateur d’appareil gratuit (série, TCP)",
    desc: "Simulateur d’appareil gratuit à règles : «quand ceci arrive, répondre cela» en série, TCP et UDP. Développez sans matériel, testez retards et réponses perdues.",
  },
  summary: "Imitez n’importe quel appareil avec des règles «quand ceci arrive → répondre cela». Développez un logiciel hôte sans matériel et testez la gestion d’erreurs avec des retards, des réponses perdues (une sur N ou au hasard) et des réponses en rotation.",
  who: [
    "Développeurs de logiciels hôtes qui n’ont pas encore le matériel",
    "Équipes qui construisent des bancs de test automatisés",
  ],
  features: [
    {
      title: "Règles à jokers",
      body: "HEX ?? (octet quelconque) et ** (zéro ou plus). L’ASCII est comparé littéralement par défaut ; activez les «Jokers» d’une règle pour ? et *. Correspondance exacte ou contient.",
    },
    {
      title: "Réponses façonnées",
      body: "Somme de contrôle et fin de ligne automatiques, retard de réponse et compteur de déclenchements par règle.",
    },
    {
      title: "Messages à l’initiative de l’appareil",
      body: "Envoyez des battements de cœur ou des rapports d’état à intervalle réglé.",
    },
    {
      title: "Quatre transports",
      body: "Série, serveur TCP, client TCP, UDP. Enregistrez et chargez les règles avec les réglages de connexion et de découpage dans un seul fichier JSON.",
    },
    {
      title: "Adresse 127.0.0.1 au premier démarrage (à partir de 0.10.0)",
      body: "L’«Hôte» du serveur TCP et d’UDP démarre à 127.0.0.1 (ce PC seulement). Pour un logiciel hôte sur un autre PC, choisissez 0.0.0.0 (toutes les cartes) ou l’adresse d’une carte. Les réglages enregistrés par les versions précédentes sont conservés.",
    },
  ],
  steps: [
    "Choisissez un transport et saisissez le port ou l’adresse",
    "«+ Ajouter une règle» — Quand / Réponse",
    "«Démarrer» — envoyez une requête depuis votre logiciel hôte",
  ],
  uses: [
    {
      title: "Construire le logiciel hôte avant l’arrivée du matériel",
      body: "Transformez les paires requête/réponse du manuel de l’appareil en règles «quand → répondre» et connectez votre IHM ou programme de test sans l’appareil réel.",
    },
    {
      title: "Tester délais d’attente et gestion d’erreurs",
      body: "Des retards de réponse (avec gigue), pas de réponse une fois sur N ou au hasard, et des réponses en rotation montrent comment votre logiciel hôte gère des réponses tardives ou absentes.",
    },
    {
      title: "S’exercer au SCPI sans instrument",
      body: "Lancez un serveur TCP sur 5025 avec l’exemple [SCPI *IDN? reply] et connectez PortDock SCPI à 127.0.0.1. Des réponses comme «+1.2{rand 0..9}E+00» changent à chaque requête.",
    },
    {
      title: "Imiter battements de cœur et rapports d’état",
      body: "«Messages de l’appareil» envoie sans requête à intervalle réglé. Les variables {counter}, {rand} et {time} sont remplies à chaque envoi.",
    },
  ],
  faq: [
    {
      q: "Des requêtes arrivent mais aucune réponse ne part",
      a: "Vérifiez que la règle est activée, que le type de motif (HEX/ASCII) et «exact/contient» correspondent, et qu’aucune règle «**» ne se trouve au-dessus. Avec «Journaliser les requêtes sans règle» activé, une ligne «NO MATCH» apparaît ; faites un clic droit dessus pour en créer une règle.",
    },
    {
      q: "Les requêtes arrivent coupées ou fusionnées",
      a: "Les règles comparent des trames entières. Ajustez le «Découpage» (silence ou terminateur) et le silence en ms. UDP n’a pas besoin de découpage — un datagramme est une trame.",
    },
    {
      q: "Comment connecter un programme sur le même PC ?",
      a: "Pour TCP, démarrez un serveur et laissez le programme hôte se connecter à 127.0.0.1. Pour la série, utilisez une paire COM virtuelle (com0com ou équivalent).",
    },
    {
      q: "Ma règle «*IDN?» répond à des requêtes sans rapport",
      a: "Avec les «Jokers» activés, ? et * dans une règle ASCII correspondent à n’importe quel caractère. Laissez les jokers désactivés pour les règles SCPI (réglage par défaut des nouvelles règles).",
    },
    {
      q: "Puis-je emporter les règles sur un autre PC ?",
      a: "«Enregistrer les règles» range les règles avec le transport, le port, l’adresse, le découpage et les messages de l’appareil dans un seul fichier JSON — gardez-en un par appareil ou par test.",
    },
  ],
};
