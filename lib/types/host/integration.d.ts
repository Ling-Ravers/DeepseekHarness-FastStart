/**
 * Host Windows Explorer shell integration: HKCU context-menu (un)registration
 * and the generated PowerShell launcher that opens the folder as a DSH
 * workspace (deep-linking into an already-running instance, or starting a
 * fresh `dsh web` rooted at the folder when none is listening).
 *
 * Registry mechanics are kept behind small, pure builders so the Windows
 * surface can be unit-tested on any platform; the I/O half only runs on
 * win32. Everything is written under HKCU, so no elevation is required.
 */
/** Context-menu verb key (stable identity under HKCU\Software\Classes). */
export declare const SHELL_MENU_KEY = "DSHOpenInDSH";
/** Human-readable Explorer menu label. */
export declare const MENU_LABEL = "\u5728 DSH \u4E2D\u6253\u5F00";
/** Default web origin the plugin deep-links into / probes for liveness. */
export declare const DEFAULT_ORIGIN = "http://127.0.0.1:3080";
/** Options consumed by the menu (un)registration and launcher rendering. */
export interface ShellMenuOptions {
    /** URL prefix of the web app, e.g. http://127.0.0.1:3080. */
    origin: string;
    /** Absolute path to the dsh CLI entry (apps/cli/lib/bin.js); empty auto-detects. */
    dshCli?: string;
    /**
     * Absolute node executable that spawns the fresh instance. Defaults to the
     * host process's own runtime when it is a plain `node` binary, so the
     * launcher does not depend on the invoking user's PATH.
     */
    nodePath?: string;
    /** Register the menu on the folder (Directory) context menu. */
    folderMenu: boolean;
    /** Register the menu on the folder-background context menu. */
    backgroundMenu: boolean;
}
/** Absolute path of one Explorer menu verb key (without the command child). */
export declare function shellMenuKey(base: 'Directory' | 'Directory\\Background'): string;
/**
 * All verb keys a registration should own, in registration order.
 * @param options - which context surfaces the user enabled.
 * @returns absolute HKCU verb keys to write (and later delete).
 */
export declare function shellMenuRegistryKeys(options: Pick<ShellMenuOptions, 'folderMenu' | 'backgroundMenu'>): string[];
/**
 * The command value stored under `<verb>\command`: it invokes PowerShell to
 * run the launcher script with the clicked folder as `%V`.
 * @param launcherPath - absolute launcher .ps1 path.
 * @returns the full registry command line.
 */
export declare function buildShellCommandLine(launcherPath: string): string;
/**
 * Render the launcher script body. Detects an instance already listening at
 * {@link origin}; when reachable it opens the deep link (the running instance
 * then creates/enters the workspace). Otherwise it starts a fresh `dsh web`
 * whose process cwd is the clicked folder (session workspace root). The fresh
 * instance runs with a hidden console: its startup line embeds the web session
 * token, so stdout/stderr are redirected to log files under the launcher
 * directory instead of a visible window. dsh web serves nothing to a
 * cookie-less browser, so once the fresh instance prints its token URL the
 * launcher opens that URL with the deep-link query appended in ONE navigation:
 * the token exchange mints/refreshes the session cookie and its redirect
 * preserves the query, so the workspace confirm overlay appears in the same
 * tab.
 * @param options - resolved menu options.
 * @returns PowerShell script text (no BOM assumptions).
 */
export declare function renderLauncherScript(options: Pick<ShellMenuOptions, 'origin' | 'dshCli' | 'nodePath'>): string;
/**
 * Locate this package's root by walking up to the nearest package.json that
 * declares this package's name (robust across src/ and lib/ entry points).
 * @param from - start directory (defaults to this module's directory).
 * @returns the package root directory.
 */
export declare function findPackageRoot(from?: string): string;
/**
 * Resolve the enclosing repository root (the directory that owns apps/cli).
 * @param packageRoot - this package's root.
 * @returns the repo root, or undefined when not inside a checkout.
 */
export declare function resolveRepoRoot(packageRoot: string): string | undefined;
/**
 * Auto-detect the checkout's built dsh CLI when inside the repository.
 * @param packageRoot - this package's root.
 * @returns absolute cli entry path, or undefined.
 */
export declare function resolveDefaultDshCli(packageRoot: string): string | undefined;
/**
 * Fall back to the CLI entry this process itself was launched from. A plugin
 * installed outside a checkout has no repo root to auto-detect, but it runs
 * inside a `dsh` process whose entry script is `process.argv[1]`; launching a
 * fresh instance from that same CLI keeps the fork consistent with the install.
 * Only compiled `.js` entries are accepted — source runs (e.g. `pnpm dsh`,
 * argv `…/src/bin.ts`) cannot be re-spawned without their tsx loader.
 * @returns the running CLI's entry path, or undefined when unusable.
 */
