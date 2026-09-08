/** Shared Host/Client vocabulary for the shell-integration preference. */
import z from '@deepseek-ai/schemastery';
/** Settings namespace owning the integration switch (paired key with the browser card). */
export const SHELL_SETTINGS_NAMESPACE = 'dsh-shell-integration';
/** Query parameter the browser half interprets as an open-workspace request. */
export const DEEP_LINK_QUERY = 'dsh-open';
/** Runtime validation and default for {@link ShellSettings}. */
export const ShellSettingsSchema = z.object({
    enabled: z.boolean().default(false),
    removed: z.boolean().default(false),
});
/** Default composition entry layered under any user override. */
export const SHELL_SETTINGS_DEFAULTS = {
    enabled: false,
    removed: false,
};
//# sourceMappingURL=settings.js.map