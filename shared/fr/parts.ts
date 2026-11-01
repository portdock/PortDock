// 프랑스어 — 공용 부품의 화면 글(설정 창·도움말 머리·문제 보고·AI 복사 창·첫 실행 카드·새 버전 알림·로그 찾기·화면 오류·사용 통계).
// 원천은 각 부품의 영어판. 빠진 열쇠는 영어로 보인다. 단추 글은 좁은 창에 맞게 짧게.
import type { SettingsTextKey } from "../SettingsDialog.tsx";
import type { HelpUiKey } from "../HelpDialog.tsx";
import type { ReportTextKey } from "../ReportDialog.tsx";
import type { AiUiKey } from "../AiCopyButton.tsx";
import type { FirstTextKey } from "../FirstCard.tsx";
import type { UpdateTextKey } from "../UpdateNotice.tsx";
import type { FilterTextKey } from "../LogFilter.tsx";
import type { BoundaryTextKey } from "../Boundary.tsx";
import type { UsageText } from "../usageText.ts";

type Fr<K extends string> = Partial<Record<K, string>>;

export const FR_SETTINGS: Fr<SettingsTextKey> = {
  title: "Réglages",
  lang: "Langue",
  theme: "Thème",
  system: "Suivre Windows",
  light: "Clair",
  dark: "Sombre",
  fontSize: "Taille du texte (px)",
  timeFormat: "Horodatage du journal",
  local: "hh:mm:ss.ms",
  localDate: "Date + heure",
  utc: "UTC",
  elapsed: "Temps écoulé depuis le début (Effacer remet à zéro)",
  maxLines: "Lignes gardées à l’écran",
  maxLinesHint: "Les lignes plus anciennes ne sont retirées que de l’écran (les journaux fichier gardent tout).",
  autoScroll: "Défilement auto sur nouvelles lignes (pause quand vous remontez)",
  alwaysOnTop: "Toujours au premier plan — garder cette fenêtre au-dessus des autres (📌 dans l’en-tête)",
  expandAll: "Tout déplier (vue experte) — toujours ouvrir les groupes repliés (connexion avancée, réglages de réception, injection de défauts, statistiques …)",
  autoLog: "Démarrer le journal fichier à la connexion",
  logFolder: "Dossier du journal auto",
  choose: "Choisir",
  noFolder: "Choisissez un dossier",
  confirmExit: "Demander avant de fermer pendant une connexion ou un journal",
  lostAlert: "Faire clignoter le bouton de la barre des tâches à la perte de connexion (fenêtre en arrière-plan)",
  keepAwake: "Garder le PC éveillé pendant une connexion ou un journal (l’écran peut s’éteindre)",
  autoConnect: "Rouvrir la dernière connexion au démarrage",
  autoReport: "Rapports d’erreur automatiques",
  arAsk: "Demander après un plantage",
  arOn: "Envoyer automatiquement",
  arOff: "Ne jamais envoyer",
  autoReportHint: "N’envoie que la cause des erreurs du programme (exceptions, plantages) et la version du programme/de Windows. Échanges, commandes, règles et réglages IP ne sont jamais envoyés. Un PC hors ligne réessaie la fois suivante.",
  backup: "Sauvegarde",
  exportAll: "Exporter les réglages",
  importAll: "Importer des réglages",
  reset: "Valeurs par défaut",
  resetAsk: "Remettre les réglages d’affichage par défaut ? (commandes et règles sont gardées)",
  importAsk: "L’import remplace tous les réglages, commandes et règles actuels. Continuer ?",
  importBusy: "Arrêtez la connexion et le journal avant d’importer.",
  noFolderWarn: "Le journal automatique ne démarre pas tant qu’aucun dossier n’est choisi.",
  close: "Fermer",
  about: "À propos",
  gpl: "Ce programme est un logiciel libre, distribué sous GNU GPL v3. Il est fourni SANS AUCUNE GARANTIE.",
  license: "Texte de la licence",
  source: "Code source",
  site: "Site web",
  notices: "Mentions des tiers",
  sponsor: "Soutenir",
  checkUpdate: "Rechercher une mise à jour",
  checkUpdateHint: "Ouvre la page de la dernière version dans votre navigateur.",
  updateCheck: "Rechercher les nouvelles versions (une fois par jour)",
  updateCheckHint: "Si actif, interroge GitHub (api.github.com) une fois par jour sur la dernière version seulement et affiche un avis en bas de la fenêtre si une version plus récente existe. Aucune donnée n’est envoyée ; rien n’est téléchargé ni installé.",
};

