/**
 * Experimental Windows Explorer shell integration.
 *
 * Host half: owns the `dsh-shell-integration` settings namespace and keeps the
 * Windows surface in sync with it live. The namespace resolves three states:
 *
 * - `removed: true` — full uninstall: no Explorer menu entries, no tray, and
 *   no generated scripts/logs. Reconciliation purges all of it and stays idle.
 * - `removed: false, enabled: true` — the "在 DSH 中打开" context menu is
 *   registered and the tray runs (the tray is DSH's master switch).
 * - `removed: false, enabled: false` — the menu is unregistered, but the tray
 *   still runs: the tray is independent of the quick-open switch.
 */
import z from '@deepseek-ai/schemastery';
import { DEFAULT_ORIGIN, ensureMenuRegistered, ensureMenuUnregistered, isTrayActive, isWindows, launchTray, removeLauncherArtifacts, resolveIconPath, resolveShellOptions, stopTrayProcesses, writeLauncher, writeTrayScript, } from "./host/integration.js";
import { SHELL_SETTINGS_DEFAULTS, SHELL_SETTINGS_NAMESPACE, ShellSettingsSchema, } from "./shared/settings.js";
/** Cordis plugin name shared with the Client face. */
export const name = 'experimental-dsh-shell-integration';
/** Runtime validation for {@link Config}. */
export const Config = z.object({
    origin: z.string().default(DEFAULT_ORIGIN),
    dshCli: z.string().default(''),
    folderMenu: z.boolean().default(true),
    backgroundMenu: z.boolean().default(true),
});
/** Normalize a {@link Config} into registry-friendly options. */
function toShellOptions(config) {
    const dshCli = config.dshCli ?? '';
    return {
        origin: config.origin ?? DEFAULT_ORIGIN,
        ...(dshCli.length > 0 ? { dshCli } : {}),
        folderMenu: config.folderMenu ?? true,
        backgroundMenu: config.backgroundMenu ?? true,
    };
}
/**
 * Start the tray unless one is already running. The tray is the user's master
 * switch for DSH itself, so it lives whenever the integration is installed
 * (`removed: false`) — independent of the quick-open menu switch.
 * @param ctx - plugin context.
 * @param origin - web origin bound to the tray actions.
 */
async function startTrayIfNeeded(ctx, origin) {
    if (isTrayActive())
        return;
    const trayPath = await writeTrayScript(resolveIconPath(), origin);
    await launchTray(trayPath);
    ctx.logger.info('experimental-dsh-shell-integration: tray started (DeepSeek-Harness)');
}
/** Logged per reconciliation attempt; keeps noisy reconciliation quiet. */
async function reconcile(ctx, config, current) {
    if (!isWindows()) {
        ctx.logger.debug('experimental-dsh-shell-integration: not Windows; nothing to reconcile');
        return;
    }
    const options = resolveShellOptions(toShellOptions(config));
    const origin = config.origin ?? DEFAULT_ORIGIN;
    try {
        if (current.removed) {
            // Full uninstall, including surfaces the quick-open switch never owned:
            // both context-menu registrations, the tray process, and every generated
            // file. Stays idle until the client clears `removed` to reinstall.
            await ensureMenuUnregistered({ folderMenu: true, backgroundMenu: true });
            await stopTrayProcesses();
            await removeLauncherArtifacts();
            ctx.logger.info('experimental-dsh-shell-integration: uninstalled (menus, tray, scripts removed)');
            return;
        }
        await startTrayIfNeeded(ctx, origin);
        if (current.enabled) {
            const launcher = await writeLauncher(options);
            await ensureMenuRegistered(options, resolveIconPath(), launcher);
            ctx.logger.info('experimental-dsh-shell-integration: "在 DSH 中打开" registered');
        }
        else {
            await ensureMenuUnregistered(options);
            ctx.logger.info('experimental-dsh-shell-integration: "在 DSH 中打开" unregistered');
        }
    }
    catch (error) {
        // The menu and tray are assists, never a reason to take the tree down.
        ctx.logger.warn(`experimental-dsh-shell-integration: reconciliation failed: ${String(error)}`);
    }
}
/**
 * Apply the Host implementation.
 * @param ctx - Host Cordis plugin context.
 * @param config - validated composition configuration.
 */
export function apply(ctx, config) {
    ctx.inject(['settings'], (settingsCtx) => {
        let source = () => SHELL_SETTINGS_DEFAULTS;
        settingsCtx.settings.installSection(ctx, SHELL_SETTINGS_NAMESPACE, ShellSettingsSchema, SHELL_SETTINGS_DEFAULTS, {
            validate: (value) => {
                // Any boolean combination is acceptable; reconciliation runs in onChange.
                void value;
            },
            setSource: (current) => { source = current; },
            onChange: () => { void reconcile(ctx, config, source()); },
        });
        // Reconcile once with the boot-time value (menu off, tray on by default).
        void reconcile(ctx, config, source());
    });
}
//# sourceMappingURL=index.js.map