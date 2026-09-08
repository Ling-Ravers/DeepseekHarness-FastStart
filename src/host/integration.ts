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

import { execFile, spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEEP_LINK_QUERY } from '../shared/settings.ts'

/** This package's registry name (used by {@link findPackageRoot}). */
export const PACKAGE_NAME = 'dsh-open-in-dsh'

/** Context-menu verb key (stable identity under HKCU\Software\Classes). */
export const SHELL_MENU_KEY = 'DSHOpenInDSH'

/** Human-readable Explorer menu label. */
export const MENU_LABEL = '在 DSH 中打开'

/** Default web origin the plugin deep-links into / probes for liveness. */
export const DEFAULT_ORIGIN = 'http://127.0.0.1:3080'

/** Absolute Windows PowerShell 5.1 executable (system location, not PATH). */
function windowsPowerShellExe(): string {
  const systemRoot = process.env.SystemRoot ?? 'C:\\Windows'
  return join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
}

/** Options consumed by the menu (un)registration and launcher rendering. */
export interface ShellMenuOptions {
  /** URL prefix of the web app, e.g. http://127.0.0.1:3080. */
  origin: string
  /** Absolute path to the dsh CLI entry (apps/cli/lib/bin.js); empty auto-detects. */
  dshCli?: string
  /**
   * Absolute node executable that spawns the fresh instance. Defaults to the
   * host process's own runtime when it is a plain `node` binary, so the
   * launcher does not depend on the invoking user's PATH.
   */
  nodePath?: string
  /** Register the menu on the folder (Directory) context menu. */
  folderMenu: boolean
  /** Register the menu on the folder-background context menu. */
  backgroundMenu: boolean
}

/** Whether an executable path is a plain node binary (not a packaged CLI). */
function isNodeBinary(path: string): boolean {
  return /^node(\.exe)?$/iu.test(basename(path))
}

/** Absolute path of one Explorer menu verb key (without the command child). */
export function shellMenuKey(base: 'Directory' | 'Directory\\Background'): string {
  return `HKCU\\Software\\Classes\\${base}\\shell\\${SHELL_MENU_KEY}`
}

/**
 * All verb keys a registration should own, in registration order.
 * @param options - which context surfaces the user enabled.
 * @returns absolute HKCU verb keys to write (and later delete).
 */
export function shellMenuRegistryKeys(options: Pick<ShellMenuOptions, 'folderMenu' | 'backgroundMenu'>): string[] {
  const keys: string[] = []
  if (options.folderMenu) keys.push(shellMenuKey('Directory'))
  if (options.backgroundMenu) keys.push(shellMenuKey('Directory\\Background'))
  return keys
}

/**
 * The command value stored under `<verb>\command`: it invokes PowerShell to
 * run the launcher script with the clicked folder as `%V`.
 * @param launcherPath - absolute launcher .ps1 path.
 * @returns the full registry command line.
 */
export function buildShellCommandLine(launcherPath: string): string {
  return `"${windowsPowerShellExe()}" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${launcherPath}" -Folder "%V"`
}

/**
 * PowerShell source of a shared helper that recovers the printed token URL of
 * the instance this launcher started: dsh web prints `dsh web: <url>?token=…`
 * only after its Loader tree settles, and a browser without the signed session
 * cookie is refused with a 401 for every page. The first visit to that URL is
 * the one way to mint or refresh the cookie, so both the launcher and the tray
 * read it back from the redirected out log. Only a URL whose authority matches
 * the configured origin is accepted, so a stale line from another run/port is
 * never opened.
 */
