// 웹 도구 «블루스크린 정지 코드 사전» 의 자료와 찾기 — 코드(0xD1·d1·0x000000D1)·이름(DRIVER_IRQL…)·이벤트 1001 메시지 전체에서 코드를 뽑는다.
// 뜻·원인 후보·볼 순서는 Microsoft 의 Bug Check Code Reference(learn.microsoft.com/windows-hardware/drivers/debugger/bug-check-0x…)를
// 읽고 직접 줄인 것이다(옮겨 붙이지 않음). 원인 후보는 «흔히 보는 쪽» 일 뿐 — 하나로 정하지 않는다.
// 문서 주소의 꼬리(slug)는 MS 의 목록 쪽(bug-check-code-reference2) 링크를 2026-10-31 에 그대로 옮겼다(대시 개수가 코드마다 다르다).
import { msg, type Lang } from "./tr.ts";
export type { Lang };
type T = { ko: string; en: string };

/** 볼 순서에 쓰는 공통 단계 — 항목마다 다시 쓰지 않고 이름으로 고른다 */
export const STEPS = {
  events: {
    ko: "이벤트 뷰어 → Windows 로그 → 시스템에서 같은 시각 앞뒤의 오류·경고(disk·Ntfs·WHEA-Logger·드라이버 이름)를 봅니다.",
    en: "In Event Viewer → Windows Logs → System, look at errors and warnings around the same time (disk, Ntfs, WHEA-Logger, driver names).",
  },
  recent: {
    ko: "블루스크린이 시작되기 직전에 바꾼 것(새 장치·드라이버·Windows 업데이트·백신·VPN·가상화·게임 보안 프로그램)을 되돌려 봅니다.",
    en: "Undo what changed just before the crashes began (new device, driver, Windows update, antivirus, VPN, virtualization, anti-cheat software).",
  },
  driver: {
    ko: "블루스크린 화면이나 덤프에 적힌 .sys 파일이 어느 장치의 드라이버인지 찾아, 장치 제조사의 최신판(또는 바로 앞 판)으로 바꿔 봅니다.",
    en: "Find which device the .sys file named on the blue screen or in the dump belongs to, and try the device maker's latest (or previous) driver.",
  },
  memtest: {
    ko: "Windows 메모리 진단(mdsched.exe)을 돌리고, 메모리가 여러 개면 하나씩 꽂아 번갈아 봅니다.",
    en: "Run Windows Memory Diagnostic (mdsched.exe); with several memory modules, try them one at a time.",
  },
  oc: {
    ko: "오버클럭·XMP/EXPO 메모리 프로필·언더볼트를 끄고 BIOS 기본값으로 돌려 같은 작업을 해 봅니다.",
    en: "Turn off overclocking, XMP/EXPO memory profiles and undervolting, return the BIOS to defaults and repeat the same workload.",
  },
  power: {
    ko: "온도(CPU·그래픽 카드)와 전원 공급(파워 용량·케이블·노트북 어댑터)을 봅니다. 부하가 클 때만 나면 이쪽 후보가 큽니다.",
    en: "Check temperatures (CPU, graphics card) and power (PSU capacity, cables, laptop adapter). If it happens only under heavy load, this is a strong candidate.",
  },
  bios: {
    ko: "메인보드(노트북) 제조사의 BIOS·칩셋 드라이버 최신판이 있는지 봅니다.",
    en: "Check for a newer BIOS and chipset driver from the motherboard or laptop maker.",
  },
  disk: {
    ko: "저장 장치를 봅니다: chkdsk C: /scan(고치지 않고 검사), 디스크 제조사 진단 도구·SMART, SATA 케이블·M.2 장착, SSD 펌웨어.",
    en: "Check the storage: chkdsk C: /scan (scan without fixing), the drive maker's diagnostics and SMART, SATA cable or M.2 seating, SSD firmware.",
  },
  storage: {
    ko: "저장 장치 컨트롤러 드라이버(SATA AHCI·NVMe·RAID)와 SSD 펌웨어를 제조사 최신판으로 맞춰 봅니다.",
    en: "Update the storage controller driver (SATA AHCI, NVMe, RAID) and SSD firmware from the maker.",
  },
  sfc: {
    ko: "관리자 명령 프롬프트에서 sfc /scannow 와 DISM /Online /Cleanup-Image /RestoreHealth 로 시스템 파일을 살펴봅니다.",
    en: "From an administrator command prompt, check system files with sfc /scannow and DISM /Online /Cleanup-Image /RestoreHealth.",
  },
  sleep: {
    ko: "절전·최대 절전에 들어가거나 깨어날 때 나는지 봅니다. 빠른 시작을 끄고, 장치 관리자의 «전원 관리» 탭(USB·네트워크)을 비교해 봅니다.",
    en: "Check whether it happens when entering or leaving sleep or hibernation. Try with Fast Startup off and compare the «Power Management» tab of USB and network devices.",
  },
  gpu: {
    ko: "그래픽 드라이버를 제조사 사이트의 최신판(또는 한 단계 앞 판)으로 새로 설치하고, 그래픽 카드 오버클럭을 끕니다.",
    en: "Reinstall the graphics driver from the maker's site (latest or one version back) and turn off graphics card overclocking.",
  },
  boot: {
    ko: "Windows 가 시작되지 않으면 복구 환경의 «시작 복구» 를 씁니다. BIOS 에서 저장 장치 모드(AHCI·RAID·VMD)를 바꿨다면 되돌립니다.",
    en: "If Windows will not start, use «Startup Repair» in the recovery environment. If the BIOS storage mode (AHCI, RAID, VMD) was changed, set it back.",
  },
  verifier: {
    ko: "같은 코드가 되풀이되고 드라이버 이름이 안 나오면, 고급 사용자는 Driver Verifier(verifier.exe)로 의심 드라이버를 좁힙니다 — 부팅이 반복될 수 있으니 복원 지점을 만들고, 끝나면 verifier /reset.",
    en: "If the same code repeats with no driver named, advanced users can narrow suspects with Driver Verifier (verifier.exe) — it can cause boot loops, so make a restore point first and run verifier /reset when done.",
  },
  dump: {
    ko: "덤프 파일(C:\\Windows\\Minidump\\*.dmp 또는 MEMORY.DMP)을 WinDbg 의 !analyze -v 로 열면 멈춘 곳의 모듈 이름을 더 볼 수 있습니다.",
    en: "Opening the dump (C:\\Windows\\Minidump\\*.dmp or MEMORY.DMP) with !analyze -v in WinDbg shows more about the module where it stopped.",
  },
  repeat: {
    ko: "코드가 매번 다르면 드라이버 하나보다 메모리·전원·온도·오버클럭 같은 하드웨어 쪽을 먼저 봅니다.",
    en: "If the code differs every time, look at hardware (memory, power, temperature, overclocking) before any single driver.",
  },
} satisfies Record<string, T>;
export type StepId = keyof typeof STEPS;

