/**
 * Shell-integration plugin, browser half.
 *
 * Two registrations: the settings card under `settings.plugin.item` keyed by
 * the namespace it edits, and the `?dsh-open=<path>` deep-link handler that
 * enters or creates a Workspace for the folder handed in by the Explorer
 * launcher.
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: pull the Context merges for ctx.locale, ctx.slots, and
// ctx.settingsScope without value-importing cross-plugin appearance.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { SHELL_SETTINGS_NAMESPACE } from '../shared/settings.ts'
import {
  ShellIntegrationCardController,
  type BoundScope,
} from './card-controller.ts'
import { handleWorkspaceDeepLink } from './deeplink.ts'
import { en, LOCALE_NS, zh } from './locales.ts'
import { ShellIntegrationCard } from './ShellIntegrationCard.tsx'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'settingsScope']

/**
 * Register the card and the deep-link handler.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  const scope = ctx.settingsScope.bind({ namespace: SHELL_SETTINGS_NAMESPACE }) as unknown as BoundScope
  const controller = new ShellIntegrationCardController(scope)
  ctx.effect(() => () => controller.dispose(), 'dsh-open-in-dsh: card controller')

  ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), 'dsh-open-in-dsh: dictionaries')

  const unregisterCard = ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    key: SHELL_SETTINGS_NAMESPACE,
    locale: LOCALE_NS,
    inject: () => controller.inject(),
  }, ShellIntegrationCard))

  // A permanent uninstall persists `removed` and then removes this plugin's
  // mount rows: drop the settings-card entry at once, so the live session
  // shows no placeholder either (after a restart the plugin is simply gone).
  controller.afterPurge(() => { unregisterCard() })

  // The deep link is a single-use URL; safe no-op on ordinary loads.
  void handleWorkspaceDeepLink(ctx)
}
