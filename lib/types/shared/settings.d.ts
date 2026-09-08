/** Shared Host/Client vocabulary for the shell-integration preference. */
import z from '@deepseek-ai/schemastery';
/** Settings namespace owning the integration switch (paired key with the browser card). */
export declare const SHELL_SETTINGS_NAMESPACE = "dsh-shell-integration";
/** Query parameter the browser half interprets as an open-workspace request. */
export declare const DEEP_LINK_QUERY = "dsh-open";
/** User-facing settings document for the shell integration. */
export interface ShellSettings {
    /** Whether the Windows Explorer "Open in DSH" menu should be registered. */
    enabled: boolean;
    /**
     * Whether the integration was fully removed: no context-menu entries, no
     * tray, and no generated scripts/logs. While true the Host keeps everything
     * purged; flipping `enabled` back on clears it and reinstalls.
     */
    removed: boolean;
}
/** Runtime validation and default for {@link ShellSettings}. */
export declare const ShellSettingsSchema: z<ShellSettings>;
/** Default composition entry layered under any user override. */
export declare const SHELL_SETTINGS_DEFAULTS: ShellSettings;
//# sourceMappingURL=settings.d.ts.map