// 블루스크린 정지 코드 사전 — lib/bsod.ts 의 볼 순서(STEPS)·뜻(meaning)·원인 후보(causes)를 영어 문장 → 일본어로. 코드 39개 전부(쪽 JSON 에 싣는다 — libText «bsod»)
// 차례: 볼 순서 16개, 그다음 코드 순서대로 뜻과 그 코드에서 처음 나온 원인 후보
export default {
  "In Event Viewer → Windows Logs → System, look at errors and warnings around the same time (disk, Ntfs, WHEA-Logger, driver names).": "イベント ビューアー → Windows ログ → システム で、同じ時刻の前後のエラー・警告(disk・Ntfs・WHEA-Logger・ドライバー名)を見ます。",
  "Undo what changed just before the crashes began (new device, driver, Windows update, antivirus, VPN, virtualization, anti-cheat software).": "ブルースクリーンが起き始める直前に変えたもの(新しいデバイス・ドライバー・Windows Update・ウイルス対策・VPN・仮想化・ゲームのチート対策ソフト)を元に戻してみます。",
  "Find which device the .sys file named on the blue screen or in the dump belongs to, and try the device maker's latest (or previous) driver.": "ブルースクリーン画面やダンプに書かれた .sys ファイルがどのデバイスのドライバーかを調べ、デバイスメーカーの最新版(または 1 つ前の版)にしてみます。",
  "Run Windows Memory Diagnostic (mdsched.exe); with several memory modules, try them one at a time.": "Windows メモリ診断(mdsched.exe)を実行し、メモリが複数枚あれば 1 枚ずつ挿して入れ替えて試します。",
  "Turn off overclocking, XMP/EXPO memory profiles and undervolting, return the BIOS to defaults and repeat the same workload.": "オーバークロック・XMP/EXPO のメモリプロファイル・低電圧化(アンダーボルト)をやめ、BIOS を既定値に戻して同じ作業をしてみます。",
  "Check temperatures (CPU, graphics card) and power (PSU capacity, cables, laptop adapter). If it happens only under heavy load, this is a strong candidate.": "温度(CPU・グラフィックスカード)と電源(電源ユニットの容量・ケーブル・ノート PC の AC アダプター)を確認します。負荷が高いときだけ起きるなら、こちらが有力な候補です。",
  "Check for a newer BIOS and chipset driver from the motherboard or laptop maker.": "マザーボード(ノート PC)メーカーの BIOS・チップセットドライバーの新しい版がないか確認します。",
  "Check the storage: chkdsk C: /scan (scan without fixing), the drive maker's diagnostics and SMART, SATA cable or M.2 seating, SSD firmware.": "ストレージを確認します: chkdsk C: /scan(修復せずに検査)、ドライブメーカーの診断ツールと SMART、SATA ケーブル・M.2 の取り付け、SSD のファームウェア。",
  "Update the storage controller driver (SATA AHCI, NVMe, RAID) and SSD firmware from the maker.": "ストレージコントローラーのドライバー(SATA AHCI・NVMe・RAID)と SSD のファームウェアをメーカーの最新版に合わせてみます。",
  "From an administrator command prompt, check system files with sfc /scannow and DISM /Online /Cleanup-Image /RestoreHealth.": "管理者のコマンド プロンプトで sfc /scannow と DISM /Online /Cleanup-Image /RestoreHealth を実行し、システムファイルを確認します。",
  "Check whether it happens when entering or leaving sleep or hibernation. Try with Fast Startup off and compare the «Power Management» tab of USB and network devices.": "スリープ・休止状態に入るとき・復帰するときに起きるかを見ます。高速スタートアップをオフにして試し、USB・ネットワークデバイスの «電源の管理» タブを比べます。",
  "Reinstall the graphics driver from the maker's site (latest or one version back) and turn off graphics card overclocking.": "グラフィックスドライバーをメーカーのサイトの最新版(または 1 つ前の版)で入れ直し、グラフィックスカードのオーバークロックをやめます。",
  "If Windows will not start, use «Startup Repair» in the recovery environment. If the BIOS storage mode (AHCI, RAID, VMD) was changed, set it back.": "Windows が起動しないときは、回復環境の «スタートアップ修復» を使います。BIOS のストレージモード(AHCI・RAID・VMD)を変えたなら元に戻します。",
  "If the same code repeats with no driver named, advanced users can narrow suspects with Driver Verifier (verifier.exe) — it can cause boot loops, so make a restore point first and run verifier /reset when done.": "同じコードが繰り返し出てドライバー名が出ないときは、上級者は Driver Verifier(verifier.exe)で疑わしいドライバーを絞り込めます — 再起動を繰り返すことがあるので先に復元ポイントを作り、終わったら verifier /reset を実行します。",
  "Opening the dump (C:\\Windows\\Minidump\\*.dmp or MEMORY.DMP) with !analyze -v in WinDbg shows more about the module where it stopped.": "ダンプ(C:\\Windows\\Minidump\\*.dmp または MEMORY.DMP)を WinDbg の !analyze -v で開くと、停止した場所のモジュールについてさらに詳しく見られます。",
  "If the code differs every time, look at hardware (memory, power, temperature, overclocking) before any single driver.": "コードが毎回違うときは、ドライバー 1 つよりも先にハードウェア(メモリ・電源・温度・オーバークロック)を見ます。",
  // IRQL_NOT_LESS_OR_EQUAL
  "Windows or a kernel driver touched an invalid address or pageable memory while running at a raised interrupt level (IRQL).": "Windows またはカーネルドライバーが、高い割り込みレベル(IRQL)で動作中に無効なアドレスやページング可能なメモリに触れました。",
  "A kernel driver using a bad address (network, antivirus, virtualization, old device drivers)": "無効なアドレスを使うカーネルドライバー(ネットワーク・ウイルス対策・仮想化・古いデバイスのドライバー)",
  "Faulty memory or overclocking": "メモリの不良・オーバークロック",
  // BAD_POOL_HEADER
  "The header of a kernel memory pool block is corrupt.": "カーネルのメモリプール(pool)ブロックのヘッダーが壊れています。",
  "A driver overwriting pool memory (antivirus, filter and network drivers are common)": "プールメモリを上書きするドライバー(ウイルス対策・フィルター・ネットワークのドライバーがよくある)",
  "Faulty memory": "メモリの不良",
  // MEMORY_MANAGEMENT
  "A severe memory management error occurred. Parameter 1 tells which kind.": "メモリ管理で重大なエラーが起きました。パラメーター 1 がどの種類かを示します。",
  "Faulty or loose memory (RAM), memory overclocking such as XMP/EXPO": "メモリ(RAM)の不良・接触不良、XMP/EXPO などのメモリのオーバークロック",
  "A driver problem": "ドライバーの問題",
  "Errors on the disk that holds the page file": "ページファイルがあるディスクのエラー",
  // KMODE_EXCEPTION_NOT_HANDLED
  "A kernel-mode program raised an exception nobody handled. Parameter 2 (the exception address) often points at the driver.": "カーネルモードのプログラムが出した例外を誰も処理しませんでした。パラメーター 2(例外のアドレス)がドライバーを指していることが多いです。",
  "A device driver or system service": "デバイスドライバー・システムサービス",
  "Incompatible hardware": "互換性のないハードウェア",
  // NTFS_FILE_SYSTEM
  "A problem occurred in the NTFS file system driver (ntfs.sys).": "NTFS ファイルシステムのドライバー(ntfs.sys)で問題が起きました。",
  "Disk corruption or bad sectors, SATA cable": "ディスクの破損・不良セクター、SATA ケーブル",
  "Antivirus, backup or defrag tools that watch the disk constantly": "ディスクを常に監視するウイルス対策・バックアップ・デフラグのツール",
  "Too little free disk space": "ディスクの空き容量不足",
  // SYSTEM_SERVICE_EXCEPTION
  "An exception occurred in a system service routine — the path where ordinary programs call into the kernel.": "システムサービスのルーチン — 一般のプログラムがカーネルの機能を呼び出す経路 — で例外が起きました。",
  "Graphics, audio, antivirus or virtualization drivers": "グラフィックス・オーディオ・ウイルス対策・仮想化のドライバー",
  "Damaged system files": "破損したシステムファイル",
  // INTERRUPT_EXCEPTION_NOT_HANDLED
  "An exception raised while handling an interrupt could not be handled.": "割り込みの処理中に起きた例外を処理できませんでした。",
  "A device driver (devices that use interrupts)": "デバイスドライバー(割り込みを使うデバイス)",
  "Faulty hardware": "ハードウェアの不良",
  // PFN_LIST_CORRUPT
  "The page frame number (PFN) list that tracks physical memory is corrupt.": "物理メモリを管理するページフレーム番号(PFN)のリストが壊れています。",
  "A driver passing a bad memory descriptor (MDL)": "不正なメモリ記述子(MDL)を渡すドライバー",
  // PAGE_FAULT_IN_NONPAGED_AREA
  "Invalid system memory was referenced.": "無効なシステムメモリが参照されました。",
  "A faulty driver or system service, antivirus": "不良なドライバー・システムサービス、ウイルス対策",
  "Faulty memory (RAM or video memory)": "メモリ(RAM・ビデオメモリ)の不良",
  "A corrupted NTFS volume": "破損した NTFS ボリューム",
  // KERNEL_DATA_INPAGE_ERROR
  "Kernel data could not be read back from the page file. Parameter 2 (error status) tells whether the disk is involved.": "カーネルのデータをページファイルから読み戻せませんでした。パラメーター 2(エラー状態)がディスクが関係するかを示します。",
  "Bad disk sectors (0xC000009C, 0xC000016A)": "ディスクの不良セクター(0xC000009C・0xC000016A)",
  "Loose or faulty cabling (0xC000009D, 0xC0000185)": "ケーブルの緩み・不良(0xC000009D・0xC0000185)",
  "Faulty memory, nonpaged pool shortage (0xC000009A)": "メモリの不良、非ページプールの不足(0xC000009A)",
  // INACCESSIBLE_BOOT_DEVICE
  "Windows lost access to the system partition during startup.": "起動中に Windows がシステムパーティションにアクセスできなくなりました。",
  "A changed BIOS storage mode (AHCI, RAID, VMD), an added or replaced disk controller": "BIOS のストレージモード(AHCI・RAID・VMD)の変更、ディスクコントローラーの追加・交換",
  "The storage controller driver": "ストレージコントローラーのドライバー",
  "A failing boot disk or cable": "起動ディスク・ケーブルの不良",
  // SYSTEM_THREAD_EXCEPTION_NOT_HANDLED
  "A system thread raised an exception that was not handled. If a driver is named on the screen, it is the first candidate.": "システムスレッドが出した例外を処理できませんでした。画面にドライバー名が出ていれば、そのドライバーが最初の候補です。",
  "The driver named on the screen or in the dump (graphics, network and storage are common)": "画面やダンプに書かれたドライバー(グラフィックス・ネットワーク・ストレージがよくある)",
  "An incompatible driver": "互換性のないドライバー",
  // UNEXPECTED_KERNEL_MODE_TRAP
  "The CPU raised a trap (such as a double fault) that the kernel did not catch.": "CPU が出したトラップ(ダブルフォールトなど)をカーネルが捕まえられませんでした。",
  "Faulty or mismatched memory": "メモリの不良・相性の合わないメモリ",
  "Failing hardware or overclocking": "ハードウェアの故障・オーバークロック",
  "Kernel stack overflow (several filter drivers on one stack)": "カーネルスタックのオーバーフロー(同じスタックに重なった複数のフィルタードライバー)",
  // MACHINE_CHECK_EXCEPTION
  "The CPU reported a fatal hardware error (machine check). Recent Windows versions usually show 0x124 instead.": "CPU が致命的なハードウェアエラー(マシンチェック)を報告しました。最近の Windows ではふつう代わりに 0x124 と表示されます。",
  "CPU, memory or motherboard hardware": "CPU・メモリ・マザーボードのハードウェア",
  "Overclocking or voltage": "オーバークロック・電圧",
  "Temperature or power": "温度・電源",
  // DRIVER_POWER_STATE_FAILURE
  "A driver did not finish a power state change (sleep, wake, shutdown) in time, or is in an inconsistent power state.": "ドライバーが電源状態の変更(スリープ・復帰・シャットダウン)を時間内に終えられなかったか、つじつまの合わない電源状態にあります。",
  "A device driver that stops responding at sleep, hibernate or shutdown (USB, wireless, network, graphics)": "スリープ・休止状態・シャットダウンのときに応答しなくなるデバイスドライバー(USB・無線・ネットワーク・グラフィックス)",
  "An old BIOS or chipset driver": "古い BIOS・チップセットドライバー",
  // ATTEMPTED_WRITE_TO_READONLY_MEMORY
  "A driver tried to write to read-only memory.": "ドライバーが読み取り専用メモリに書き込もうとしました。",
  "The driver named on the screen": "画面に書かれたドライバー",
  "A recently installed driver or security software": "最近インストールしたドライバー・セキュリティソフト",
  // BAD_POOL_CALLER
  "A thread made a bad memory pool request (zero-byte allocation, freeing an already-freed block, wrong IRQL …).": "スレッドが不正なメモリプールの要求をしました(0 バイトの確保、解放済みブロックの解放、誤った IRQL など)。",
  "A driver bug (antivirus, filter and network drivers are common)": "ドライバーのバグ(ウイルス対策・フィルター・ネットワークのドライバーがよくある)",
  "Pool corruption": "プールの破損",
  // DRIVER_VERIFIER_DETECTED_VIOLATION
  "Driver Verifier found a fatal mistake in a driver it was watching. It only appears when Driver Verifier is turned on.": "Driver Verifier が監視していたドライバーの致命的な誤りを見つけました。Driver Verifier をオンにした PC でだけ出ます。",
  "The driver Driver Verifier caught (named on the screen or in the dump)": "Driver Verifier が見つけたドライバー(画面やダンプに名前が出る)",
  "Driver Verifier left on unintentionally": "知らないうちにオンのままになっている Driver Verifier",
  // DRIVER_CORRUPTED_EXPOOL
  "Invalid memory was accessed at a raised IRQL. Almost always a driver has corrupted the system pool.": "高い IRQL で無効なメモリにアクセスしました。ほとんどの場合、ドライバーがシステムプールを壊しています。",
  "A driver overwriting a small memory block": "小さなメモリブロックを上書きするドライバー",
  "Recently installed software or drivers": "最近インストールしたソフト・ドライバー",
  // DRIVER_IRQL_NOT_LESS_OR_EQUAL
  "A kernel driver accessed a pageable (or invalid) address at too high an IRQL. The driver is often named on the screen.": "カーネルドライバーが高すぎる IRQL でページング可能な(または無効な)アドレスにアクセスしました。画面にドライバー名がよく出ます。",
  "The .sys driver named on the screen (network, wireless, USB, antivirus and VPN drivers are common)": "画面に書かれた .sys ドライバー(ネットワーク・無線・USB・ウイルス対策・VPN のドライバーがよくある)",
  "A driver bug using freed memory or a NULL pointer": "解放済みメモリや NULL ポインターを使うドライバーのバグ",
  // MANUALLY_INITIATED_CRASH
  "A crash started on purpose by the user (kernel debugger or keyboard shortcut — a setting enabled to capture a diagnostic dump).": "ユーザーが意図的に起こしたクラッシュです(カーネルデバッガーやキーボードショートカット — 診断用ダンプを取るために有効にした設定)。",
  "A deliberate key press with a diagnostic setting such as CrashOnCtrlScroll": "CrashOnCtrlScroll などの診断用設定で意図的にキーを押した",
  // THREAD_STUCK_IN_DEVICE_DRIVER
  "A thread in a device driver is spinning endlessly (usually a graphics driver waiting on the graphics card).": "デバイスドライバーのスレッドが際限なく回り続けています(たいていはグラフィックスドライバーがグラフィックスカードを待っている)。",
  "The graphics driver": "グラフィックスドライバー",
  "Graphics card overheating, power or overclocking": "グラフィックスカードの過熱・電源・オーバークロック",
  // UNMOUNTABLE_BOOT_VOLUME
  "The boot volume could not be mounted.": "ブートボリュームをマウントできませんでした。",
  "A failing boot disk or damaged file system": "起動ディスクの不良・ファイルシステムの破損",
  "Cabling or connection problems": "ケーブル・接続の不良",
  // CRITICAL_PROCESS_DIED
  "A critical system process terminated.": "Windows に欠かせないシステムプロセスが終了しました。",
  "Damaged system files or a bad update": "破損したシステムファイル・不具合のある更新",
  "Storage errors": "ストレージのエラー",
  "Drivers or security software": "ドライバー・セキュリティソフト",
  // CRITICAL_OBJECT_TERMINATION
  "A process or thread crucial to system operation exited or was terminated unexpectedly.": "システムの動作に欠かせないプロセスやスレッドが、予期せず終了したか終了させられました。",
  "Storage errors (disk, cable, SSD firmware) so system files cannot be read": "ストレージ(ディスク・ケーブル・SSD ファームウェア)のエラーでシステムファイルを読めない",
  "Security software": "セキュリティソフト",
  // ATTEMPTED_EXECUTE_OF_NOEXECUTE_MEMORY
  "Code in non-executable memory was about to run. The driver may be named on the screen.": "実行してはいけないメモリ上のコードが実行されようとしました。画面にドライバー名が出ることもあります。",
  "Memory corruption": "メモリの破損",
  // CLOCK_WATCHDOG_TIMEOUT
  "One processor core did not receive its clock interrupt in time (that core hung or deadlocked).": "複数の CPU コアのうち 1 つが、決められた時間内にクロック割り込みを受け取れませんでした(そのコアが止まったかデッドロックした)。",
  "CPU overclocking, undervolting or voltage": "CPU のオーバークロック・低電圧化・電圧",
  "BIOS or chipset driver": "BIOS・チップセットドライバー",
  "CPU or motherboard hardware": "CPU・マザーボードのハードウェア",
  // CRITICAL_STRUCTURE_CORRUPTION
  "Critical kernel code or data was found modified.": "カーネルの重要なコードやデータが書き換えられているのを見つけました。",
  "A driver patching the kernel (old security, anti-cheat or virtualization software)": "カーネルを書き換えるドライバー(古いセキュリティ・チート対策・仮想化のソフト)",
  // VIDEO_DXGKRNL_FATAL_ERROR
  "The DirectX graphics kernel detected a violation.": "DirectX グラフィックスカーネルが違反を検出しました。",
  // VIDEO_TDR_FAILURE
  "The graphics card stopped responding and resetting the display driver (TDR) failed. Names such as nvlddmkm.sys, atikmpag.sys or igdkmd64.sys are common.": "グラフィックスカードが応答しなくなり、ディスプレイドライバーのリセット(TDR)に失敗しました。画面には nvlddmkm.sys・atikmpag.sys・igdkmd64.sys のような名前がよく出ます。",
  "Graphics card overheating, insufficient power or overclocking": "グラフィックスカードの過熱・電源不足・オーバークロック",
  "Memory settings (timings) or a defective part": "メモリの設定(タイミング)・部品の不良",
  // VIDEO_TDR_TIMEOUT_DETECTED
  "The display driver did not respond in time (TDR timeout). It is often only logged with a dump, without a blue screen.": "ディスプレイドライバーが時間内に応答しませんでした(TDR タイムアウト)。ブルースクリーンにならず、イベントとダンプだけに残ることも多いです。",
  // VIDEO_SCHEDULER_INTERNAL_ERROR
  "The video scheduler detected a fatal violation.": "グラフィックスの処理順を決めるビデオスケジューラーが致命的な違反を検出しました。",
  "Graphics card hardware": "グラフィックスカードのハードウェア",
  // WHEA_UNCORRECTABLE_ERROR
  "An uncorrectable hardware error occurred (reported through WHEA). The WHEA-Logger events in Event Viewer tell which part (CPU cache, memory, PCIe bus) was involved.": "訂正できないハードウェアエラーが起きました(WHEA が報告)。イベント ビューアーの WHEA-Logger の記録が、どの部品(CPU キャッシュ・メモリ・PCIe バス)かを示します。",
  "Overclocking, undervolting, XMP/EXPO, voltage": "オーバークロック・低電圧化・XMP/EXPO、電圧",
  "Temperature or power supply": "温度・電源供給",
  "Faulty CPU, memory, motherboard or PCIe device": "CPU・メモリ・マザーボード・PCIe デバイスの不良",
  "An old BIOS": "古い BIOS",
  // DPC_WATCHDOG_VIOLATION
  "A single deferred procedure call (DPC) ran too long, or the system stayed at DISPATCH_LEVEL or above too long. Parameter 1 tells which.": "1 つの遅延プロシージャ呼び出し(DPC)の実行が長すぎたか、システムが DISPATCH_LEVEL 以上に長く留まりすぎました。パラメーター 1 がどちらかを示します。",
  "Storage drivers (SATA AHCI, NVMe) or SSD firmware": "ストレージのドライバー(SATA AHCI・NVMe)・SSD のファームウェア",
  "A device driver that holds the CPU too long (network, audio, USB)": "CPU を長く占有するデバイスドライバー(ネットワーク・オーディオ・USB)",
  // KERNEL_SECURITY_CHECK_FAILURE
  "The kernel detected corruption of a critical data structure (such as a list entry).": "カーネルが重要なデータ構造(リストのエントリなど)の破損を検出しました。",
  "A driver bug or incompatible driver": "ドライバーのバグ・互換性のないドライバー",
  "Recently added hardware": "最近追加したハードウェア",
  // KERNEL_MODE_HEAP_CORRUPTION
  "The kernel-mode heap manager detected heap corruption.": "カーネルモードのヒープマネージャーがヒープの破損を検出しました。",
  "A driver overwriting the heap (graphics, audio, security software)": "ヒープを上書きするドライバー(グラフィックス・オーディオ・セキュリティソフト)",
  // UNEXPECTED_STORE_EXCEPTION
  "The kernel memory store component (memory compression and paging) caught an unexpected exception.": "カーネルのメモリストア(メモリ圧縮・ページング)のコンポーネントが予期しない例外を捕まえました。",
  "Storage, SSD firmware or controller driver": "ストレージ・SSD のファームウェア・コントローラーのドライバー",
  "Antivirus or security software": "ウイルス対策・セキュリティソフト",
  // MANUALLY_INITIATED_POWER_BUTTON_HOLD
  "The power button was held on a PC set to capture a dump on a long press. It records a forced power-off of a hung system.": "長押しでダンプを残すよう設定された PC で、電源ボタンが長押しされました。止まった PC を強制的に切った記録です。",
  "Look separately at why the PC hung before the button was held": "ボタンを長押しする前に PC が止まった理由(フリーズ・画面が消えた)を別に見る必要があります",
  // WINLOGON_FATAL_ERROR
  "A core user-mode process such as Winlogon terminated unexpectedly.": "Winlogon のようなユーザーモードの中核プロセスが予期せず終了しました。",
  "Damaged system files or a failed update": "破損したシステムファイル・失敗した更新",
  "Incompatible system software": "互換性のないシステムソフト",
};
