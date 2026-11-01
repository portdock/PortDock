// Słownik kodów zatrzymania — kroki sprawdzania (STEPS), znaczenie (meaning) i możliwe przyczyny (causes) z lib/bsod.ts, zdanie angielskie → polski. Wszystkie 39 kodów (w JSON strony — libText „bsod”)
// Kolejność: 16 kroków, potem dla każdego kodu znaczenie i przyczyny, które pojawiają się tam po raz pierwszy. Nazwy menu według polskiego Windows
export default {
  "In Event Viewer → Windows Logs → System, look at errors and warnings around the same time (disk, Ntfs, WHEA-Logger, driver names).": "W Podglądzie zdarzeń → Dzienniki systemu Windows → System przejrzyj błędy i ostrzeżenia z tego samego czasu (disk, Ntfs, WHEA-Logger, nazwy sterowników).",
  "Undo what changed just before the crashes began (new device, driver, Windows update, antivirus, VPN, virtualization, anti-cheat software).": "Cofnij to, co zmieniło się tuż przed początkiem awarii (nowe urządzenie, sterownik, aktualizacja Windows, antywirus, VPN, wirtualizacja, oprogramowanie anti-cheat).",
  "Find which device the .sys file named on the blue screen or in the dump belongs to, and try the device maker's latest (or previous) driver.": "Ustal, do którego urządzenia należy plik .sys wymieniony na niebieskim ekranie lub w zrzucie, i wypróbuj najnowszy (lub poprzedni) sterownik producenta urządzenia.",
  "Run Windows Memory Diagnostic (mdsched.exe); with several memory modules, try them one at a time.": "Uruchom Diagnostykę pamięci systemu Windows (mdsched.exe); przy kilku modułach pamięci testuj je pojedynczo.",
  "Turn off overclocking, XMP/EXPO memory profiles and undervolting, return the BIOS to defaults and repeat the same workload.": "Wyłącz podkręcanie, profile pamięci XMP/EXPO i undervolting, przywróć domyślne ustawienia BIOS i powtórz to samo obciążenie.",
  "Check temperatures (CPU, graphics card) and power (PSU capacity, cables, laptop adapter). If it happens only under heavy load, this is a strong candidate.": "Sprawdź temperatury (procesor, karta graficzna) i zasilanie (moc zasilacza, kable, zasilacz laptopa). Jeśli dzieje się to tylko przy dużym obciążeniu, to mocny kandydat.",
  "Check for a newer BIOS and chipset driver from the motherboard or laptop maker.": "Sprawdź, czy producent płyty głównej lub laptopa ma nowszy BIOS i sterownik chipsetu.",
  "Check the storage: chkdsk C: /scan (scan without fixing), the drive maker's diagnostics and SMART, SATA cable or M.2 seating, SSD firmware.": "Sprawdź dysk: chkdsk C: /scan (skanowanie bez naprawy), narzędzie diagnostyczne producenta dysku i SMART, kabel SATA lub osadzenie M.2, firmware SSD.",
  "Update the storage controller driver (SATA AHCI, NVMe, RAID) and SSD firmware from the maker.": "Zaktualizuj sterownik kontrolera pamięci masowej (SATA AHCI, NVMe, RAID) i firmware SSD od producenta.",
  "From an administrator command prompt, check system files with sfc /scannow and DISM /Online /Cleanup-Image /RestoreHealth.": "W wierszu polecenia uruchomionym jako administrator sprawdź pliki systemowe poleceniami sfc /scannow i DISM /Online /Cleanup-Image /RestoreHealth.",
  "Check whether it happens when entering or leaving sleep or hibernation. Try with Fast Startup off and compare the «Power Management» tab of USB and network devices.": "Sprawdź, czy dzieje się to przy wchodzeniu w uśpienie lub hibernację albo wychodzeniu z nich. Spróbuj z wyłączonym szybkim uruchamianiem i porównaj kartę „Zarządzanie energią” urządzeń USB i sieciowych.",
  "Reinstall the graphics driver from the maker's site (latest or one version back) and turn off graphics card overclocking.": "Zainstaluj ponownie sterownik grafiki ze strony producenta (najnowszy lub o wersję starszy) i wyłącz podkręcanie karty graficznej.",
  "If Windows will not start, use «Startup Repair» in the recovery environment. If the BIOS storage mode (AHCI, RAID, VMD) was changed, set it back.": "Jeśli Windows się nie uruchamia, użyj „Naprawy podczas uruchamiania” w środowisku odzyskiwania. Jeśli zmieniono tryb pamięci masowej w BIOS (AHCI, RAID, VMD), przywróć go.",
  "If the same code repeats with no driver named, advanced users can narrow suspects with Driver Verifier (verifier.exe) — it can cause boot loops, so make a restore point first and run verifier /reset when done.": "Jeśli ten sam kod się powtarza bez nazwy sterownika, zaawansowani użytkownicy mogą zawęzić podejrzanych narzędziem Driver Verifier (verifier.exe) — może ono wywołać pętlę restartów, więc najpierw utwórz punkt przywracania, a po zakończeniu uruchom verifier /reset.",
  "Opening the dump (C:\\Windows\\Minidump\\*.dmp or MEMORY.DMP) with !analyze -v in WinDbg shows more about the module where it stopped.": "Otwarcie zrzutu (C:\\Windows\\Minidump\\*.dmp lub MEMORY.DMP) w WinDbg poleceniem !analyze -v pokazuje więcej o module, w którym nastąpiło zatrzymanie.",
  "If the code differs every time, look at hardware (memory, power, temperature, overclocking) before any single driver.": "Jeśli kod za każdym razem jest inny, najpierw sprawdź sprzęt (pamięć, zasilanie, temperaturę, podkręcanie), a nie pojedynczy sterownik.",
  // IRQL_NOT_LESS_OR_EQUAL
  "Windows or a kernel driver touched an invalid address or pageable memory while running at a raised interrupt level (IRQL).": "Windows lub sterownik jądra odwołał się do nieprawidłowego adresu albo pamięci stronicowanej, działając na podwyższonym poziomie przerwań (IRQL).",
  "A kernel driver using a bad address (network, antivirus, virtualization, old device drivers)": "Sterownik jądra używający złego adresu (sieć, antywirus, wirtualizacja, stare sterowniki urządzeń)",
  "Faulty memory or overclocking": "Uszkodzona pamięć lub podkręcanie",
  // BAD_POOL_HEADER
  "The header of a kernel memory pool block is corrupt.": "Nagłówek bloku puli pamięci jądra jest uszkodzony.",
  "A driver overwriting pool memory (antivirus, filter and network drivers are common)": "Sterownik nadpisujący pamięć puli (często sterowniki antywirusa, filtrów i sieci)",
  "Faulty memory": "Uszkodzona pamięć",
  // MEMORY_MANAGEMENT
  "A severe memory management error occurred. Parameter 1 tells which kind.": "Wystąpił poważny błąd zarządzania pamięcią. Parametr 1 mówi, jakiego rodzaju.",
  "Faulty or loose memory (RAM), memory overclocking such as XMP/EXPO": "Uszkodzona lub luźno osadzona pamięć (RAM), podkręcanie pamięci, np. XMP/EXPO",
  "A driver problem": "Problem ze sterownikiem",
  "Errors on the disk that holds the page file": "Błędy na dysku z plikiem stronicowania",
  // KMODE_EXCEPTION_NOT_HANDLED
  "A kernel-mode program raised an exception nobody handled. Parameter 2 (the exception address) often points at the driver.": "Program trybu jądra zgłosił wyjątek, którego nikt nie obsłużył. Parametr 2 (adres wyjątku) często wskazuje sterownik.",
  "A device driver or system service": "Sterownik urządzenia lub usługa systemowa",
  "Incompatible hardware": "Niezgodny sprzęt",
  // NTFS_FILE_SYSTEM
  "A problem occurred in the NTFS file system driver (ntfs.sys).": "Wystąpił problem w sterowniku systemu plików NTFS (ntfs.sys).",
  "Disk corruption or bad sectors, SATA cable": "Uszkodzenie dysku lub złe sektory, kabel SATA",
  "Antivirus, backup or defrag tools that watch the disk constantly": "Antywirus, kopie zapasowe lub defragmentacja stale monitorujące dysk",
  "Too little free disk space": "Za mało wolnego miejsca na dysku",
  // SYSTEM_SERVICE_EXCEPTION
  "An exception occurred in a system service routine — the path where ordinary programs call into the kernel.": "Wystąpił wyjątek w procedurze usługi systemowej — ścieżce, którą zwykłe programy wywołują jądro.",
  "Graphics, audio, antivirus or virtualization drivers": "Sterowniki grafiki, dźwięku, antywirusa lub wirtualizacji",
  "Damaged system files": "Uszkodzone pliki systemowe",
  // INTERRUPT_EXCEPTION_NOT_HANDLED
  "An exception raised while handling an interrupt could not be handled.": "Nie udało się obsłużyć wyjątku zgłoszonego podczas obsługi przerwania.",
  "A device driver (devices that use interrupts)": "Sterownik urządzenia (urządzenia korzystające z przerwań)",
  "Faulty hardware": "Uszkodzony sprzęt",
  // PFN_LIST_CORRUPT
  "The page frame number (PFN) list that tracks physical memory is corrupt.": "Lista numerów ramek stron (PFN), która śledzi pamięć fizyczną, jest uszkodzona.",
  "A driver passing a bad memory descriptor (MDL)": "Sterownik przekazujący nieprawidłowy deskryptor pamięci (MDL)",
  // PAGE_FAULT_IN_NONPAGED_AREA
  "Invalid system memory was referenced.": "Nastąpiło odwołanie do nieprawidłowej pamięci systemowej.",
  "A faulty driver or system service, antivirus": "Wadliwy sterownik lub usługa systemowa, antywirus",
  "Faulty memory (RAM or video memory)": "Uszkodzona pamięć (RAM lub pamięć karty graficznej)",
  "A corrupted NTFS volume": "Uszkodzony wolumin NTFS",
  // KERNEL_DATA_INPAGE_ERROR
  "Kernel data could not be read back from the page file. Parameter 2 (error status) tells whether the disk is involved.": "Nie udało się wczytać danych jądra z pliku stronicowania. Parametr 2 (stan błędu) mówi, czy chodzi o dysk.",
  "Bad disk sectors (0xC000009C, 0xC000016A)": "Złe sektory dysku (0xC000009C, 0xC000016A)",
  "Loose or faulty cabling (0xC000009D, 0xC0000185)": "Luźne lub uszkodzone okablowanie (0xC000009D, 0xC0000185)",
  "Faulty memory, nonpaged pool shortage (0xC000009A)": "Uszkodzona pamięć, brak puli niestronicowanej (0xC000009A)",
  // INACCESSIBLE_BOOT_DEVICE
  "Windows lost access to the system partition during startup.": "Podczas uruchamiania Windows utracił dostęp do partycji systemowej.",
  "A changed BIOS storage mode (AHCI, RAID, VMD), an added or replaced disk controller": "Zmieniony tryb pamięci masowej w BIOS (AHCI, RAID, VMD), dodany lub wymieniony kontroler dysku",
  "The storage controller driver": "Sterownik kontrolera pamięci masowej",
  "A failing boot disk or cable": "Uszkodzony dysk rozruchowy lub kabel",
  // SYSTEM_THREAD_EXCEPTION_NOT_HANDLED
  "A system thread raised an exception that was not handled. If a driver is named on the screen, it is the first candidate.": "Wątek systemowy zgłosił wyjątek, który nie został obsłużony. Jeśli na ekranie jest nazwa sterownika, to on jest pierwszym kandydatem.",
  "The driver named on the screen or in the dump (graphics, network and storage are common)": "Sterownik wymieniony na ekranie lub w zrzucie (często grafika, sieć i pamięć masowa)",
  "An incompatible driver": "Niezgodny sterownik",
  // UNEXPECTED_KERNEL_MODE_TRAP
  "The CPU raised a trap (such as a double fault) that the kernel did not catch.": "Procesor zgłosił pułapkę (np. double fault), której jądro nie przechwyciło.",
  "Faulty or mismatched memory": "Uszkodzona lub niedopasowana pamięć",
  "Failing hardware or overclocking": "Psujący się sprzęt lub podkręcanie",
  "Kernel stack overflow (several filter drivers on one stack)": "Przepełnienie stosu jądra (kilka sterowników filtrujących na jednym stosie)",
  // MACHINE_CHECK_EXCEPTION
  "The CPU reported a fatal hardware error (machine check). Recent Windows versions usually show 0x124 instead.": "Procesor zgłosił krytyczny błąd sprzętowy (machine check). Nowsze wersje Windows zwykle pokazują zamiast tego 0x124.",
  "CPU, memory or motherboard hardware": "Sprzęt: procesor, pamięć lub płyta główna",
  "Overclocking or voltage": "Podkręcanie lub napięcie",
  "Temperature or power": "Temperatura lub zasilanie",
  // DRIVER_POWER_STATE_FAILURE
  "A driver did not finish a power state change (sleep, wake, shutdown) in time, or is in an inconsistent power state.": "Sterownik nie zakończył na czas zmiany stanu zasilania (uśpienie, wybudzenie, zamknięcie) albo jest w niespójnym stanie zasilania.",
  "A device driver that stops responding at sleep, hibernate or shutdown (USB, wireless, network, graphics)": "Sterownik urządzenia, który przestaje odpowiadać przy uśpieniu, hibernacji lub zamykaniu (USB, sieć bezprzewodowa, sieć, grafika)",
  "An old BIOS or chipset driver": "Stary BIOS lub sterownik chipsetu",
  // ATTEMPTED_WRITE_TO_READONLY_MEMORY
  "A driver tried to write to read-only memory.": "Sterownik próbował zapisać do pamięci tylko do odczytu.",
  "The driver named on the screen": "Sterownik wymieniony na ekranie",
  "A recently installed driver or security software": "Niedawno zainstalowany sterownik lub oprogramowanie zabezpieczające",
  // BAD_POOL_CALLER
  "A thread made a bad memory pool request (zero-byte allocation, freeing an already-freed block, wrong IRQL …).": "Wątek wysłał nieprawidłowe żądanie do puli pamięci (przydział zera bajtów, zwolnienie już zwolnionego bloku, zły IRQL …).",
  "A driver bug (antivirus, filter and network drivers are common)": "Błąd sterownika (często sterowniki antywirusa, filtrów i sieci)",
  "Pool corruption": "Uszkodzenie puli",
  // DRIVER_VERIFIER_DETECTED_VIOLATION
  "Driver Verifier found a fatal mistake in a driver it was watching. It only appears when Driver Verifier is turned on.": "Driver Verifier znalazł krytyczny błąd w obserwowanym sterowniku. Pojawia się tylko przy włączonym Driver Verifier.",
  "The driver Driver Verifier caught (named on the screen or in the dump)": "Sterownik przyłapany przez Driver Verifier (wymieniony na ekranie lub w zrzucie)",
  "Driver Verifier left on unintentionally": "Niechcący pozostawiony włączony Driver Verifier",
  // DRIVER_CORRUPTED_EXPOOL
  "Invalid memory was accessed at a raised IRQL. Almost always a driver has corrupted the system pool.": "Przy podwyższonym IRQL nastąpił dostęp do nieprawidłowej pamięci. Prawie zawsze sterownik uszkodził pulę systemową.",
  "A driver overwriting a small memory block": "Sterownik nadpisujący mały blok pamięci",
  "Recently installed software or drivers": "Niedawno zainstalowane oprogramowanie lub sterowniki",
  // DRIVER_IRQL_NOT_LESS_OR_EQUAL
  "A kernel driver accessed a pageable (or invalid) address at too high an IRQL. The driver is often named on the screen.": "Sterownik jądra odwołał się do adresu stronicowanego (lub nieprawidłowego) przy zbyt wysokim IRQL. Nazwa sterownika często jest na ekranie.",
  "The .sys driver named on the screen (network, wireless, USB, antivirus and VPN drivers are common)": "Sterownik .sys wymieniony na ekranie (często sterowniki sieci, Wi-Fi, USB, antywirusa i VPN)",
  "A driver bug using freed memory or a NULL pointer": "Błąd sterownika używającego zwolnionej pamięci lub wskaźnika NULL",
  // MANUALLY_INITIATED_CRASH
  "A crash started on purpose by the user (kernel debugger or keyboard shortcut — a setting enabled to capture a diagnostic dump).": "Awaria celowo wywołana przez użytkownika (debuger jądra lub skrót klawiszowy — ustawienie włączone, aby uzyskać zrzut diagnostyczny).",
  "A deliberate key press with a diagnostic setting such as CrashOnCtrlScroll": "Celowe naciśnięcie klawiszy przy ustawieniu diagnostycznym, np. CrashOnCtrlScroll",
  // THREAD_STUCK_IN_DEVICE_DRIVER
  "A thread in a device driver is spinning endlessly (usually a graphics driver waiting on the graphics card).": "Wątek w sterowniku urządzenia kręci się bez końca (zwykle sterownik grafiki czekający na kartę graficzną).",
  "The graphics driver": "Sterownik grafiki",
  "Graphics card overheating, power or overclocking": "Przegrzanie, zasilanie lub podkręcanie karty graficznej",
  // UNMOUNTABLE_BOOT_VOLUME
  "The boot volume could not be mounted.": "Nie udało się zamontować woluminu rozruchowego.",
  "A failing boot disk or damaged file system": "Uszkodzony dysk rozruchowy lub system plików",
  "Cabling or connection problems": "Problemy z kablami lub połączeniami",
  // CRITICAL_PROCESS_DIED
  "A critical system process terminated.": "Zakończył się krytyczny proces systemowy.",
  "Damaged system files or a bad update": "Uszkodzone pliki systemowe lub wadliwa aktualizacja",
  "Storage errors": "Błędy pamięci masowej",
  "Drivers or security software": "Sterowniki lub oprogramowanie zabezpieczające",
  // CRITICAL_OBJECT_TERMINATION
  "A process or thread crucial to system operation exited or was terminated unexpectedly.": "Proces lub wątek kluczowy dla działania systemu nieoczekiwanie się zakończył lub został zakończony.",
  "Storage errors (disk, cable, SSD firmware) so system files cannot be read": "Błędy pamięci masowej (dysk, kabel, firmware SSD), przez które nie da się odczytać plików systemowych",
  "Security software": "Oprogramowanie zabezpieczające",
  // ATTEMPTED_EXECUTE_OF_NOEXECUTE_MEMORY
  "Code in non-executable memory was about to run. The driver may be named on the screen.": "Miał zostać wykonany kod z pamięci niewykonywalnej. Nazwa sterownika może być na ekranie.",
  "Memory corruption": "Uszkodzenie pamięci",
  // CLOCK_WATCHDOG_TIMEOUT
  "One processor core did not receive its clock interrupt in time (that core hung or deadlocked).": "Jeden rdzeń procesora nie otrzymał na czas przerwania zegarowego (ten rdzeń się zawiesił lub zakleszczył).",
  "CPU overclocking, undervolting or voltage": "Podkręcanie procesora, undervolting lub napięcie",
  "BIOS or chipset driver": "BIOS lub sterownik chipsetu",
  "CPU or motherboard hardware": "Sprzęt: procesor lub płyta główna",
  // CRITICAL_STRUCTURE_CORRUPTION
  "Critical kernel code or data was found modified.": "Wykryto modyfikację krytycznego kodu lub danych jądra.",
  "A driver patching the kernel (old security, anti-cheat or virtualization software)": "Sterownik modyfikujący jądro (stare oprogramowanie zabezpieczające, anti-cheat lub wirtualizacji)",
  // VIDEO_DXGKRNL_FATAL_ERROR
  "The DirectX graphics kernel detected a violation.": "Jądro grafiki DirectX wykryło naruszenie.",
  // VIDEO_TDR_FAILURE
  "The graphics card stopped responding and resetting the display driver (TDR) failed. Names such as nvlddmkm.sys, atikmpag.sys or igdkmd64.sys are common.": "Karta graficzna przestała odpowiadać, a resetowanie sterownika ekranu (TDR) się nie powiodło. Częste są nazwy takie jak nvlddmkm.sys, atikmpag.sys czy igdkmd64.sys.",
  "Graphics card overheating, insufficient power or overclocking": "Przegrzanie karty graficznej, niewystarczające zasilanie lub podkręcanie",
  "Memory settings (timings) or a defective part": "Ustawienia pamięci (timingi) lub wadliwy element",
  // VIDEO_TDR_TIMEOUT_DETECTED
  "The display driver did not respond in time (TDR timeout). It is often only logged with a dump, without a blue screen.": "Sterownik ekranu nie odpowiedział na czas (limit czasu TDR). Często zostaje tylko wpis i zrzut, bez niebieskiego ekranu.",
  // VIDEO_SCHEDULER_INTERNAL_ERROR
  "The video scheduler detected a fatal violation.": "Harmonogram wideo (video scheduler) wykrył krytyczne naruszenie.",
  "Graphics card hardware": "Sprzęt karty graficznej",
  // WHEA_UNCORRECTABLE_ERROR
  "An uncorrectable hardware error occurred (reported through WHEA). The WHEA-Logger events in Event Viewer tell which part (CPU cache, memory, PCIe bus) was involved.": "Wystąpił nienaprawialny błąd sprzętowy (zgłoszony przez WHEA). Zdarzenia WHEA-Logger w Podglądzie zdarzeń mówią, którego elementu dotyczył (pamięć podręczna procesora, pamięć, magistrala PCIe).",
  "Overclocking, undervolting, XMP/EXPO, voltage": "Podkręcanie, undervolting, XMP/EXPO, napięcie",
  "Temperature or power supply": "Temperatura lub zasilacz",
  "Faulty CPU, memory, motherboard or PCIe device": "Uszkodzony procesor, pamięć, płyta główna lub urządzenie PCIe",
  "An old BIOS": "Stary BIOS",
  // DPC_WATCHDOG_VIOLATION
  "A single deferred procedure call (DPC) ran too long, or the system stayed at DISPATCH_LEVEL or above too long. Parameter 1 tells which.": "Pojedyncze odroczone wywołanie procedury (DPC) trwało za długo albo system zbyt długo pozostawał na poziomie DISPATCH_LEVEL lub wyższym. Parametr 1 mówi, co z tych dwóch.",
  "Storage drivers (SATA AHCI, NVMe) or SSD firmware": "Sterowniki pamięci masowej (SATA AHCI, NVMe) lub firmware SSD",
  "A device driver that holds the CPU too long (network, audio, USB)": "Sterownik urządzenia zbyt długo zajmujący procesor (sieć, dźwięk, USB)",
  // KERNEL_SECURITY_CHECK_FAILURE
  "The kernel detected corruption of a critical data structure (such as a list entry).": "Jądro wykryło uszkodzenie krytycznej struktury danych (np. wpisu listy).",
  "A driver bug or incompatible driver": "Błąd sterownika lub niezgodny sterownik",
  "Recently added hardware": "Niedawno dodany sprzęt",
  // KERNEL_MODE_HEAP_CORRUPTION
  "The kernel-mode heap manager detected heap corruption.": "Menedżer sterty trybu jądra wykrył uszkodzenie sterty.",
  "A driver overwriting the heap (graphics, audio, security software)": "Sterownik nadpisujący stertę (grafika, dźwięk, oprogramowanie zabezpieczające)",
  // UNEXPECTED_STORE_EXCEPTION
  "The kernel memory store component (memory compression and paging) caught an unexpected exception.": "Składnik magazynu pamięci jądra (kompresja pamięci i stronicowanie) przechwycił nieoczekiwany wyjątek.",
  "Storage, SSD firmware or controller driver": "Pamięć masowa, firmware SSD lub sterownik kontrolera",
  "Antivirus or security software": "Antywirus lub oprogramowanie zabezpieczające",
  // MANUALLY_INITIATED_POWER_BUTTON_HOLD
  "The power button was held on a PC set to capture a dump on a long press. It records a forced power-off of a hung system.": "Na komputerze ustawionym tak, by przy długim naciśnięciu zapisać zrzut, przytrzymano przycisk zasilania. To zapis wymuszonego wyłączenia zawieszonego systemu.",
  "Look separately at why the PC hung before the button was held": "Osobno sprawdź, dlaczego komputer się zawiesił, zanim przytrzymano przycisk",
  // WINLOGON_FATAL_ERROR
  "A core user-mode process such as Winlogon terminated unexpectedly.": "Kluczowy proces trybu użytkownika, taki jak Winlogon, nieoczekiwanie się zakończył.",
  "Damaged system files or a failed update": "Uszkodzone pliki systemowe lub nieudana aktualizacja",
  "Incompatible system software": "Niezgodne oprogramowanie systemowe",
};
