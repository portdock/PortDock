// 인도네시아어 — «Salin untuk bertanya ke AI» 의 질문 틀·머리말(aiCopy.ts). 원천은 영어판. 붙여 넣는 글이라 화면 언어를 따른다.
import type { AiText } from "../aiCopy.ts";

type HideIp = "public" | "all";

export const ID_AI_COPY: Partial<AiText> = {
  ask: (app: string) => `Berikut log dari ${app}. Tolong sebutkan kemungkinan penyebab masalah dan urutan pengecekannya.`,
  ask2: "Sebutkan apakah perlu melihat pengaturan perangkat, kabel, atau PC lebih dulu, dan tunjukkan baris log yang mendukungnya. Jika tidak yakin, beri tahu apa lagi yang perlu dicek.",
  situation: "## Situasi (isi setelah menempel)",
  situationLines: ["- Yang ingin saya lakukan:", "- Hasil yang diharapkan / sebenarnya:", "- Perangkat (pembuat, model) dan koneksi:"],
  kinds: {
    pc: {
      ask: (app: string) => `Berikut hasil pemeriksaan PC dari ${app}. Tolong sebutkan kemungkinan penyebab masalah dan urutan pengecekannya.`,
      ask2: "Sebutkan apakah perlu melihat pengaturan PC, driver, lingkungan nirkabel (Wi-Fi, Bluetooth), atau router lebih dulu, dan tunjukkan baris yang mendukungnya. Jika tidak yakin, beri tahu apa lagi yang perlu dicek.",
      situationLines: ["- Yang ingin saya lakukan:", "- Hasil yang diharapkan / sebenarnya:", "- PC dan lingkungan nirkabel (laptop/desktop, kabel/nirkabel, model router atau perangkat):"],
    },
    scan: {
      ask: (app: string) => `Berikut daftar perangkat jaringan yang ditemukan ${app}. Tolong bantu saya menemukan perangkat yang dicari, atau mengapa tidak muncul.`,
      ask2: "Sebutkan apakah perlu melihat rentang alamat (subnet), pengaturan IP perangkat, adaptor jaringan, atau switch lebih dulu, dan tunjukkan baris yang mendukungnya. Jika tidak yakin, beri tahu apa lagi yang perlu dicek.",
      situationLines: ["- Perangkat yang dicari (pembuat, model, IP yang diketahui):", "- Hasil yang diharapkan / sebenarnya:", "- Cara PC dan perangkat tersambung (langsung, switch, jaringan pabrik):"],
    },
    port: {
      ask: (app: string) => `Berikut hasil pemeriksaan port dari ${app}. Tolong sebutkan kemungkinan penyebab masalah dan urutan pengecekannya.`,
      ask2: "Sebutkan apakah perlu melihat nomor port, driver, adaptor USB, atau pengaturan hemat daya lebih dulu, dan tunjukkan baris yang mendukungnya. Jika tidak yakin, beri tahu apa lagi yang perlu dicek.",
      situationLines: ["- Yang ingin saya lakukan:", "- Hasil yang diharapkan / sebenarnya:", "- Adaptor atau perangkat (pembuat, model) dan port USB yang dipakai:"],
    },
  },
  found: "## Perangkat ditemukan",
  program: "## Program",
  state: "Status saat ini",
  settings: "## Pengaturan koneksi",
  errors: (n: number) => `## Error di sesi ini (${n})`,
  checks: "## Hasil pemeriksaan",
  log: (n: number) => `## Lalu lintas terbaru (${n} baris)`,
  logFormat: "Format: waktu arah [lawan] HEX | teks | catatan dari program",
  logEmpty: "(tidak ada lalu lintas)",
  cutLines: (n: number, max: number) => `(${n} baris lama dibuang agar muat ${max.toLocaleString("en-US")} karakter)`,
  cutText: "…(dipotong — terlalu panjang)",
  masked: (ip: HideIp) => `_Disembunyikan PortDock: folder pengguna, nama PC (DESKTOP-… dll.), 3 byte terakhir alamat MAC, ${ip === "all" ? "semua alamat IP" : "alamat IP publik"} («[IP-n]»)._`,
};
