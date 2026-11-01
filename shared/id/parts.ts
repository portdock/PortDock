// 인도네시아어 — 공용 부품의 화면 글(설정 창·도움말 머리·문제 보고·AI 복사 창·첫 실행 카드·새 버전 알림·로그 찾기·화면 오류·사용 통계).
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

type Id<K extends string> = Partial<Record<K, string>>;

export const ID_SETTINGS: Id<SettingsTextKey> = {
  title: "Pengaturan",
  lang: "Bahasa",
  theme: "Tema",
  system: "Ikuti Windows",
  light: "Terang",
  dark: "Gelap",
  fontSize: "Ukuran huruf (px)",
  timeFormat: "Cap waktu log",
  local: "hh:mm:ss.ms",
  localDate: "Tanggal + waktu",
  utc: "UTC",
  elapsed: "Waktu sejak mulai (Bersihkan me-reset)",
  maxLines: "Baris yang disimpan di layar",
  maxLinesHint: "Baris lama hanya dibuang dari layar (log file menyimpan semuanya).",
  autoScroll: "Gulir otomatis pada baris baru (berhenti saat Anda menggulir ke atas)",
  alwaysOnTop: "Selalu di atas — jaga jendela ini di atas yang lain (📌 di header)",
  expandAll: "Buka semua (tampilan ahli) — selalu tampilkan grup yang diciutkan (koneksi lanjutan, pengaturan terima, injeksi gangguan, statistik …) terbuka",
  autoLog: "Mulai log file saat tersambung",
  logFolder: "Folder log otomatis",
  choose: "Pilih",
  noFolder: "Pilih folder",
  confirmExit: "Tanya sebelum menutup saat tersambung atau mencatat log",
  lostAlert: "Kedipkan tombol taskbar saat koneksi putus (saat jendela di latar belakang)",
  keepAwake: "Jaga PC tetap terjaga saat tersambung atau mencatat log (layar tetap bisa mati)",
  autoConnect: "Buka lagi koneksi terakhir saat mulai",
  autoReport: "Laporan error otomatis",
  arAsk: "Tanya setelah crash",
  arOn: "Kirim otomatis",
  arOff: "Jangan pernah kirim",
  autoReportHint: "Hanya mengirim penyebab error program (exception, crash) dan versi program/Windows. Lalu lintas, perintah, aturan, dan pengaturan IP tidak pernah dikirim. PC offline mencoba lagi lain kali.",
  backup: "Backup",
  exportAll: "Ekspor pengaturan",
  importAll: "Impor pengaturan",
  reset: "Kembali ke bawaan",
  resetAsk: "Kembalikan pengaturan tampilan ke bawaan? (perintah dan aturan dipertahankan)",
  importAsk: "Impor mengganti semua pengaturan, perintah, dan aturan saat ini. Lanjutkan?",
  importBusy: "Hentikan koneksi dan log sebelum mengimpor.",
  noFolderWarn: "Log otomatis tidak akan dimulai sampai folder dipilih.",
  close: "Tutup",
  about: "Tentang",
  copyright: "Copyright (C) 2026 PortDock",
  gpl: "Program ini adalah perangkat lunak bebas, didistribusikan di bawah GNU GPL v3. Program ini TANPA JAMINAN APA PUN.",
  license: "Teks lisensi",
  source: "Kode sumber",
  site: "Situs web",
  notices: "Pemberitahuan pihak ketiga",
  sponsor: "Dukung",
  checkUpdate: "Cek pembaruan",
  checkUpdateHint: "Membuka halaman rilis terbaru di browser.",
  updateCheck: "Cek versi baru (sekali sehari)",
  updateCheckHint: "Jika aktif, sekali sehari bertanya ke GitHub (api.github.com) hanya tentang rilis terbaru dan menampilkan pemberitahuan di bawah jendela jika ada versi lebih baru. Tidak ada data yang dikirim; tidak ada yang diunduh atau dipasang.",
};

