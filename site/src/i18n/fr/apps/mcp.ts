// PortDock MCP — texte de présentation.
export default {
  seo: {
    title: "PortDock MCP — lire ports COM et Modbus depuis des clients IA",
    desc: "Serveur MCP gratuit : Claude Desktop et autres clients IA lisent ports COM, valeurs Modbus, MC et SCPI. N’écrit que vers des simulateurs sur 127.0.0.1.",
  },
  summary: "Un serveur MCP sans fenêtre, lancé par des clients IA (Claude Desktop, VS Code, Cursor …). L’IA lit les ports COM et cartes réseau de ce PC ainsi que des valeurs Modbus, protocole MC et SCPI sur les appareils que vous nommez. Les outils d’écriture n’acceptent que l’adresse de ce PC (127.0.0.1) et sont prévus pour des simulateurs. À partir de 0.10.0, les écritures Modbus ne vont qu’à une cible qui s’identifie comme PortDock. Les écritures MC ne sont vérifiées que par l’adresse : si un programme de ce PC relaie vers un autre appareil (relais TCP, passerelle ou tunnel), une écriture peut atteindre un appareil réel.",
  who: [
    "Toute personne qui veut examiner avec un assistant IA des problèmes de port COM et d’adaptateur USB",
    "Développeurs qui veulent lire des valeurs Modbus, MC ou SCPI au cours d’une conversation avec une IA",
    "Personnes qui s’exercent à l’usage d’outils par l’IA sur des simulateurs plutôt que sur des appareils réels",
  ],
  features: [
    {
      title: "Neuf outils de lecture",
      body: "Liste des ports COM, rapport Port Inspector, écoute série (n’envoie rien), lectures Modbus (FC 01–04), lecture par lot MC 3E, requêtes SCPI, ping, cartes réseau et cartes de registres des appareils.",
    },
    {
      title: "Écriture uniquement vers des simulateurs sur 127.0.0.1",
      body: "Exercez-vous à «écrire, puis relire» avec Modbus Slave ou PLC Simulator sur ce PC. Toute autre adresse est refusée avant la connexion. À partir de 0.10.0, les écritures Modbus exigent aussi que la cible s’identifie comme «PortDock» (FC 2B/0E) ; les écritures MC ne sont vérifiées que par l’adresse, ne les utilisez donc pas lorsqu’un programme de relais tourne.",
    },
    {
      title: "Requêtes SCPI uniquement",
      body: "Envoie une requête se terminant par «?» ; celles qui peuvent modifier l’état, comme *TST?, *CAL? et *RST, sont refusées. READ? et MEAS…?, qui lancent une nouvelle mesure, sont refusées par défaut et envoyées seulement si vous l’autorisez avec allow_measure (depuis 0.8.0). Utilisez FETC? pour ne lire que la dernière valeur.",
    },
    {
      title: "Journal de session et limites de débit",
      body: "Chaque appel est conservé sur ce PC sous forme de lignes JSON et n’est jamais envoyé à l’extérieur. Même cible au plus une fois par 100 ms, 120 appels par minute.",
    },
    {
      title: "Données personnelles masquées",
      body: "Les chemins de dossiers utilisateur dans les résultats deviennent «~», les adresses MAC «xx-…» et les noms de réseaux «(hidden)».",
    },
    {
      title: "Un seul fichier à installer",
      body: "Ni Python, ni Node, ni Docker : un .mcpb (à ouvrir dans Claude Desktop) ou un seul exe dans un zip.",
    },
  ],
  steps: [
    "Ouvrez PortDock-MCP.mcpb dans Claude Desktop (autres clients : placez dans leurs réglages le chemin de l’exe du zip)",
    "Demandez à l’IA quelque chose comme «Liste mes ports COM» — le client vous demande avant chaque appel d’outil",
    "Donnez l’adresse, le port et l’unité pour lire un appareil. Exercez-vous avec Modbus Slave ou PLC Simulator sur 127.0.0.1",
  ],
  faq: [
    {
      q: "L’IA peut-elle modifier les réglages d’un appareil ?",
      a: "Les deux outils d’écriture ne fonctionnent que si la cible est 127.0.0.1 ou localhost (ce PC) ; toute autre adresse est refusée avant la connexion. À partir de 0.10.0, modbus_write_sim n’écrit que si la cible répond à l’identification d’appareil (FC 2B/0E) avec un nom de fabricant commençant par «PortDock», et n’écrit donc pas vers de vrais appareils derrière la passerelle Modbus TCP ↔ RTU de PortDock Serial (127.0.0.1:502 par défaut). mc_write_sim n’est vérifié que par l’adresse : si un programme de ce PC relaie vers un autre appareil (relais TCP, passerelle de fabricant, tunnel SSH …), une écriture peut atteindre un appareil réel — n’utilisez pas les outils d’écriture tant qu’un tel programme tourne.",
    },
    {
      q: "Qu’envoie-t-il vers l’extérieur ?",
      a: "PortDock MCP lui-même ne parle qu’aux adresses d’appareils et ports que vous donnez, et le journal de session reste sur ce PC. Les résultats des outils vont au client IA que vous utilisez ; à partir de là, la politique de ce client s’applique.",
    },
  ],
};
