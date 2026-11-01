// Dizionario dei codici di arresto (schermata blu) — ordine dei controlli (STEPS), significato (meaning) e cause possibili (causes) di lib/bsod.ts, frase inglese → italiano. Tutti i 39 codici (nel JSON della pagina — libText «bsod»)
// Ordine: i 16 controlli, poi per ogni codice il significato e le cause possibili che vi compaiono per la prima volta
export default {
  "In Event Viewer → Windows Logs → System, look at errors and warnings around the same time (disk, Ntfs, WHEA-Logger, driver names).": "Nel Visualizzatore eventi → Registri di Windows → Sistema, guardate errori e avvisi alla stessa ora (disk, Ntfs, WHEA-Logger, nomi di driver).",
  "Undo what changed just before the crashes began (new device, driver, Windows update, antivirus, VPN, virtualization, anti-cheat software).": "Annullate ciò che è cambiato appena prima che iniziassero le schermate blu (nuovo dispositivo, driver, aggiornamento di Windows, antivirus, VPN, virtualizzazione, software anti-cheat).",
  "Find which device the .sys file named on the blue screen or in the dump belongs to, and try the device maker's latest (or previous) driver.": "Scoprite a quale dispositivo appartiene il file .sys indicato nella schermata blu o nel file di dump e provate il driver più recente (o quello precedente) del produttore.",
  "Run Windows Memory Diagnostic (mdsched.exe); with several memory modules, try them one at a time.": "Eseguite Diagnostica memoria Windows (mdsched.exe); con più moduli di memoria, provateli uno alla volta.",
  "Turn off overclocking, XMP/EXPO memory profiles and undervolting, return the BIOS to defaults and repeat the same workload.": "Disattivate overclock, profili di memoria XMP/EXPO e undervolt, riportate il BIOS ai valori predefiniti e ripetete lo stesso carico di lavoro.",
  "Check temperatures (CPU, graphics card) and power (PSU capacity, cables, laptop adapter). If it happens only under heavy load, this is a strong candidate.": "Controllate le temperature (CPU, scheda video) e l'alimentazione (potenza dell'alimentatore, cavi, alimentatore del portatile). Se succede solo sotto carico pesante, è un candidato forte.",
  "Check for a newer BIOS and chipset driver from the motherboard or laptop maker.": "Cercate un BIOS e un driver del chipset più recenti presso il produttore della scheda madre o del portatile.",
  "Check the storage: chkdsk C: /scan (scan without fixing), the drive maker's diagnostics and SMART, SATA cable or M.2 seating, SSD firmware.": "Controllate l'archiviazione: chkdsk C: /scan (analisi senza riparazione), diagnostica del produttore dell'unità e SMART, cavo SATA o montaggio dell'M.2, firmware dell'SSD.",
  "Update the storage controller driver (SATA AHCI, NVMe, RAID) and SSD firmware from the maker.": "Aggiornate il driver del controller di archiviazione (SATA AHCI, NVMe, RAID) e il firmware dell'SSD alle versioni del produttore.",
  "From an administrator command prompt, check system files with sfc /scannow and DISM /Online /Cleanup-Image /RestoreHealth.": "Da un prompt dei comandi come amministratore, controllate i file di sistema con sfc /scannow e DISM /Online /Cleanup-Image /RestoreHealth.",
  "Check whether it happens when entering or leaving sleep or hibernation. Try with Fast Startup off and compare the «Power Management» tab of USB and network devices.": "Verificate se succede entrando o uscendo da sospensione o ibernazione. Provate con l'avvio rapido disattivato e confrontate la scheda «Risparmio energia» dei dispositivi USB e di rete.",
  "Reinstall the graphics driver from the maker's site (latest or one version back) and turn off graphics card overclocking.": "Reinstallate il driver video dal sito del produttore (ultima versione o quella precedente) e disattivate l'overclock della scheda video.",
  "If Windows will not start, use «Startup Repair» in the recovery environment. If the BIOS storage mode (AHCI, RAID, VMD) was changed, set it back.": "Se Windows non si avvia, usate «Ripristino all'avvio» nell'ambiente di ripristino. Se la modalità di archiviazione del BIOS (AHCI, RAID, VMD) è stata cambiata, ripristinatela.",
  "If the same code repeats with no driver named, advanced users can narrow suspects with Driver Verifier (verifier.exe) — it can cause boot loops, so make a restore point first and run verifier /reset when done.": "Se lo stesso codice si ripete senza nome di driver, gli utenti esperti possono restringere i sospetti con Driver Verifier (verifier.exe) — può causare riavvii a ciclo, quindi create prima un punto di ripristino ed eseguite verifier /reset alla fine.",
  "Opening the dump (C:\\Windows\\Minidump\\*.dmp or MEMORY.DMP) with !analyze -v in WinDbg shows more about the module where it stopped.": "Aprendo il file di dump (C:\\Windows\\Minidump\\*.dmp o MEMORY.DMP) con !analyze -v in WinDbg si vede di più sul modulo in cui il sistema si è fermato.",
  "If the code differs every time, look at hardware (memory, power, temperature, overclocking) before any single driver.": "Se il codice cambia ogni volta, guardate l'hardware (memoria, alimentazione, temperatura, overclock) prima di un singolo driver.",
  // IRQL_NOT_LESS_OR_EQUAL
  "Windows or a kernel driver touched an invalid address or pageable memory while running at a raised interrupt level (IRQL).": "Windows o un driver del kernel ha toccato un indirizzo non valido o memoria paginabile mentre era in esecuzione a un livello di interrupt (IRQL) elevato.",
  "A kernel driver using a bad address (network, antivirus, virtualization, old device drivers)": "Un driver del kernel che usa un indirizzo errato (rete, antivirus, virtualizzazione, driver di dispositivi vecchi)",
  "Faulty memory or overclocking": "Memoria difettosa o overclock",
  // BAD_POOL_HEADER
  "The header of a kernel memory pool block is corrupt.": "L'intestazione di un blocco del pool di memoria del kernel è danneggiata.",
  "A driver overwriting pool memory (antivirus, filter and network drivers are common)": "Un driver che sovrascrive la memoria del pool (spesso antivirus, driver di filtro o di rete)",
  "Faulty memory": "Memoria difettosa",
  // MEMORY_MANAGEMENT
  "A severe memory management error occurred. Parameter 1 tells which kind.": "Si è verificato un grave errore nella gestione della memoria. Il parametro 1 ne indica il tipo.",
  "Faulty or loose memory (RAM), memory overclocking such as XMP/EXPO": "Memoria (RAM) difettosa o non ben inserita, overclock della memoria come XMP/EXPO",
  "A driver problem": "Un problema di driver",
  "Errors on the disk that holds the page file": "Errori sul disco che contiene il file di paging",
  // KMODE_EXCEPTION_NOT_HANDLED
  "A kernel-mode program raised an exception nobody handled. Parameter 2 (the exception address) often points at the driver.": "Un programma in modalità kernel ha sollevato un'eccezione che nessuno ha gestito. Il parametro 2 (l'indirizzo dell'eccezione) indica spesso il driver.",
  "A device driver or system service": "Un driver di dispositivo o un servizio di sistema",
  "Incompatible hardware": "Hardware incompatibile",
  // NTFS_FILE_SYSTEM
  "A problem occurred in the NTFS file system driver (ntfs.sys).": "Si è verificato un problema nel driver del file system NTFS (ntfs.sys).",
  "Disk corruption or bad sectors, SATA cable": "Disco danneggiato o settori difettosi, cavo SATA",
  "Antivirus, backup or defrag tools that watch the disk constantly": "Antivirus, strumenti di backup o di deframmentazione che sorvegliano il disco di continuo",
  "Too little free disk space": "Troppo poco spazio libero su disco",
  // SYSTEM_SERVICE_EXCEPTION
  "An exception occurred in a system service routine — the path where ordinary programs call into the kernel.": "Si è verificata un'eccezione in una routine di servizio di sistema — il percorso con cui i normali programmi chiamano il kernel.",
  "Graphics, audio, antivirus or virtualization drivers": "Driver video, audio, antivirus o di virtualizzazione",
  "Damaged system files": "File di sistema danneggiati",
  // INTERRUPT_EXCEPTION_NOT_HANDLED
  "An exception raised while handling an interrupt could not be handled.": "Non è stato possibile gestire un'eccezione sollevata durante la gestione di un interrupt.",
  "A device driver (devices that use interrupts)": "Un driver di dispositivo (dispositivi che usano interrupt)",
  "Faulty hardware": "Hardware difettoso",
  // PFN_LIST_CORRUPT
  "The page frame number (PFN) list that tracks physical memory is corrupt.": "L'elenco dei numeri di frame di pagina (PFN) che tiene traccia della memoria fisica è danneggiato.",
  "A driver passing a bad memory descriptor (MDL)": "Un driver che passa un descrittore di memoria (MDL) errato",
  // PAGE_FAULT_IN_NONPAGED_AREA
  "Invalid system memory was referenced.": "È stata referenziata memoria di sistema non valida.",
  "A faulty driver or system service, antivirus": "Un driver o un servizio di sistema difettoso, antivirus",
  "Faulty memory (RAM or video memory)": "Memoria difettosa (RAM o memoria video)",
  "A corrupted NTFS volume": "Un volume NTFS danneggiato",
  // KERNEL_DATA_INPAGE_ERROR
  "Kernel data could not be read back from the page file. Parameter 2 (error status) tells whether the disk is involved.": "Non è stato possibile rileggere dati del kernel dal file di paging. Il parametro 2 (stato di errore) indica se è coinvolto il disco.",
  "Bad disk sectors (0xC000009C, 0xC000016A)": "Settori del disco difettosi (0xC000009C, 0xC000016A)",
  "Loose or faulty cabling (0xC000009D, 0xC0000185)": "Cavi allentati o difettosi (0xC000009D, 0xC0000185)",
  "Faulty memory, nonpaged pool shortage (0xC000009A)": "Memoria difettosa, pool non di paging insufficiente (0xC000009A)",
  // INACCESSIBLE_BOOT_DEVICE
  "Windows lost access to the system partition during startup.": "Durante l'avvio Windows ha perso l'accesso alla partizione di sistema.",
  "A changed BIOS storage mode (AHCI, RAID, VMD), an added or replaced disk controller": "Una modalità di archiviazione del BIOS cambiata (AHCI, RAID, VMD), un controller del disco aggiunto o sostituito",
  "The storage controller driver": "Il driver del controller di archiviazione",
  "A failing boot disk or cable": "Un disco di avvio o un cavo guasto",
  // SYSTEM_THREAD_EXCEPTION_NOT_HANDLED
  "A system thread raised an exception that was not handled. If a driver is named on the screen, it is the first candidate.": "Un thread di sistema ha sollevato un'eccezione non gestita. Se nella schermata compare il nome di un driver, è il primo candidato.",
  "The driver named on the screen or in the dump (graphics, network and storage are common)": "Il driver indicato nella schermata o nel file di dump (spesso video, rete o archiviazione)",
  "An incompatible driver": "Un driver incompatibile",
  // UNEXPECTED_KERNEL_MODE_TRAP
  "The CPU raised a trap (such as a double fault) that the kernel did not catch.": "La CPU ha generato una trap (per esempio un double fault) che il kernel non ha intercettato.",
  "Faulty or mismatched memory": "Memoria difettosa o moduli non compatibili tra loro",
  "Failing hardware or overclocking": "Hardware guasto o overclock",
  "Kernel stack overflow (several filter drivers on one stack)": "Overflow dello stack del kernel (più driver di filtro sullo stesso stack)",
  // MACHINE_CHECK_EXCEPTION
  "The CPU reported a fatal hardware error (machine check). Recent Windows versions usually show 0x124 instead.": "La CPU ha segnalato un errore hardware fatale (machine check). Le versioni recenti di Windows di solito mostrano invece 0x124.",
  "CPU, memory or motherboard hardware": "Hardware: CPU, memoria o scheda madre",
  "Overclocking or voltage": "Overclock o tensione",
  "Temperature or power": "Temperatura o alimentazione",
  // DRIVER_POWER_STATE_FAILURE
  "A driver did not finish a power state change (sleep, wake, shutdown) in time, or is in an inconsistent power state.": "Un driver non ha completato in tempo un cambio di stato di alimentazione (sospensione, riattivazione, arresto) o si trova in uno stato di alimentazione incoerente.",
  "A device driver that stops responding at sleep, hibernate or shutdown (USB, wireless, network, graphics)": "Un driver di dispositivo che smette di rispondere a sospensione, ibernazione o arresto (USB, wireless, rete, video)",
  "An old BIOS or chipset driver": "Un BIOS o un driver del chipset vecchio",
  // ATTEMPTED_WRITE_TO_READONLY_MEMORY
  "A driver tried to write to read-only memory.": "Un driver ha tentato di scrivere in memoria di sola lettura.",
  "The driver named on the screen": "Il driver indicato nella schermata",
  "A recently installed driver or security software": "Un driver o un software di sicurezza installato di recente",
  // BAD_POOL_CALLER
  "A thread made a bad memory pool request (zero-byte allocation, freeing an already-freed block, wrong IRQL …).": "Un thread ha fatto una richiesta errata al pool di memoria (allocazione di zero byte, rilascio di un blocco già rilasciato, IRQL sbagliato…).",
  "A driver bug (antivirus, filter and network drivers are common)": "Un bug di un driver (spesso antivirus, driver di filtro o di rete)",
  "Pool corruption": "Danneggiamento del pool",
  // DRIVER_VERIFIER_DETECTED_VIOLATION
  "Driver Verifier found a fatal mistake in a driver it was watching. It only appears when Driver Verifier is turned on.": "Driver Verifier ha trovato un errore fatale in un driver che stava controllando. Compare solo quando Driver Verifier è attivo.",
  "The driver Driver Verifier caught (named on the screen or in the dump)": "Il driver colto in errore da Driver Verifier (indicato nella schermata o nel file di dump)",
  "Driver Verifier left on unintentionally": "Driver Verifier lasciato attivo per sbaglio",
  // DRIVER_CORRUPTED_EXPOOL
  "Invalid memory was accessed at a raised IRQL. Almost always a driver has corrupted the system pool.": "È stato fatto un accesso a memoria non valida a un IRQL elevato. Quasi sempre un driver ha danneggiato il pool di sistema.",
  "A driver overwriting a small memory block": "Un driver che sovrascrive un piccolo blocco di memoria",
  "Recently installed software or drivers": "Software o driver installati di recente",
  // DRIVER_IRQL_NOT_LESS_OR_EQUAL
  "A kernel driver accessed a pageable (or invalid) address at too high an IRQL. The driver is often named on the screen.": "Un driver del kernel ha fatto accesso a un indirizzo paginabile (o non valido) a un IRQL troppo alto. Il driver è spesso indicato nella schermata.",
  "The .sys driver named on the screen (network, wireless, USB, antivirus and VPN drivers are common)": "Il driver .sys indicato nella schermata (spesso rete, wireless, USB, antivirus o VPN)",
  "A driver bug using freed memory or a NULL pointer": "Un bug di un driver che usa memoria già rilasciata o un puntatore NULL",
  // MANUALLY_INITIATED_CRASH
  "A crash started on purpose by the user (kernel debugger or keyboard shortcut — a setting enabled to capture a diagnostic dump).": "Un arresto anomalo provocato di proposito dall'utente (debugger del kernel o scorciatoia da tastiera — un'impostazione attivata per ottenere un dump di diagnostica).",
  "A deliberate key press with a diagnostic setting such as CrashOnCtrlScroll": "Una pressione di tasti voluta con un'impostazione di diagnostica come CrashOnCtrlScroll",
  // THREAD_STUCK_IN_DEVICE_DRIVER
  "A thread in a device driver is spinning endlessly (usually a graphics driver waiting on the graphics card).": "Un thread di un driver di dispositivo gira all'infinito (di solito un driver video in attesa della scheda video).",
  "The graphics driver": "Il driver video",
  "Graphics card overheating, power or overclocking": "Surriscaldamento, alimentazione o overclock della scheda video",
  // UNMOUNTABLE_BOOT_VOLUME
  "The boot volume could not be mounted.": "Non è stato possibile montare il volume di avvio.",
  "A failing boot disk or damaged file system": "Un disco di avvio guasto o un file system danneggiato",
  "Cabling or connection problems": "Problemi di cavi o di collegamento",
  // CRITICAL_PROCESS_DIED
  "A critical system process terminated.": "Un processo di sistema critico è terminato.",
  "Damaged system files or a bad update": "File di sistema danneggiati o un aggiornamento difettoso",
  "Storage errors": "Errori dell'archiviazione",
  "Drivers or security software": "Driver o software di sicurezza",
  // CRITICAL_OBJECT_TERMINATION
  "A process or thread crucial to system operation exited or was terminated unexpectedly.": "Un processo o un thread indispensabile al funzionamento del sistema è terminato o è stato chiuso inaspettatamente.",
  "Storage errors (disk, cable, SSD firmware) so system files cannot be read": "Errori dell'archiviazione (disco, cavo, firmware dell'SSD) che impediscono di leggere i file di sistema",
  "Security software": "Software di sicurezza",
  // ATTEMPTED_EXECUTE_OF_NOEXECUTE_MEMORY
  "Code in non-executable memory was about to run. The driver may be named on the screen.": "Stava per essere eseguito codice in memoria non eseguibile. Il driver può essere indicato nella schermata.",
  "Memory corruption": "Danneggiamento della memoria",
  // CLOCK_WATCHDOG_TIMEOUT
  "One processor core did not receive its clock interrupt in time (that core hung or deadlocked).": "Un core del processore non ha ricevuto in tempo il suo interrupt di clock (quel core si è bloccato o è in deadlock).",
  "CPU overclocking, undervolting or voltage": "Overclock, undervolt o tensione della CPU",
  "BIOS or chipset driver": "BIOS o driver del chipset",
  "CPU or motherboard hardware": "Hardware: CPU o scheda madre",
  // CRITICAL_STRUCTURE_CORRUPTION
  "Critical kernel code or data was found modified.": "Sono stati trovati modificati codice o dati critici del kernel.",
  "A driver patching the kernel (old security, anti-cheat or virtualization software)": "Un driver che modifica il kernel (vecchio software di sicurezza, anti-cheat o di virtualizzazione)",
  // VIDEO_DXGKRNL_FATAL_ERROR
  "The DirectX graphics kernel detected a violation.": "Il kernel grafico DirectX ha rilevato una violazione.",
  // VIDEO_TDR_FAILURE
  "The graphics card stopped responding and resetting the display driver (TDR) failed. Names such as nvlddmkm.sys, atikmpag.sys or igdkmd64.sys are common.": "La scheda video ha smesso di rispondere e il ripristino del driver dello schermo (TDR) non è riuscito. Nomi come nvlddmkm.sys, atikmpag.sys o igdkmd64.sys sono frequenti.",
  "Graphics card overheating, insufficient power or overclocking": "Surriscaldamento, alimentazione insufficiente o overclock della scheda video",
  "Memory settings (timings) or a defective part": "Impostazioni della memoria (timing) o un componente difettoso",
  // VIDEO_TDR_TIMEOUT_DETECTED
  "The display driver did not respond in time (TDR timeout). It is often only logged with a dump, without a blue screen.": "Il driver dello schermo non ha risposto in tempo (timeout TDR). Spesso resta solo un evento con un file di dump, senza schermata blu.",
  // VIDEO_SCHEDULER_INTERNAL_ERROR
  "The video scheduler detected a fatal violation.": "L'utilità di pianificazione video ha rilevato una violazione fatale.",
  "Graphics card hardware": "Hardware della scheda video",
  // WHEA_UNCORRECTABLE_ERROR
  "An uncorrectable hardware error occurred (reported through WHEA). The WHEA-Logger events in Event Viewer tell which part (CPU cache, memory, PCIe bus) was involved.": "Si è verificato un errore hardware non correggibile (segnalato tramite WHEA). Gli eventi WHEA-Logger nel Visualizzatore eventi indicano quale componente è coinvolto (cache della CPU, memoria, bus PCIe).",
  "Overclocking, undervolting, XMP/EXPO, voltage": "Overclock, undervolt, XMP/EXPO, tensione",
  "Temperature or power supply": "Temperatura o alimentatore",
  "Faulty CPU, memory, motherboard or PCIe device": "CPU, memoria, scheda madre o dispositivo PCIe difettosi",
  "An old BIOS": "Un BIOS vecchio",
  // DPC_WATCHDOG_VIOLATION
  "A single deferred procedure call (DPC) ran too long, or the system stayed at DISPATCH_LEVEL or above too long. Parameter 1 tells which.": "Una singola chiamata di procedura differita (DPC) è durata troppo, oppure il sistema è rimasto troppo a lungo a DISPATCH_LEVEL o superiore. Il parametro 1 indica quale dei due.",
  "Storage drivers (SATA AHCI, NVMe) or SSD firmware": "Driver di archiviazione (SATA AHCI, NVMe) o firmware dell'SSD",
  "A device driver that holds the CPU too long (network, audio, USB)": "Un driver di dispositivo che occupa la CPU troppo a lungo (rete, audio, USB)",
  // KERNEL_SECURITY_CHECK_FAILURE
  "The kernel detected corruption of a critical data structure (such as a list entry).": "Il kernel ha rilevato il danneggiamento di una struttura dati critica (per esempio una voce di elenco).",
  "A driver bug or incompatible driver": "Un bug di un driver o un driver incompatibile",
  "Recently added hardware": "Hardware aggiunto di recente",
  // KERNEL_MODE_HEAP_CORRUPTION
  "The kernel-mode heap manager detected heap corruption.": "Il gestore dell'heap in modalità kernel ha rilevato un danneggiamento dell'heap.",
  "A driver overwriting the heap (graphics, audio, security software)": "Un driver che sovrascrive l'heap (video, audio, software di sicurezza)",
  // UNEXPECTED_STORE_EXCEPTION
  "The kernel memory store component (memory compression and paging) caught an unexpected exception.": "Il componente dell'archivio di memoria del kernel (compressione della memoria e paging) ha intercettato un'eccezione imprevista.",
  "Storage, SSD firmware or controller driver": "Archiviazione, firmware dell'SSD o driver del controller",
  "Antivirus or security software": "Antivirus o software di sicurezza",
  // MANUALLY_INITIATED_POWER_BUTTON_HOLD
  "The power button was held on a PC set to capture a dump on a long press. It records a forced power-off of a hung system.": "È stato tenuto premuto il pulsante di accensione su un PC impostato per salvare un dump con la pressione prolungata. È la traccia dello spegnimento forzato di un sistema bloccato.",
  "Look separately at why the PC hung before the button was held": "Cercate a parte perché il PC si era bloccato (blocco, schermo nero) prima della pressione prolungata",
  // WINLOGON_FATAL_ERROR
  "A core user-mode process such as Winlogon terminated unexpectedly.": "Un processo centrale in modalità utente, come Winlogon, è terminato inaspettatamente.",
  "Damaged system files or a failed update": "File di sistema danneggiati o un aggiornamento non riuscito",
  "Incompatible system software": "Software di sistema incompatibile",
};