const TOKEN_URL_LOOKUP_LINES: string[] = [
  'function Get-DshTokenUrl {',
  '  param([string]$LogPath, [string]$Origin)',
  '  if (-not (Test-Path -LiteralPath $LogPath)) { return $null }',
  '  $lines = @(Get-Content -LiteralPath $LogPath -Tail 100 -ErrorAction SilentlyContinue |',
  `    Where-Object { $_ -match 'dsh web:\\s*https?://\\S+' })`,
  '  if ($lines.Count -eq 0) { return $null }',
  '  $text = $lines[$lines.Count - 1]',
  '  try {',
  `    $value = [regex]::Match($text, 'dsh web:\\s*(\\S+)').Groups[1].Value`,
  '    if ([string]::IsNullOrEmpty($value)) { return $null }',
  '    $candidate = New-Object -TypeName System.Uri -ArgumentList $value',
  '    $expected = New-Object -TypeName System.Uri -ArgumentList $Origin',
  '    if ($candidate.Scheme -ne $expected.Scheme) { return $null }',
  '    if ($candidate.Host -ne $expected.Host) { return $null }',
  '    if ($candidate.Port -ne $expected.Port) { return $null }',
  `    if ($candidate.Query -notmatch 'token=') { return $null }`,
  '    return $value',
  '  } catch {',
  '    return $null',
  '  }',
  '}',
]

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
export function renderLauncherScript(options: Pick<ShellMenuOptions, 'origin' | 'dshCli' | 'nodePath'>): string {
  const rawOrigin = options.origin.replace(/\/+$/, '')
  // PowerShell single-quote embedding; the quote is invalid in a URL anyway.
  const origin = rawOrigin.replace(/'/g, "''")
  const cli = options.dshCli ?? ''
  const node = (options.nodePath ?? 'node').replace(/'/g, "''")
  return [
    'param([Parameter(Mandatory = $true)][string]$Folder)',
    "$ErrorActionPreference = 'Stop'",
    `$origin = '${origin}'`,
    '$resolved = (Resolve-Path -LiteralPath $Folder -ErrorAction Stop).Path',
    '$encoded = [uri]::EscapeDataString($resolved)',
    `$deepLink = $origin + '/?${DEEP_LINK_QUERY}=' + $encoded`,
    // The out log doubles as the recovery point for the printed token URL, so
    // the log paths are resolved before the probe below can consult them.
    "$logDir = Join-Path (Join-Path $HOME '.dsh') 'dsh-shell-integration'",
    'New-Item -ItemType Directory -Force -Path $logDir | Out-Null',
    "$outLog = Join-Path $logDir 'dsh-web.out.log'",
    "$errLog = Join-Path $logDir 'dsh-web.err.log'",
    ...TOKEN_URL_LOOKUP_LINES,
    '# 1) A DSH instance is already listening -> deep-link into it.',
    '$probe = New-Object System.Net.Sockets.TcpClient',
    'try {',
    '  $parsed = [uri]$origin',
    '  $pending = $probe.BeginConnect($parsed.Host, $parsed.Port, $null, $null)',
    '  $connected = $pending.AsyncWaitHandle.WaitOne(1500)',
    '  if ($connected -and $probe.Connected) {',
    '    # Single tab: when the running instance is one this launcher started, its',
    '    # printed token URL is in the out log. The token exchange redirect keeps',
    '    # the deep-link query, so one navigation logs in AND opens the workspace.',
    '    $tokenUrl = Get-DshTokenUrl -LogPath $outLog -Origin $origin',
    '    if ($null -ne $tokenUrl) {',
    `      Start-Process ($tokenUrl + "&${DEEP_LINK_QUERY}=" + $encoded)`,
    '    } else {',
    '      # A manually started instance has no recoverable token: plain deep link.',
    '      Start-Process $deepLink',
    '    }',
    '    exit 0',
    '  }',
    '} catch {',
    '  # unreachable or malformed origin: fall through to launching a new instance',
    '} finally {',
    '  $probe.Dispose()',
    '}',
    '# 2) No instance is listening -> start a fresh one rooted at the folder,',
    '#    suppressed from auto-opening a browser (--no-open); the deep link is',
    '#    opened only after the fresh instance prints its token URL (step 4).',
    '#    The child console is hidden and its output goes to the log files,',
    '#    because the startup line embeds the web session token and must never',
    '#    surface in a visible window.',
    `$node = '${node}'`,
    `$cli = '${cli.replace(/'/g, "''")}'`,
    'Remove-Item -LiteralPath $outLog, $errLog -Force -ErrorAction SilentlyContinue',
    'if ($cli -ne \'\' -and (Test-Path -LiteralPath $cli)) {',
    '  $spawn = @($cli, \'web\', \'--no-open\')',
    '  try {',
    '    Start-Process -FilePath $node -ArgumentList $spawn -WorkingDirectory $resolved -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog',
    '  } catch {',
    '    # A stale server can still hold the log files open: retry without them',
    '    # (the console stays hidden either way, so nothing is displayed).',
    '    Start-Process -FilePath $node -ArgumentList $spawn -WorkingDirectory $resolved -WindowStyle Hidden',
    '  }',
    '} else {',
    '  # No usable CLI: only the deep link remains (a listening instance handles it).',
    '  Start-Process $deepLink',
    '  exit 0',
    '}',
    '# 3) Wait for the fresh instance to serve the origin (<= 30s).',
    '$ready = $false',
    'for ($i = 0; $i -lt 60; $i++) {',
    '  $poll = New-Object System.Net.Sockets.TcpClient',
    '  try {',
    '    $parsed = [uri]$origin',
    '    $pending = $poll.BeginConnect($parsed.Host, $parsed.Port, $null, $null)',
    '    if ($pending.AsyncWaitHandle.WaitOne(500) -and $poll.Connected) { $ready = $true }',
    '  } catch {',
    '    # still starting',
    '  } finally {',
    '    $poll.Dispose()',
    '  }',
    '  if ($ready) { break }',
    '  Start-Sleep -Milliseconds 500',
    '}',
    // The token URL line prints only after the Loader tree settles, a moment
    // after the port binds; poll the out log for this instance's own line.
    '# 4) One tab: open the printed token URL with the deep-link query appended.',
    '#    The token exchange mints/refreshes the session cookie and its redirect',
    '#    preserves the query, so the workspace confirm overlay appears here.',
    '$tokenUrl = $null',
    'for ($i = 0; $i -lt 20 -and $null -eq $tokenUrl; $i++) {',
    '  $tokenUrl = Get-DshTokenUrl -LogPath $outLog -Origin $origin',
    '  if ($null -eq $tokenUrl) { Start-Sleep -Milliseconds 250 }',
    '}',
    'if ($null -ne $tokenUrl) {',
    `  Start-Process ($tokenUrl + "&${DEEP_LINK_QUERY}=" + $encoded)`,
    '} else {',
    '  # No recoverable token URL (e.g. instance started by hand): open the deep link alone.',
    '  Start-Process $deepLink',
    '}',
    'exit 0',
  ].join('\r\n')
}

/**
 * Locate this package's root by walking up to the nearest package.json that
 * declares this package's name (robust across src/ and lib/ entry points).
 * @param from - start directory (defaults to this module's directory).
 * @returns the package root directory.
 */
export function findPackageRoot(from: string = dirname(fileURLToPath(import.meta.url))): string {
  let cursor = resolve(from)
  for (;;) {
    const manifest = join(cursor, 'package.json')
    if (existsSync(manifest)) {
      try {
        const name: unknown = JSON.parse(readFileSync(manifest, 'utf8')).name
        if (name === PACKAGE_NAME) return cursor
      } catch {
        // Malformed ancestor manifest: keep walking.
      }
    }
    const parent = dirname(cursor)
    if (parent === cursor) throw new Error('dsh-shell-integration: package root not found')
    cursor = parent
  }
}

/**
 * Resolve the enclosing repository root (the directory that owns apps/cli).
 * @param packageRoot - this package's root.
 * @returns the repo root, or undefined when not inside a checkout.
 */
export function resolveRepoRoot(packageRoot: string): string | undefined {
  let cursor = resolve(packageRoot)
  for (;;) {
    if (existsSync(join(cursor, 'apps', 'cli', 'package.json'))) return cursor
    const parent = dirname(cursor)
    if (parent === cursor) return undefined
    cursor = parent
  }
}

/**
 * Auto-detect the checkout's built dsh CLI when inside the repository.
 * @param packageRoot - this package's root.
 * @returns absolute cli entry path, or undefined.
 */
export function resolveDefaultDshCli(packageRoot: string): string | undefined {
  const repoRoot = resolveRepoRoot(packageRoot)
  if (repoRoot === undefined) return undefined
  const cli = join(repoRoot, 'apps', 'cli', 'lib', 'bin.js')
  return existsSync(cli) ? cli : undefined
}

/**
 * Fall back to the CLI entry this process itself was launched from. A plugin
 * installed outside a checkout has no repo root to auto-detect, but it runs
 * inside a `dsh` process whose entry script is `process.argv[1]`; launching a
 * fresh instance from that same CLI keeps the fork consistent with the install.
 * Only compiled `.js` entries are accepted — source runs (e.g. `pnpm dsh`,
 * argv `…/src/bin.ts`) cannot be re-spawned without their tsx loader.
 * @returns the running CLI's entry path, or undefined when unusable.
 */
export function runningCliEntryPath(): string | undefined {
  const entry = process.argv[1]
  if (entry === undefined || entry === '') return undefined
  if (!entry.toLowerCase().endsWith('.js')) return undefined
  const resolved = resolve(entry)
  return existsSync(resolved) ? resolved : undefined
}

/**
 * Map a `…/src/bin.ts`-style dev CLI entry to its compiled `lib/bin.js`
 * sibling. A plugin installed outside a checkout cannot repo-detect the CLI,
 * and a `tsx` source run cannot be re-spawned without its loader — but when
 * the checkout has built `lib/`, the compiled entry is the exact production
 * CLI to cold-start with. Pure path mapping; callers verify existence.
 * @param entry - a CLI entry script path (e.g. `process.argv[1]`).
 * @returns the compiled sibling path, or undefined when the shape does not fit.
 */
export function compiledCliPathForSource(entry: string): string | undefined {
  if (entry.length === 0) return undefined
  const script = resolve(entry)
  if (!/^bin\.[cm]?ts$/iu.test(basename(script))) return undefined
  const src = dirname(script)
  if (basename(src) !== 'src') return undefined
  return join(dirname(src), 'lib', 'bin.js')
}

/**
 * The running instance's CLI when it is a dev source run with a compiled
 * sibling (`…/apps/cli/src/bin.ts` → `…/apps/cli/lib/bin.js`), mirroring
 * {@link runningCliEntryPath}'s install-consistency rationale.
 * @returns the compiled sibling entry, or undefined when unavailable.
 */
function compiledSiblingCliEntry(): string | undefined {
  const entry = process.argv[1]
  if (entry === undefined || entry === '') return undefined
  const candidate = compiledCliPathForSource(entry)
  return candidate !== undefined && existsSync(candidate) ? candidate : undefined
}

/** The writable launcher location under the user's dsh home. */
export function launcherDirectory(): string {
  return join(homedir(), '.dsh', 'dsh-shell-integration')
}

/** Absolute launcher script path. */
export function launcherPath(): string {
  return join(launcherDirectory(), 'dsh-open.ps1')
}

/** Run one `reg.exe` command with an argv array (no shell). */
export function runReg(args: string[]): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    execFile('reg.exe', args, { windowsHide: true }, (error, _stdout, stderr) => {
      if (error === null) {
        resolvePromise()
        return
      }
      const detail = stderr.length > 0 ? stderr.trim() : error.message
      reject(new Error(`reg ${args[0] ?? ''} failed: ${detail}`))
    })
  })
}

