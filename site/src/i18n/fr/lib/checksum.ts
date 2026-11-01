// lib/checksum.ts 문구(영어 문장 → 프랑스어). {} 는 그 자리에 들어가는 값, 번역에서는 {0} {1} … 로 쓴다(lib/tr.ts)
export default {
  "Poly 0xA001 (reflected 0x8005), init 0xFFFF, low byte first": "Polynôme 0xA001 (0x8005 réfléchi), valeur initiale 0xFFFF, octet de poids faible en premier",
  "Poly 0x1021, init 0xFFFF, high byte first (CCITT-FALSE)": "Polynôme 0x1021, valeur initiale 0xFFFF, octet de poids fort en premier (CCITT-FALSE)",
  "Poly 0x1021, init 0x0000, high byte first": "Polynôme 0x1021, valeur initiale 0x0000, octet de poids fort en premier",
  "Poly 0x07, init 0x00": "Polynôme 0x07, valeur initiale 0x00",
  "Two's complement of the byte sum": "Complément à deux de la somme des octets",
  "XOR of all bytes": "XOR de tous les octets",
  "Byte sum, low 8 bits": "Somme des octets, 8 bits de poids faible",
  "Byte sum, 16 bits, high byte first": "Somme des octets sur 16 bits, octet de poids fort en premier",
  "Not a HEX digit: «{}»": "Caractère non hexadécimal : « {0} »",
  "Odd number of HEX digits: «{}»": "Nombre impair de chiffres hexadécimaux : « {0} »",
  "Bad \\x escape: «\\x{}» (two HEX digits)": "Séquence \\x invalide : « \\x{0} » (deux chiffres hexadécimaux)",
  "Unknown escape: «\\{}»": "Séquence d’échappement inconnue : « \\{0} »",
};
