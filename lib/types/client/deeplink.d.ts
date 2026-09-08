/**
 * `?dsh-open=<path>` deep-link handling for the Explorer launcher.
 *
 * When the query is present, this renders a centered confirmation overlay
 * through the shared {@link showConfirmOverlay} factory. Confirming creates
 * (idempotently) or resolves the folder as a Workspace through the same host
 * capability the "add workspace" UI uses, then enters it (reusing an existing
 * blank session rooted at the directory, otherwise creating a new one);
 * cancelling clears the query and lets DSH open normally. The overlay only
 * ever appears on a single-use deep link.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/**
 * Handle a deep link found on the current page by asking the user first:
 * confirm -> open the folder as a workspace; cancel -> open DSH normally.
 * Safe no-op when no deep link is present or the DOM is unavailable.
 * @param ctx - client context.
 */
export declare function handleWorkspaceDeepLink(ctx: ClientContext): Promise<void>;
//# sourceMappingURL=deeplink.d.ts.map