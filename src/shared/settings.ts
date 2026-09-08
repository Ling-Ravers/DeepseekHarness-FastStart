/** Shared Host/Client vocabulary for the shell-integration preference. */

import z from '@deepseek-ai/schemastery'

/** Settings namespace owning the integration switch (paired key with the browser card). */
export const SHELL_SETTINGS_NAMESPACE = 'dsh-shell-integration'

/** Query parameter the browser half interprets as an open-workspace request. */
export const DEEP_LINK_QUERY = 'dsh-open'

/** User-facing settings document for the shell integration. */
export interface ShellSettings {
  /** Whether the Windows Explorer "Open in DSH" menu should be registered. */
  enabled: boolean
  /**
   * Permanent-uninstall marker. `true` means the user deleted the plugin from
   * the settings card: the Host purges every Windows surface (menus, tray,
   * generated scripts/logs), removes this plugin's own mount rows from every
   * overlay patch it can reach, and deletes its installed files when they live
   * inside the DSH home — after a restart the plugin no longer exists. The
   * marker is a tombstone: mounting the plugin again (a deliberate reinstall)
   * is detected at boot and cleared automatically, so a fresh install starts
   * clean instead of hiding its card.
   */
  removed: boolean
}

/** Runtime validation and default for {@link ShellSettings}. */
export const ShellSettingsSchema: z<ShellSettings> = z.object({
  enabled: z.boolean().default(false),
  removed: z.boolean().default(false),
})

/** Default composition entry layered under any user override. */
export const SHELL_SETTINGS_DEFAULTS: ShellSettings = {
  enabled: false,
  removed: false,
}
