// 프랑스어 — Modbus 요청 만들기 창(ModbusBuilder.tsx)·요청과 짝 값(MbValues.tsx)·MBAP 풀이(MbapDetail.tsx)·요청 검사 문구(modbusBuild.ts).
// 원천은 영어판, 빠진 열쇠는 영어로 보인다. 용어는 사이트 fr 와 같게(esclave·registre de maintien·entrée TOR·bobine).
import type { MbBuilderTextKey } from "../ModbusBuilder.tsx";
import type { MbValuesTextKey } from "../MbValues.tsx";
import type { MbapTextKey } from "../MbapDetail.tsx";
import type { MbBuildText } from "../modbusBuild.ts";

type Fr<K extends string> = Partial<Record<K, string>>;

export const FR_MB_BUILDER: Fr<MbBuilderTextKey> = {
  title: "Construire une requête Modbus",
  titleTcp: "Construire une requête Modbus TCP",
  slave: "Adresse esclave",
  slaveHint: "1–247 (écritures : 0 = broadcast, pas de réponse)",
  unitHint: "0–255 — va dans le champ Unit ID du MBAP. En général 1 ; l’adresse esclave RTU derrière une passerelle ; n’importe quelle valeur si l’appareil l’ignore",
  tid: "ID de transaction",
  tidHint: "0–65535 — la réponse le renvoie. Avec «ID de transaction MBAP auto» activé dans la barre d’envoi, il change à chaque envoi",
  func: "Fonction",
  addr: "Adresse de début",
  zero: "base 0",
  plc: "notation {a}",
  qty: "Quantité",
  qtyHint: "1–{a}",
  values: "Valeurs",
  valuesHint: "Séparées par virgule/espace. Décimal ou hex 0x ; négatifs admis",
  coilsHint: "1 (ON) / 0 (OFF), séparés par virgule/espace — la première valeur est l’adresse de début",
  coil: "Valeur",
  on: "ON (FF 00)",
  off: "OFF (00 00)",
  nVals: "{n} valeurs",
  preview: "Requête (avant CRC)",
  previewTcp: "Requête (en-tête MBAP + PDU)",
  crcNote: "+ le CRC16 Modbus de 2 octets est ajouté par la barre d’envoi",
  tcpNote: "Modbus TCP n’a pas de CRC — envoyé tel quel, sans somme de contrôle",
  put: "Mettre en saisie",
  send: "Envoyer",
  sendTip: "Envoie cette requête maintenant (HEX, CRC16 Modbus ajouté, sans fin de ligne). Entrée dans cette fenêtre fait de même",
  toPlc: "Passer en notation {a}",
  putTip: "Règle la barre d’envoi sur HEX, somme CRC16 Modbus, sans fin de ligne, et y place ces octets",
  putTipTcp: "Règle la barre d’envoi sur HEX, sans somme de contrôle, sans fin de ligne, et y place ces octets",
  add: "Enregistrer dans la liste",
  added: "«{a}» ajouté à la liste de commandes",
  close: "Fermer",
  bcast: "L’esclave 0 écrit dans tous les appareils ; aucun ne répond.",
  help: "Première fois ?",
  helpLink: "Voir le pas-à-pas",
  helpTip: "Ouvre le pas-à-pas Modbus dans l’aide (cette fenêtre se ferme)",
};

export const FR_MB_VALUES: Fr<Exclude<MbValuesTextKey, "fmts">> = {
  head: "Associé à la requête",
  from: "Esclave {u} · {f} · {a} ({n})",
  tid: "transaction {t}",
  fmt: "Format des valeurs",
  notation: "Adresses",
  zero: "base 0",
  plc: "notation {a}",
  write: "OK — l’appareil a accepté l’écriture",
  exc: "Exception {a}",
};

export const FR_MBAP: Fr<MbapTextKey> = {
  tid: "ID de transaction",
  len: "Champ longueur",
  lenBad: "le champ longueur ne correspond pas",
  unit: "Unit ID (esclave)",
  values: "Valeurs",
  head: "Modbus TCP",
};

export const FR_MB_BUILD: Partial<MbBuildText> = {
  slave: "L’adresse esclave va de 1 à 247 (0 = broadcast pour les fonctions d’écriture — pas de réponse).",
  slaveRead: "Les fonctions de lecture ne peuvent pas utiliser l’esclave 0 (broadcast) — aucune réponse ne viendrait. Utilisez 1–247.",
  func: "Fonction non prise en charge.",
  addrEmpty: "Saisissez une adresse.",
  addrNum: "L’adresse doit être un nombre (décimal ; hex 0x admis en base 0).",
  addrZero: "L’adresse en base 0 va de 0 à 65535.",
  addrPlcLen: "La notation automate a 5 chiffres (ex. 40001) ou 6 chiffres (ex. 400001).",
  addrPlcOff: "La notation automate compte à partir de 1 (5 chiffres 0001–9999, 6 chiffres 00001–65536).",
  addrPrefix: "«{a}» est en notation {b}. Cette fonction utilise {c}.",
  addrBadPrefix: "Le premier chiffre {a} n’est pas une notation Modbus (0 bobine, 1 entrée TOR, 3 registre d’entrée, 4 registre de maintien).",
  addrPlcNote: "{a} → base 0 {b} (0x{c})",
  addrLooksPlc: "«{a}» ressemble à la notation {p}xxxx. Tel que saisi, c’est l’adresse {a} en base 0 (0x{c}) — en notation {p}xxxx, c’est l’adresse {b}.",
  qty: "La quantité va de 1 à {a} (limite du protocole).",
  overflow: "L’adresse de fin dépasse 65535 (début {a} + quantité {b}).",
  valEmpty: "Saisissez la ou les valeurs à écrire.",
  valBad: "«{a}» n’est pas une valeur — utilisez le décimal ou l’hex 0x.",
  valReg: "La valeur de registre «{a}» doit être entre -32768 et 65535 (les négatifs partent en complément à deux).",
  valCoil: "La valeur de bobine «{a}» doit être 1 (ON) ou 0 (OFF).",
  valOne: "Cette fonction écrit une seule valeur.",
  valCount: "{n} valeurs — cette fonction en accepte de 1 à {a}.",
  plcNames: { "0": "0xxxx (bobine)", "1": "1xxxx (entrée TOR, FC02)", "3": "3xxxx (registre d’entrée, FC04)", "4": "4xxxx (registre de maintien, FC03/06/10)" },
};
