// PortDock Plot — texte de présentation.
export default {
  seo: {
    title: "PortDock Plot — traceur série gratuit : courbes en direct et CSV",
    desc: "Traceur en direct gratuit pour des nombres reçus en série, TCP ou UDP : nom:valeur façon Arduino, trames binaires, jusqu’à 32 voies, curseurs et export CSV.",
  },
  summary: "Voyez en courbe, en direct, les nombres qu’envoie un Arduino, un capteur ou un appareil. Lit du texte séparé par virgule/espace/tabulation/point-virgule, du «name:value» façon Arduino et des trames binaires, avec couleur et axe par voie, pause, zoom et écarts entre deux points, et enregistre un CSV pendant la réception.",
  who: [
    "Développeurs qui règlent un firmware en observant les valeurs d’un capteur ou d’une carte",
    "Techniciens de terrain qui enregistrent la sortie d’un appareil pendant des heures pour trouver des anomalies",
  ],
  features: [
    {
      title: "Série, TCP, UDP",
      body: "Ports COM (vitesse, bits de données, parité, bits d’arrêt — 8N1 par défaut — et DTR), un client TCP qui se connecte à l’appareil et la réception UDP (multicast aussi). Se reconnecte après débranchement/rebranchement.",
    },
    {
      title: "Texte, nom:valeur, binaire",
      body: "Virgule, espace, tabulation ou point-virgule détectés automatiquement, valeurs nommées comme temp:23.1 hum:40, lignes d’en-tête, et trames avec octets de début, u8–f64, ordre des octets et somme de contrôle. Les lignes en échec apparaissent en rouge avec la raison.",
    },
    {
      title: "Visualiser et mesurer",
      body: "Jusqu’à 32 voies sur les axes gauche/droit, N derniers points ou secondes, Y auto/fixe, pause (la réception continue), lecture au curseur, Δt et Δvaleur entre deux repères, zoom à la molette et déplacement par glisser.",
    },
    {
      title: "Surveillance des voies et alarmes (à partir de 0.10.0)",
      body: "Réglez par voie les limites basse/haute, le blocage pendant N secondes et la perte de données pendant N secondes : les lignes déclenchées sont surlignées, avec une liste d’alarmes, un son optionnel et un journal CSV des alarmes. Une aide à la surveillance, pas un dispositif de sécurité.",
    },
    {
      title: "Suit le rythme",
      body: "L’analyse tourne en Rust ; le tracé se fait une fois par image sur un canvas avec min/max par pixel — des milliers de lignes par seconde sans perdre les pointes.",
    },
    {
      title: "Enregistrer et sauvegarder",
      body: "Chaque valeur en CSV pendant la réception (compatible Excel), la plage visible en CSV, la courbe en PNG. Tableau de la dernière valeur avec min, max et moyenne sur la plage visible.",
    },
  ],
  steps: [
    "Faites afficher des nombres par ligne à l’appareil (par ex. 23.1,40 ou temp:23.1 hum:40)",
    "Choisissez la source (port série et vitesse, TCP, UDP) et «Démarrer» (F4)",
    "Cliquez sur la courbe pour mesurer ; «● Enregistrer CSV» pour la conserver",
  ],
  similar: "Parmi les outils similaires, le Serial Plotter de l’IDE Arduino et le logiciel open source SerialPlot. PortDock Plot accepte aussi l’entrée TCP et UDP, les trames binaires, et enregistre un CSV pendant la réception.",
};
