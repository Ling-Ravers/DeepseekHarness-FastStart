/**
 * Pure-builder tests for the Windows shell menu surface. No registry or file
 * I/O is performed, so these run on any platform.
 */

import { describe, expect, it } from 'vitest'
import {
  buildShellCommandLine,
  compiledCliPathForSource,
  MENU_LABEL,
  mountRowMatches,
  removeMountRowsFromPatch,
  renderLauncherScript,
  renderTrayScript,
  shellMenuKey,
  shellMenuRegistryKeys,
  SHELL_MENU_KEY,
  trayScriptPath,
  TRAY_MUTEX,
  TRAY_TITLE,
} from '../src/host/integration.ts'
import { DEEP_LINK_QUERY } from '../src/shared/settings.ts'

describe('shell menu registry keys', () => {
  it('uses the plugin verb key under the folder and background classes', () => {
    expect(shellMenuKey('Directory')).toBe(`HKCU\\Software\\Classes\\Directory\\shell\\${SHELL_MENU_KEY}`)
    expect(shellMenuKey('Directory\\Background'))
      .toBe(`HKCU\\Software\\Classes\\Directory\\Background\\shell\\${SHELL_MENU_KEY}`)
  })

  it('enumerates exactly the enabled surfaces in registration order', () => {
    expect(shellMenuRegistryKeys({ folderMenu: true, backgroundMenu: true })).toEqual([
      shellMenuKey('Directory'),
      shellMenuKey('Directory\\Background'),
    ])
    expect(shellMenuRegistryKeys({ folderMenu: true, backgroundMenu: false })).toEqual([
      shellMenuKey('Directory'),
    ])
    expect(shellMenuRegistryKeys({ folderMenu: false, backgroundMenu: true })).toEqual([
      shellMenuKey('Directory\\Background'),
    ])
    expect(shellMenuRegistryKeys({ folderMenu: false, backgroundMenu: false })).toEqual([])
  })
})

describe('command line', () => {
  it('invokes powershell hidden against the launcher with %V', () => {
    const line = buildShellCommandLine('C:\\Users\\demo\\.dsh\\dsh-shell-integration\\dsh-open.ps1')
    expect(line).toContain('powershell.exe')
    expect(line).toContain('-NoProfile')
    expect(line).toContain('-WindowStyle Hidden')
    expect(line).toContain('dsh-open.ps1')
    expect(line).toContain('"%V"')
  })
})

describe('launcher script', () => {
  it('embeds the origin, the deep-link query, and the cli path', () => {
    const body = renderLauncherScript({
      origin: 'http://127.0.0.1:3080/',
      dshCli: 'D:\\repo\\apps\\cli\\lib\\bin.js',
    })
    expect(body).toContain("$origin = 'http://127.0.0.1:3080'")
    expect(body).toContain(`/?${DEEP_LINK_QUERY}=`)
    expect(body).toContain("$node = 'node'")
    expect(body).toContain('apps\\cli\\lib\\bin.js')
  })

  it('escapes single quotes inside the cli and origin values', () => {
    const body = renderLauncherScript({
      origin: "http://127.0.0.1:3080/'oops",
      dshCli: "D:\\it's\\bin.js",
    })
    expect(body).toContain("D:\\it''s\\bin.js")
    expect(body).toContain("$origin = 'http://127.0.0.1:3080/''oops'")
  })

  it('hides the fresh instance console and redirects its output to log files', () => {
    const body = renderLauncherScript({
      origin: 'http://127.0.0.1:3080',
      dshCli: 'D:\\repo\\apps\\cli\\lib\\bin.js',
      nodePath: 'C:\\Program Files\\nodejs\\node.exe',
    })
    expect(body).toContain("$node = 'C:\\Program Files\\nodejs\\node.exe'")
    // No visible window and no token-bearing startup line on screen.
    expect(body).toContain('-WindowStyle Hidden')
    expect(body).toContain('-RedirectStandardOutput $outLog')
    expect(body).toContain('-RedirectStandardError $errLog')
    expect(body).toContain("Join-Path (Join-Path $HOME '.dsh') 'dsh-shell-integration'")
  })

  it('suppresses the fresh instance auto-open and opens only the deep link after readiness', () => {
    const body = renderLauncherScript({ origin: 'http://127.0.0.1:3080', dshCli: 'D:\\repo\\apps\\cli\\lib\\bin.js' })
    expect(body).toContain("'web', '--no-open'")
    // The old unconditional auto-open must not be produced by the fallback.
    expect(body).not.toContain("ArgumentList @($cli, 'web') -WorkingDirectory")
    // Readiness polling precedes the open that follows the spawn.
    expect(body).toContain('$ready = $false')
    const pollIndex = body.indexOf('$ready = $false')
    expect(pollIndex).toBeGreaterThan(-1)
    // Cookie bootstrap in ONE navigation: once the fresh instance prints its
    // token URL, the launcher opens that URL with the deep-link query appended
    // (the token exchange mints the cookie; its redirect keeps the query), so
    // no second tab is opened for the deep link.
    expect(body).toContain('Get-DshTokenUrl -LogPath $outLog -Origin $origin')
    const combinedIndex = body.lastIndexOf('Start-Process ($tokenUrl + "&dsh-open="')
    expect(combinedIndex).toBeGreaterThan(pollIndex)
    expect(body.indexOf('Start-Process $tokenUrl')).toBe(-1)
    // A plain deep-link open remains only as the no-token fallback after it.
    const openIndex = body.lastIndexOf('Start-Process $deepLink')
    expect(openIndex).toBeGreaterThan(combinedIndex)
  })

  it('exits immediately after the fallback open when no CLI is usable', () => {
    const body = renderLauncherScript({ origin: 'http://127.0.0.1:3080', dshCli: '' })
    const pollIndex = body.indexOf('$ready = $false')
    // The CLI-less fallback branch opens the deep link and exits at once,
    // instead of falling through to the 30s readiness wait and opening twice.
    const fallbackIndex = body.indexOf('Start-Process $deepLink', body.indexOf('$cli -ne'))
    expect(fallbackIndex).toBeGreaterThan(-1)
    expect(body.indexOf('exit 0', fallbackIndex)).toBeLessThan(pollIndex)
  })

  it('keeps the human menu label stable', () => {
    expect(MENU_LABEL).toBe('在 DSH 中打开')
  })
})