/** Register one verb key (label, icon, and command child). */
async function addVerbKey(key: string, label: string, iconPath: string, commandLine: string): Promise<void> {
  await runReg(['add', key, '/ve', '/t', 'REG_SZ', '/d', label, '/f'])
  await runReg(['add', key, '/v', 'Icon', '/t', 'REG_SZ', '/d', iconPath, '/f'])
  await runReg(['add', `${key}\\command`, '/ve', '/t', 'REG_SZ', '/d', commandLine, '/f'])
}

/** Remove one verb key and everything below it. */
async function removeVerbKey(key: string): Promise<void> {
  await runReg(['delete', key, '/f'])
}

/**
 * Write the launcher script (idempotent content write).
 * @param options - resolved menu options.
 */
export async function writeLauncher(options: Pick<ShellMenuOptions, 'origin' | 'dshCli'>): Promise<string> {
  const target = launcherPath()
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, renderLauncherScript(options), 'utf8')
  return target
}

/**
 * Register all enabled Explorer menus.
 * @param options - resolved menu options.
 * @param iconPath - absolute .ico path.
 * @param launcher - absolute generated `dsh-open.ps1` path.
 */
export async function ensureMenuRegistered(options: ShellMenuOptions, iconPath: string, launcher: string): Promise<void> {
  const commandLine = buildShellCommandLine(launcher)
  for (const key of shellMenuRegistryKeys(options)) {
    await addVerbKey(key, MENU_LABEL, iconPath, commandLine)
  }
}

