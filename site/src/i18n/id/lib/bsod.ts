// Kamus kode stop layar biru — urutan pemeriksaan (STEPS), arti (meaning), dan kemungkinan penyebab (causes) di lib/bsod.ts, kalimat bahasa Inggris → Indonesia. Ke-39 kode (dimuat di JSON halaman — libText «bsod»)
// Urutan: 16 langkah pemeriksaan, lalu arti per kode dan kemungkinan penyebab yang pertama muncul di kode itu
export default {
  "In Event Viewer → Windows Logs → System, look at errors and warnings around the same time (disk, Ntfs, WHEA-Logger, driver names).": "Di Penampil Peristiwa (Event Viewer) → Log Windows → Sistem, lihat kesalahan dan peringatan sekitar waktu yang sama (disk, Ntfs, WHEA-Logger, nama driver).",
  "Undo what changed just before the crashes began (new device, driver, Windows update, antivirus, VPN, virtualization, anti-cheat software).": "Batalkan perubahan yang terjadi tepat sebelum crash mulai muncul (perangkat baru, driver, pembaruan Windows, antivirus, VPN, virtualisasi, perangkat lunak anti-cheat).",
  "Find which device the .sys file named on the blue screen or in the dump belongs to, and try the device maker's latest (or previous) driver.": "Cari tahu perangkat mana pemilik berkas .sys yang disebut di layar biru atau di dump, lalu coba driver terbaru (atau versi sebelumnya) dari pembuat perangkat.",
  "Run Windows Memory Diagnostic (mdsched.exe); with several memory modules, try them one at a time.": "Jalankan Diagnostik Memori Windows (mdsched.exe); jika ada beberapa keping memori, coba satu per satu.",
  "Turn off overclocking, XMP/EXPO memory profiles and undervolting, return the BIOS to defaults and repeat the same workload.": "Matikan overclock, profil memori XMP/EXPO, dan undervolt, kembalikan BIOS ke pengaturan default, lalu ulangi beban kerja yang sama.",
  "Check temperatures (CPU, graphics card) and power (PSU capacity, cables, laptop adapter). If it happens only under heavy load, this is a strong candidate.": "Periksa suhu (CPU, kartu grafis) dan daya (kapasitas PSU, kabel, adaptor laptop). Jika hanya terjadi saat beban berat, ini kandidat kuat.",
  "Check for a newer BIOS and chipset driver from the motherboard or laptop maker.": "Periksa apakah ada BIOS dan driver chipset yang lebih baru dari pembuat motherboard atau laptop.",
  "Check the storage: chkdsk C: /scan (scan without fixing), the drive maker's diagnostics and SMART, SATA cable or M.2 seating, SSD firmware.": "Periksa penyimpanan: chkdsk C: /scan (memindai tanpa memperbaiki), alat diagnostik pembuat drive dan SMART, kabel SATA atau pemasangan M.2, firmware SSD.",
  "Update the storage controller driver (SATA AHCI, NVMe, RAID) and SSD firmware from the maker.": "Perbarui driver pengontrol penyimpanan (SATA AHCI, NVMe, RAID) dan firmware SSD dari pembuatnya.",
  "From an administrator command prompt, check system files with sfc /scannow and DISM /Online /Cleanup-Image /RestoreHealth.": "Dari Prompt Perintah sebagai administrator, periksa berkas sistem dengan sfc /scannow dan DISM /Online /Cleanup-Image /RestoreHealth.",
  "Check whether it happens when entering or leaving sleep or hibernation. Try with Fast Startup off and compare the «Power Management» tab of USB and network devices.": "Periksa apakah terjadi saat masuk atau keluar dari mode tidur atau hibernasi. Coba dengan pengaktifan cepat (Fast Startup) dimatikan, lalu bandingkan tab «Manajemen Daya» perangkat USB dan jaringan.",
  "Reinstall the graphics driver from the maker's site (latest or one version back) and turn off graphics card overclocking.": "Pasang ulang driver grafis dari situs pembuatnya (terbaru atau satu versi sebelumnya) dan matikan overclock kartu grafis.",
  "If Windows will not start, use «Startup Repair» in the recovery environment. If the BIOS storage mode (AHCI, RAID, VMD) was changed, set it back.": "Jika Windows tidak mau mulai, gunakan «Perbaikan Startup» di lingkungan pemulihan. Jika mode penyimpanan BIOS (AHCI, RAID, VMD) diubah, kembalikan.",
  "If the same code repeats with no driver named, advanced users can narrow suspects with Driver Verifier (verifier.exe) — it can cause boot loops, so make a restore point first and run verifier /reset when done.": "Jika kode yang sama berulang tanpa nama driver, pengguna mahir dapat mempersempit tersangka dengan Driver Verifier (verifier.exe) — ini dapat menyebabkan boot berulang, jadi buat titik pemulihan dulu dan jalankan verifier /reset setelah selesai.",
  "Opening the dump (C:\\Windows\\Minidump\\*.dmp or MEMORY.DMP) with !analyze -v in WinDbg shows more about the module where it stopped.": "Membuka dump (C:\\Windows\\Minidump\\*.dmp atau MEMORY.DMP) dengan !analyze -v di WinDbg menampilkan lebih banyak tentang modul tempat sistem berhenti.",
  "If the code differs every time, look at hardware (memory, power, temperature, overclocking) before any single driver.": "Jika kodenya berbeda setiap kali, periksa perangkat keras (memori, daya, suhu, overclock) sebelum mencurigai satu driver.",
  // IRQL_NOT_LESS_OR_EQUAL
  "Windows or a kernel driver touched an invalid address or pageable memory while running at a raised interrupt level (IRQL).": "Windows atau driver kernel menyentuh alamat tidak valid atau memori yang dapat di-page saat berjalan pada tingkat interupsi (IRQL) yang dinaikkan.",
  "A kernel driver using a bad address (network, antivirus, virtualization, old device drivers)": "Driver kernel yang memakai alamat salah (jaringan, antivirus, virtualisasi, driver perangkat lama)",
  "Faulty memory or overclocking": "Memori rusak atau overclock",
  // BAD_POOL_HEADER
  "The header of a kernel memory pool block is corrupt.": "Header blok pool memori kernel rusak.",
  "A driver overwriting pool memory (antivirus, filter and network drivers are common)": "Driver yang menimpa memori pool (sering driver antivirus, filter, dan jaringan)",
  "Faulty memory": "Memori rusak",
  // MEMORY_MANAGEMENT
  "A severe memory management error occurred. Parameter 1 tells which kind.": "Terjadi kesalahan manajemen memori yang parah. Parameter 1 menunjukkan jenisnya.",
  "Faulty or loose memory (RAM), memory overclocking such as XMP/EXPO": "Memori (RAM) rusak atau longgar, overclock memori seperti XMP/EXPO",
  "A driver problem": "Masalah driver",
  "Errors on the disk that holds the page file": "Kesalahan pada disk tempat berkas halaman (page file)",
  // KMODE_EXCEPTION_NOT_HANDLED
  "A kernel-mode program raised an exception nobody handled. Parameter 2 (the exception address) often points at the driver.": "Program mode kernel memunculkan eksepsi yang tidak ditangani siapa pun. Parameter 2 (alamat eksepsi) sering menunjuk ke driver.",
  "A device driver or system service": "Driver perangkat atau layanan sistem",
  "Incompatible hardware": "Perangkat keras yang tidak kompatibel",
  // NTFS_FILE_SYSTEM
  "A problem occurred in the NTFS file system driver (ntfs.sys).": "Terjadi masalah pada driver sistem berkas NTFS (ntfs.sys).",
  "Disk corruption or bad sectors, SATA cable": "Kerusakan disk atau bad sector, kabel SATA",
  "Antivirus, backup or defrag tools that watch the disk constantly": "Alat antivirus, pencadangan, atau defrag yang terus memantau disk",
  "Too little free disk space": "Ruang kosong disk terlalu sedikit",
  // SYSTEM_SERVICE_EXCEPTION
  "An exception occurred in a system service routine — the path where ordinary programs call into the kernel.": "Terjadi eksepsi di rutin layanan sistem — jalur tempat program biasa memanggil kernel.",
  "Graphics, audio, antivirus or virtualization drivers": "Driver grafis, audio, antivirus, atau virtualisasi",
  "Damaged system files": "Berkas sistem rusak",
  // INTERRUPT_EXCEPTION_NOT_HANDLED
  "An exception raised while handling an interrupt could not be handled.": "Eksepsi yang muncul saat menangani interupsi tidak dapat ditangani.",
  "A device driver (devices that use interrupts)": "Driver perangkat (perangkat yang memakai interupsi)",
  "Faulty hardware": "Perangkat keras rusak",
  // PFN_LIST_CORRUPT
  "The page frame number (PFN) list that tracks physical memory is corrupt.": "Daftar nomor bingkai halaman (PFN) yang melacak memori fisik rusak.",
  "A driver passing a bad memory descriptor (MDL)": "Driver yang mengirim deskriptor memori (MDL) yang salah",
  // PAGE_FAULT_IN_NONPAGED_AREA
  "Invalid system memory was referenced.": "Memori sistem yang tidak valid dirujuk.",
  "A faulty driver or system service, antivirus": "Driver atau layanan sistem yang bermasalah, antivirus",
  "Faulty memory (RAM or video memory)": "Memori rusak (RAM atau memori video)",
  "A corrupted NTFS volume": "Volume NTFS yang rusak",
  // KERNEL_DATA_INPAGE_ERROR
  "Kernel data could not be read back from the page file. Parameter 2 (error status) tells whether the disk is involved.": "Data kernel tidak dapat dibaca kembali dari berkas halaman. Parameter 2 (status kesalahan) menunjukkan apakah disk terlibat.",
  "Bad disk sectors (0xC000009C, 0xC000016A)": "Bad sector pada disk (0xC000009C, 0xC000016A)",
  "Loose or faulty cabling (0xC000009D, 0xC0000185)": "Kabel longgar atau rusak (0xC000009D, 0xC0000185)",
  "Faulty memory, nonpaged pool shortage (0xC000009A)": "Memori rusak, kekurangan nonpaged pool (0xC000009A)",
  // INACCESSIBLE_BOOT_DEVICE
  "Windows lost access to the system partition during startup.": "Windows kehilangan akses ke partisi sistem saat memulai.",
  "A changed BIOS storage mode (AHCI, RAID, VMD), an added or replaced disk controller": "Mode penyimpanan BIOS (AHCI, RAID, VMD) yang diubah, pengontrol disk yang ditambah atau diganti",
  "The storage controller driver": "Driver pengontrol penyimpanan",
  "A failing boot disk or cable": "Disk boot atau kabel yang mulai rusak",
  // SYSTEM_THREAD_EXCEPTION_NOT_HANDLED
  "A system thread raised an exception that was not handled. If a driver is named on the screen, it is the first candidate.": "Thread sistem memunculkan eksepsi yang tidak ditangani. Jika ada nama driver di layar, itulah kandidat pertama.",
  "The driver named on the screen or in the dump (graphics, network and storage are common)": "Driver yang disebut di layar atau di dump (sering grafis, jaringan, dan penyimpanan)",
  "An incompatible driver": "Driver yang tidak kompatibel",
  // UNEXPECTED_KERNEL_MODE_TRAP
  "The CPU raised a trap (such as a double fault) that the kernel did not catch.": "CPU memunculkan trap (seperti double fault) yang tidak ditangkap kernel.",
  "Faulty or mismatched memory": "Memori rusak atau tidak cocok",
  "Failing hardware or overclocking": "Perangkat keras yang mulai rusak atau overclock",
  "Kernel stack overflow (several filter drivers on one stack)": "Stack kernel meluap (beberapa driver filter dalam satu stack)",
  // MACHINE_CHECK_EXCEPTION
  "The CPU reported a fatal hardware error (machine check). Recent Windows versions usually show 0x124 instead.": "CPU melaporkan kesalahan perangkat keras fatal (machine check). Versi Windows terbaru biasanya menampilkan 0x124 sebagai gantinya.",
  "CPU, memory or motherboard hardware": "Perangkat keras CPU, memori, atau motherboard",
  "Overclocking or voltage": "Overclock atau tegangan",
  "Temperature or power": "Suhu atau daya",
  // DRIVER_POWER_STATE_FAILURE
  "A driver did not finish a power state change (sleep, wake, shutdown) in time, or is in an inconsistent power state.": "Driver tidak menyelesaikan perubahan status daya (tidur, bangun, matikan) tepat waktu, atau berada dalam status daya yang tidak konsisten.",
  "A device driver that stops responding at sleep, hibernate or shutdown (USB, wireless, network, graphics)": "Driver perangkat yang berhenti merespons saat tidur, hibernasi, atau dimatikan (USB, nirkabel, jaringan, grafis)",
  "An old BIOS or chipset driver": "BIOS atau driver chipset yang lama",
  // ATTEMPTED_WRITE_TO_READONLY_MEMORY
  "A driver tried to write to read-only memory.": "Driver mencoba menulis ke memori baca-saja.",
  "The driver named on the screen": "Driver yang disebut di layar",
  "A recently installed driver or security software": "Driver atau perangkat lunak keamanan yang baru dipasang",
  // BAD_POOL_CALLER
  "A thread made a bad memory pool request (zero-byte allocation, freeing an already-freed block, wrong IRQL …).": "Sebuah thread membuat permintaan pool memori yang salah (alokasi nol byte, membebaskan blok yang sudah dibebaskan, IRQL salah …).",
  "A driver bug (antivirus, filter and network drivers are common)": "Bug driver (sering driver antivirus, filter, dan jaringan)",
  "Pool corruption": "Kerusakan pool",
  // DRIVER_VERIFIER_DETECTED_VIOLATION
  "Driver Verifier found a fatal mistake in a driver it was watching. It only appears when Driver Verifier is turned on.": "Driver Verifier menemukan kesalahan fatal di driver yang diawasinya. Kode ini hanya muncul jika Driver Verifier dinyalakan.",
  "The driver Driver Verifier caught (named on the screen or in the dump)": "Driver yang tertangkap Driver Verifier (disebut di layar atau di dump)",
  "Driver Verifier left on unintentionally": "Driver Verifier tanpa sengaja masih menyala",
  // DRIVER_CORRUPTED_EXPOOL
  "Invalid memory was accessed at a raised IRQL. Almost always a driver has corrupted the system pool.": "Memori tidak valid diakses pada IRQL yang dinaikkan. Hampir selalu ada driver yang merusak pool sistem.",
  "A driver overwriting a small memory block": "Driver yang menimpa blok memori kecil",
  "Recently installed software or drivers": "Perangkat lunak atau driver yang baru dipasang",
  // DRIVER_IRQL_NOT_LESS_OR_EQUAL
  "A kernel driver accessed a pageable (or invalid) address at too high an IRQL. The driver is often named on the screen.": "Driver kernel mengakses alamat yang dapat di-page (atau tidak valid) pada IRQL yang terlalu tinggi. Nama driver sering tampil di layar.",
  "The .sys driver named on the screen (network, wireless, USB, antivirus and VPN drivers are common)": "Driver .sys yang disebut di layar (sering driver jaringan, nirkabel, USB, antivirus, dan VPN)",
  "A driver bug using freed memory or a NULL pointer": "Bug driver yang memakai memori yang sudah dibebaskan atau pointer NULL",
  // MANUALLY_INITIATED_CRASH
  "A crash started on purpose by the user (kernel debugger or keyboard shortcut — a setting enabled to capture a diagnostic dump).": "Crash yang sengaja dipicu pengguna (debugger kernel atau pintasan keyboard — pengaturan yang diaktifkan untuk mengambil dump diagnostik).",
  "A deliberate key press with a diagnostic setting such as CrashOnCtrlScroll": "Penekanan tombol yang disengaja dengan pengaturan diagnostik seperti CrashOnCtrlScroll",
  // THREAD_STUCK_IN_DEVICE_DRIVER
  "A thread in a device driver is spinning endlessly (usually a graphics driver waiting on the graphics card).": "Sebuah thread di driver perangkat berputar tanpa henti (biasanya driver grafis yang menunggu kartu grafis).",
  "The graphics driver": "Driver grafis",
  "Graphics card overheating, power or overclocking": "Kartu grafis kepanasan, daya, atau overclock",
  // UNMOUNTABLE_BOOT_VOLUME
  "The boot volume could not be mounted.": "Volume boot tidak dapat dipasang (mount).",
  "A failing boot disk or damaged file system": "Disk boot yang mulai rusak atau sistem berkas yang rusak",
  "Cabling or connection problems": "Masalah kabel atau sambungan",
  // CRITICAL_PROCESS_DIED
  "A critical system process terminated.": "Proses sistem yang penting berhenti.",
  "Damaged system files or a bad update": "Berkas sistem rusak atau pembaruan yang bermasalah",
  "Storage errors": "Kesalahan penyimpanan",
  "Drivers or security software": "Driver atau perangkat lunak keamanan",
  // CRITICAL_OBJECT_TERMINATION
  "A process or thread crucial to system operation exited or was terminated unexpectedly.": "Proses atau thread yang penting bagi jalannya sistem keluar atau dihentikan secara tak terduga.",
  "Storage errors (disk, cable, SSD firmware) so system files cannot be read": "Kesalahan penyimpanan (disk, kabel, firmware SSD) sehingga berkas sistem tidak dapat dibaca",
  "Security software": "Perangkat lunak keamanan",
  // ATTEMPTED_EXECUTE_OF_NOEXECUTE_MEMORY
  "Code in non-executable memory was about to run. The driver may be named on the screen.": "Kode di memori yang tidak dapat dieksekusi akan dijalankan. Nama driver mungkin tampil di layar.",
  "Memory corruption": "Kerusakan memori",
  // CLOCK_WATCHDOG_TIMEOUT
  "One processor core did not receive its clock interrupt in time (that core hung or deadlocked).": "Satu inti prosesor tidak menerima interupsi clock-nya tepat waktu (inti itu macet atau deadlock).",
  "CPU overclocking, undervolting or voltage": "Overclock CPU, undervolt, atau tegangan",
  "BIOS or chipset driver": "BIOS atau driver chipset",
  "CPU or motherboard hardware": "Perangkat keras CPU atau motherboard",
  // CRITICAL_STRUCTURE_CORRUPTION
  "Critical kernel code or data was found modified.": "Kode atau data kernel yang penting ditemukan telah diubah.",
  "A driver patching the kernel (old security, anti-cheat or virtualization software)": "Driver yang menambal kernel (perangkat lunak keamanan, anti-cheat, atau virtualisasi yang lama)",
  // VIDEO_DXGKRNL_FATAL_ERROR
  "The DirectX graphics kernel detected a violation.": "Kernel grafis DirectX mendeteksi pelanggaran.",
  // VIDEO_TDR_FAILURE
  "The graphics card stopped responding and resetting the display driver (TDR) failed. Names such as nvlddmkm.sys, atikmpag.sys or igdkmd64.sys are common.": "Kartu grafis berhenti merespons dan reset driver tampilan (TDR) gagal. Nama seperti nvlddmkm.sys, atikmpag.sys, atau igdkmd64.sys sering muncul.",
  "Graphics card overheating, insufficient power or overclocking": "Kartu grafis kepanasan, daya kurang, atau overclock",
  "Memory settings (timings) or a defective part": "Pengaturan memori (timing) atau komponen cacat",
  // VIDEO_TDR_TIMEOUT_DETECTED
  "The display driver did not respond in time (TDR timeout). It is often only logged with a dump, without a blue screen.": "Driver tampilan tidak merespons tepat waktu (TDR timeout). Sering hanya dicatat beserta dump, tanpa layar biru.",
  // VIDEO_SCHEDULER_INTERNAL_ERROR
  "The video scheduler detected a fatal violation.": "Penjadwal video mendeteksi pelanggaran fatal.",
  "Graphics card hardware": "Perangkat keras kartu grafis",
  // WHEA_UNCORRECTABLE_ERROR
  "An uncorrectable hardware error occurred (reported through WHEA). The WHEA-Logger events in Event Viewer tell which part (CPU cache, memory, PCIe bus) was involved.": "Terjadi kesalahan perangkat keras yang tidak dapat dikoreksi (dilaporkan lewat WHEA). Peristiwa WHEA-Logger di Penampil Peristiwa menunjukkan bagian mana (cache CPU, memori, bus PCIe) yang terlibat.",
  "Overclocking, undervolting, XMP/EXPO, voltage": "Overclock, undervolt, XMP/EXPO, tegangan",
  "Temperature or power supply": "Suhu atau catu daya",
  "Faulty CPU, memory, motherboard or PCIe device": "CPU, memori, motherboard, atau perangkat PCIe yang rusak",
  "An old BIOS": "BIOS yang lama",
  // DPC_WATCHDOG_VIOLATION
  "A single deferred procedure call (DPC) ran too long, or the system stayed at DISPATCH_LEVEL or above too long. Parameter 1 tells which.": "Satu deferred procedure call (DPC) berjalan terlalu lama, atau sistem terlalu lama berada di DISPATCH_LEVEL atau lebih tinggi. Parameter 1 menunjukkan yang mana.",
  "Storage drivers (SATA AHCI, NVMe) or SSD firmware": "Driver penyimpanan (SATA AHCI, NVMe) atau firmware SSD",
  "A device driver that holds the CPU too long (network, audio, USB)": "Driver perangkat yang menahan CPU terlalu lama (jaringan, audio, USB)",
  // KERNEL_SECURITY_CHECK_FAILURE
  "The kernel detected corruption of a critical data structure (such as a list entry).": "Kernel mendeteksi kerusakan struktur data yang penting (seperti entri daftar).",
  "A driver bug or incompatible driver": "Bug driver atau driver yang tidak kompatibel",
  "Recently added hardware": "Perangkat keras yang baru ditambahkan",
  // KERNEL_MODE_HEAP_CORRUPTION
  "The kernel-mode heap manager detected heap corruption.": "Pengelola heap mode kernel mendeteksi kerusakan heap.",
  "A driver overwriting the heap (graphics, audio, security software)": "Driver yang menimpa heap (grafis, audio, perangkat lunak keamanan)",
  // UNEXPECTED_STORE_EXCEPTION
  "The kernel memory store component (memory compression and paging) caught an unexpected exception.": "Komponen store memori kernel (kompresi memori dan paging) menangkap eksepsi tak terduga.",
  "Storage, SSD firmware or controller driver": "Penyimpanan, firmware SSD, atau driver pengontrol",
  "Antivirus or security software": "Antivirus atau perangkat lunak keamanan",
  // MANUALLY_INITIATED_POWER_BUTTON_HOLD
  "The power button was held on a PC set to capture a dump on a long press. It records a forced power-off of a hung system.": "Tombol daya ditahan pada PC yang diatur untuk mengambil dump saat ditekan lama. Ini mencatat pematian paksa sistem yang macet.",
  "Look separately at why the PC hung before the button was held": "Periksa terpisah mengapa PC macet sebelum tombol ditahan",
  // WINLOGON_FATAL_ERROR
  "A core user-mode process such as Winlogon terminated unexpectedly.": "Proses inti mode pengguna seperti Winlogon berhenti secara tak terduga.",
  "Damaged system files or a failed update": "Berkas sistem rusak atau pembaruan yang gagal",
  "Incompatible system software": "Perangkat lunak sistem yang tidak kompatibel",
};