export declare function runningCliEntryPath(): string | undefined;
/** The writable launcher location under the user's dsh home. */
export declare function launcherDirectory(): string;
/** Absolute launcher script path. */
export declare function launcherPath(): string;
/** Run one `reg.exe` command with an argv array (no shell). */
export declare function runReg(args: string[]): Promise<void>;
/**
 * Write the launcher script (idempotent content write).
 * @param options - resolved menu options.
 */
export declare function writeLauncher(options: Pick<ShellMenuOptions, 'origin' | 'dshCli'>): Promise<string>;
/**
 * Register all enabled Explorer menus.
 * @param options - resolved menu options.
 * @param iconPath - absolute .ico path.
 * @param launcher - absolute generated `dsh-open.ps1` path.
 */
export declare function ensureMenuRegistered(options: ShellMenuOptions, iconPath: string, launcher: string): Promise<void>;
/** Unregister all menus owned by this plugin (idempotent). */
export declare function ensureMenuUnregistered(options: Pick<ShellMenuOptions, 'folderMenu' | 'backgroundMenu'>): Promise<void>;
/** Whether this process can touch the Windows registry. */
export declare function isWindows(): boolean;
/**
 * Fully resolve a ShellMenuOptions against runtime facts.
 * @param options - plugin config values.
 * @returns resolved options (auto-detected cli applied when not configured).
 */
export declare function resolveShellOptions(options: ShellMenuOptions): ShellMenuOptions;
/** Absolute icon path shipped in this package's assets directory. */
export declare function resolveIconPath(): string;
/** Tray script filename under the launcher directory. */
export declare const TRAY_FILE_NAME = "dsh-tray.ps1";
/** Tooltip/title shown next to the tray icon. */
export declare const TRAY_TITLE = "DeepSeek-Harness";
/** Named mutex used for single-instance protection of the tray process. */
export declare const TRAY_MUTEX = "DeepSeek-Harness.ShellTray";
/** How many 5s misses of the origin port before the tray auto-exits. */
export declare const TRAY_AUTO_EXIT_MISSES = 6;
/**
 * Render the tray host script (Windows Forms NotifyIcon). The tray is the
 * user's master switch for DSH itself: it always runs while the plugin is
 * loaded on Windows (independent of the context-menu settings), reuses the
 * whale icon, and offers "唤起 web 端" (reopen the web UI after the page was
 * closed; when the running instance's printed token URL is recoverable from
 * the out log it is opened instead, so the browser session cookie is minted
 * or refreshed) and "退出" (stop the DSH process owning the origin port, then
 * exit the tray). It auto-exits when the origin stops being served.
 * @param iconPath - absolute .ico path (the black whale).
 * @param origin - web origin bound to the tray actions.
 * @returns PowerShell script text (UTF-8; callers should write a BOM so
 * Windows PowerShell 5.1 decodes the CJK labels correctly).
 */
export declare function renderTrayScript(iconPath: string, origin: string): string;
/** Absolute tray script path under the launcher directory. */
export declare function trayScriptPath(): string;
/**
 * Write the tray script (UTF-8 with BOM for Windows PowerShell 5.1 CJK).
 * @param iconPath - absolute .ico path.
 * @param origin - web origin bound to the tray actions.
 * @returns the absolute tray script path.
 */
export declare function writeTrayScript(iconPath: string, origin: string): Promise<string>;
/**
 * Whether a tray started by this plugin instance is still running. A tray
 * spawned by an earlier DSH run holds the single-instance mutex, so a fresh
 * launch attempt exits at once; callers use this to skip duplicate spawns.
 */
export declare function isTrayActive(): boolean;
/**
 * Stop every tray this plugin owns: pids spawned by this instance are
 * terminated directly, and any tray left over from an earlier DSH run is
 * swept by command line. The sweep runs through `-EncodedCommand` so its own
 * command line never contains the `dsh-tray.ps1` pattern it matches against.
 */
export declare function stopTrayProcesses(): Promise<void>;
/**
 * Delete every generated artifact of the integration (launcher, tray script,
 * logs, and the launcher directory). Best-effort: Windows refuses to remove a
 * directory whose `dsh-web.out.log` is still held open by the running web
 * instance, so individual well-known names are retried and remaining errors
 * are ignored — a later launch clears the logs itself.
 */
export declare function removeLauncherArtifacts(): Promise<void>;
/**
 * Start the tray process fully hidden (no console window, no taskbar entry).
 *
 * Deliberately NOT detached: a `detached` console child proved unstable under
 * this harness's process tree (it exited code 0 right after launch, while a
 * non-detached child stayed alive). The tray is tied to the DSH process that
 * spawned it and, independently, auto-exits ~30s after the origin port stops
 * being served, so no detached lifetime is needed. The spawned pid is
 * registered so {@link stopTrayProcesses} can end the tray on uninstall.
 * @param trayPath - absolute tray script path.
 */
export declare function launchTray(trayPath: string): Promise<void>;
//# sourceMappingURL=integration.d.ts.map