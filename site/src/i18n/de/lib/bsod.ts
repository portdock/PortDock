// Bluescreen-Stoppcode-Nachschlagewerk — Prüfschritte (STEPS), Bedeutung (meaning) und mögliche Ursachen (causes) aus lib/bsod.ts, englischer Satz → Deutsch. Alle 39 Codes (im Seiten-JSON — libText „bsod“)
// Reihenfolge: 16 Prüfschritte, dann je Code die Bedeutung und die dort erstmals vorkommenden Ursachen. Windows-Menünamen nach deutschem Windows
export default {
  "In Event Viewer → Windows Logs → System, look at errors and warnings around the same time (disk, Ntfs, WHEA-Logger, driver names).": "In der Ereignisanzeige → Windows-Protokolle → System die Fehler und Warnungen um denselben Zeitpunkt ansehen (disk, Ntfs, WHEA-Logger, Treibernamen).",
  "Undo what changed just before the crashes began (new device, driver, Windows update, antivirus, VPN, virtualization, anti-cheat software).": "Rückgängig machen, was sich kurz vor den ersten Abstürzen geändert hat (neues Gerät, Treiber, Windows-Update, Virenschutz, VPN, Virtualisierung, Anti-Cheat-Software).",
  "Find which device the .sys file named on the blue screen or in the dump belongs to, and try the device maker's latest (or previous) driver.": "Herausfinden, zu welchem Gerät die auf dem Bluescreen oder im Speicherabbild genannte .sys-Datei gehört, und den neuesten (oder vorherigen) Treiber des Geräteherstellers probieren.",
  "Run Windows Memory Diagnostic (mdsched.exe); with several memory modules, try them one at a time.": "Die Windows-Speicherdiagnose (mdsched.exe) ausführen; bei mehreren Speichermodulen diese einzeln testen.",
  "Turn off overclocking, XMP/EXPO memory profiles and undervolting, return the BIOS to defaults and repeat the same workload.": "Übertaktung, XMP/EXPO-Speicherprofile und Undervolting abschalten, das BIOS auf Standardwerte zurücksetzen und dieselbe Arbeit wiederholen.",
  "Check temperatures (CPU, graphics card) and power (PSU capacity, cables, laptop adapter). If it happens only under heavy load, this is a strong candidate.": "Temperaturen (CPU, Grafikkarte) und Stromversorgung (Netzteilleistung, Kabel, Laptop-Netzteil) prüfen. Tritt es nur unter hoher Last auf, ist das ein starker Kandidat.",
  "Check for a newer BIOS and chipset driver from the motherboard or laptop maker.": "Beim Mainboard- oder Laptophersteller nach neuerem BIOS und Chipsatztreiber sehen.",
  "Check the storage: chkdsk C: /scan (scan without fixing), the drive maker's diagnostics and SMART, SATA cable or M.2 seating, SSD firmware.": "Den Datenträger prüfen: chkdsk C: /scan (prüfen ohne Reparatur), Diagnosetool des Laufwerksherstellers und SMART, SATA-Kabel bzw. Sitz der M.2-Karte, SSD-Firmware.",
  "Update the storage controller driver (SATA AHCI, NVMe, RAID) and SSD firmware from the maker.": "Speichercontroller-Treiber (SATA AHCI, NVMe, RAID) und SSD-Firmware vom Hersteller aktualisieren.",
  "From an administrator command prompt, check system files with sfc /scannow and DISM /Online /Cleanup-Image /RestoreHealth.": "In einer Eingabeaufforderung als Administrator die Systemdateien mit sfc /scannow und DISM /Online /Cleanup-Image /RestoreHealth prüfen.",
  "Check whether it happens when entering or leaving sleep or hibernation. Try with Fast Startup off and compare the «Power Management» tab of USB and network devices.": "Prüfen, ob es beim Wechsel in oder aus Energiesparmodus oder Ruhezustand auftritt. Mit ausgeschaltetem Schnellstart probieren und die Registerkarte „Energieverwaltung“ von USB- und Netzwerkgeräten vergleichen.",
  "Reinstall the graphics driver from the maker's site (latest or one version back) and turn off graphics card overclocking.": "Den Grafiktreiber von der Herstellerseite neu installieren (neueste oder vorherige Version) und die Übertaktung der Grafikkarte abschalten.",
  "If Windows will not start, use «Startup Repair» in the recovery environment. If the BIOS storage mode (AHCI, RAID, VMD) was changed, set it back.": "Startet Windows nicht, in der Wiederherstellungsumgebung die „Starthilfe“ verwenden. Wurde der Speichermodus im BIOS (AHCI, RAID, VMD) geändert, ihn zurückstellen.",
  "If the same code repeats with no driver named, advanced users can narrow suspects with Driver Verifier (verifier.exe) — it can cause boot loops, so make a restore point first and run verifier /reset when done.": "Wiederholt sich derselbe Code ohne Treibernamen, können erfahrene Anwender die Verdächtigen mit Driver Verifier (verifier.exe) eingrenzen — das kann Neustartschleifen auslösen, daher vorher einen Wiederherstellungspunkt anlegen und danach verifier /reset ausführen.",
  "Opening the dump (C:\\Windows\\Minidump\\*.dmp or MEMORY.DMP) with !analyze -v in WinDbg shows more about the module where it stopped.": "Wird das Speicherabbild (C:\\Windows\\Minidump\\*.dmp oder MEMORY.DMP) in WinDbg mit !analyze -v geöffnet, zeigt es mehr über das Modul, in dem es anhielt.",
  "If the code differs every time, look at hardware (memory, power, temperature, overclocking) before any single driver.": "Ist der Code jedes Mal anders, zuerst die Hardware (Arbeitsspeicher, Stromversorgung, Temperatur, Übertaktung) ansehen, nicht einen einzelnen Treiber.",
  // IRQL_NOT_LESS_OR_EQUAL
  "Windows or a kernel driver touched an invalid address or pageable memory while running at a raised interrupt level (IRQL).": "Windows oder ein Kerneltreiber hat bei erhöhter Interruptebene (IRQL) auf eine ungültige Adresse oder auslagerbaren Speicher zugegriffen.",
  "A kernel driver using a bad address (network, antivirus, virtualization, old device drivers)": "Ein Kerneltreiber, der eine ungültige Adresse verwendet (Netzwerk, Virenschutz, Virtualisierung, alte Gerätetreiber)",
  "Faulty memory or overclocking": "Defekter Arbeitsspeicher oder Übertaktung",
  // BAD_POOL_HEADER
  "The header of a kernel memory pool block is corrupt.": "Der Kopf eines Blocks im Kernel-Speicherpool ist beschädigt.",
  "A driver overwriting pool memory (antivirus, filter and network drivers are common)": "Ein Treiber, der Poolspeicher überschreibt (häufig Virenschutz-, Filter- und Netzwerktreiber)",
  "Faulty memory": "Defekter Arbeitsspeicher",
  // MEMORY_MANAGEMENT
  "A severe memory management error occurred. Parameter 1 tells which kind.": "In der Speicherverwaltung ist ein schwerer Fehler aufgetreten. Parameter 1 gibt die Art an.",
  "Faulty or loose memory (RAM), memory overclocking such as XMP/EXPO": "Defekter oder locker sitzender Arbeitsspeicher (RAM), Speicherübertaktung wie XMP/EXPO",
  "A driver problem": "Ein Treiberproblem",
  "Errors on the disk that holds the page file": "Fehler auf dem Datenträger mit der Auslagerungsdatei",
  // KMODE_EXCEPTION_NOT_HANDLED
  "A kernel-mode program raised an exception nobody handled. Parameter 2 (the exception address) often points at the driver.": "Ein Programm im Kernelmodus hat eine Ausnahme ausgelöst, die niemand behandelt hat. Parameter 2 (die Ausnahmeadresse) zeigt oft auf den Treiber.",
  "A device driver or system service": "Ein Gerätetreiber oder Systemdienst",
  "Incompatible hardware": "Inkompatible Hardware",
  // NTFS_FILE_SYSTEM
  "A problem occurred in the NTFS file system driver (ntfs.sys).": "Im NTFS-Dateisystemtreiber (ntfs.sys) ist ein Problem aufgetreten.",
  "Disk corruption or bad sectors, SATA cable": "Beschädigter Datenträger oder fehlerhafte Sektoren, SATA-Kabel",
  "Antivirus, backup or defrag tools that watch the disk constantly": "Virenschutz-, Backup- oder Defragmentierungsprogramme, die den Datenträger ständig überwachen",
  "Too little free disk space": "Zu wenig freier Speicherplatz",
  // SYSTEM_SERVICE_EXCEPTION
  "An exception occurred in a system service routine — the path where ordinary programs call into the kernel.": "In einer Systemdienstroutine — dem Weg, über den normale Programme den Kernel aufrufen — ist eine Ausnahme aufgetreten.",
  "Graphics, audio, antivirus or virtualization drivers": "Grafik-, Audio-, Virenschutz- oder Virtualisierungstreiber",
  "Damaged system files": "Beschädigte Systemdateien",
  // INTERRUPT_EXCEPTION_NOT_HANDLED
  "An exception raised while handling an interrupt could not be handled.": "Eine bei der Verarbeitung eines Interrupts ausgelöste Ausnahme konnte nicht behandelt werden.",
  "A device driver (devices that use interrupts)": "Ein Gerätetreiber (Geräte, die Interrupts nutzen)",
  "Faulty hardware": "Defekte Hardware",
  // PFN_LIST_CORRUPT
  "The page frame number (PFN) list that tracks physical memory is corrupt.": "Die Liste der Seitenrahmennummern (PFN), die den physischen Speicher verwaltet, ist beschädigt.",
  "A driver passing a bad memory descriptor (MDL)": "Ein Treiber, der einen ungültigen Speicherdeskriptor (MDL) übergibt",
  // PAGE_FAULT_IN_NONPAGED_AREA
  "Invalid system memory was referenced.": "Es wurde auf ungültigen Systemspeicher verwiesen.",
  "A faulty driver or system service, antivirus": "Ein fehlerhafter Treiber oder Systemdienst, Virenschutz",
  "Faulty memory (RAM or video memory)": "Defekter Speicher (RAM oder Grafikspeicher)",
  "A corrupted NTFS volume": "Ein beschädigtes NTFS-Volume",
  // KERNEL_DATA_INPAGE_ERROR
  "Kernel data could not be read back from the page file. Parameter 2 (error status) tells whether the disk is involved.": "Kerneldaten konnten nicht aus der Auslagerungsdatei zurückgelesen werden. Parameter 2 (Fehlerstatus) zeigt, ob der Datenträger beteiligt ist.",
  "Bad disk sectors (0xC000009C, 0xC000016A)": "Fehlerhafte Sektoren (0xC000009C, 0xC000016A)",
  "Loose or faulty cabling (0xC000009D, 0xC0000185)": "Lockere oder defekte Verkabelung (0xC000009D, 0xC0000185)",
  "Faulty memory, nonpaged pool shortage (0xC000009A)": "Defekter Arbeitsspeicher, zu wenig nicht ausgelagerter Pool (0xC000009A)",
  // INACCESSIBLE_BOOT_DEVICE
  "Windows lost access to the system partition during startup.": "Windows hat beim Start den Zugriff auf die Systempartition verloren.",
  "A changed BIOS storage mode (AHCI, RAID, VMD), an added or replaced disk controller": "Ein geänderter Speichermodus im BIOS (AHCI, RAID, VMD), ein hinzugefügter oder getauschter Festplattencontroller",
  "The storage controller driver": "Der Speichercontroller-Treiber",
  "A failing boot disk or cable": "Ein defekter Startdatenträger oder ein defektes Kabel",
  // SYSTEM_THREAD_EXCEPTION_NOT_HANDLED
  "A system thread raised an exception that was not handled. If a driver is named on the screen, it is the first candidate.": "Ein Systemthread hat eine Ausnahme ausgelöst, die nicht behandelt wurde. Steht ein Treiber auf dem Bildschirm, ist er der erste Kandidat.",
  "The driver named on the screen or in the dump (graphics, network and storage are common)": "Der auf dem Bildschirm oder im Speicherabbild genannte Treiber (häufig Grafik, Netzwerk und Speicher)",
  "An incompatible driver": "Ein inkompatibler Treiber",
  // UNEXPECTED_KERNEL_MODE_TRAP
  "The CPU raised a trap (such as a double fault) that the kernel did not catch.": "Die CPU hat einen Trap (etwa einen Double Fault) ausgelöst, den der Kernel nicht abgefangen hat.",
  "Faulty or mismatched memory": "Defekter oder nicht zueinander passender Arbeitsspeicher",
  "Failing hardware or overclocking": "Ausfallende Hardware oder Übertaktung",
  "Kernel stack overflow (several filter drivers on one stack)": "Überlauf des Kernelstapels (mehrere Filtertreiber auf einem Stapel)",
  // MACHINE_CHECK_EXCEPTION
  "The CPU reported a fatal hardware error (machine check). Recent Windows versions usually show 0x124 instead.": "Die CPU hat einen schweren Hardwarefehler (Machine Check) gemeldet. Neuere Windows-Versionen zeigen meist stattdessen 0x124.",
  "CPU, memory or motherboard hardware": "Hardware von CPU, Arbeitsspeicher oder Mainboard",
  "Overclocking or voltage": "Übertaktung oder Spannung",
  "Temperature or power": "Temperatur oder Stromversorgung",
  // DRIVER_POWER_STATE_FAILURE
  "A driver did not finish a power state change (sleep, wake, shutdown) in time, or is in an inconsistent power state.": "Ein Treiber hat einen Wechsel des Energiezustands (Energiesparmodus, Aufwachen, Herunterfahren) nicht rechtzeitig abgeschlossen oder ist in einem widersprüchlichen Energiezustand.",
  "A device driver that stops responding at sleep, hibernate or shutdown (USB, wireless, network, graphics)": "Ein Gerätetreiber, der bei Energiesparmodus, Ruhezustand oder Herunterfahren nicht mehr reagiert (USB, WLAN, Netzwerk, Grafik)",
  "An old BIOS or chipset driver": "Ein altes BIOS oder ein alter Chipsatztreiber",
  // ATTEMPTED_WRITE_TO_READONLY_MEMORY
  "A driver tried to write to read-only memory.": "Ein Treiber hat versucht, in schreibgeschützten Speicher zu schreiben.",
  "The driver named on the screen": "Der auf dem Bildschirm genannte Treiber",
  "A recently installed driver or security software": "Ein kürzlich installierter Treiber oder Sicherheitssoftware",
  // BAD_POOL_CALLER
  "A thread made a bad memory pool request (zero-byte allocation, freeing an already-freed block, wrong IRQL …).": "Ein Thread hat eine ungültige Anforderung an den Speicherpool gestellt (Zuweisung von null Bytes, Freigabe eines bereits freigegebenen Blocks, falsche IRQL …).",
  "A driver bug (antivirus, filter and network drivers are common)": "Ein Treiberfehler (häufig Virenschutz-, Filter- und Netzwerktreiber)",
  "Pool corruption": "Beschädigter Pool",
  // DRIVER_VERIFIER_DETECTED_VIOLATION
  "Driver Verifier found a fatal mistake in a driver it was watching. It only appears when Driver Verifier is turned on.": "Driver Verifier hat in einem überwachten Treiber einen schweren Fehler gefunden. Erscheint nur, wenn Driver Verifier eingeschaltet ist.",
  "The driver Driver Verifier caught (named on the screen or in the dump)": "Der von Driver Verifier ertappte Treiber (auf dem Bildschirm oder im Speicherabbild genannt)",
  "Driver Verifier left on unintentionally": "Versehentlich eingeschaltet gebliebener Driver Verifier",
  // DRIVER_CORRUPTED_EXPOOL
  "Invalid memory was accessed at a raised IRQL. Almost always a driver has corrupted the system pool.": "Bei erhöhter IRQL wurde auf ungültigen Speicher zugegriffen. Fast immer hat ein Treiber den Systempool beschädigt.",
  "A driver overwriting a small memory block": "Ein Treiber, der einen kleinen Speicherblock überschreibt",
  "Recently installed software or drivers": "Kürzlich installierte Software oder Treiber",
  // DRIVER_IRQL_NOT_LESS_OR_EQUAL
  "A kernel driver accessed a pageable (or invalid) address at too high an IRQL. The driver is often named on the screen.": "Ein Kerneltreiber hat bei zu hoher IRQL auf eine auslagerbare (oder ungültige) Adresse zugegriffen. Der Treiber steht oft auf dem Bildschirm.",
  "The .sys driver named on the screen (network, wireless, USB, antivirus and VPN drivers are common)": "Der auf dem Bildschirm genannte .sys-Treiber (häufig Netzwerk-, WLAN-, USB-, Virenschutz- und VPN-Treiber)",
  "A driver bug using freed memory or a NULL pointer": "Ein Treiberfehler, der freigegebenen Speicher oder einen NULL-Zeiger verwendet",
  // MANUALLY_INITIATED_CRASH
  "A crash started on purpose by the user (kernel debugger or keyboard shortcut — a setting enabled to capture a diagnostic dump).": "Ein vom Benutzer absichtlich ausgelöster Absturz (Kerneldebugger oder Tastenkombination — eine Einstellung, um ein Diagnose-Speicherabbild zu erhalten).",
  "A deliberate key press with a diagnostic setting such as CrashOnCtrlScroll": "Ein absichtlicher Tastendruck bei einer Diagnoseeinstellung wie CrashOnCtrlScroll",
  // THREAD_STUCK_IN_DEVICE_DRIVER
  "A thread in a device driver is spinning endlessly (usually a graphics driver waiting on the graphics card).": "Ein Thread in einem Gerätetreiber läuft endlos in einer Schleife (meist ein Grafiktreiber, der auf die Grafikkarte wartet).",
  "The graphics driver": "Der Grafiktreiber",
  "Graphics card overheating, power or overclocking": "Überhitzung, Stromversorgung oder Übertaktung der Grafikkarte",
  // UNMOUNTABLE_BOOT_VOLUME
  "The boot volume could not be mounted.": "Das Startvolume konnte nicht eingebunden werden.",
  "A failing boot disk or damaged file system": "Ein defekter Startdatenträger oder ein beschädigtes Dateisystem",
  "Cabling or connection problems": "Probleme mit Kabeln oder Anschlüssen",
  // CRITICAL_PROCESS_DIED
  "A critical system process terminated.": "Ein kritischer Systemprozess wurde beendet.",
  "Damaged system files or a bad update": "Beschädigte Systemdateien oder ein fehlerhaftes Update",
  "Storage errors": "Fehler des Datenträgers",
  "Drivers or security software": "Treiber oder Sicherheitssoftware",
  // CRITICAL_OBJECT_TERMINATION
  "A process or thread crucial to system operation exited or was terminated unexpectedly.": "Ein für den Systembetrieb wichtiger Prozess oder Thread hat sich unerwartet beendet oder wurde beendet.",
  "Storage errors (disk, cable, SSD firmware) so system files cannot be read": "Fehler des Datenträgers (Laufwerk, Kabel, SSD-Firmware), sodass Systemdateien nicht gelesen werden können",
  "Security software": "Sicherheitssoftware",
  // ATTEMPTED_EXECUTE_OF_NOEXECUTE_MEMORY
  "Code in non-executable memory was about to run. The driver may be named on the screen.": "Code in nicht ausführbarem Speicher sollte ausgeführt werden. Der Treiber steht womöglich auf dem Bildschirm.",
  "Memory corruption": "Beschädigter Speicher",
  // CLOCK_WATCHDOG_TIMEOUT
  "One processor core did not receive its clock interrupt in time (that core hung or deadlocked).": "Ein Prozessorkern hat seinen Taktinterrupt nicht rechtzeitig erhalten (dieser Kern hing oder war verklemmt).",
  "CPU overclocking, undervolting or voltage": "CPU-Übertaktung, Undervolting oder Spannung",
  "BIOS or chipset driver": "BIOS oder Chipsatztreiber",
  "CPU or motherboard hardware": "Hardware von CPU oder Mainboard",
  // CRITICAL_STRUCTURE_CORRUPTION
  "Critical kernel code or data was found modified.": "Kritischer Kernelcode oder kritische Kerneldaten wurden verändert vorgefunden.",
  "A driver patching the kernel (old security, anti-cheat or virtualization software)": "Ein Treiber, der den Kernel verändert (alte Sicherheits-, Anti-Cheat- oder Virtualisierungssoftware)",
  // VIDEO_DXGKRNL_FATAL_ERROR
  "The DirectX graphics kernel detected a violation.": "Der DirectX-Grafikkernel hat eine Verletzung erkannt.",
  // VIDEO_TDR_FAILURE
  "The graphics card stopped responding and resetting the display driver (TDR) failed. Names such as nvlddmkm.sys, atikmpag.sys or igdkmd64.sys are common.": "Die Grafikkarte reagierte nicht mehr, und das Zurücksetzen des Anzeigetreibers (TDR) schlug fehl. Namen wie nvlddmkm.sys, atikmpag.sys oder igdkmd64.sys sind häufig.",
  "Graphics card overheating, insufficient power or overclocking": "Überhitzung der Grafikkarte, zu wenig Strom oder Übertaktung",
  "Memory settings (timings) or a defective part": "Speichereinstellungen (Timings) oder ein defektes Bauteil",
  // VIDEO_TDR_TIMEOUT_DETECTED
  "The display driver did not respond in time (TDR timeout). It is often only logged with a dump, without a blue screen.": "Der Anzeigetreiber hat nicht rechtzeitig reagiert (TDR-Zeitüberschreitung). Oft wird das nur mit einem Speicherabbild protokolliert, ohne Bluescreen.",
  // VIDEO_SCHEDULER_INTERNAL_ERROR
  "The video scheduler detected a fatal violation.": "Der Videoplaner (Video Scheduler) hat eine schwere Verletzung erkannt.",
  "Graphics card hardware": "Hardware der Grafikkarte",
  // WHEA_UNCORRECTABLE_ERROR
  "An uncorrectable hardware error occurred (reported through WHEA). The WHEA-Logger events in Event Viewer tell which part (CPU cache, memory, PCIe bus) was involved.": "Ein nicht korrigierbarer Hardwarefehler ist aufgetreten (über WHEA gemeldet). Die WHEA-Logger-Ereignisse in der Ereignisanzeige zeigen, welches Teil (CPU-Cache, Arbeitsspeicher, PCIe-Bus) beteiligt war.",
  "Overclocking, undervolting, XMP/EXPO, voltage": "Übertaktung, Undervolting, XMP/EXPO, Spannung",
  "Temperature or power supply": "Temperatur oder Netzteil",
  "Faulty CPU, memory, motherboard or PCIe device": "Defekte CPU, Arbeitsspeicher, Mainboard oder PCIe-Gerät",
  "An old BIOS": "Ein altes BIOS",
  // DPC_WATCHDOG_VIOLATION
  "A single deferred procedure call (DPC) ran too long, or the system stayed at DISPATCH_LEVEL or above too long. Parameter 1 tells which.": "Ein einzelner verzögerter Prozeduraufruf (DPC) lief zu lange, oder das System blieb zu lange auf DISPATCH_LEVEL oder höher. Parameter 1 zeigt, was davon.",
  "Storage drivers (SATA AHCI, NVMe) or SSD firmware": "Speichertreiber (SATA AHCI, NVMe) oder SSD-Firmware",
  "A device driver that holds the CPU too long (network, audio, USB)": "Ein Gerätetreiber, der die CPU zu lange belegt (Netzwerk, Audio, USB)",
  // KERNEL_SECURITY_CHECK_FAILURE
  "The kernel detected corruption of a critical data structure (such as a list entry).": "Der Kernel hat die Beschädigung einer kritischen Datenstruktur (etwa eines Listeneintrags) erkannt.",
  "A driver bug or incompatible driver": "Ein Treiberfehler oder ein inkompatibler Treiber",
  "Recently added hardware": "Kürzlich hinzugefügte Hardware",
  // KERNEL_MODE_HEAP_CORRUPTION
  "The kernel-mode heap manager detected heap corruption.": "Die Heapverwaltung im Kernelmodus hat einen beschädigten Heap erkannt.",
  "A driver overwriting the heap (graphics, audio, security software)": "Ein Treiber, der den Heap überschreibt (Grafik, Audio, Sicherheitssoftware)",
  // UNEXPECTED_STORE_EXCEPTION
  "The kernel memory store component (memory compression and paging) caught an unexpected exception.": "Die Speicherkomponente des Kernels (Speicherkomprimierung und Auslagerung) hat eine unerwartete Ausnahme abgefangen.",
  "Storage, SSD firmware or controller driver": "Datenträger, SSD-Firmware oder Controllertreiber",
  "Antivirus or security software": "Virenschutz oder Sicherheitssoftware",
  // MANUALLY_INITIATED_POWER_BUTTON_HOLD
  "The power button was held on a PC set to capture a dump on a long press. It records a forced power-off of a hung system.": "An einem PC, der bei langem Drücken ein Speicherabbild schreiben soll, wurde der Netzschalter gedrückt gehalten. Es dokumentiert das erzwungene Ausschalten eines hängenden Systems.",
  "Look separately at why the PC hung before the button was held": "Getrennt untersuchen, warum der PC hing, bevor der Schalter gehalten wurde",
  // WINLOGON_FATAL_ERROR
  "A core user-mode process such as Winlogon terminated unexpectedly.": "Ein zentraler Prozess im Benutzermodus wie Winlogon wurde unerwartet beendet.",
  "Damaged system files or a failed update": "Beschädigte Systemdateien oder ein fehlgeschlagenes Update",
  "Incompatible system software": "Inkompatible Systemsoftware",
};
