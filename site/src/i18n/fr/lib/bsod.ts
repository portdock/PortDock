// Dictionnaire des codes d’arrêt (écran bleu) — ordre de vérification (STEPS), signification (meaning) et causes possibles (causes) de lib/bsod.ts, phrase anglaise → français. Les 39 codes (dans le JSON de la page — libText « bsod »)
// Ordre : les 16 vérifications, puis par code sa signification et les causes possibles qui y apparaissent pour la première fois
export default {
  "In Event Viewer → Windows Logs → System, look at errors and warnings around the same time (disk, Ntfs, WHEA-Logger, driver names).": "Dans l’Observateur d’événements → Journaux Windows → Système, regardez les erreurs et avertissements à la même heure (disk, Ntfs, WHEA-Logger, noms de pilotes).",
  "Undo what changed just before the crashes began (new device, driver, Windows update, antivirus, VPN, virtualization, anti-cheat software).": "Annulez ce qui a changé juste avant le début des écrans bleus (nouveau périphérique, pilote, mise à jour Windows, antivirus, VPN, virtualisation, logiciel anti-triche).",
  "Find which device the .sys file named on the blue screen or in the dump belongs to, and try the device maker's latest (or previous) driver.": "Identifiez le périphérique auquel appartient le fichier .sys cité sur l’écran bleu ou dans le fichier dump, et essayez le pilote le plus récent (ou la version précédente) de son fabricant.",
  "Run Windows Memory Diagnostic (mdsched.exe); with several memory modules, try them one at a time.": "Lancez le Diagnostic de mémoire Windows (mdsched.exe) ; avec plusieurs barrettes, testez-les une par une.",
  "Turn off overclocking, XMP/EXPO memory profiles and undervolting, return the BIOS to defaults and repeat the same workload.": "Désactivez l’overclocking, les profils mémoire XMP/EXPO et l’undervolting, remettez le BIOS aux valeurs par défaut et refaites la même tâche.",
  "Check temperatures (CPU, graphics card) and power (PSU capacity, cables, laptop adapter). If it happens only under heavy load, this is a strong candidate.": "Contrôlez les températures (processeur, carte graphique) et l’alimentation (puissance du bloc d’alimentation, câbles, chargeur du portable). Si cela n’arrive qu’en forte charge, c’est une piste sérieuse.",
  "Check for a newer BIOS and chipset driver from the motherboard or laptop maker.": "Cherchez un BIOS et un pilote de chipset plus récents chez le fabricant de la carte mère ou du portable.",
  "Check the storage: chkdsk C: /scan (scan without fixing), the drive maker's diagnostics and SMART, SATA cable or M.2 seating, SSD firmware.": "Contrôlez le stockage : chkdsk C: /scan (analyse sans réparation), outil de diagnostic du fabricant du disque et SMART, câble SATA ou fixation du M.2, firmware du SSD.",
  "Update the storage controller driver (SATA AHCI, NVMe, RAID) and SSD firmware from the maker.": "Mettez à jour le pilote du contrôleur de stockage (SATA AHCI, NVMe, RAID) et le firmware du SSD avec les versions du fabricant.",
  "From an administrator command prompt, check system files with sfc /scannow and DISM /Online /Cleanup-Image /RestoreHealth.": "Dans une invite de commandes ouverte en administrateur, vérifiez les fichiers système avec sfc /scannow et DISM /Online /Cleanup-Image /RestoreHealth.",
  "Check whether it happens when entering or leaving sleep or hibernation. Try with Fast Startup off and compare the «Power Management» tab of USB and network devices.": "Regardez si cela arrive à l’entrée ou à la sortie de la veille ou de la veille prolongée. Essayez avec le démarrage rapide désactivé et comparez l’onglet « Gestion de l’alimentation » des périphériques USB et réseau.",
  "Reinstall the graphics driver from the maker's site (latest or one version back) and turn off graphics card overclocking.": "Réinstallez le pilote graphique depuis le site du fabricant (dernière version ou la précédente) et désactivez l’overclocking de la carte graphique.",
  "If Windows will not start, use «Startup Repair» in the recovery environment. If the BIOS storage mode (AHCI, RAID, VMD) was changed, set it back.": "Si Windows ne démarre plus, utilisez l’« Outil de redémarrage système » de l’environnement de récupération. Si le mode de stockage du BIOS (AHCI, RAID, VMD) a été modifié, rétablissez-le.",
  "If the same code repeats with no driver named, advanced users can narrow suspects with Driver Verifier (verifier.exe) — it can cause boot loops, so make a restore point first and run verifier /reset when done.": "Si le même code revient sans nom de pilote, les utilisateurs avancés peuvent cerner le pilote en cause avec Driver Verifier (verifier.exe) — il peut provoquer des redémarrages en boucle : créez d’abord un point de restauration et lancez verifier /reset à la fin.",
  "Opening the dump (C:\\Windows\\Minidump\\*.dmp or MEMORY.DMP) with !analyze -v in WinDbg shows more about the module where it stopped.": "Ouvrir le fichier dump (C:\\Windows\\Minidump\\*.dmp ou MEMORY.DMP) avec !analyze -v dans WinDbg en dit plus sur le module où le système s’est arrêté.",
  "If the code differs every time, look at hardware (memory, power, temperature, overclocking) before any single driver.": "Si le code change à chaque fois, regardez le matériel (mémoire, alimentation, température, overclocking) avant de soupçonner un pilote en particulier.",
  // IRQL_NOT_LESS_OR_EQUAL
  "Windows or a kernel driver touched an invalid address or pageable memory while running at a raised interrupt level (IRQL).": "Windows ou un pilote noyau a accédé à une adresse invalide ou à de la mémoire paginable alors qu’il s’exécutait à un niveau d’interruption (IRQL) élevé.",
  "A kernel driver using a bad address (network, antivirus, virtualization, old device drivers)": "Un pilote noyau qui utilise une mauvaise adresse (réseau, antivirus, virtualisation, pilotes de périphériques anciens)",
  "Faulty memory or overclocking": "Mémoire défectueuse ou overclocking",
  // BAD_POOL_HEADER
  "The header of a kernel memory pool block is corrupt.": "L’en-tête d’un bloc du pool de mémoire du noyau est corrompu.",
  "A driver overwriting pool memory (antivirus, filter and network drivers are common)": "Un pilote qui écrase la mémoire du pool (souvent un antivirus, un pilote de filtre ou un pilote réseau)",
  "Faulty memory": "Mémoire défectueuse",
  // MEMORY_MANAGEMENT
  "A severe memory management error occurred. Parameter 1 tells which kind.": "Une erreur grave de gestion de la mémoire s’est produite. Le paramètre 1 en indique le type.",
  "Faulty or loose memory (RAM), memory overclocking such as XMP/EXPO": "Mémoire (RAM) défectueuse ou mal enfoncée, overclocking de la mémoire comme XMP/EXPO",
  "A driver problem": "Un problème de pilote",
  "Errors on the disk that holds the page file": "Erreurs sur le disque qui contient le fichier d’échange",
  // KMODE_EXCEPTION_NOT_HANDLED
  "A kernel-mode program raised an exception nobody handled. Parameter 2 (the exception address) often points at the driver.": "Un programme en mode noyau a levé une exception que personne n’a traitée. Le paramètre 2 (l’adresse de l’exception) désigne souvent le pilote.",
  "A device driver or system service": "Un pilote de périphérique ou un service système",
  "Incompatible hardware": "Matériel incompatible",
  // NTFS_FILE_SYSTEM
  "A problem occurred in the NTFS file system driver (ntfs.sys).": "Un problème s’est produit dans le pilote du système de fichiers NTFS (ntfs.sys).",
  "Disk corruption or bad sectors, SATA cable": "Disque corrompu ou secteurs défectueux, câble SATA",
  "Antivirus, backup or defrag tools that watch the disk constantly": "Antivirus, outils de sauvegarde ou de défragmentation qui surveillent le disque en permanence",
  "Too little free disk space": "Trop peu d’espace libre sur le disque",
  // SYSTEM_SERVICE_EXCEPTION
  "An exception occurred in a system service routine — the path where ordinary programs call into the kernel.": "Une exception s’est produite dans une routine de service système — le chemin par lequel les programmes ordinaires appellent le noyau.",
  "Graphics, audio, antivirus or virtualization drivers": "Pilotes graphiques, audio, antivirus ou de virtualisation",
  "Damaged system files": "Fichiers système endommagés",
  // INTERRUPT_EXCEPTION_NOT_HANDLED
  "An exception raised while handling an interrupt could not be handled.": "Une exception levée pendant le traitement d’une interruption n’a pas pu être traitée.",
  "A device driver (devices that use interrupts)": "Un pilote de périphérique (périphériques qui utilisent des interruptions)",
  "Faulty hardware": "Matériel défectueux",
  // PFN_LIST_CORRUPT
  "The page frame number (PFN) list that tracks physical memory is corrupt.": "La liste des numéros de cadres de page (PFN) qui suit la mémoire physique est corrompue.",
  "A driver passing a bad memory descriptor (MDL)": "Un pilote qui transmet un mauvais descripteur de mémoire (MDL)",
  // PAGE_FAULT_IN_NONPAGED_AREA
  "Invalid system memory was referenced.": "Une mémoire système invalide a été référencée.",
  "A faulty driver or system service, antivirus": "Un pilote ou un service système défectueux, un antivirus",
  "Faulty memory (RAM or video memory)": "Mémoire défectueuse (RAM ou mémoire vidéo)",
  "A corrupted NTFS volume": "Un volume NTFS corrompu",
  // KERNEL_DATA_INPAGE_ERROR
  "Kernel data could not be read back from the page file. Parameter 2 (error status) tells whether the disk is involved.": "Des données du noyau n’ont pas pu être relues depuis le fichier d’échange. Le paramètre 2 (état d’erreur) indique si le disque est en cause.",
  "Bad disk sectors (0xC000009C, 0xC000016A)": "Secteurs défectueux sur le disque (0xC000009C, 0xC000016A)",
  "Loose or faulty cabling (0xC000009D, 0xC0000185)": "Câblage mal branché ou défectueux (0xC000009D, 0xC0000185)",
  "Faulty memory, nonpaged pool shortage (0xC000009A)": "Mémoire défectueuse, manque de pool non paginé (0xC000009A)",
  // INACCESSIBLE_BOOT_DEVICE
  "Windows lost access to the system partition during startup.": "Windows a perdu l’accès à la partition système pendant le démarrage.",
  "A changed BIOS storage mode (AHCI, RAID, VMD), an added or replaced disk controller": "Un mode de stockage du BIOS modifié (AHCI, RAID, VMD), un contrôleur de disque ajouté ou remplacé",
  "The storage controller driver": "Le pilote du contrôleur de stockage",
  "A failing boot disk or cable": "Un disque de démarrage ou un câble défaillant",
  // SYSTEM_THREAD_EXCEPTION_NOT_HANDLED
  "A system thread raised an exception that was not handled. If a driver is named on the screen, it is the first candidate.": "Un thread système a levé une exception qui n’a pas été traitée. Si un pilote est cité à l’écran, c’est le premier suspect.",
  "The driver named on the screen or in the dump (graphics, network and storage are common)": "Le pilote cité à l’écran ou dans le fichier dump (souvent graphique, réseau ou stockage)",
  "An incompatible driver": "Un pilote incompatible",
  // UNEXPECTED_KERNEL_MODE_TRAP
  "The CPU raised a trap (such as a double fault) that the kernel did not catch.": "Le processeur a déclenché une interruption (trap, par exemple une double faute) que le noyau n’a pas interceptée.",
  "Faulty or mismatched memory": "Mémoire défectueuse ou barrettes dépareillées",
  "Failing hardware or overclocking": "Matériel défaillant ou overclocking",
  "Kernel stack overflow (several filter drivers on one stack)": "Débordement de la pile du noyau (plusieurs pilotes de filtre empilés)",
  // MACHINE_CHECK_EXCEPTION
  "The CPU reported a fatal hardware error (machine check). Recent Windows versions usually show 0x124 instead.": "Le processeur a signalé une erreur matérielle fatale (machine check). Les versions récentes de Windows affichent en général 0x124 à la place.",
  "CPU, memory or motherboard hardware": "Matériel : processeur, mémoire ou carte mère",
  "Overclocking or voltage": "Overclocking ou tension",
  "Temperature or power": "Température ou alimentation",
  // DRIVER_POWER_STATE_FAILURE
  "A driver did not finish a power state change (sleep, wake, shutdown) in time, or is in an inconsistent power state.": "Un pilote n’a pas terminé à temps un changement d’état d’alimentation (veille, sortie de veille, arrêt) ou se trouve dans un état d’alimentation incohérent.",
  "A device driver that stops responding at sleep, hibernate or shutdown (USB, wireless, network, graphics)": "Un pilote de périphérique qui ne répond plus à la mise en veille, en veille prolongée ou à l’arrêt (USB, sans fil, réseau, graphique)",
  "An old BIOS or chipset driver": "Un BIOS ou un pilote de chipset ancien",
  // ATTEMPTED_WRITE_TO_READONLY_MEMORY
  "A driver tried to write to read-only memory.": "Un pilote a tenté d’écrire dans une mémoire en lecture seule.",
  "The driver named on the screen": "Le pilote cité à l’écran",
  "A recently installed driver or security software": "Un pilote ou un logiciel de sécurité installé récemment",
  // BAD_POOL_CALLER
  "A thread made a bad memory pool request (zero-byte allocation, freeing an already-freed block, wrong IRQL …).": "Un thread a fait une requête incorrecte au pool de mémoire (allocation de zéro octet, libération d’un bloc déjà libéré, mauvais IRQL…).",
  "A driver bug (antivirus, filter and network drivers are common)": "Un bogue de pilote (souvent un antivirus, un pilote de filtre ou un pilote réseau)",
  "Pool corruption": "Corruption du pool",
  // DRIVER_VERIFIER_DETECTED_VIOLATION
  "Driver Verifier found a fatal mistake in a driver it was watching. It only appears when Driver Verifier is turned on.": "Driver Verifier a trouvé une erreur fatale dans un pilote qu’il surveillait. Ce code n’apparaît que si Driver Verifier est activé.",
  "The driver Driver Verifier caught (named on the screen or in the dump)": "Le pilote pris en faute par Driver Verifier (cité à l’écran ou dans le fichier dump)",
  "Driver Verifier left on unintentionally": "Driver Verifier resté activé par inadvertance",
  // DRIVER_CORRUPTED_EXPOOL
  "Invalid memory was accessed at a raised IRQL. Almost always a driver has corrupted the system pool.": "Une mémoire invalide a été accédée à un IRQL élevé. Presque toujours, un pilote a corrompu le pool système.",
  "A driver overwriting a small memory block": "Un pilote qui écrase un petit bloc de mémoire",
  "Recently installed software or drivers": "Logiciels ou pilotes installés récemment",
  // DRIVER_IRQL_NOT_LESS_OR_EQUAL
  "A kernel driver accessed a pageable (or invalid) address at too high an IRQL. The driver is often named on the screen.": "Un pilote noyau a accédé à une adresse paginable (ou invalide) à un IRQL trop élevé. Le pilote est souvent cité à l’écran.",
  "The .sys driver named on the screen (network, wireless, USB, antivirus and VPN drivers are common)": "Le pilote .sys cité à l’écran (souvent réseau, sans fil, USB, antivirus ou VPN)",
  "A driver bug using freed memory or a NULL pointer": "Un bogue de pilote qui utilise de la mémoire libérée ou un pointeur NULL",
  // MANUALLY_INITIATED_CRASH
  "A crash started on purpose by the user (kernel debugger or keyboard shortcut — a setting enabled to capture a diagnostic dump).": "Un plantage provoqué volontairement par l’utilisateur (débogueur noyau ou raccourci clavier — un réglage activé pour capturer un dump de diagnostic).",
  "A deliberate key press with a diagnostic setting such as CrashOnCtrlScroll": "Un appui volontaire sur des touches avec un réglage de diagnostic comme CrashOnCtrlScroll",
  // THREAD_STUCK_IN_DEVICE_DRIVER
  "A thread in a device driver is spinning endlessly (usually a graphics driver waiting on the graphics card).": "Un thread d’un pilote de périphérique tourne en boucle sans fin (en général un pilote graphique qui attend la carte graphique).",
  "The graphics driver": "Le pilote graphique",
  "Graphics card overheating, power or overclocking": "Surchauffe, alimentation ou overclocking de la carte graphique",
  // UNMOUNTABLE_BOOT_VOLUME
  "The boot volume could not be mounted.": "Le volume de démarrage n’a pas pu être monté.",
  "A failing boot disk or damaged file system": "Un disque de démarrage défaillant ou un système de fichiers endommagé",
  "Cabling or connection problems": "Problèmes de câble ou de connexion",
  // CRITICAL_PROCESS_DIED
  "A critical system process terminated.": "Un processus système critique s’est arrêté.",
  "Damaged system files or a bad update": "Fichiers système endommagés ou mise à jour défectueuse",
  "Storage errors": "Erreurs de stockage",
  "Drivers or security software": "Pilotes ou logiciels de sécurité",
  // CRITICAL_OBJECT_TERMINATION
  "A process or thread crucial to system operation exited or was terminated unexpectedly.": "Un processus ou un thread indispensable au fonctionnement du système s’est terminé ou a été arrêté de façon inattendue.",
  "Storage errors (disk, cable, SSD firmware) so system files cannot be read": "Erreurs de stockage (disque, câble, firmware du SSD) qui empêchent de lire les fichiers système",
  "Security software": "Logiciel de sécurité",
  // ATTEMPTED_EXECUTE_OF_NOEXECUTE_MEMORY
  "Code in non-executable memory was about to run. The driver may be named on the screen.": "Du code situé en mémoire non exécutable allait être exécuté. Le pilote peut être cité à l’écran.",
  "Memory corruption": "Corruption de la mémoire",
  // CLOCK_WATCHDOG_TIMEOUT
  "One processor core did not receive its clock interrupt in time (that core hung or deadlocked).": "Un cœur du processeur n’a pas reçu son interruption d’horloge à temps (ce cœur s’est figé ou est en interblocage).",
  "CPU overclocking, undervolting or voltage": "Overclocking, undervolting ou tension du processeur",
  "BIOS or chipset driver": "BIOS ou pilote de chipset",
  "CPU or motherboard hardware": "Matériel : processeur ou carte mère",
  // CRITICAL_STRUCTURE_CORRUPTION
  "Critical kernel code or data was found modified.": "Du code ou des données critiques du noyau ont été trouvés modifiés.",
  "A driver patching the kernel (old security, anti-cheat or virtualization software)": "Un pilote qui modifie le noyau (ancien logiciel de sécurité, d’anti-triche ou de virtualisation)",
  // VIDEO_DXGKRNL_FATAL_ERROR
  "The DirectX graphics kernel detected a violation.": "Le noyau graphique DirectX a détecté une violation.",
  // VIDEO_TDR_FAILURE
  "The graphics card stopped responding and resetting the display driver (TDR) failed. Names such as nvlddmkm.sys, atikmpag.sys or igdkmd64.sys are common.": "La carte graphique ne répondait plus et la réinitialisation du pilote d’affichage (TDR) a échoué. Des noms comme nvlddmkm.sys, atikmpag.sys ou igdkmd64.sys sont fréquents.",
  "Graphics card overheating, insufficient power or overclocking": "Surchauffe, alimentation insuffisante ou overclocking de la carte graphique",
  "Memory settings (timings) or a defective part": "Réglages de la mémoire (timings) ou composant défectueux",
  // VIDEO_TDR_TIMEOUT_DETECTED
  "The display driver did not respond in time (TDR timeout). It is often only logged with a dump, without a blue screen.": "Le pilote d’affichage n’a pas répondu à temps (délai TDR dépassé). Souvent, seuls un événement et un fichier dump en gardent la trace, sans écran bleu.",
  // VIDEO_SCHEDULER_INTERNAL_ERROR
  "The video scheduler detected a fatal violation.": "Le planificateur vidéo a détecté une violation fatale.",
  "Graphics card hardware": "Matériel de la carte graphique",
  // WHEA_UNCORRECTABLE_ERROR
  "An uncorrectable hardware error occurred (reported through WHEA). The WHEA-Logger events in Event Viewer tell which part (CPU cache, memory, PCIe bus) was involved.": "Une erreur matérielle non corrigible s’est produite (signalée par WHEA). Les événements WHEA-Logger de l’Observateur d’événements indiquent le composant en cause (cache du processeur, mémoire, bus PCIe).",
  "Overclocking, undervolting, XMP/EXPO, voltage": "Overclocking, undervolting, XMP/EXPO, tension",
  "Temperature or power supply": "Température ou bloc d’alimentation",
  "Faulty CPU, memory, motherboard or PCIe device": "Processeur, mémoire, carte mère ou périphérique PCIe défectueux",
  "An old BIOS": "Un BIOS ancien",
  // DPC_WATCHDOG_VIOLATION
  "A single deferred procedure call (DPC) ran too long, or the system stayed at DISPATCH_LEVEL or above too long. Parameter 1 tells which.": "Un appel de procédure différé (DPC) a duré trop longtemps, ou le système est resté trop longtemps à DISPATCH_LEVEL ou au-dessus. Le paramètre 1 indique lequel des deux.",
  "Storage drivers (SATA AHCI, NVMe) or SSD firmware": "Pilotes de stockage (SATA AHCI, NVMe) ou firmware du SSD",
  "A device driver that holds the CPU too long (network, audio, USB)": "Un pilote de périphérique qui monopolise le processeur trop longtemps (réseau, audio, USB)",
  // KERNEL_SECURITY_CHECK_FAILURE
  "The kernel detected corruption of a critical data structure (such as a list entry).": "Le noyau a détecté la corruption d’une structure de données critique (par exemple une entrée de liste).",
  "A driver bug or incompatible driver": "Un bogue de pilote ou un pilote incompatible",
  "Recently added hardware": "Matériel ajouté récemment",
  // KERNEL_MODE_HEAP_CORRUPTION
  "The kernel-mode heap manager detected heap corruption.": "Le gestionnaire de tas du mode noyau a détecté une corruption du tas.",
  "A driver overwriting the heap (graphics, audio, security software)": "Un pilote qui écrase le tas (graphique, audio, logiciel de sécurité)",
  // UNEXPECTED_STORE_EXCEPTION
  "The kernel memory store component (memory compression and paging) caught an unexpected exception.": "Le composant de magasin de mémoire du noyau (compression de la mémoire et pagination) a intercepté une exception inattendue.",
  "Storage, SSD firmware or controller driver": "Stockage, firmware du SSD ou pilote du contrôleur",
  "Antivirus or security software": "Antivirus ou logiciel de sécurité",
  // MANUALLY_INITIATED_POWER_BUTTON_HOLD
  "The power button was held on a PC set to capture a dump on a long press. It records a forced power-off of a hung system.": "Le bouton d’alimentation a été maintenu enfoncé sur un PC réglé pour enregistrer un dump lors d’un appui long. C’est la trace de l’arrêt forcé d’un système figé.",
  "Look separately at why the PC hung before the button was held": "Cherchez à part pourquoi le PC s’était figé (blocage, écran noir) avant l’appui long",
  // WINLOGON_FATAL_ERROR
  "A core user-mode process such as Winlogon terminated unexpectedly.": "Un processus central du mode utilisateur, comme Winlogon, s’est arrêté de façon inattendue.",
  "Damaged system files or a failed update": "Fichiers système endommagés ou mise à jour qui a échoué",
  "Incompatible system software": "Logiciel système incompatible",
};
