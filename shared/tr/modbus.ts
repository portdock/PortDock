// 튀르키예어 — Modbus 요청 만들기 창(ModbusBuilder.tsx)·요청과 짝 값(MbValues.tsx)·MBAP 풀이(MbapDetail.tsx)·요청 검사 문구(modbusBuild.ts).
// 원천은 영어판, 빠진 열쇠는 영어로 보인다. 용어는 앱 tr 사전과 같게(Slave ID·register·yazım).
import type { MbBuilderTextKey } from "../ModbusBuilder.tsx";
import type { MbValuesTextKey } from "../MbValues.tsx";
import type { MbapTextKey } from "../MbapDetail.tsx";
import type { MbBuildText } from "../modbusBuild.ts";

type Tr<K extends string> = Partial<Record<K, string>>;

export const TR_MB_BUILDER: Tr<MbBuilderTextKey> = {
  title: "Modbus isteği oluştur",
  titleTcp: "Modbus TCP isteği oluştur",
  slave: "Slave ID",
  slaveHint: "1–247 (yazma: 0 = yayın, yanıt yok)",
  unitHint: "0–255 — MBAP Unit ID alanına girer. Genelde 1; ağ geçidinin arkasındaki RTU Slave ID'si; cihaz yok sayıyorsa herhangi bir değer",
  tid: "İşlem kimliği",
  tidHint: "0–65535 — yanıt aynısını döndürür. Gönderme çubuğunda «Otomatik işlem kimliği» açıksa her gönderimde değişir",
  func: "Fonksiyon",
  addr: "Başlangıç adresi",
  zero: "0 tabanlı",
  plc: "{a} yazımı",
  qty: "Adet",
  qtyHint: "1–{a}",
  values: "Değerler",
  valuesHint: "Virgül/boşlukla ayrılmış. Ondalık veya 0x onaltılık; negatifler olur",
  coilsHint: "1 (ON) / 0 (OFF), virgül/boşlukla ayrılmış — ilk değer başlangıç adresidir",
  coil: "Değer",
  on: "ON (FF 00)",
  off: "OFF (00 00)",
  nVals: "{n} değer",
  preview: "İstek (CRC'den önce)",
  previewTcp: "İstek (MBAP başlığı + PDU)",
  crcNote: "+ 2 baytlık CRC16 Modbus'ı gönderme çubuğu ekler",
  tcpNote: "Modbus TCP'de CRC yoktur — sağlama toplamı olmadan olduğu gibi gönderilir",
  put: "Girişe koy",
  send: "Gönder",
  sendTip: "Bu isteği şimdi gönderir (HEX, CRC16 Modbus eklenir, satır sonu yok). Bu pencerede Enter da aynısını yapar",
  toPlc: "{a} yazımına geç",
  putTip: "Gönderme çubuğunu HEX, sağlama CRC16 Modbus, satır sonu yok olarak ayarlar ve bu baytları doldurur",
  putTipTcp: "Gönderme çubuğunu HEX, sağlama yok, satır sonu yok olarak ayarlar ve bu baytları doldurur",
  add: "Listeye kaydet",
  added: "«{a}» komut listesine eklendi",
  close: "Kapat",
  bcast: "Slave ID 0 tüm cihazlara yazar; hiçbiri yanıt vermez.",
  help: "İlk kez mi?",
  helpLink: "Adım adım göster",
  helpTip: "Yardım'daki Modbus adım adım rehberini açar (bu pencere kapanır)",
};

export const TR_MB_VALUES: Tr<Exclude<MbValuesTextKey, "fmts">> = {
  head: "İstekle eşlendi",
  from: "Slave ID {u} · {f} · {a} ({n})",
  tid: "işlem {t}",
  fmt: "Değer biçimi",
  notation: "Adresler",
  zero: "0 tabanlı",
  plc: "{a} yazımı",
  write: "Tamam — cihaz yazmayı kabul etti",
  exc: "İstisna {a}",
};

export const TR_MBAP: Tr<MbapTextKey> = {
  tid: "İşlem kimliği",
  len: "Uzunluk alanı",
  lenBad: "uzunluk alanı uyuşmuyor",
  unit: "Unit ID (Slave ID)",
  values: "Değerler",
  head: "Modbus TCP",
};

export const TR_MB_BUILD: Partial<MbBuildText> = {
  slave: "Slave ID 1–247'dir (yazma fonksiyonlarında 0 = yayın — yanıt yok).",
  slaveRead: "Okuma fonksiyonları Slave ID 0 (yayın) kullanamaz — yanıt gelmez. 1–247 kullanın.",
  func: "Desteklenmeyen fonksiyon.",
  addrEmpty: "Bir adres girin.",
  addrNum: "Adres bir sayı olmalı (ondalık; 0 tabanlıda 0x onaltılık da olur).",
  addrZero: "0 tabanlı adres 0–65535'tir.",
  addrPlcLen: "PLC yazımı 5 hanelidir (ör. 40001) veya 6 hanelidir (ör. 400001).",
  addrPlcOff: "PLC yazımı 1'den sayar (5 hane 0001–9999, 6 hane 00001–65536).",
  addrPrefix: "«{a}» {b} yazımında. Bu fonksiyon {c} kullanır.",
  addrBadPrefix: "Baştaki {a} rakamı Modbus yazımı değil (0 coil, 1 ayrık giriş, 3 input register, 4 holding register).",
  addrPlcNote: "{a} → 0 tabanlı {b} (0x{c})",
  addrLooksPlc: "«{a}» {p}xxxx yazımına benziyor. Yazıldığı gibi 0 tabanlı {a} (0x{c}) adresini okur — {p}xxxx yazımında adres {b} olur.",
  qty: "Adet 1–{a}'dır (protokol sınırı).",
  overflow: "Bitiş adresi 65535'i aşıyor (başlangıç {a} + adet {b}).",
  valEmpty: "Yazılacak değer(ler)i girin.",
  valBad: "«{a}» bir değer değil — ondalık veya 0x onaltılık kullanın.",
  valReg: "Register değeri «{a}» -32768–65535 olmalı (negatifler ikinin tümleyeni olarak gönderilir).",
  valCoil: "Coil değeri «{a}» 1 (ON) veya 0 (OFF) olmalı.",
  valOne: "Bu fonksiyon tek bir değer yazar.",
  valCount: "{n} değer — bu fonksiyon 1–{a} alır.",
  plcNames: { "0": "0xxxx (coil)", "1": "1xxxx (ayrık giriş, FC02)", "3": "3xxxx (input register, FC04)", "4": "4xxxx (holding register, FC03/06/10)" },
};
