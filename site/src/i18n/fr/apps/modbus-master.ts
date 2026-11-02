// PortDock Modbus Master — texte de présentation. Le nombre d’appareils intégrés est dans le texte-fonction.
export default {
  seo: {
    title: "PortDock Modbus Master — outil de test Modbus RTU/TCP gratuit",
    desc: "Maître Modbus RTU/TCP gratuit pour Windows : plusieurs tables, F32/U32 et ordres d’octets, notation 40001, écritures, scan d’ID, journaux CSV.",
  },
  summary: "Interrogez des appareils Modbus à la place d’un automate ou d’une IHM. Interrogez plusieurs tables par Slave ID, fonction, adresse et intervalle, affichez F32/U32/chaînes avec ordres d’octets et notation 40001, et double-cliquez sur une cellule pour écrire. Requêtes/réponses HEX décodées, statistiques et journal CSV des valeurs inclus.",
  who: [
    "Techniciens de terrain qui vérifient la carte Modbus d’un nouveau variateur ou compteur",
    "Développeurs qui testent le firmware d’appareils esclaves",
  ],
  features: [
    {
      title: "Plusieurs tables d’interrogation",
      body: "Chaque table a son propre Slave ID, sa fonction (01–04), son adresse de début, son nombre et son intervalle, avec un compteur d’erreurs sur son onglet. RTU série, Modbus TCP et RTU sur TCP.",
    },
    {
      title: "Valeurs typées et ordre des octets",
      body: "De U16 à F64 et chaînes en ABCD/CDAB/BADC/DCBA, HEX/BIN et notation 40001. Partage avec Modbus Slave le format CSV de carte de registres.",
    },
    {
      title: "Écritures avec aperçu",
      body: "Double-cliquez pour écrire avec 05/06/0F/10 et prévisualisez les octets exacts. Une option «toujours FC15/16» envoie même les valeurs seules avec 0F/10.",
    },
    {
      title: "Profils d’appareils",
      body: (c: { nDevices: number }) => `Choisissez l’un des ${c.nDevices} appareils intégrés (variateurs, régulateurs de température, compteurs d’énergie …) pour ajouter des tables d’interrogation avec noms (unité et échelle), types, Slave ID et réglages série par défaut.`,
    },
    {
      title: "Scan de Slave ID et d’adresses",
      body: "Trouvez quels Slave ID (1–247) répondent et quelles plages d’adresses sont lisibles, puis transformez-les en tables.",
    },
    {
      title: "Trouver les réglages de ligne (à partir de 0.10.0)",
      body: "Quand vitesse, parité et ID d’un appareil sont inconnus, envoie une courte lecture pour chaque vitesse choisie (1200–115200) × parité/bits d’arrêt × plage d’ID et liste les combinaisons qui répondent. Une réponse d’exception signifie quand même «un appareil est là». Estimation de durée, bouton d’arrêt et «Se connecter avec ce réglage» ; l’ID 0 (broadcast) n’est jamais utilisé. Pas pour des bus avec un autre maître.",
    },
    {
      title: "«Pas de réponse» — causes possibles (à partir de 0.10.0)",
      body: "Classe les derniers résultats de requêtes en causes possibles et façons de les vérifier — aucun octet (câblage, ID, polarité A/B), seulement la requête renvoyée en écho (écho d’un adaptateur 2 fils), erreurs CRC (vitesse, parité, bruit, terminaison), trames tronquées (délai, latence USB), ce que signifie chaque code d’exception, un autre ID qui répond. Avec liens vers les guides et l’assistant de dépannage ; copiable en texte.",
    },
    {
      title: "Sauvegarde des réglages d’un appareil, comparaison, restauration (à partir de 0.10.0)",
      body: "Pour le remplacement et la maintenance d’appareils. Lit plusieurs plages à la fois (ou les remplit depuis un profil d’appareil) en JSON et CSV — les plages de plus de 125 sont coupées, les plages en échec listées — et compare avec l’appareil actuel ou une autre sauvegarde, en n’affichant que les différences. La restauration n’écrit que les cellules choisies : aperçu (actuel vs. à écrire), un second clic pour écrire, puis une vérification par relecture. Les registres d’entrée et les registres en lecture seule du profil sont bloqués.",
    },
    {
      title: "Délais d’attente, nouvelles tentatives, statistiques",
      body: "Réglez délai d’attente, nouvelles tentatives et retard ; comptez requêtes, OK, délais dépassés, erreurs CRC et exceptions avec les temps de réponse par table. Les exceptions sont expliquées.",
    },
    {
      title: "Journal des valeurs et tendances",
      body: "Journalisez les valeurs en CSV à chaque interrogation ou à chaque changement, et suivez des cellules choisies sous forme de petites courbes de tendance.",
    },
    {
      title: "Surveillance des valeurs et alarmes (à partir de 0.10.0)",
      body: "Par cellule : limites basse/haute, absence de changement (blocage) pendant N secondes et communication perdue pendant N secondes, avec une marge de retour (hystérésis). Une cellule déclenchée est surlignée, avec une liste d’alarmes (levée, effacée, durée, acquittement), son optionnel, clignotement de la barre des tâches et journal CSV des alarmes. Une aide à la surveillance, pas un dispositif de sécurité.",
    },
  ],
  steps: [
    "Adaptez la connexion et le port (ou l’IP) à l’appareil",
    "«Connecter» (F4), puis réglez Slave ID, fonction, adresse de début et nombre d’après le manuel",
    "Double-cliquez sur une cellule pour écrire ; clic droit pour le nom et le type",
  ],
  similar: "Parmi les outils similaires, le Modbus Poll commercial (Witte Software) et le logiciel open source QModMaster. PortDock Modbus Master est gratuit (GPL-3.0) et sans limite de durée.",
};