export const FR_HELP_UI: Fr<HelpUiKey> = {
  title: "Aide",
  search: "Rechercher…",
  close: "Fermer",
  none: "Aucun résultat",
  enOnly: "L’aide n’existe qu’en anglais (écran en français).",
};

export const FR_REPORT: Fr<ReportTextKey> = {
  button: "Signaler un problème — envoyer erreurs et bogues au développeur",
  title: "Signaler un problème",
  intro: "Un rapport est préparé sur ce PC et affiché ci-dessous. Rien n’est envoyé automatiquement. Relisez-le, puis choisissez comment l’envoyer.",
  what: "Que s’est-il passé ? (ce que vous faisiez, ce que vous avez cliqué, résultat attendu et obtenu)",
  whatPh: "ex. La fenêtre s’est figée quand un troisième pair s’est connecté au serveur TCP.",
  env: "Version du programme et de Windows (toujours incluse)",
  errors: "{n} erreur(s) dans cette session",
  crashes: "{n} plantage(s) enregistré(s)",
  dumps: "Fichier dump inclus ({n} Ko)",
  dumpsSend: " — envoyé avec «Envoyer maintenant»",
  dumpManual: "Joignez vous-même le fichier dump en cas d’envoi par e-mail ou GitHub (gardé jusqu’à envoi ou suppression) : {a}",
  config: "Réglages de connexion et d’affichage (IP, port, débit … — commandes et règles non incluses)",
  log: "{n} dernières lignes d’échanges",
  logWarn: "Les échanges peuvent contenir des données d’entreprise ou d’appareil. Ne les incluez que si c’est permis.",
  preview: "Aperçu du rapport",
  copy: "Copier",
  copied: "Copié",
  saveFile: "Enregistrer dans un fichier",
  saved: "Enregistré : {a}",
  email: "Envoyer par e-mail",
  emailHint: "Votre messagerie s’ouvre. Les rapports longs sont coupés : joignez le fichier issu de «Enregistrer dans un fichier».",
  issue: "Ouvrir une issue GitHub",
  issueHint: "Publié publiquement sur GitHub (compte requis). Vérifiez qu’il ne contient pas de données d’entreprise.",
  offline: "Sur un PC hors ligne, «Enregistrer dans un fichier», transférez-le par USB et envoyez-le depuis un autre PC.",
  close: "Fermer",
  crashTitle: "Le programme a planté la dernière fois",
  crashBody: "{a} s’est fermé de façon inattendue la dernière fois et a laissé un enregistrement de plantage. L’envoyer au développeur aide beaucoup.",
  crashOpen: "Voir le rapport",
  crashLater: "Plus tard",
  crashDiscard: "Supprimer sans envoyer",
  noTarget: "Aucune destination n’est encore configurée. Utilisez «Enregistrer dans un fichier».",
  sendNow: "Envoyer maintenant",
  sendNowHint: "Envoie directement l’aperçu ci-dessus au développeur (Internet requis, sans compte).",
  sending: "Envoi…",
  sentOk: "Envoyé. Merci !",
  sendFail: "Envoi impossible (vérifiez la connexion Internet). «Enregistrer dans un fichier» et envoyez plus tard.",
  crashSend: "Envoyer maintenant",
  crashAlways: "Désormais, envoyer automatiquement sans demander",
};