export interface BugCheck {
  code: number;
  name: string;
  /** MS 문서 주소의 꼬리 — bug-check-<slug> */
  slug: string;
  meaning: T;
  causes: { ko: string[]; en: string[] };
  steps: StepId[];
}

const BC = (code: number, name: string, slug: string, meaning: T, causes: { ko: string[]; en: string[] }, steps: StepId[]): BugCheck => ({ code, name, slug, meaning, causes, steps });

export const BUGCHECKS: BugCheck[] = [
  BC(0x0a, "IRQL_NOT_LESS_OR_EQUAL", "0xa--irql-not-less-or-equal",
    { ko: "Windows 나 커널 드라이버가 높은 인터럽트 수준(IRQL)에서 잘못된 주소나 페이지로 내보낼 수 있는 메모리를 건드렸습니다.", en: "Windows or a kernel driver touched an invalid address or pageable memory while running at a raised interrupt level (IRQL)." },
    { ko: ["잘못된 주소를 쓰는 커널 드라이버(네트워크·백신·가상화·오래된 장치 드라이버)", "메모리 불량·오버클럭"], en: ["A kernel driver using a bad address (network, antivirus, virtualization, old device drivers)", "Faulty memory or overclocking"] },
    ["events", "driver", "recent", "memtest", "oc"]),
  BC(0x19, "BAD_POOL_HEADER", "0x19--bad-pool-header",
    { ko: "커널 메모리 풀(pool) 블록의 머리 정보가 깨졌습니다.", en: "The header of a kernel memory pool block is corrupt." },
    { ko: ["풀 메모리를 덮어쓰는 드라이버(백신·필터·네트워크 드라이버가 흔함)", "메모리 불량"], en: ["A driver overwriting pool memory (antivirus, filter and network drivers are common)", "Faulty memory"] },
    ["recent", "driver", "memtest", "verifier"]),
  BC(0x1a, "MEMORY_MANAGEMENT", "0x1a--memory-management",
    { ko: "메모리 관리에서 심각한 오류가 났습니다. 첫 번째 매개변수가 어떤 종류인지 알려 줍니다.", en: "A severe memory management error occurred. Parameter 1 tells which kind." },
    { ko: ["메모리(RAM) 불량·접촉 불량, XMP/EXPO 같은 메모리 오버클럭", "드라이버 문제", "페이지 파일이 있는 디스크 오류"], en: ["Faulty or loose memory (RAM), memory overclocking such as XMP/EXPO", "A driver problem", "Errors on the disk that holds the page file"] },
    ["memtest", "oc", "driver", "disk"]),
  BC(0x1e, "KMODE_EXCEPTION_NOT_HANDLED", "0x1e--kmode-exception-not-handled",
    { ko: "커널 모드 프로그램이 낸 예외를 아무도 처리하지 못했습니다. 두 번째 매개변수(예외 주소)가 드라이버를 가리키는 경우가 많습니다.", en: "A kernel-mode program raised an exception nobody handled. Parameter 2 (the exception address) often points at the driver." },
    { ko: ["장치 드라이버·시스템 서비스 문제", "호환되지 않는 하드웨어", "메모리 불량"], en: ["A device driver or system service", "Incompatible hardware", "Faulty memory"] },
    ["driver", "recent", "events", "memtest"]),
  BC(0x24, "NTFS_FILE_SYSTEM", "0x24--ntfs-file-system",
    { ko: "NTFS 파일 시스템 드라이버(ntfs.sys)에서 문제가 났습니다.", en: "A problem occurred in the NTFS file system driver (ntfs.sys)." },
    { ko: ["디스크 손상·불량 섹터, SATA 케이블", "디스크를 계속 감시하는 백신·백업·조각 모음 프로그램", "디스크 여유 공간 부족"], en: ["Disk corruption or bad sectors, SATA cable", "Antivirus, backup or defrag tools that watch the disk constantly", "Too little free disk space"] },
    ["disk", "events", "recent"]),
  BC(0x3b, "SYSTEM_SERVICE_EXCEPTION", "0x3b--system-service-exception",
    { ko: "일반 프로그램이 커널 기능을 부르는 길목(시스템 서비스)에서 예외가 났습니다.", en: "An exception occurred in a system service routine — the path where ordinary programs call into the kernel." },
    { ko: ["그래픽·오디오·백신·가상화 드라이버", "손상된 시스템 파일", "메모리 불량"], en: ["Graphics, audio, antivirus or virtualization drivers", "Damaged system files", "Faulty memory"] },
    ["driver", "recent", "gpu", "sfc", "memtest"]),
  BC(0x3d, "INTERRUPT_EXCEPTION_NOT_HANDLED", "0x3d--interrupt-exception-not-handled",
    { ko: "인터럽트를 처리하던 중 난 예외를 처리하지 못했습니다.", en: "An exception raised while handling an interrupt could not be handled." },
    { ko: ["장치 드라이버(인터럽트를 쓰는 장치)", "하드웨어 불량"], en: ["A device driver (devices that use interrupts)", "Faulty hardware"] },
    ["driver", "recent", "bios"]),
  BC(0x4e, "PFN_LIST_CORRUPT", "0x4e--pfn-list-corrupt",
    { ko: "물리 메모리 페이지를 관리하는 목록(PFN)이 깨졌습니다.", en: "The page frame number (PFN) list that tracks physical memory is corrupt." },
    { ko: ["메모리 불량", "잘못된 메모리 설명(MDL)을 넘기는 드라이버"], en: ["Faulty memory", "A driver passing a bad memory descriptor (MDL)"] },
    ["memtest", "oc", "driver"]),
  BC(0x50, "PAGE_FAULT_IN_NONPAGED_AREA", "0x50--page-fault-in-nonpaged-area",
    { ko: "있어서는 안 되는(잘못된) 시스템 메모리 주소를 참조했습니다.", en: "Invalid system memory was referenced." },
    { ko: ["잘못된 드라이버·시스템 서비스, 백신", "메모리(RAM·그래픽 메모리) 불량", "손상된 NTFS 볼륨"], en: ["A faulty driver or system service, antivirus", "Faulty memory (RAM or video memory)", "A corrupted NTFS volume"] },
    ["driver", "recent", "memtest", "disk"]),
  BC(0x7a, "KERNEL_DATA_INPAGE_ERROR", "0x7a--kernel-data-inpage-error",
    { ko: "페이지 파일에서 커널 데이터를 메모리로 읽어 오지 못했습니다. 두 번째 매개변수(오류 상태)가 디스크 쪽인지 알려 줍니다.", en: "Kernel data could not be read back from the page file. Parameter 2 (error status) tells whether the disk is involved." },
    { ko: ["디스크 불량 섹터(0xC000009C·0xC000016A)", "케이블·연결 불량(0xC000009D·0xC0000185)", "메모리 불량, 비페이지 풀 부족(0xC000009A)"], en: ["Bad disk sectors (0xC000009C, 0xC000016A)", "Loose or faulty cabling (0xC000009D, 0xC0000185)", "Faulty memory, nonpaged pool shortage (0xC000009A)"] },
    ["disk", "events", "memtest"]),
  BC(0x7b, "INACCESSIBLE_BOOT_DEVICE", "0x7b--inaccessible-boot-device",
    { ko: "시작하는 중에 Windows 가 시스템 파티션에 닿지 못했습니다.", en: "Windows lost access to the system partition during startup." },
    { ko: ["BIOS 저장 장치 모드(AHCI·RAID·VMD) 변경, 디스크 컨트롤러 추가·교체", "저장 장치 컨트롤러 드라이버", "부팅 디스크 불량·케이블"], en: ["A changed BIOS storage mode (AHCI, RAID, VMD), an added or replaced disk controller", "The storage controller driver", "A failing boot disk or cable"] },
    ["boot", "recent", "storage", "disk"]),
  BC(0x7e, "SYSTEM_THREAD_EXCEPTION_NOT_HANDLED", "0x7e--system-thread-exception-not-handled",
    { ko: "시스템 스레드가 낸 예외를 처리하지 못했습니다. 화면에 드라이버 이름이 나오면 그 드라이버가 첫 후보입니다.", en: "A system thread raised an exception that was not handled. If a driver is named on the screen, it is the first candidate." },
    { ko: ["화면·덤프에 적힌 드라이버(그래픽·네트워크·저장 장치가 흔함)", "호환되지 않는 드라이버", "메모리 불량"], en: ["The driver named on the screen or in the dump (graphics, network and storage are common)", "An incompatible driver", "Faulty memory"] },
    ["driver", "recent", "gpu", "memtest"]),
  BC(0x7f, "UNEXPECTED_KERNEL_MODE_TRAP", "0x7f--unexpected-kernel-mode-trap",
    { ko: "CPU 가 낸 트랩(예: 이중 폴트)을 커널이 잡지 못했습니다.", en: "The CPU raised a trap (such as a double fault) that the kernel did not catch." },
    { ko: ["메모리 불량·호환되지 않는 메모리", "하드웨어 고장·오버클럭", "커널 스택 넘침(같은 스택에 붙은 여러 필터 드라이버)"], en: ["Faulty or mismatched memory", "Failing hardware or overclocking", "Kernel stack overflow (several filter drivers on one stack)"] },
    ["memtest", "oc", "power", "recent"]),
  BC(0x9c, "MACHINE_CHECK_EXCEPTION", "0x9c--machine-check-exception",
    { ko: "CPU 가 치명적인 하드웨어 오류(machine check)를 알렸습니다. 요즘 Windows 에서는 대개 0x124 로 나옵니다.", en: "The CPU reported a fatal hardware error (machine check). Recent Windows versions usually show 0x124 instead." },
    { ko: ["CPU·메모리·메인보드 하드웨어", "오버클럭·전압", "온도·전원"], en: ["CPU, memory or motherboard hardware", "Overclocking or voltage", "Temperature or power"] },
    ["oc", "power", "memtest", "bios"]),
  BC(0x9f, "DRIVER_POWER_STATE_FAILURE", "0x9f--driver-power-state-failure",
    { ko: "드라이버가 전원 상태 바꾸기(절전·깨우기·끄기) 요청을 제때 끝내지 못했거나 앞뒤가 맞지 않는 상태입니다.", en: "A driver did not finish a power state change (sleep, wake, shutdown) in time, or is in an inconsistent power state." },
    { ko: ["절전·최대 절전·종료 때 응답하지 않는 장치 드라이버(USB·무선·네트워크·그래픽)", "오래된 BIOS·칩셋 드라이버"], en: ["A device driver that stops responding at sleep, hibernate or shutdown (USB, wireless, network, graphics)", "An old BIOS or chipset driver"] },
    ["sleep", "driver", "bios", "events"]),
  BC(0xbe, "ATTEMPTED_WRITE_TO_READONLY_MEMORY", "0xbe--attempted-write-to-readonly-memory",
    { ko: "드라이버가 읽기 전용 메모리에 쓰려고 했습니다.", en: "A driver tried to write to read-only memory." },
    { ko: ["화면에 적힌 드라이버", "최근 설치한 드라이버·보안 프로그램"], en: ["The driver named on the screen", "A recently installed driver or security software"] },
    ["driver", "recent"]),
  BC(0xc2, "BAD_POOL_CALLER", "0xc2--bad-pool-caller",
    { ko: "스레드가 메모리 풀을 잘못 요청했습니다(0 바이트 할당, 이미 해제한 블록 해제, 잘못된 IRQL 등).", en: "A thread made a bad memory pool request (zero-byte allocation, freeing an already-freed block, wrong IRQL …)." },
    { ko: ["드라이버 버그(백신·필터·네트워크 드라이버가 흔함)", "메모리 풀 손상"], en: ["A driver bug (antivirus, filter and network drivers are common)", "Pool corruption"] },
    ["recent", "driver", "memtest", "verifier"]),
  BC(0xc4, "DRIVER_VERIFIER_DETECTED_VIOLATION", "0xc4--driver-verifier-detected-violation",
    { ko: "Driver Verifier 가 지켜보던 드라이버의 치명적인 잘못을 찾았습니다. Driver Verifier 를 켜 둔 PC 에서만 나옵니다.", en: "Driver Verifier found a fatal mistake in a driver it was watching. It only appears when Driver Verifier is turned on." },
    { ko: ["Driver Verifier 가 걸러 낸 드라이버(화면·덤프에 이름)", "모르는 사이 켜 둔 Driver Verifier"], en: ["The driver Driver Verifier caught (named on the screen or in the dump)", "Driver Verifier left on unintentionally"] },
    ["driver", "verifier"]),
  BC(0xc5, "DRIVER_CORRUPTED_EXPOOL", "0xc5--driver-corrupted-expool",
    { ko: "높은 IRQL 에서 잘못된 메모리에 접근했습니다. 드라이버가 시스템 풀을 망가뜨린 경우가 거의 대부분입니다.", en: "Invalid memory was accessed at a raised IRQL. Almost always a driver has corrupted the system pool." },
    { ko: ["작은 메모리 블록을 덮어쓰는 드라이버", "최근 설치한 소프트웨어·드라이버"], en: ["A driver overwriting a small memory block", "Recently installed software or drivers"] },
    ["recent", "driver", "verifier"]),
  BC(0xd1, "DRIVER_IRQL_NOT_LESS_OR_EQUAL", "0xd1--driver-irql-not-less-or-equal",
    { ko: "커널 드라이버가 너무 높은 IRQL 에서 페이지로 내보낼 수 있는(또는 잘못된) 주소에 접근했습니다. 화면에 드라이버 이름이 자주 나옵니다.", en: "A kernel driver accessed a pageable (or invalid) address at too high an IRQL. The driver is often named on the screen." },
    { ko: ["화면에 적힌 .sys 드라이버(네트워크·무선·USB·백신·VPN 드라이버가 흔함)", "해제된 메모리·NULL 포인터를 쓰는 드라이버 버그"], en: ["The .sys driver named on the screen (network, wireless, USB, antivirus and VPN drivers are common)", "A driver bug using freed memory or a NULL pointer"] },
    ["driver", "recent", "events", "memtest"]),
  BC(0xe2, "MANUALLY_INITIATED_CRASH", "0xe2--manually-initiated-crash",
    { ko: "사용자가 일부러 일으킨 크래시입니다(커널 디버거나 키보드 단축키 — 진단용 덤프를 얻으려고 켜 둔 설정).", en: "A crash started on purpose by the user (kernel debugger or keyboard shortcut — a setting enabled to capture a diagnostic dump)." },
    { ko: ["CrashOnCtrlScroll 같은 진단 설정으로 일부러 누름"], en: ["A deliberate key press with a diagnostic setting such as CrashOnCtrlScroll"] },
    ["recent"]),
  BC(0xea, "THREAD_STUCK_IN_DEVICE_DRIVER", "0xea--thread-stuck-in-device-driver",
    { ko: "장치 드라이버의 스레드가 끝없이 돌고 있습니다(대개 그래픽 드라이버가 그래픽 카드를 기다리며).", en: "A thread in a device driver is spinning endlessly (usually a graphics driver waiting on the graphics card)." },
    { ko: ["그래픽 드라이버", "그래픽 카드 과열·전원·오버클럭"], en: ["The graphics driver", "Graphics card overheating, power or overclocking"] },
    ["gpu", "power", "oc"]),
  BC(0xed, "UNMOUNTABLE_BOOT_VOLUME", "0xed--unmountable-boot-volume",
    { ko: "부팅 볼륨을 붙이지(mount) 못했습니다.", en: "The boot volume could not be mounted." },
    { ko: ["부팅 디스크 불량·파일 시스템 손상", "케이블·연결 불량"], en: ["A failing boot disk or damaged file system", "Cabling or connection problems"] },
    ["boot", "disk"]),
  BC(0xef, "CRITICAL_PROCESS_DIED", "0xef--critical-process-died",
    { ko: "Windows 에 꼭 필요한 시스템 프로세스가 끝나 버렸습니다.", en: "A critical system process terminated." },
    { ko: ["손상된 시스템 파일·업데이트", "저장 장치 오류", "드라이버·보안 프로그램"], en: ["Damaged system files or a bad update", "Storage errors", "Drivers or security software"] },
    ["events", "sfc", "disk", "recent"]),
  BC(0xf4, "CRITICAL_OBJECT_TERMINATION", "0xf4--critical-object-termination",
    { ko: "시스템 동작에 꼭 필요한 프로세스나 스레드가 갑자기 끝났습니다.", en: "A process or thread crucial to system operation exited or was terminated unexpectedly." },
    { ko: ["저장 장치(디스크·케이블·SSD 펌웨어) 오류로 시스템 파일을 못 읽음", "손상된 시스템 파일", "보안 프로그램"], en: ["Storage errors (disk, cable, SSD firmware) so system files cannot be read", "Damaged system files", "Security software"] },
    ["events", "disk", "storage", "sfc"]),
  BC(0xfc, "ATTEMPTED_EXECUTE_OF_NOEXECUTE_MEMORY", "0xfc---attempted-execute-of-noexecute-memory",
    { ko: "실행하면 안 되는 메모리의 코드를 실행하려고 했습니다. 화면에 드라이버 이름이 나오기도 합니다.", en: "Code in non-executable memory was about to run. The driver may be named on the screen." },
    { ko: ["화면에 적힌 드라이버", "메모리 손상"], en: ["The driver named on the screen", "Memory corruption"] },
    ["driver", "recent", "memtest"]),
  BC(0x101, "CLOCK_WATCHDOG_TIMEOUT", "0x101---clock-watchdog-timeout",
    { ko: "여러 CPU 코어 중 하나가 정해진 시간 안에 시계 인터럽트를 받지 못했습니다(그 코어가 멈췄거나 막힘).", en: "One processor core did not receive its clock interrupt in time (that core hung or deadlocked)." },
    { ko: ["CPU 오버클럭·언더볼트·전압", "BIOS·칩셋 드라이버", "CPU·메인보드 하드웨어"], en: ["CPU overclocking, undervolting or voltage", "BIOS or chipset driver", "CPU or motherboard hardware"] },
    ["oc", "bios", "power", "repeat"]),
  BC(0x109, "CRITICAL_STRUCTURE_CORRUPTION", "0x109---critical-structure-corruption",
    { ko: "커널의 중요한 코드나 데이터가 바뀐 것을 찾았습니다.", en: "Critical kernel code or data was found modified." },
    { ko: ["커널을 고쳐 쓰는 드라이버(오래된 보안·치트 방지·가상화 프로그램)", "메모리 불량"], en: ["A driver patching the kernel (old security, anti-cheat or virtualization software)", "Faulty memory"] },
    ["recent", "driver", "memtest"]),
  BC(0x113, "VIDEO_DXGKRNL_FATAL_ERROR", "0x113---video-dxgkrnl-fatal-error",
    { ko: "DirectX 그래픽 커널이 규칙 위반을 찾았습니다.", en: "The DirectX graphics kernel detected a violation." },
    { ko: ["그래픽 드라이버"], en: ["The graphics driver"] },
    ["gpu", "recent"]),
  BC(0x116, "VIDEO_TDR_FAILURE", "0x116---video-tdr-failure",
    { ko: "그래픽 카드가 응답하지 않아 드라이버를 다시 시작하려 했지만(TDR) 실패했습니다. 화면에 nvlddmkm.sys·atikmpag.sys·igdkmd64.sys 같은 이름이 흔히 보입니다.", en: "The graphics card stopped responding and resetting the display driver (TDR) failed. Names such as nvlddmkm.sys, atikmpag.sys or igdkmd64.sys are common." },
    { ko: ["그래픽 드라이버", "그래픽 카드 과열·전원 부족·오버클럭", "메모리 설정(타이밍)·부품 불량"], en: ["The graphics driver", "Graphics card overheating, insufficient power or overclocking", "Memory settings (timings) or a defective part"] },
    ["gpu", "power", "oc", "memtest"]),
  BC(0x117, "VIDEO_TDR_TIMEOUT_DETECTED", "0x117---video-tdr-timeout-detected",
    { ko: "그래픽 드라이버가 제때 응답하지 않았습니다(TDR 시간 초과). 블루스크린 없이 이벤트·덤프로만 남는 경우도 많습니다.", en: "The display driver did not respond in time (TDR timeout). It is often only logged with a dump, without a blue screen." },
    { ko: ["그래픽 드라이버", "그래픽 카드 과열·전원·오버클럭"], en: ["The graphics driver", "Graphics card overheating, power or overclocking"] },
    ["gpu", "power", "oc"]),
  BC(0x119, "VIDEO_SCHEDULER_INTERNAL_ERROR", "0x119---video-scheduler-internal-error",
    { ko: "그래픽 작업 순서를 정하는 비디오 스케줄러가 치명적인 위반을 찾았습니다.", en: "The video scheduler detected a fatal violation." },
    { ko: ["그래픽 드라이버", "그래픽 카드 하드웨어"], en: ["The graphics driver", "Graphics card hardware"] },
    ["gpu", "power", "recent"]),
  BC(0x124, "WHEA_UNCORRECTABLE_ERROR", "0x124---whea-uncorrectable-error",
    { ko: "고칠 수 없는 하드웨어 오류가 났습니다(WHEA 가 알림). 이벤트 뷰어의 WHEA-Logger 기록이 어느 부품(CPU 캐시·메모리·PCIe 버스)인지 알려 줍니다.", en: "An uncorrectable hardware error occurred (reported through WHEA). The WHEA-Logger events in Event Viewer tell which part (CPU cache, memory, PCIe bus) was involved." },
    { ko: ["오버클럭·언더볼트·XMP/EXPO, 전압", "온도·전원 공급", "CPU·메모리·메인보드·PCIe 장치 불량", "오래된 BIOS"], en: ["Overclocking, undervolting, XMP/EXPO, voltage", "Temperature or power supply", "Faulty CPU, memory, motherboard or PCIe device", "An old BIOS"] },
    ["events", "oc", "power", "bios", "memtest"]),
  BC(0x133, "DPC_WATCHDOG_VIOLATION", "0x133-dpc-watchdog-violation",
    { ko: "지연 프로시저 호출(DPC) 하나가 너무 오래 돌았거나, 시스템이 DISPATCH_LEVEL 이상에서 너무 오래 머물렀습니다. 첫 번째 매개변수가 둘 중 어느 쪽인지 알려 줍니다.", en: "A single deferred procedure call (DPC) ran too long, or the system stayed at DISPATCH_LEVEL or above too long. Parameter 1 tells which." },
    { ko: ["저장 장치 드라이버(SATA AHCI·NVMe)·SSD 펌웨어", "오래 붙잡는 장치 드라이버(네트워크·오디오·USB)", "BIOS·칩셋 드라이버"], en: ["Storage drivers (SATA AHCI, NVMe) or SSD firmware", "A device driver that holds the CPU too long (network, audio, USB)", "BIOS or chipset driver"] },
    ["storage", "driver", "bios", "recent"]),
  BC(0x139, "KERNEL_SECURITY_CHECK_FAILURE", "0x139--kernel-security-check-failure",
    { ko: "커널이 중요한 자료 구조(목록 항목 등)가 깨진 것을 찾았습니다.", en: "The kernel detected corruption of a critical data structure (such as a list entry)." },
    { ko: ["드라이버 버그·호환되지 않는 드라이버", "메모리 불량", "최근 추가한 하드웨어"], en: ["A driver bug or incompatible driver", "Faulty memory", "Recently added hardware"] },
    ["recent", "driver", "memtest", "events"]),
  BC(0x13a, "KERNEL_MODE_HEAP_CORRUPTION", "0x13a--kernel-mode-heap-corruption",
    { ko: "커널 모드 힙 관리자가 힙이 깨진 것을 찾았습니다.", en: "The kernel-mode heap manager detected heap corruption." },
    { ko: ["힙을 덮어쓰는 드라이버(그래픽·오디오·보안 프로그램)", "메모리 불량"], en: ["A driver overwriting the heap (graphics, audio, security software)", "Faulty memory"] },
    ["recent", "driver", "gpu", "memtest"]),
  BC(0x154, "UNEXPECTED_STORE_EXCEPTION", "0x154--unexpected-store-exception",
    { ko: "커널 메모리 저장소(메모리 압축 등) 구성 요소가 예상하지 못한 예외를 잡았습니다.", en: "The kernel memory store component (memory compression and paging) caught an unexpected exception." },
    { ko: ["저장 장치·SSD 펌웨어·컨트롤러 드라이버", "메모리 불량", "백신·보안 프로그램"], en: ["Storage, SSD firmware or controller driver", "Faulty memory", "Antivirus or security software"] },
    ["disk", "storage", "memtest", "recent"]),
  BC(0x1c8, "MANUALLY_INITIATED_POWER_BUTTON_HOLD", "0x1c8--manually-initiated-power-button-hold",
    { ko: "전원 버튼을 오래 눌렀을 때 덤프를 남기도록 설정된 PC 에서 전원 버튼을 길게 눌렀습니다. 멈춘 화면을 강제로 끈 기록입니다.", en: "The power button was held on a PC set to capture a dump on a long press. It records a forced power-off of a hung system." },
    { ko: ["먼저 PC 가 멈춘 까닭(멈춤·화면 꺼짐)을 따로 봐야 합니다"], en: ["Look separately at why the PC hung before the button was held"] },
    ["events", "recent", "dump"]),
  BC(0xc000021a, "WINLOGON_FATAL_ERROR", "0xc000021a--winlogin-fatal-error",
    { ko: "Winlogon 같은 사용자 모드의 핵심 프로세스가 갑자기 끝났습니다.", en: "A core user-mode process such as Winlogon terminated unexpectedly." },
    { ko: ["손상된 시스템 파일·실패한 업데이트", "호환되지 않는 시스템 프로그램"], en: ["Damaged system files or a failed update", "Incompatible system software"] },
    ["boot", "sfc", "recent"]),
];

