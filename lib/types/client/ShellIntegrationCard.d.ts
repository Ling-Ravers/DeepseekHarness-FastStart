/**
 * Settings card: "DSH 快捷开启". Rendered by the Plugins settings partition
 * under the `settings.plugin.item` key equal to the namespace this card edits
 * (`dsh-shell-integration`), matching Host-side registration.
 *
 * The card mirrors the Plugins block's own card chrome (name + state chip +
 * chevron header, disclosing controls in place): the header toggles a body
 * that holds the quick-open switch and a "彻底删除" (uninstall) action. The
 * trailing chip reports the integration state (已启用 / 已停用 / 已卸载) with
 * the same palette the plugin list uses. Uninstall asks through a centered
 * confirmation overlay and, on confirm, persists `removed` — the Host then
 * removes every context-menu entry, stops the tray, and deletes the generated
 * scripts/logs.
 */
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { ShellIntegrationCardFace } from './card-controller.ts';
import { LOCALE_NS, type ShellLocaleKey } from './locales.ts';
/** Full component props for the shell-integration settings card. */
type ShellIntegrationCardProps = InjectFace<ShellIntegrationCardFace> & PropsLocale<typeof LOCALE_NS>;
/**
 * Render the shell-integration card.
 * @param props - composed slot props.
 * @returns the card, or null when the Host does not serve it.
 */
export declare function ShellIntegrationCard(props: ShellIntegrationCardProps): import("react").JSX.Element | null;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Shell-integration card copy. */
        [LOCALE_NS]: ShellLocaleKey;
    }
}
export {};
//# sourceMappingURL=ShellIntegrationCard.d.ts.map