describe('tray script', () => {
  it('embeds title, actions, origin, icon, and the single-instance mutex', () => {
    const body = renderTrayScript('D:\\pkg\\assets\\dsh-black.ico', 'http://127.0.0.1:3080')
    expect(body).toContain(`$script:tray.Text = '${TRAY_TITLE}'`)
    expect(body).toContain('唤起 web 端')
    expect(body).toContain('退出')
    expect(body).toContain("$script:origin = 'http://127.0.0.1:3080'")
    expect(body).toContain("$script:iconPath = 'D:\\pkg\\assets\\dsh-black.ico'")
    expect(body).toContain(`$script:mutexName = '${TRAY_MUTEX}'`)
    expect(body).toContain('New-Object System.Threading.Mutex')
    expect(body).toContain('WaitOne(0)')
  })

  it('offers reopen and exit, polls the port, and auto-exits after misses', () => {
    const body = renderTrayScript('C:\\ico.ico', 'http://127.0.0.1:3080')
    expect(body).toContain('Start-Process $script:origin')
    expect(body).toContain('Stop-Dsh')
    expect(body).toContain('Get-NetTCPConnection -LocalPort')
    expect(body).toContain('$script:timer.Interval = 5000')
    expect(body).toContain('$script:fails -ge 6')
    expect(body).toContain('[System.Windows.Forms.Application]::Run($script:form)')
    // Reopen prefers the running instance's printed token URL so the browser
    // session cookie is minted/refreshed; the plain origin remains the fallback.
    expect(body).toContain('Get-DshTokenUrl -LogPath $script:outLog -Origin $script:origin')
    const tokenOpen = body.indexOf('Start-Process $tokenUrl')
    const plainOpen = body.indexOf('} else { Start-Process $script:origin }')
    expect(tokenOpen).toBeGreaterThan(-1)
    expect(plainOpen).toBeGreaterThan(tokenOpen)
  })

  it('lives under the launcher directory as dsh-tray.ps1', () => {
    expect(trayScriptPath().endsWith('dsh-tray.ps1')).toBe(true)
  })
})