/** 원인 후보 — 추가 언어는 영어 문장으로 번역 표(lib 묶음 «bsod»)를 찾는다 */
export const causesOf = (b: BugCheck, lang: Lang): string[] => b.causes.en.map((en, i) => msg(lang, b.causes.ko[i], en));

/** MS 문서 주소 — 언어를 빼면 보는 사람의 언어판으로 넘어간다 */
export const msUrl = (b: BugCheck) => `https://learn.microsoft.com/windows-hardware/drivers/debugger/bug-check-${b.slug}`;
export const MS_LIST_URL = "https://learn.microsoft.com/windows-hardware/drivers/debugger/bug-check-code-reference2";
export const MS_USER_URL = "https://support.microsoft.com/help/14238";

/** 0x0000001A 꼴 */
export const codeText = (n: number) => "0x" + (n >>> 0).toString(16).toUpperCase().padStart(8, "0");

const byCode = new Map(BUGCHECKS.map((b) => [b.code >>> 0, b]));
/** 0x1000007E 처럼 0x10000000 이 붙은 판은 같은 뜻(MS 문서의 «-M» 판) */
export function lookupCode(n: number): { bc?: BugCheck; variant: boolean } {
  const u = n >>> 0;
  if (byCode.has(u)) return { bc: byCode.get(u), variant: false };
  if (u >= 0x10000000 && u < 0x20000000 && byCode.has(u - 0x10000000)) return { bc: byCode.get(u - 0x10000000), variant: true };
  return { variant: false };
}