export const ID_HELP_UI: Id<HelpUiKey> = {
  title: "Bantuan",
  search: "Cari…",
  close: "Tutup",
  none: "Tidak ada yang cocok",
  enOnly: "Bantuan hanya dalam bahasa Inggris (layar dalam bahasa Indonesia).",
};

export const ID_REPORT: Id<ReportTextKey> = {
  button: "Laporkan masalah — kirim error dan bug ke pengembang",
  title: "Laporkan masalah",
  intro: "Laporan dibuat di PC ini dan ditampilkan di bawah. Tidak ada yang dikirim otomatis. Periksa dulu, lalu pilih cara mengirimnya.",
  what: "Apa yang terjadi? (apa yang sedang dilakukan, apa yang diklik, hasil yang diharapkan vs. sebenarnya)",
  whatPh: "mis. Jendela membeku saat lawan ketiga tersambung ke TCP server.",
  env: "Versi program dan Windows (selalu disertakan)",
  errors: "{n} error di sesi ini",
  crashes: "{n} catatan crash",
  dumps: "File dump disertakan ({n} KB)",
  dumpsSend: " — diunggah dengan «Kirim sekarang»",
  dumpManual: "Lampirkan file dump sendiri saat mengirim lewat email atau GitHub (disimpan sampai dikirim atau dibuang): {a}",
  config: "Pengaturan koneksi dan tampilan (IP, port, baud … — perintah dan aturan tidak disertakan)",
  log: "{n} baris lalu lintas terakhir",
  logWarn: "Lalu lintas bisa berisi data perusahaan atau perangkat. Sertakan hanya jika diizinkan.",
  preview: "Pratinjau laporan",
  copy: "Salin",
  copied: "Tersalin",
  saveFile: "Simpan ke file",
  saved: "Tersimpan: {a}",
  email: "Kirim lewat email",
  emailHint: "Program email Anda terbuka. Laporan panjang dipotong, jadi lampirkan file dari «Simpan ke file».",
  issue: "Buka issue GitHub",
  issueHint: "Diterbitkan publik di GitHub (perlu akun). Pastikan tidak ada data perusahaan.",
  offline: "Di PC offline, «Simpan ke file», pindahkan dengan USB, dan kirim dari PC lain.",
  close: "Tutup",
  crashTitle: "Program crash terakhir kali",
  crashBody: "{a} tertutup tak terduga terakhir kali dan meninggalkan catatan crash. Mengirimnya ke pengembang sangat membantu.",
  crashOpen: "Lihat laporan",
  crashLater: "Nanti",
  crashDiscard: "Buang tanpa mengirim",
  noTarget: "Belum ada tujuan yang diatur. Pakai «Simpan ke file».",
  sendNow: "Kirim sekarang",
  sendNowHint: "Mengirim pratinjau di atas langsung ke pengembang (perlu internet, tanpa akun).",
  sending: "Mengirim…",
  sentOk: "Terkirim. Terima kasih!",
  sendFail: "Tidak bisa mengirim (periksa koneksi internet). «Simpan ke file» dan kirim nanti.",
  crashSend: "Kirim sekarang",
  crashAlways: "Mulai sekarang kirim otomatis tanpa bertanya",
};

export const ID_AI_UI: Id<AiUiKey> = {
  button: "Tanya AI — hanya menyalin, tidak ada yang dikirim: situasi saat ini sebagai teks untuk chat AI, ke clipboard",
  title: "Salin untuk bertanya ke AI",
  introLog: "Membuat teks untuk chat AI (dengan templat pertanyaan): program, pengaturan koneksi, error di sesi ini, dan lalu lintas terbaru.",
  introChecks: "Membuat teks untuk chat AI (dengan templat pertanyaan): program, error di sesi ini, dan hasil pemeriksaan.",
  local: "PortDock tidak mengirim apa pun ke mana pun — hanya ke clipboard.",
  warn: "Apa pun yang Anda tempel dikirim ke layanan AI itu. Periksa detail perangkat dan perusahaan sebelum menempel.",
  hideIp: "Sembunyikan juga IP privat (IP publik selalu disembunyikan)",
  incLog: "Sertakan lalu lintas terbaru",
  incChecks: "Sertakan hasil pemeriksaan",
  incFound: "Sertakan perangkat ditemukan",
  introFound: "Membuat teks untuk chat AI (dengan templat pertanyaan): program, error di sesi ini, dan perangkat yang ditemukan.",
  preview: "Teks yang ditempel (pratinjau)",
  size: "{n} / {max} karakter",
  cut: " · {n} baris lama dibuang",
  cutText: " · teks panjang dipotong",
  copy: "Salin",
  copied: "Tersalin — tempel ke chat AI (Ctrl+V) dan isi «Situasi».",
  copyFail: "Tidak bisa menyalin — program lain mungkin memakai clipboard",
  close: "Tutup",
};