/** Unregister all menus owned by this plugin (idempotent). */
export async function ensureMenuUnregistered(options: Pick<ShellMenuOptions, 'folderMenu' | 'backgroundMenu'>): Promise<void> {
  for (const key of shellMenuRegistryKeys(options)) {
    // Deleting an absent key is a normal, ignorable outcome.
    try {
      await removeVerbKey(key)
    } catch {
      // continue
    }
  }
}

/** Whether this process can touch the Windows registry. */
export function isWindows(): boolean {
  return process.platform === 'win32'
}

/**
 * Fully resolve a ShellMenuOptions against runtime facts.
 * @param options - plugin config values.
 * @returns resolved options (auto-detected cli applied when not configured).
 */
export function resolveShellOptions(options: ShellMenuOptions): ShellMenuOptions {
  const packageRoot = findPackageRoot()
  const resolved: ShellMenuOptions = {
    origin: options.origin.length > 0 ? options.origin : DEFAULT_ORIGIN,
    folderMenu: options.folderMenu,
    backgroundMenu: options.backgroundMenu,
  }
  const dshCli = options.dshCli
    ?? resolveDefaultDshCli(packageRoot)
    ?? runningCliEntryPath()
    ?? compiledSiblingCliEntry()
  if (dshCli !== undefined && dshCli.length > 0) resolved.dshCli = dshCli
  // Pin the host's own node runtime; fall back to PATH resolution when the
  // host process is not a plain node binary (e.g. a packaged executable).
  const nodePath = options.nodePath ?? (isNodeBinary(process.execPath) ? process.execPath : 'node')
  if (nodePath.length > 0) resolved.nodePath = nodePath
  return resolved
}

/** Absolute icon path shipped in this package's assets directory. */
export function resolveIconPath(): string {
  return join(findPackageRoot(), 'assets', 'dsh-black.ico')
}

/* ------------------------------------------------------------------ *
 * System tray
 * ------------------------------------------------------------------ */

/** Tray script filename under the launcher directory. */
export const TRAY_FILE_NAME = 'dsh-tray.ps1'

/** Tooltip/title shown next to the tray icon. */
export const TRAY_TITLE = 'DeepSeek-Harness'

/** Named mutex used for single-instance protection of the tray process. */
export const TRAY_MUTEX = 'DeepSeek-Harness.ShellTray'

