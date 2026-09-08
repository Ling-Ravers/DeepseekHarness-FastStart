/**
 * Windows Explorer shell integration — Host half.
 *
 * The `dsh-shell-integration` settings namespace carries the user-facing
 * state. `removed` is not a reversible "disable" flag but a PERMANENT
 * uninstall marker:
 *
 * - `removed: false, enabled: true` — the "在 DSH 中打开" context menu is
 *   registered and the tray runs (the tray is DSH's master switch).
 * - `removed: false, enabled: false` — the menu is unregistered; the tray
 *   still runs, because it is independent of the quick-open switch.
 * - `removed: true` — the user deleted the plugin from the settings card. The
 *   Host purges every Windows surface (both context menus, the tray, every
 *   generated script/log), removes this plugin's own mount rows from every
 *   overlay patch it can reach, and deletes the installed files when they
 *   live inside the DSH home. After a restart the plugin no longer loads: no
 *   code, no card, no residue. The marker doubles as a tombstone: mounting
 *   the plugin again (a deliberate reinstall) is detected at boot and cleared
 *   automatically, so the fresh install starts clean instead of hiding its
 *   own settings card.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import {
  DEFAULT_ORIGIN,
  ensureMenuRegistered,
  ensureMenuUnregistered,
  findPackageRoot,
  isTrayActive,
  isWindows,
  launchTray,
  PACKAGE_NAME,
  removeLauncherArtifacts,
  removeSelfInstallIfManaged,
  resolveIconPath,
  resolveShellOptions,
  stopTrayProcesses,
  stripProfilePackageReferences,
  uninstallPatchMounts,
  writeLauncher,
  writeTrayScript,
  type ShellMenuOptions,
} from './host/integration.ts'
import {
  SHELL_SETTINGS_DEFAULTS,
  SHELL_SETTINGS_NAMESPACE,
  ShellSettingsSchema,
  type ShellSettings,
} from './shared/settings.ts'

/** Cordis plugin name shared with the Client face. */
export const name = 'dsh-open-in-dsh'

/** Logging prefix shared by every Host message. */
const LOG_PREFIX = 'dsh-open-in-dsh'

/**
 * Host plugin configuration (composition-level). The user-facing state lives
 * in the `dsh-shell-integration` settings namespace; these fields tune where
 * and how the menu launches DSH.
 */
export interface Config {
  /** Web origin the launcher probes and deep-links into. */
  origin?: string
  /**
   * Absolute path to a dsh CLI entry (apps/cli/lib/bin.js). When omitted the
   * plugin auto-detects the checkout CLI when it runs inside the repository.
   */
  dshCli?: string
  /** Register the menu on the folder context menu. */
  folderMenu?: boolean
  /** Register the menu on the folder-background context menu. */
  backgroundMenu?: boolean
}

/** Runtime validation for {@link Config}. */
export const Config: z<Config> = z.object({
  origin: z.string().default(DEFAULT_ORIGIN),
  dshCli: z.string().default(''),
  folderMenu: z.boolean().default(true),
  backgroundMenu: z.boolean().default(true),
})

/** Normalize a {@link Config} into registry-friendly options. */
function toShellOptions(config: Config): ShellMenuOptions {
  const dshCli = config.dshCli ?? ''
  return {
    origin: config.origin ?? DEFAULT_ORIGIN,
    ...(dshCli.length > 0 ? { dshCli } : {}),
    folderMenu: config.folderMenu ?? true,
    backgroundMenu: config.backgroundMenu ?? true,
  }
}

/**
 * Start the tray unless one is already running. The tray is the user's master
 * switch for DSH itself, so it lives whenever the integration is installed
 * (`removed: false`) — independent of the quick-open menu switch.
 * @param ctx - plugin context.
 * @param origin - web origin bound to the tray actions.
 */
async function startTrayIfNeeded(ctx: Context, origin: string): Promise<void> {
  if (isTrayActive()) return
  const trayPath = await writeTrayScript(resolveIconPath(), origin)
  await launchTray(trayPath)
  ctx.logger.info(`${LOG_PREFIX}: tray started (DeepSeek-Harness)`)
}

/**
 * Perform the permanent uninstall: every OS surface the plugin ever owned,
 * then its own mount rows in every overlay patch, then the installed files
 * (only when they live inside the DSH home). Mount-row removal is what keeps
 * the plugin from loading after the next restart; source checkouts keep their
 * tree so development survives.
 * @param ctx - plugin context.
 */
