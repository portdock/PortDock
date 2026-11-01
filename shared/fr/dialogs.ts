// 프랑스어 — 공용 창: 장비 프로필(DeviceDialog)·연결 점검(PortCheckDialog)·연결 시험(LoopbackPanel)·랜카드 주소 목록(NetIfaces)·
// 다른 앱 열기 알림(openApp)·닫기 확인(exitGuard)·예시 명령(examples). 원천은 영어판, 빠진 열쇠는 영어로 보인다.
import type { DeviceTextKey } from "../DeviceDialog.tsx";
import type { PortCheckTextKey } from "../PortCheckDialog.tsx";
import type { LoopTextKey } from "../LoopbackPanel.tsx";
import type { IfaceTextKey } from "../NetIfaces.tsx";
import type { OpenAppTextKey } from "../openApp.ts";

type Fr<K extends string> = Partial<Record<K, string>>;

export const FR_DEVICE: Fr<DeviceTextKey> = {
  masterTitle: "Charger un profil d’appareil",
  slaveTitle: "Charger une émulation d’appareil",
  search: "Rechercher (fabricant, modèle, type)",
  none: "Aucun appareil correspondant",
  close: "Fermer",
  cancel: "Annuler",
  apply: "Charger",
  regs: "{n} registres",
  comm: "Communication par défaut",
  commOpt: "Appliquer aussi les réglages série (débit, données, parité, stop)",
  commNone: "Aucun réglage de communication par défaut confirmé dans le manuel",
  gapOpt: "Lire en une table les registres séparés par de petits trous (jusqu’à {n} — désactivez si l’appareil refuse les adresses inutilisées)",
  masterPlan: "Ajoute {n} tables de scrutation (esclave {u}) : {a}",
  masterSkip: "{n} registres en écriture seule ne sont pas scrutés",
  slavePlan: "Remplit noms, types et valeurs d’exemple dans l’esclave actuel {u}. Les plages de réponse s’agrandissent au besoin.",
  slaveUnit: "L’adresse esclave par défaut de cet appareil est {u}",
  sources: "Sources",
  caution: "Faits tirés du manuel du fabricant (sans lien avec le fabricant). Ils peuvent varier selon le firmware ou le modèle — vérifiez le manuel de l’appareil avant d’écrire.",
  thAddr: "Adresse (manuel)",
  thName: "Nom",
  thType: "Type",
  thUnit: "Unité",
  thRw: "L/É",
  notes: "Remarques",
  behaveOpt: "Ajouter aussi générateurs de valeurs et règles de liaison — dérive tension/courant, cumul d’énergie, ordre de marche → rampe de fréquence de sortie",
  guardOpt: "Faire respecter lecture seule et écriture seule",
  slaveNote: "Ces valeurs viennent des tableaux du manuel — le comportement réel de l’appareil (temps de rampe, etc.) peut différer.",
};

export const FR_PORTCHECK: Fr<PortCheckTextKey> = {
  title: "Vérifier la connexion",
  close: "Fermer (Échap)",
  reading: "Lecture…",
  readFail: "Lecture impossible",
  device: "Périphérique et pilote",
  settings: "Réglages",
  power: "Économie d’énergie",
  test: "Test de connexion",
  cannot: "Ce que le PC ne voit pas",
  guides: "Guides :",
  name: "Nom",
  chip: "VID:PID · puce",
  driver: "Pilote",
  problem: "Code de problème",
  action: "À essayer",
  latency: "Latency timer FTDI",
  suspend: "Suspension sélective USB",
  canOff: "Le PC peut l’éteindre",
  on: "activé",
  off: "désactivé",
  connected: "Déconnectez d’abord pour lancer le test (il ouvre lui-même le port).",
  copy: "Copier le texte",
  copied: "Copié",
  more: "Pour l’historique des pilotes, les numéros COM réservés et les périphériques masqués, utilisez PortDock Port Inspector.",
  readOnly: "Lecture seule, sans droits administrateur.",
};