export const FR_AI_UI: Fr<AiUiKey> = {
  button: "Demander à une IA — copie seulement, rien n’est envoyé : la situation actuelle en texte pour un chat IA, dans le presse-papiers",
  title: "Copier pour demander à une IA",
  introLog: "Prépare un texte pour un chat IA (avec un modèle de question) : programme, réglages de connexion, erreurs de cette session et échanges récents.",
  introChecks: "Prépare un texte pour un chat IA (avec un modèle de question) : programme, erreurs de cette session et résultats du contrôle.",
  local: "PortDock n’envoie rien nulle part — tout va seulement dans le presse-papiers.",
  warn: "Ce que vous collez part vers ce service d’IA. Vérifiez les détails d’appareil et d’entreprise avant de coller.",
  hideIp: "Masquer aussi les IP privées (les IP publiques sont toujours masquées)",
  incLog: "Inclure les échanges récents",
  incChecks: "Inclure les résultats du contrôle",
  incFound: "Inclure les appareils trouvés",
  introFound: "Prépare un texte pour un chat IA (avec un modèle de question) : programme, erreurs de cette session et appareils trouvés.",
  preview: "Texte à coller (aperçu)",
  size: "{n} / {max} caractères",
  cut: " · {n} lignes anciennes retirées",
  cutText: " · texte long coupé",
  copy: "Copier",
  copied: "Copié — collez-le dans le chat IA (Ctrl+V) et complétez «Situation».",
  copyFail: "Copie impossible — un autre programme tient peut-être le presse-papiers",
  close: "Fermer",
};

export const FR_FIRST: Fr<FirstTextKey> = {
  hide: "Ne plus afficher",
  help: "Aide :",
  narrow: "La fenêtre est étroite, le panneau de gauche est donc replié — «à gauche» ci-dessous désigne le panneau derrière le bouton «⚙ {b}» en haut à gauche.",
  open: "Ouvrir le panneau de gauche",
};

export const FR_UPDATE: Fr<UpdateTextKey> = {
  msg: "La version {a} est disponible (vous avez {b}).",
  open: "Page de la version",
  later: "Ne plus me rappeler cette version",
  close: "Fermer (réaffiché au prochain démarrage)",
};

export const FR_FILTER: Fr<FilterTextKey> = {
  find: "Rechercher (Ctrl+F) — 01 03 ou texte",
  auto: "Auto",
  hex: "HEX",
  text: "Texte",
  prev: "Précédent (Maj+Entrée)",
  next: "Suivant (Entrée)",
  hitsOnly: "Correspondances",
  failOnly: "ÉCHEC seulement",
  all: "Tout",
  off: "Effacer le filtre (Échap)",
  badHex: "pas du HEX",
  none: "aucun",
  shown: "{a}/{b} lignes",
};

export const FR_BOUNDARY: Fr<BoundaryTextKey> = {
  title: "L’écran a planté",
  body: "Envoyer ceci au développeur aide à corriger. Rouvrir le programme suffit en général à revenir.",
  report: "Signaler un problème",
  reload: "Recharger",
  resetTip: "Si le rechargement plante encore — efface les réglages d’écran enregistrés (y compris listes de commandes et règles)",
  resetArm: "Vraiment réinitialiser — cliquez encore",
  reset: "Réinitialiser les réglages",
};

export const FR_USAGE: Partial<UsageText> = {
  title: "Envoyer des statistiques d’utilisation ?",
  why: "Savoir quelles fonctions sont utilisées aide à choisir quoi améliorer ensuite. Si vous activez ceci, les éléments ci-dessous sont envoyés anonymement, une fois, à la fermeture de la fenêtre.",
  sendsTitle: "Envoyé",
  sends: ["Nom et version du programme, version de Windows (10/11), langue d’affichage", "Minutes d’ouverture du programme", "Nombre d’utilisations de chaque fonction (connexion, envoi, lecture … — nombres seulement)", "Édition installée ou portable"],
  neverTitle: "Jamais envoyé",
  never: ["Contenu des échanges", "Adresses IP, ports, noms COM", "Chemins de fichiers", "Noms du PC, de l’utilisateur et des appareils", "Tout ID identifiant l’installation ou le PC"],
  where: "Destinataire : Aptabase (UE). Hors ligne ou en cas d’échec, les données sont abandonnées. Votre réponse devient aussi la valeur de départ des autres apps PortDock de ce PC (elles ne redemandent pas), et chaque app peut la changer à tout moment dans les Réglages (⚙).",
  yes: "Envoyer",
  no: "Ne pas envoyer",
  setting: "Envoyer des statistiques d’utilisation (anonymes, à la fermeture)",
  hint: "N’envoie que les nombres d’utilisation des fonctions, les minutes d’ouverture, la version du programme/de Windows, la langue d’affichage et l’édition installée/portable. Échanges, adresses IP, ports, noms COM, chemins de fichiers et noms du PC/de l’utilisateur/des appareils ne sont jamais envoyés. Destinataire : Aptabase (UE).",
};
