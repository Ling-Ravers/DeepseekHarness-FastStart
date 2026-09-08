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
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/** Cordis plugin name shared with the Client face. */
export declare const name = "experimental-dsh-shell-integration";
/**
 * Host plugin configuration (composition-level). The user-facing state lives
 * in the `dsh-shell-integration` settings namespace; these fields tune where
 * and how the menu launches DSH.
 */
export interface Config {
    /** Web origin the launcher probes and deep-links into. */
    origin?: string;
    /**
     * Absolute path to a dsh CLI entry (apps/cli/lib/bin.js). When omitted the
     * plugin auto-detects the checkout CLI when it runs inside the repository.
     */
    dshCli?: string;
    /** Register the menu on the folder context menu. */
    folderMenu?: boolean;
    /** Register the menu on the folder-background context menu. */
    backgroundMenu?: boolean;
}
/** Runtime validation for {@link Config}. */
export declare const Config: z<Config>;
/**
 * Apply the Host implementation.
 * @param ctx - Host Cordis plugin context.
 * @param config - validated composition configuration.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map