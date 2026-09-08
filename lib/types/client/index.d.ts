/**
 * Shell-integration plugin, browser half.
 *
 * Two registrations: the settings card under `settings.plugin.item` keyed by
 * the namespace it edits, and the `?dsh-open=<path>` deep-link handler that
 * enters or creates a Workspace for the folder handed in by the Explorer
 * launcher.
 */
import type { Context } from '@deepseek-ai/cordis';
/** Required services (cordis fiber inject). */
export declare const inject: string[];
/**
 * Register the card and the deep-link handler.
 * @param ctx - client root context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map