export interface FindResult {
  /** 찾은 코드(이름으로만 찾았으면 그 항목의 코드) */
  code?: number;
  bc?: BugCheck;
  /** 0x1000xxxx 판 */
  variant: boolean;
  /** 1001 메시지의 매개변수 4개 */
  params?: string[];
  /** 메시지에 적힌 .sys·.exe 이름(멈춘 곳으로 적힌 파일 — 원인 후보) */
  files: string[];
  /** 이름 일부로 찾았을 때 여러 후보 */
  matches: BugCheck[];
  /** 어떻게 찾았는지 */
  how: "bugcheck-message" | "keyword" | "hex" | "name" | "none";
}

const HEX_TOKEN = /0x([0-9a-f]{1,16})\b/i;
// 1001(BugCheck) 메시지: «…: 0x00000133 (0x…, 0x…, 0x…, 0x…)» — 언어와 상관없이 «코드 (매개변수 4개)» 모양
const BUGCHECK_LINE = /0x([0-9a-f]{1,16})\s*\(\s*(0x[0-9a-f]+)\s*,\s*(0x[0-9a-f]+)\s*,\s*(0x[0-9a-f]+)\s*,\s*(0x[0-9a-f]+)\s*\)/i;
// WER·미니덤프 요약: «BCCode: 133», «P1: 133», «Bugcheck code: 0x…», «Stop code: 0x…», «정지 코드: …», «버그 검사: …», 일본어 «停止コード: …»·«バグチェック: …», 베트남어 «Mã dừng: …»
const KEYWORD = /(?:BCCode|\bP1|bug\s*check(?:\s*code)?|bugcheck(?:\s*code)?|stop\s*code|정지\s*코드|중지\s*코드|버그\s*검사(?:\s*코드)?|停止\s*コード|バグ\s*チェック(?:\s*コード)?|mã\s*dừng)\s*[:=：]?\s*(?:0x)?([0-9a-f]{1,16})\b/i;

