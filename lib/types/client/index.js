/**
 * Shell-integration plugin, browser half.
 *
 * Two registrations: the settings card under `settings.plugin.item` keyed by
 * the namespace it edits, and the `?dsh-open=<path>` deep-link handler that
 * enters or creates a Workspace for the folder handed in by the Explorer
 * launcher.
 */
import { SHELL_SETTINGS_NAMESPACE } from "../shared/settings.js";
import { ShellIntegrationCardController, } from "./card-controller.js";
import { handleWorkspaceDeepLink } from "./deeplink.js";
import { en, LOCALE_NS, zh } from "./locales.js";
import { ShellIntegrationCard } from "./ShellIntegrationCard.js";
/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'settingsScope'];
/**
 * Register the card and the deep-link handler.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    const scope = ctx.settingsScope.bind({ namespace: SHELL_SETTINGS_NAMESPACE });
    const controller = new ShellIntegrationCardController(scope);
    ctx.effect(() => () => controller.dispose(), 'experimental-dsh-shell-integration: card controller');
    ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), 'experimental-dsh-shell-integration: dictionaries');
    ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
        name: 'settings.plugin.item',
        key: SHELL_SETTINGS_NAMESPACE,
        locale: LOCALE_NS,
        inject: () => controller.inject(),
    }, ShellIntegrationCard));
    // The deep link is a single-use URL; safe no-op on ordinary loads.
    void handleWorkspaceDeepLink(ctx);
}
//# sourceMappingURL=index.js.map