/** How many 5s misses of the origin port before the tray auto-exits. */
export const TRAY_AUTO_EXIT_MISSES = 6

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
export function renderTrayScript(iconPath: string, origin: string): string {
  const safeOrigin = origin.replace(/'/g, "''")
  const safeIcon = iconPath.replace(/'/g, "''")
  return [
    'param()',
    "$ErrorActionPreference = 'SilentlyContinue'",
    'Add-Type -AssemblyName System.Windows.Forms',
    'Add-Type -AssemblyName System.Drawing',
    `$script:origin = '${safeOrigin}'`,
    `$script:iconPath = '${safeIcon}'`,
    '$script:port = ([uri]$script:origin).Port',
    'if ($script:port -le 0) { $script:port = 3080 }',
    `$script:mutexName = '${TRAY_MUTEX}'`,
    '$script:mutex = New-Object System.Threading.Mutex($false, $script:mutexName)',
    'if (-not $script:mutex.WaitOne(0)) { exit 0 }',
    "$script:logDir = Join-Path (Join-Path $HOME '.dsh') 'dsh-shell-integration'",
    "$script:outLog = Join-Path $script:logDir 'dsh-web.out.log'",
    ...TOKEN_URL_LOOKUP_LINES,
    'function Test-DshPort {',
    '  $c = New-Object System.Net.Sockets.TcpClient',
    '  $a = $c.BeginConnect(([uri]$script:origin).Host, $script:port, $null, $null)',
    '  $ok = $a.AsyncWaitHandle.WaitOne(800) -and $c.Connected',
    '  $c.Close()',
    '  return $ok',
    '}',
    'function Stop-Dsh {',
    '  Get-NetTCPConnection -LocalPort $script:port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {',
    '    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue',
    '  }',
    '}',
    'function Teardown {',
    '  try { $script:tray.Visible = $false } catch {}',
    '  try { $script:tray.Dispose() } catch {}',
    '  try { $script:timer.Stop() } catch {}',
    '  try { $script:mutex.ReleaseMutex() } catch {}',
    '  try { $script:form.Close() } catch {}',
    '  [System.Windows.Forms.Application]::Exit()',
    '}',
    // A message pump needs a window: a never-visible hidden form.
    '$script:form = New-Object System.Windows.Forms.Form',
    '$script:form.ShowInTaskbar = $false',
    "$script:form.WindowState = 'Minimized'",
    '$script:form.Opacity = 0',
    '$script:form.Show()',
    '$script:menu = New-Object System.Windows.Forms.ContextMenuStrip',
    "$script:tray = New-Object System.Windows.Forms.NotifyIcon",
    `$script:tray.Text = '${TRAY_TITLE}'`,
    'try { $script:tray.Icon = [System.Drawing.Icon]::new($script:iconPath) } catch { $script:tray.Icon = [System.Drawing.SystemIcons]::Application }',
    '$script:openItem = New-Object System.Windows.Forms.ToolStripMenuItem("唤起 web 端")',
    '$script:exitItem = New-Object System.Windows.Forms.ToolStripMenuItem("退出")',
    '$script:openItem.add_Click({',
    '  # Prefer the printed token URL of the running instance when this launcher',
    '  # wrote it: the first visit mints or refreshes the browser session cookie',
    '  # (dsh web refuses cookie-less browsers), and the 303 redirect lands on',
    '  # the GUI anyway.',
    '  $tokenUrl = Get-DshTokenUrl -LogPath $script:outLog -Origin $script:origin',
    '  if ($null -ne $tokenUrl) { Start-Process $tokenUrl } else { Start-Process $script:origin }',
    '})',
    '$script:exitItem.add_Click({ Stop-Dsh; Teardown })',
    '$script:menu.Items.Add($script:openItem) | Out-Null',
    '$script:menu.Items.Add($script:exitItem) | Out-Null',
    '$script:tray.ContextMenuStrip = $script:menu',
    // Left or right click both reveal the menu.
    '$script:tray.add_MouseClick({ param($sender, $e) if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) { $m = [System.Windows.Forms.NotifyIcon].GetMethod("ShowContextMenu", [System.Reflection.BindingFlags]"Instance,NonPublic"); if ($null -ne $m) { $m.Invoke($script:tray, $null) } } })',
    '$script:fails = 0',
    '$script:timer = New-Object System.Windows.Forms.Timer',
    '$script:timer.Interval = 5000',
    '$script:timer.add_Tick({',
    '  if (Test-DshPort) { $script:fails = 0; return }',
    '  $script:fails += 1',
    `  if ($script:fails -ge ${TRAY_AUTO_EXIT_MISSES}) { Teardown }`,
    '})',
    '$script:timer.Start()',
    '$script:tray.Visible = $true',
    '[System.Windows.Forms.Application]::Run($script:form)',
  ].join('\r\n')
}

/** Absolute tray script path under the launcher directory. */
export function trayScriptPath(): string {
  return join(launcherDirectory(), TRAY_FILE_NAME)
}

/**
 * Write the tray script (UTF-8 with BOM for Windows PowerShell 5.1 CJK).
 * @param iconPath - absolute .ico path.
 * @param origin - web origin bound to the tray actions.
 * @returns the absolute tray script path.
 */
export async function writeTrayScript(iconPath: string, origin: string): Promise<string> {
  const target = trayScriptPath()
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, `\uFEFF${renderTrayScript(iconPath, origin)}`, 'utf8')
  return target
}

/** Tray process pids spawned by this plugin instance (pruned on process exit). */
const ACTIVE_TRAY_PIDS = new Set<number>()

/** Whether a pid still names a running process (probe without signalling). */
function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/**
 * Whether a tray started by this plugin instance is still running. A tray
 * spawned by an earlier DSH run holds the single-instance mutex, so a fresh
 * launch attempt exits at once; callers use this to skip duplicate spawns.
 */
export function isTrayActive(): boolean {
  for (const pid of ACTIVE_TRAY_PIDS) {
    if (pidAlive(pid)) return true
  }
  return false
}

/**
 * Run one short hidden PowerShell command and wait for it to settle.
 * Failures resolve quietly: every cleanup path is best-effort.
 * @param code - PowerShell statements to execute.
 */
function runHiddenPowerShellCommand(code: string): Promise<void> {
  const encoded = Buffer.from(code, 'utf16le').toString('base64')
  return new Promise((resolvePromise) => {
    let settled = false
    const finish = (): void => {
      if (!settled) {
        settled = true
        resolvePromise()
      }
    }
    let child: ReturnType<typeof spawn>
    try {
      child = spawn(windowsPowerShellExe(), [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-WindowStyle', 'Hidden',
        '-EncodedCommand', encoded,
      ], {
        windowsHide: true,
        stdio: 'ignore',
      })
    } catch {
      finish()
      return
    }
    child.on('error', finish)
    child.on('exit', finish)
  })
}

/**
 * Stop every tray this plugin owns: pids spawned by this instance are
 * terminated directly, and any tray left over from an earlier DSH run is
 * swept by command line. The sweep runs through `-EncodedCommand` so its own
 * command line never contains the `dsh-tray.ps1` pattern it matches against.
 */
export async function stopTrayProcesses(): Promise<void> {
  for (const pid of [...ACTIVE_TRAY_PIDS]) {
    try {
      process.kill(pid)
    } catch {
      // Already gone; the exit handler prunes the set.
    }
  }
  await runHiddenPowerShellCommand(
    `Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" | Where-Object { $_.CommandLine -like '*dsh-tray.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
  )
}

/**
 * Delete every generated artifact of the integration (launcher, tray script,
 * logs, and the launcher directory). Best-effort: Windows refuses to remove a
 * directory whose `dsh-web.out.log` is still held open by the running web
 * instance, so individual well-known names are retried and remaining errors
 * are ignored — a later launch clears the logs itself.
 */
export async function removeLauncherArtifacts(): Promise<void> {
  const dir = launcherDirectory()
  const attempts = [
    () => rm(dir, { recursive: true, force: true }),
    () => rm(join(dir, TRAY_FILE_NAME), { force: true }),
    () => rm(join(dir, 'dsh-open.ps1'), { force: true }),
    () => rm(join(dir, 'dsh-web.out.log'), { force: true }),
    () => rm(join(dir, 'dsh-web.err.log'), { force: true }),
    () => rm(dir, { recursive: true, force: true }),
  ]
  for (const attempt of attempts) {
    try {
      await attempt()
    } catch {
      // Best effort: a still-locked log gets a detached retry below.
    }
  }
  if (existsSync(dir)) scheduleArtifactCleanup(dir)
}

/**
 * When the running DSH instance itself owns the out log, Windows refuses to
 * delete the file (and thus the directory) until that process exits. Launch a
 * detached hidden PowerShell that retries the removal for a while after this
 * process is gone, so no artifact survives a permanent uninstall.
 * @param dir - the launcher directory that must disappear.
 */
function scheduleArtifactCleanup(dir: string): void {
  const safeDir = dir.replace(/'/g, "''")
  const code = [
    'Start-Sleep -Seconds 2',
    `$dir = '${safeDir}'`,
    'for ($i = 0; $i -lt 8; $i++) {',
    '  Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue',
    '  if (-not (Test-Path -LiteralPath $dir)) { break }',
    '  Start-Sleep -Seconds 2',
    '}',
  ].join('\r\n')
  try {
    const encoded = Buffer.from(code, 'utf16le').toString('base64')
    const child = spawn(windowsPowerShellExe(), [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-WindowStyle', 'Hidden',
      '-EncodedCommand', encoded,
    ], {
      detached: true,
      windowsHide: true,
      stdio: 'ignore',
    })
    child.unref()
  } catch {
    // Best effort: the directory is left for the user to remove.
  }
}

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
export function launchTray(trayPath: string): Promise<void> {
  return new Promise((resolvePromise) => {
    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-WindowStyle', 'Hidden',
      '-File', trayPath,
    ], {
      windowsHide: true,
      stdio: 'ignore',
    })
    child.on('error', () => { resolvePromise() })
    if (child.pid !== undefined) {
      const pid = child.pid
      ACTIVE_TRAY_PIDS.add(pid)
      child.on('exit', () => { ACTIVE_TRAY_PIDS.delete(pid) })
    }
    child.unref()
    resolvePromise()
  })
}

/* ------------------------------------------------------------------ *
 * Permanent uninstall (self-removal)
 *
 * Deleting the plugin is a real uninstall, not a disable: besides the OS
 * surfaces above, the plugin removes its own mount rows from every
 * user-writable overlay patch (so a restart no longer loads it) and deletes
 * its installed files when they live inside the DSH home. Source checkouts
 * (dev) are deliberately kept — only their mount rows are removed.
 * ------------------------------------------------------------------ */

/** DSH home directory (the folder that owns `cordis.patch.yml` etc.). */
export function dshHomeDirectory(): string {
  return join(homedir(), '.dsh')
}

/** Whether a path lives inside the DSH home — an installed copy, not a source checkout. */
export function isUnderDshHome(path: string): boolean {
  const home = resolve(dshHomeDirectory())
  const target = resolve(path)
  const rel = relative(home, target)
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

/**
 * Every user-writable patch file that could mount this plugin: the home-level
 * patch, each profile's patch, and any `--patch` overlay named on the dsh
 * command line (values may be comma-separated). Only existing files return.
 */
export function patchFileCandidates(): string[] {
  const candidates: string[] = [join(dshHomeDirectory(), 'cordis.patch.yml')]
  const profiles = join(dshHomeDirectory(), 'profiles')
  try {
    for (const dirent of readdirSync(profiles, { withFileTypes: true })) {
      if (!dirent.isDirectory()) continue
      candidates.push(join(profiles, dirent.name, 'cordis.patch.yml'))
    }
  } catch {
    // No profiles directory yet — nothing to scan.
  }
  const argv = process.argv
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--patch') {
      const next = argv[index + 1]
      if (next !== undefined && !next.startsWith('-')) candidates.push(next)
    } else if (token.startsWith('--patch=')) {
      candidates.push(token.slice('--patch='.length))
    }
  }
  return [...new Set(candidates.flatMap(value => value.split(',')))]
    .filter(path => path.length > 0 && existsSync(path))
}

/** What identifies one composition mount row as belonging to this plugin. */
export interface MountMatcher {
  /** Cordis entry id this plugin mounts under (its settings namespace). */
  namespace: string
  /** Package names this plugin resolves by; scoped and bare forms are accepted. */
  packageNames: readonly string[]
  /** Package root, used to recognize `file://` dev mounts into a source tree. */
  packageRoot?: string
}

/** One parsed mount row (`id` / `name`) of a top-level `- insert:` block. */
export interface MountRow {
  id?: string
  name?: string
}

/** Whether one mount row names this plugin (by id, package name, or dev file URL). */
export function mountRowMatches(row: MountRow, matcher: MountMatcher): boolean {
  if (row.id !== undefined && row.id === matcher.namespace) return true
  if (row.name === undefined) return false
  const name = unquote(row.name)
  for (const candidate of matcher.packageNames) {
    if (name === candidate) return true
    // A scoped entry may be written bare (`@scope/pkg` vs `pkg`).
    const bare = name.split('/').pop()
    if (bare !== undefined && bare === candidate) return true
  }
  if (matcher.packageRoot !== undefined && /^file:/iu.test(name)) {
    let filePath: string
    try {
      filePath = fileURLToPath(name)
    } catch {
      return false
    }
    if (isPathInside(matcher.packageRoot, filePath)) return true
  }
  return false
}

/**
 * Remove every top-level `- insert:` block whose parsed row belongs to this
 * plugin. Pure line rewrite: comments and unrelated entries survive; the
 * result collapses any blank-line gaps and always ends with one newline.
 * @returns the edited document and whether anything was removed.
 */
export function removeMountRowsFromPatch(text: string, matcher: MountMatcher): { text: string; removed: boolean } {
  const lines = text.split(/\r\n|\r|\n/)
  const output: string[] = []
  let removed = false
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (!/^- /.test(line)) {
      output.push(line)
      index += 1
      continue
    }
    // Gather the full block: indented continuation lines and the blanks that
    // trail the last row, up to the next column-zero (or EOF) content line.
    const block: string[] = [line]
    index += 1
    while (index < lines.length) {
      const next = lines[index]
      if (next.trim().length === 0) {
        block.push(next)
        index += 1
        continue
      }
      if (next[0] !== ' ' && next[0] !== '\t') break
      block.push(next)
      index += 1
    }
    if (blockMatches(block, matcher)) removed = true
    else output.push(...block)
  }
  const body = collapseBlankLines(output)
  // A patch document must stay a top-level YAML array: once every entry is
  // removed (or the file held none), emit an explicit `[]` so the next boot
  // still parses it instead of failing on a comments-only document.
  if (!body.some(line => /^- /u.test(line))) body.push('[]')
  return { text: `${body.join('\n')}\n`, removed }
}

/** Whether one top-level block's first mount row belongs to this plugin. */
function blockMatches(block: readonly string[], matcher: MountMatcher): boolean {
  const row: MountRow = {}
  for (const line of block) {
    const idMatch = /^\s*- id:\s*(.*?)\s*$/u.exec(line)
    if (idMatch !== null) row.id = unquote(idMatch[1])
    const nameMatch = /^\s*name:\s*(.*?)\s*$/u.exec(line)
    if (nameMatch !== null) row.name = unquote(nameMatch[1])
  }
  return mountRowMatches(row, matcher)
}

/** Strip one level of surrounding single/double quotes from a YAML scalar. */
function unquote(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length >= 2) {
    const first = trimmed[0]
    const last = trimmed[trimmed.length - 1]
    if ((first === "'" && last === "'") || (first === '"' && last === '"')) return trimmed.slice(1, -1)
  }
  return trimmed
}