async function performPermanentUninstall(ctx: Context): Promise<void> {
  await ensureMenuUnregistered({ folderMenu: true, backgroundMenu: true })
  await stopTrayProcesses()
  await removeLauncherArtifacts()
  const packageRoot = findPackageRoot()
  const mounts = await uninstallPatchMounts({
    namespace: SHELL_SETTINGS_NAMESPACE,
    packageNames: [PACKAGE_NAME],
    packageRoot,
  })
  // `dsh plugin add` also records the package in profile package.json
  // (dependencies + dsh.profile.bundles); drop those references so a later
  // `pnpm install` cannot re-fetch a deleted installed copy.
  const profiles = await stripProfilePackageReferences([PACKAGE_NAME])
  const selfRemoval = await removeSelfInstallIfManaged(packageRoot)
  if (mounts.failed.length > 0) {
    ctx.logger.warn(
      `${LOG_PREFIX}: uninstall could not edit some mount files: ${
        mounts.failed.map(failure => `${failure.file} (${failure.error})`).join('; ')
      }`,
    )
  }
  if (profiles.failed.length > 0) {
    ctx.logger.warn(
      `${LOG_PREFIX}: uninstall could not update some profile manifests: ${
        profiles.failed.map(failure => `${failure.file} (${failure.error})`).join('; ')
      }`,
    )
  }
  const manifests = profiles.edited.length > 0 ? `, ${profiles.edited.length} profile manifest(s) updated` : ''
  const installed = selfRemoval === 'deleted' ? ', installed files deleted' : selfRemoval === 'failed' ? ' (installed files removal failed)' : ''
  ctx.logger.info(`${LOG_PREFIX}: permanently uninstalled (menus, tray, artifacts, mount rows${manifests}${installed}); restart DSH to finish`)
}

/**
 * Apply the Host implementation.
 * @param ctx - Host Cordis plugin context.
 * @param config - validated composition configuration.
 */
export function apply(ctx: Context, config: Config): void {
  ctx.inject(['settings'], (settingsCtx) => {
    let source: () => ShellSettings = () => SHELL_SETTINGS_DEFAULTS
    /** Whether the uninstall marker was already present at boot (reinstall). */
    let bootedRemoved = false
    /** Whether this process already performed its permanent uninstall. */
    let purged = false
    /** Reconciliation stays inert until boot facts are captured. */
    let armed = false

    /**
     * Keep the Windows surface in sync with the namespace, or run the
     * permanent uninstall when `removed` flips true at runtime.
     */
    async function reconcile(current: ShellSettings): Promise<void> {
      if (!armed || purged) return
      if (!isWindows()) {
        ctx.logger.debug(`${LOG_PREFIX}: not Windows; nothing to reconcile`)
        return
      }
      const options: ShellMenuOptions = resolveShellOptions(toShellOptions(config))
      const origin = config.origin ?? DEFAULT_ORIGIN
      try {
        if (current.removed) {
          if (bootedRemoved) {
            // The marker is a tombstone left by an earlier permanent
            // uninstall; this process mounted the plugin again on purpose, so
            // clear it and start fresh instead of uninstalling a reinstall.
            bootedRemoved = false
            ctx.logger.info(`${LOG_PREFIX}: previous uninstall marker cleared (plugin re-mounted); starting clean`)
            await settingsCtx.settings.replace(SHELL_SETTINGS_NAMESPACE, {})
            return
          }
          // Runtime deletion request from the settings card.
          purged = true
          await performPermanentUninstall(ctx)
          return
        }
        await startTrayIfNeeded(ctx, origin)
        if (current.enabled) {
          const launcher = await writeLauncher(options)
          await ensureMenuRegistered(options, resolveIconPath(), launcher)
          ctx.logger.info(`${LOG_PREFIX}: "在 DSH 中打开" registered`)
        } else {
          await ensureMenuUnregistered(options)
          ctx.logger.info(`${LOG_PREFIX}: "在 DSH 中打开" unregistered`)
        }
      } catch (error) {
        // The menu and tray are assists, never a reason to take the tree down.
        ctx.logger.warn(`${LOG_PREFIX}: reconciliation failed: ${String(error)}`)
      }
    }

    settingsCtx.settings.installSection(ctx, SHELL_SETTINGS_NAMESPACE, ShellSettingsSchema, SHELL_SETTINGS_DEFAULTS, {
      validate: (value: ShellSettings) => {
        // Any boolean combination is acceptable; reconciliation runs in onChange.
        void value
      },
      setSource: (current) => { source = current },
      onChange: () => { void reconcile(source()) },
    })
    // Capture boot facts after the namespace registered (the synchronous
    // attach onChange above ran while `armed` was false and no-op'd), then
    // reconcile once with them in place.
    bootedRemoved = source().removed
    armed = true
    void reconcile(source())
  })
}