export const FR_LOOP: Fr<LoopTextKey> = {
  mode: "Test",
  loop: "Bouclage — TX relié à RX",
  loopHint: "Sur un DB9, reliez la broche 2 (RX) à la broche 3 (TX) ; sur un adaptateur TTL, reliez TX à RX. Vérifie que les octets reviennent inchangés à chaque vitesse et mesure l’aller-retour d’un octet.",
  two: "Deux ports — deux adaptateurs reliés entre eux",
  twoHint: "Avec deux adaptateurs/câbles reliés entre eux, envoie de ce port → l’autre et de l’autre → ce port à chaque vitesse, puis compare ce qui arrive. Utile pour vérifier des adaptateurs RS-485.",
  peer: "Autre port",
  peerNone: "Aucun autre port",
  pattern: "Motif",
  patRandom: "Octets mélangés",
  patRamp: "0x00–0xFF dans l’ordre",
  patAlt: "0x55/0xAA en alternance",
  length: "Longueur (octets)",
  wiring: "Câblage",
  overall: "Global",
  colDir: "Sens",
  echo: "Écho RS-485 2 fils",
  echoHint: "Sans appareil sur le bus, vérifie si l’adaptateur reçoit les octets qu’il envoie.",
  bauds: "Vitesses",
  more: "Autres vitesses",
  start: "Lancer le test",
  cancel: "Arrêter",
  sure: "L’appareil est-il débranché de la ligne/du bus ? Les octets de test pourraient arriver à un appareil comme des commandes.",
  sureYes: "Débranché — lancer",
  sureNo: "Annuler",
  running: "Test en cours",
  noPort: "Choisissez d’abord un port.",
  colBaud: "Vitesse",
  colResult: "Résultat",
  colBytes: "Envoyés · identiques · perdus · modifiés",
  colRtt: "Aller-retour 1 octet ms (médiane · max)",
  colFlags: "Indicateurs d’erreur",
  flagsNone: "aucun",
  flagsUnread: "non lu",
  flagFrame: "trame",
  flagParity: "parité",
  flagOverrun: "débordement",
  flagRxOver: "dépassement de tampon",
  flagsNote: "Les indicateurs d’erreur n’apparaissent que si le pilote les lève — «aucun» ne garantit pas l’absence d’erreur. Le temps d’aller-retour inclut la latence USB, le pilote et le temps du programme.",
  echoBack: "Octets revenus",
  firstMs: "Premier octet après",
};

/** Schéma de câblage (en texte) */
export const FR_WIRING: Partial<Record<"loopback" | "two" | "echo", string>> = {
  loopback: ["RS-232 (DB9, mâle ou femelle)", "  broche 2 (RX) ──┐", "  broche 3 (TX) ──┘   relier la broche 2 à la 3", "", "Adaptateur TTL", "  TX ──┐", "  RX ──┘   relier TX à RX", "", "Le RS-485 ne se boucle pas sur un seul port — choisissez «Deux ports»."].join("\n"),
  two: ["RS-232 (croisé, null modem)", "  port A          port B", "  broche 2 RX ──── broche 3 TX", "  broche 3 TX ──── broche 2 RX", "  broche 5 GND ─── broche 5 GND", "", "RS-485 (2 fils)", "  A(D+) ─────── A(D+)", "  B(D−) ─────── B(D−)", "  GND ──────── GND"].join("\n"),
  echo: ["Un adaptateur RS-485 — sans appareil sur le bus", "  A(D+)  B(D−)  rien de branché"].join("\n"),
};

export const FR_IFACE: Fr<IfaceTextKey> = {
  title: "Ce PC",
  all: "toutes les cartes",
  local: "ce PC seulement",
  down: "non connectée",
  none: "Impossible de lire les adresses des cartes",
  refresh: "Recharger",
  use: "Utiliser cette adresse",
  gw: "passerelle",
  notHere: "«{a}» n’est pas une adresse de ce PC — le démarrage échouera avec «adresse non disponible». Choisissez-en une dans la liste ci-dessous.",
  downHere: "La carte de «{a}» ({b}) n’est pas connectée (vérifiez le câble / le Wi-Fi).",
};

export const FR_OPEN_APP: Fr<OpenAppTextKey> = {
  opened: "{a} ouvert — {b}. Appuyez sur Connecter dans cette fenêtre.",
  missing: "{a} est introuvable sur ce PC, donc «{b}» a été copié — collez-le là-bas.",
  get: "Page de téléchargement",
};

/** Confirmation de fermeture (exitGuard.ts) */
export const FR_EXIT = "Une connexion ou un journal fichier est actif. Fermer va déconnecter et arrêter l’enregistrement. Fermer quand même ?";

/** Commandes d’exemple (examples.ts) — préfixe du nom et nom anglais → nom français */
export const FR_EXAMPLE_PREFIX = "ex. ";
export const FR_EXAMPLES: Record<string, string> = {
  "AT (check reply)": "AT (vérifier la réponse)",
  "ATI (device info)": "ATI (infos appareil)",
  "AT+GMR (firmware version)": "AT+GMR (version du firmware)",
  "Modbus Slave ID 1 read 40001–40010 (FC03)": "Modbus esclave 1 lire 40001–40010 (FC03)",
  "Modbus Slave ID 1 read 30001–30002 (FC04)": "Modbus esclave 1 lire 30001–30002 (FC04)",
  "*IDN? (SCPI instrument ID)": "*IDN? (identité de l’instrument SCPI)",
  "Modbus TCP Slave ID 1 read 40001–40010 (FC03)": "Modbus TCP esclave 1 lire 40001–40010 (FC03)",
  "Modbus TCP Slave ID 1 read 30001–30002 (FC04)": "Modbus TCP esclave 1 lire 30001–30002 (FC04)",
  "HTTP request for the home page (port 80)": "HTTP requête de la page d’accueil (port 80)",
  "text hello": "texte hello",
  "HEX 01 02 03 04": "HEX 01 02 03 04",
  "*IDN? (instrument ID)": "*IDN? (identité de l’instrument)",
  "MEAS:VOLT:DC? (DC voltage)": "MEAS:VOLT:DC? (tension DC)",
  "SYST:ERR? (one error)": "SYST:ERR? (une erreur)",
};