/** Whether `target` resolves strictly inside `root`. */
function isPathInside(root: string, target: string): boolean {
  const rootResolved = resolve(root)
  const targetResolved = resolve(target)
  const rel = relative(rootResolved, targetResolved)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

/** Drop blank lines that are empty or duplicate an already-blank neighbor. */
function collapseBlankLines(lines: readonly string[]): string[] {
  const output: string[] = []
  for (const line of lines) {
    const blank = line.trim().length === 0
    if (blank && output.length > 0 && output[output.length - 1].trim().length === 0) continue
    output.push(line)
  }
  while (output.length > 0 && output[output.length - 1].trim().length === 0) output.pop()
  return output
}

/** Outcome of editing the overlay patches. */
export interface UninstallMountsResult {
  /** Patch files edited (this plugin's mount rows removed). */
  edited: string[]
  /** Patch files scanned that contained no mount row of this plugin. */
  skipped: string[]
  /** Files that could not be read or rewritten. */
  failed: Array<{ file: string; error: string }>
}

/**
 * Remove this plugin's mount rows from every reachable overlay patch. Each
 * file keeps its BOM when it had one; per-file failures are collected, never
 * thrown — one unwritable patch must not abort the rest of the uninstall.
 */
export async function uninstallPatchMounts(matcher: MountMatcher): Promise<UninstallMountsResult> {
  const result: UninstallMountsResult = { edited: [], skipped: [], failed: [] }
  for (const file of patchFileCandidates()) {
    try {
      const raw = readFileSync(file, 'utf8')
      const hasBom = raw.charCodeAt(0) === 0xfeff
      const body = hasBom ? raw.slice(1) : raw
      const next = removeMountRowsFromPatch(body, matcher)
      if (!next.removed) {
        result.skipped.push(file)
        continue
      }
      await writeFile(file, hasBom ? `\uFEFF${next.text}` : next.text, 'utf8')
      result.edited.push(file)
    } catch (error) {
      result.failed.push({ file, error: String(error) })
    }
  }
  return result
}

/**
 * Remove this plugin from every profile manifest (package.json). `dsh plugin
 * add` records the package under `dependencies` and `dsh.profile.bundles`;
 * without this step a later `pnpm install` would re-fetch a deleted installed
 * copy and resurrect the bundle. JSON must stay valid — failures are collected,
 * never thrown.
 * @param packageNames - package identities this plugin installs under.
 */
export async function stripProfilePackageReferences(packageNames: readonly string[]): Promise<UninstallMountsResult> {
  const result: UninstallMountsResult = { edited: [], skipped: [], failed: [] }
  const profiles = join(dshHomeDirectory(), 'profiles')
  let profileDirs: string[]
  try {
    profileDirs = readdirSync(profiles, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => join(profiles, dirent.name))
  } catch {
    return result
  }
  const isOurs = (value: string): boolean => {
    for (const candidate of packageNames) {
      if (value === candidate) return true
      // Bare form of a scoped name (`pkg` for `@scope/pkg`).
      if (value === candidate.split('/').pop()) return true
    }
    return false
  }
  for (const dir of profileDirs) {
    const manifestPath = join(dir, 'package.json')
    if (!existsSync(manifestPath)) continue
    try {
      const manifest: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'))
      if (typeof manifest !== 'object' || manifest === null || Array.isArray(manifest)) continue
      const record = manifest as Record<string, unknown>
      let changed = false
      const dependencies = record['dependencies']
      if (typeof dependencies === 'object' && dependencies !== null && !Array.isArray(dependencies)) {
        const deps = dependencies as Record<string, unknown>
        for (const key of Object.keys(deps)) {
          if (isOurs(key)) {
            delete deps[key]
            changed = true
          }
        }
        if (Object.keys(deps).length === 0) delete record['dependencies']
      }
      const dsh = record['dsh']
      if (typeof dsh === 'object' && dsh !== null) {
        const profile = (dsh as Record<string, unknown>)['profile']
        if (typeof profile === 'object' && profile !== null) {
          const bundles = (profile as Record<string, unknown>)['bundles']
          if (Array.isArray(bundles)) {
            const next = bundles.filter(entry => !(typeof entry === 'string' && isOurs(entry)))
            if (next.length !== bundles.length) {
              ;(profile as Record<string, unknown>)['bundles'] = next
              changed = true
            }
          }
        }
      }
      if (!changed) continue
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
      result.edited.push(manifestPath)
    } catch (error) {
      result.failed.push({ file: manifestPath, error: String(error) })
    }
  }
  return result
}

/** Whether the plugin's own files were removed. */
export type SelfRemovalOutcome = 'deleted' | 'skipped-source' | 'failed'

/**
 * Delete this plugin's installed files. Only a package living inside the DSH
 * home is an installed copy worth deleting; a plugin running from a source
 * checkout (dev) keeps its tree — its mount rows are still removed, so it
 * stops loading without destroying the working source.
 * @param packageRoot - resolved plugin package root ({@link findPackageRoot}).
 */
export async function removeSelfInstallIfManaged(packageRoot: string): Promise<SelfRemovalOutcome> {
  const root = resolve(packageRoot)
  if (!isUnderDshHome(root)) return 'skipped-source'
  try {
    await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
    return 'deleted'
  } catch {
    return 'failed'
  }
}