const normName = (s: string) => s.toUpperCase().replace(/[\s-]+/g, "_").replace(/[^A-Z0-9_]/g, "");

/** 붙여 넣은 글에서 코드·이름을 찾는다 */
export function findBugcheck(input: string): FindResult {
  const text = input.trim();
  const files = [...new Set([...text.matchAll(/\b([\w.-]+\.(?:sys|exe|dll))\b/gi)].map((m) => m[1]))].slice(0, 8);
  const done = (code: number, how: FindResult["how"], params?: string[]): FindResult => {
    const { bc, variant } = lookupCode(code);
    return { code: code >>> 0, bc, variant, params, files, matches: bc ? [bc] : [], how };
  };
  if (!text) return { variant: false, files, matches: [], how: "none" };
  const line = text.match(BUGCHECK_LINE);
  if (line) return done(parseInt(line[1], 16), "bugcheck-message", line.slice(2, 6));
  const kw = text.match(KEYWORD);
  // «BugCheck 1001» 처럼 이벤트 ID 를 적은 것은 코드가 아니다
  if (kw && !(kw[1] === "1001" && !/0x1001/i.test(kw[0]))) return done(parseInt(kw[1], 16), "keyword");
  // 이름(전체 또는 일부) — «DRIVER_IRQL», «dpc watchdog», 블루스크린 화면의 «Stop code: DPC WATCHDOG VIOLATION»
  const n = normName(text.replace(/^.*?(?:stop\s*code|정지\s*코드|중지\s*코드|停止\s*コード|mã\s*dừng)\s*[:：]?/i, ""));
  if (n.length >= 4 && /[A-Z]{3}/.test(n)) {
    const exact = BUGCHECKS.find((b) => b.name === n || n.includes(b.name));
    if (exact) return { code: exact.code >>> 0, bc: exact, variant: false, files, matches: [exact], how: "name" };
    const part = BUGCHECKS.filter((b) => b.name.includes(n));
    if (part.length) return { code: part.length === 1 ? part[0].code >>> 0 : undefined, bc: part.length === 1 ? part[0] : undefined, variant: false, files, matches: part, how: "name" };
  }
  const hx = text.match(HEX_TOKEN);
  if (hx) return done(parseInt(hx[1], 16), "hex");
  // 맨 HEX(«d1», «133», «1A»)
  const bare = text.match(/^(?:0x)?([0-9a-f]{1,8})h?$/i);
  if (bare) return done(parseInt(bare[1], 16), "hex");
  return { variant: false, files, matches: [], how: "none" };
}