describe('mount-row matching (permanent uninstall)', () => {
  const matcher = {
    namespace: 'dsh-shell-integration',
    packageNames: ['dsh-open-in-dsh'],
    packageRoot: 'D:\\dev\\dsh-open-in-dsh',
  }

  it('matches by entry id, by package name, and by bare package name', () => {
    expect(mountRowMatches({ id: 'dsh-shell-integration' }, matcher)).toBe(true)
    expect(mountRowMatches({ name: 'dsh-open-in-dsh' }, matcher)).toBe(true)
    expect(mountRowMatches({ name: "'@scope/dsh-open-in-dsh'" }, matcher)).toBe(true)
    expect(mountRowMatches({ name: 'unrelated-package' }, matcher)).toBe(false)
    expect(mountRowMatches({ id: 'other', name: 'unrelated-package' }, matcher)).toBe(false)
  })

  it('matches a dev mount whose file:// name points inside the package root', () => {
    const row = { id: 'custom-id', name: "'file:///D:/dev/dsh-open-in-dsh/lib/index.js'" }
    expect(mountRowMatches(row, matcher)).toBe(true)
    expect(mountRowMatches({ ...row, name: "'file:///D:/elsewhere/pkg/lib/index.js'" }, matcher)).toBe(false)
  })
})

describe('removeMountRowsFromPatch', () => {
  const matcher = {
    namespace: 'dsh-shell-integration',
    packageNames: ['dsh-open-in-dsh'],
    packageRoot: 'D:\\dev\\dsh-open-in-dsh',
  }
  const patch = `# home-level patch header
- insert:
    - id: dsh-shell-integration
      name: 'dsh-open-in-dsh'
      config:
        origin: 'http://127.0.0.1:3080'

- insert:
    - id: unrelated-plugin
      name: '@deepseek-ai/unrelated'
`

  it('removes only this plugin\u2019s insert block and keeps the rest', () => {
    const next = removeMountRowsFromPatch(patch, matcher)
    expect(next.removed).toBe(true)
    expect(next.text).toContain('# home-level patch header')
    expect(next.text).toContain('- insert:')
    expect(next.text).toContain('unrelated-plugin')
    expect(next.text).toContain('@deepseek-ai/unrelated')
    expect(next.text).not.toContain('dsh-shell-integration')
    expect(next.text).not.toContain('dsh-open-in-dsh')
  })

  it('is idempotent: a second pass removes nothing', () => {
    const first = removeMountRowsFromPatch(patch, matcher)
    const second = removeMountRowsFromPatch(first.text, matcher)
    expect(second.removed).toBe(false)
    expect(second.text).toBe(first.text)
  })

  it('removes a file:// dev mount row even under a custom entry id', () => {
    const devPatch = `- insert:
    - id: my-deepseek
      name: 'file:///D:/dev/dsh-open-in-dsh/lib/index.js'
`
    const next = removeMountRowsFromPatch(devPatch, matcher)
    expect(next.removed).toBe(true)
    expect(next.text.trim()).toBe('[]')
  })

  it('leaves documents without this plugin untouched', () => {
    const unrelated = `- insert:
    - id: other
      name: '@deepseek-ai/other'
`
    const next = removeMountRowsFromPatch(unrelated, matcher)
    expect(next.removed).toBe(false)
    expect(next.text).toBe(unrelated)
  })

  it('keeps the patch a valid top-level array when the last entry is removed', () => {
    const single = `# header
- insert:
    - id: dsh-shell-integration
      name: 'dsh-open-in-dsh'
`
    const next = removeMountRowsFromPatch(single, matcher)
    expect(next.removed).toBe(true)
    expect(next.text).toContain('# header')
    expect(next.text).toContain('[]')
  })
})

describe('compiledCliPathForSource', () => {
  it('maps a src/bin.ts entry to the compiled lib/bin.js sibling', () => {
    expect(compiledCliPathForSource('D:\\repo\\apps\\cli\\src\\bin.ts'))
      .toBe('D:\\repo\\apps\\cli\\lib\\bin.js')
    expect(compiledCliPathForSource('D:/repo/apps/cli/src/bin.ts'))
      .toBe('D:\\repo\\apps\\cli\\lib\\bin.js')
  })

  it('accepts mts/cts source names and rejects non-source shapes', () => {
    expect(compiledCliPathForSource('D:\\repo\\apps\\cli\\src\\bin.mts'))
      .toBe('D:\\repo\\apps\\cli\\lib\\bin.js')
    expect(compiledCliPathForSource('D:\\repo\\apps\\cli\\lib\\bin.js')).toBeUndefined()
    expect(compiledCliPathForSource('D:\\repo\\apps\\cli\\src\\runner.ts')).toBeUndefined()
    expect(compiledCliPathForSource('')).toBeUndefined()
  })
})