export const ID_FIRST: Id<FirstTextKey> = {
  hide: "Jangan tampilkan lagi",
  help: "Bantuan:",
  narrow: "Jendela sempit, jadi panel kiri dilipat — «kiri» di bawah berarti panel di balik tombol «⚙ {b}» di kiri atas.",
  open: "Buka panel kiri",
};

export const ID_UPDATE: Id<UpdateTextKey> = {
  msg: "Versi {a} tersedia (Anda memakai {b}).",
  open: "Halaman rilis",
  later: "Jangan ingatkan versi ini lagi",
  close: "Tutup (tampil lagi saat mulai berikutnya)",
};

export const ID_FILTER: Id<FilterTextKey> = {
  find: "Cari (Ctrl+F) — 01 03 atau teks",
  auto: "Otomatis",
  hex: "HEX",
  text: "Teks",
  prev: "Sebelumnya (Shift+Enter)",
  next: "Berikutnya (Enter)",
  hitsOnly: "Hanya yang cocok",
  failOnly: "Hanya GAGAL",
  all: "Semua",
  off: "Hapus filter (Esc)",
  badHex: "bukan HEX",
  none: "tidak ada",
  shown: "{a}/{b} baris",
};

export const ID_BOUNDARY: Id<BoundaryTextKey> = {
  title: "Layar mengalami crash",
  body: "Mengirim ini ke pengembang membantu memperbaikinya. Membuka ulang program biasanya memulihkannya.",
  report: "Laporkan masalah",
  reload: "Muat ulang",
  resetTip: "Jika memuat ulang crash lagi — menghapus pengaturan layar tersimpan (termasuk daftar perintah dan aturan)",
  resetArm: "Benar-benar reset — klik lagi",
  reset: "Reset pengaturan",
};

export const ID_USAGE: Partial<UsageText> = {
  title: "Kirim statistik penggunaan?",
  why: "Mengetahui fitur mana yang dipakai membantu menentukan apa yang diperbaiki berikutnya. Jika diaktifkan, item di bawah dikirim secara anonim, sekali, saat Anda menutup jendela.",
  sendsTitle: "Yang dikirim",
  sends: ["Nama dan versi program, versi Windows (10/11), bahasa tampilan", "Menit program terbuka", "Berapa kali tiap fitur dipakai (sambung, kirim, baca … — hanya jumlah)", "Edisi terpasang atau portabel"],
  neverTitle: "Tidak pernah dikirim",
  never: ["Isi lalu lintas", "Alamat IP, port, nama COM", "Path file", "Nama PC, pengguna, dan perangkat", "ID apa pun yang mengenali instalasi atau PC"],
  where: "Penerima: Aptabase (UE). Jika offline atau gagal mengirim, data dibuang. Jawaban Anda juga menjadi nilai awal untuk aplikasi PortDock lain di PC ini (tidak akan bertanya lagi), dan tiap aplikasi bisa mengubahnya kapan saja di Pengaturan (⚙).",
  yes: "Kirim",
  no: "Jangan kirim",
  setting: "Kirim statistik penggunaan (anonim, saat ditutup)",
  hint: "Hanya mengirim jumlah pemakaian fitur, menit terbuka, versi program/Windows, bahasa tampilan, dan edisi terpasang/portabel. Lalu lintas, alamat IP, port, nama COM, path file, dan nama PC/pengguna/perangkat tidak pernah dikirim. Penerima: Aptabase (UE).",
};
