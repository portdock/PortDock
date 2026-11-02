// PortDock Modbus Slave — texte de présentation. Le nombre d’appareils intégrés est dans le texte-fonction.
export default {
  seo: {
    title: "PortDock Modbus Slave — simulateur d’esclave Modbus gratuit",
    desc: "Simulateur d’esclave Modbus RTU/TCP gratuit pour Windows : testez automate, IHM ou maître sans l’appareil, avec tables de registres et injection de défauts.",
  },
  summary: "Transforme le PC en esclave Modbus (RTU série, ou serveur Modbus TCP ou RTU sur TCP) pour tester un maître (automate, IHM, logiciel hôte) sans l’appareil réel — y compris avec des retards et des erreurs volontaires.",
  who: [
    "Développeurs qui écrivent un maître Modbus",
    "Équipes qui préparent des écrans d’IHM avant l’arrivée de l’appareil",
  ],
  features: [
    {
      title: "Trois transports",
      body: "Série (RTU), serveur TCP (Modbus TCP) et serveur TCP (RTU sur TCP — un appareil derrière un serveur de périphériques série).",
    },
    {
      title: "Quatre tables",
      body: "Bobines, entrées discrètes, registres de maintien et registres d’entrée. Affichez une table en U16, S16, HEX ou BIN, réglez par cellule des types U32, S32, F32, F64 ou chaîne avec l’ordre des octets, et laissez les valeurs évoluer d’elles-mêmes (incrément, aléatoire, sinus …).",
    },
    {
      title: "Plusieurs Slave ID",
      body: "Exécutez plusieurs Slave ID (1–247), chacun avec ses propres valeurs.",
    },
    {
      title: "Injection de défauts",
      body: "Retard, absence de réponse, CRC cassée, mauvaise longueur MBAP ou exceptions forcées — ciblés par Slave ID, fonction, adresse, une requête sur N ou probabilité — pour tester les délais d’attente et les nouvelles tentatives du maître.",
    },
    {
      title: "Voir chaque écriture",
      body: "Les cellules écrites par le maître clignotent, avec un journal de trafic et des statistiques.",
    },
    {
      title: "Profils d’appareils, tables enregistrées",
      body: (c: { nDevices: number }) => `Chargez les noms et types de registres de ${c.nDevices} appareils intégrés (variateurs, régulateurs de température, compteurs d’énergie …) avec des valeurs d’exemple. Exportez et importez les tables sous forme de cartes de registres CSV (même format que Modbus Master) ou JSON.`,
    },
    {
      title: "Émuler avec un profil d’appareil — valeurs vivantes (à partir de 0.10.0)",
      body: "Testez un SCADA, une IHM ou votre propre programme sans variateur ni compteur d’énergie réel. L’écriture de la commande de marche fait monter la fréquence de sortie jusqu’à la consigne (et redescendre à 0), le courant, la tension et la puissance suivent ; les compteurs d’énergie font dériver légèrement tension et courant et cumulent l’énergie. Des «règles de liaison» modifiables (suivre, proportionnel, cumuler) relient les cellules. Les cellules en lecture seule et en écriture seule de la carte de l’appareil sont appliquées (exception 02 ou 03, à votre choix), les adresses non mappées donnent l’exception 02, et le tout fonctionne avec l’injection de défauts. Les valeurs viennent des tableaux du manuel, donc le comportement d’un appareil réel (temps de rampe, etc.) peut différer.",
    },
    {
      title: "Adresse d’écoute 127.0.0.1 au premier démarrage (à partir de 0.10.0)",
      body: "L’«Adresse d’écoute» du serveur TCP démarre à 127.0.0.1 (ce PC seulement). Pour un maître sur un autre PC, choisissez-y 0.0.0.0 (toutes les cartes) ou l’adresse d’une carte. Les réglages enregistrés par les versions précédentes sont conservés.",
    },
  ],
  steps: [
    "Choisissez le transport (série ou TCP) et le port et la vitesse (ou l’adresse et le port) ; ajoutez des Slave ID si besoin",
    "Choisissez une table, réglez l’adresse de début et le nombre, saisissez les valeurs",
    "«Connecter» («Démarrer» pour TCP) — les requêtes du maître reçoivent leur réponse depuis la table",
  ],
  similar: "Parmi les outils similaires, le Modbus Slave commercial (Witte Software) et le logiciel open source ModRSsim2. PortDock Modbus Slave est gratuit (GPL-3.0) et sans limite de durée.",
};
