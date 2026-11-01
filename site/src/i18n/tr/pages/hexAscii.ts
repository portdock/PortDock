// HEX ↔ ASCII dönüştürücü (views/HexAsciiPage.astro) — 4. paket
export default {
  title: "HEX ↔ ASCII dönüştürücü",
  seo: "HEX’ten ASCII’ye (metne) çevirici, kontrol kodlarıyla — PortDock",
  desc: "HEX baytlarını metne, metni HEX’e çevirin. CR ve LF gibi kontrol karakterleri \\r \\n \\xNN olarak görünür; olduğu gibi kopyalayıp gönderebilirsiniz.",
  hex: "HEX",
  ascii: "Metin (ASCII · kaçış dizileri)",
  dec: "Ondalık",
  count: "bayt",
  how: "Yazdırılabilir karakterler (0x20–0x7E) olduğu gibi kalır; diğer her şey \\r \\n \\t \\0 \\\\ \\xNN olur. ASCII dışı metin (ç, ğ, ş gibi Türkçe harfler dahil) UTF-8 baytlarına dönüşür. Her şey tarayıcınızda çalışır.",
  tableTitle: "Sık kullanılan kontrol karakterleri",
  appNote: "Hemen bir cihaza göndermek için şunu kullanın:",
  appEnd: ".",
  ctrlHead: ["HEX", "Ad", "Kaçış"],
  asciiNote: "0–127 arasındaki tüm kodlar ve kontrol karakteri adları için:",
  asciiEnd: ".",
};
