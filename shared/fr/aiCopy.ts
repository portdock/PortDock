// 프랑스어 — «Copier pour poser la question à une IA» 의 질문 틀·머리말(aiCopy.ts). 원천은 영어판. 붙여 넣는 글이라 화면 언어를 따른다.
import type { AiText } from "../aiCopy.ts";

type HideIp = "public" | "all";

export const FR_AI_COPY: Partial<AiText> = {
  ask: (app: string) => `Voici un journal de ${app}. Indique les causes probables du problème et l’ordre dans lequel les vérifier.`,
  ask2: "Dis s’il faut d’abord regarder les réglages de l’appareil, le câblage ou le PC, et cite les lignes du journal qui l’appuient. En cas de doute, dis-moi quoi vérifier d’autre.",
  situation: "## Situation (à compléter après le collage)",
  situationLines: ["- Ce que j’essayais de faire :", "- Résultat attendu / obtenu :", "- Appareil (fabricant, modèle) et connexion :"],
  kinds: {
    pc: {
      ask: (app: string) => `Voici les résultats du contrôle du PC par ${app}. Indique les causes probables du problème et l’ordre dans lequel les vérifier.`,
      ask2: "Dis s’il faut d’abord regarder les réglages du PC, les pilotes, l’environnement sans fil (Wi-Fi, Bluetooth) ou le routeur, et cite les lignes qui l’appuient. En cas de doute, dis-moi quoi vérifier d’autre.",
      situationLines: ["- Ce que j’essayais de faire :", "- Résultat attendu / obtenu :", "- PC et sans-fil (portable/fixe, filaire/sans fil, modèle de routeur ou d’appareil) :"],
    },
    scan: {
      ask: (app: string) => `Voici la liste des appareils réseau trouvés par ${app}. Aide-moi à trouver l’appareil que je cherche, ou pourquoi il n’apparaît pas.`,
      ask2: "Dis s’il faut d’abord regarder la plage d’adresses (sous-réseau), les réglages IP de l’appareil, la carte réseau ou le switch, et cite les lignes qui l’appuient. En cas de doute, dis-moi quoi vérifier d’autre.",
      situationLines: ["- Appareil cherché (fabricant, modèle, IP connue) :", "- Résultat attendu / obtenu :", "- Liaison PC–appareil (directe, switch, réseau d’usine) :"],
    },
    port: {
      ask: (app: string) => `Voici les résultats du contrôle de port par ${app}. Indique les causes probables du problème et l’ordre dans lequel les vérifier.`,
      ask2: "Dis s’il faut d’abord regarder le numéro de port, le pilote, l’adaptateur USB ou les réglages d’économie d’énergie, et cite les lignes qui l’appuient. En cas de doute, dis-moi quoi vérifier d’autre.",
      situationLines: ["- Ce que j’essayais de faire :", "- Résultat attendu / obtenu :", "- Adaptateur ou appareil (fabricant, modèle) et port USB utilisé :"],
    },
  },
  found: "## Appareils trouvés",
  program: "## Programme",
  state: "État actuel",
  settings: "## Réglages de connexion",
  errors: (n: number) => `## Erreurs de cette session (${n})`,
  checks: "## Résultats du contrôle",
  log: (n: number) => `## Échanges récents (${n} lignes)`,
  logFormat: "Format : heure sens [pair] HEX | texte | note ajoutée par le programme",
  logEmpty: "(aucun échange)",
  cutLines: (n: number, max: number) => `(${n} lignes anciennes retirées pour tenir dans ${max.toLocaleString("en-US")} caractères)`,
  cutText: "…(coupé — trop long)",
  masked: (ip: HideIp) => `_Masqué par PortDock : dossier utilisateur, nom du PC (DESKTOP-… etc.), 3 derniers octets des adresses MAC, ${ip === "all" ? "toutes les adresses IP" : "adresses IP publiques"} («[IP-n]»)._`,
};
