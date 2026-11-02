// metricThreads — bahasa Indonesia, kunci sama dengan ja/pages/metricThreads.ts
export default {
  h1: "Tabel Mata Bor Tap Ulir Metrik dan Baut",
  desc: "Pitch dan mata bor tap (d − P) ulir metrik kasar dan halus M2–M20, plus ukuran kunci L (ISO 4762) dan kunci pas (ISO 4032). Cari menurut ulir atau perkakas.",
  seo: "Tabel Bor Tap Metrik, Ukuran Kunci L dan Kunci Pas — PortDock",
  find: "Cari ulir",
  thread: "Ulir (mis. M8, M10x1.25)",
  bad: "Tidak ada di tabel — masukkan M2, M2.5, M3, M4, M5, M6, M8, M10, M12, M14, M16, M18 atau M20 dengan pitch kasar atau halusnya.",
  k: { p: "Pitch", kind: "Jenis", coarse: "Kasar", fine: "Halus", drill: "Mata bor tap ≈ d − P", key: "Kunci L (baut kepala silinder ISO 4762)", sp: "Kunci pas (mur ISO 4032, baut ISO 4014/4017)", din: "DIN 934 (standar lama)" },
  rev: "Cari menurut ukuran perkakas",
  bySp: "Kunci pas (mm)",
  byKey: "Kunci L (mm)",
  tTitle: "Tabel ulir metrik (M2–M20)",
  tHead: ["Ulir", "Pitch kasar", "Mata bor tap", "Pitch halus (mata bor tap)", "Kunci L", "Kunci pas"],
  tNote:
    "Mata bor tap d − P adalah pendekatan untuk tap pemotong. Dalam praktik pakai mata bor terdekat yang Anda punya dan sesuaikan dengan bahan dan kedalaman ulir. Tap pembentuk (roll) memerlukan ukuran bor yang berbeda — lihat tabel pembuat tap. Ukuran kunci pas mengikuti ISO 4032; mur DIN 934 lama adalah 17 mm untuk M10, 19 mm untuk M12 dan 22 mm untuk M14.",
  torqueTitle: "Torsi pengencangan",
  torque:
    "Torsi baut bergantung pada kelas kekuatan (8.8, A2-70 dan seterusnya), pelumasan, dan material pasangannya, dan terminal blok, pemutus, serta kontaktor memiliki torsi yang ditetapkan pembuatnya sendiri (tercetak pada komponen atau di lembar data). Tabel ini tidak memuat nilai torsi — periksa nilai dari pembuatnya dan gunakan obeng torsi.",
  privacy: "Halaman ini mencari data di dalam peramban Anda; apa yang Anda masukkan tidak dikirim ke server.",
  srcTitle: "Sumber",
  see: ["Untuk terminal cincin yang cocok dengan baut, lihat ", ". Untuk konversi inci dan mm, gunakan ", "."],
  isoNut: "Mur segi enam biasa (tipe 1)",
  dinNut: "standar mur segi enam yang lama",
  faqTitle: "Tanya jawab",
  faq: [
    ["Mengapa mata bor tap «d − P»?", "Itu pendekatan yang lazim untuk tap pemotong (diameter nominal dikurangi pitch). Dalam praktik pakai mata bor terdekat yang Anda punya dan sesuaikan dengan bahan dan kedalaman ulir. Tap pembentuk (roll) memerlukan bor yang berbeda — lihat tabel pembuat tap."],
    ["Ukuran kunci pas saya tidak cocok dengan tabel", "Mur DIN 934 lama memakai ukuran kunci pas yang berbeda dari ISO 4032 untuk M10, M12 dan M14. Periksa nilai «DIN 934» di tabel."],
    ["Mengapa tidak ada torsi pengencangan?", "Itu bergantung pada kelas kekuatan baut, pelumasan, dan material pasangan, dan terminal blok, pemutus, serta kontaktor punya torsi sendiri dari pembuatnya. Ikuti penandaan produk atau lembar datanya."],
  ] as [string, string][],
};
