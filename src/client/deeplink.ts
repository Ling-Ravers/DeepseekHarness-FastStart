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

import type { Context as ClientContext } from '@deepseek-ai/cordis'
import { DEEP_LINK_QUERY } from '../shared/settings.ts'
import { showConfirmOverlay } from './overlay.ts'

/** Structural subset of the client `workspaces` controller. */
interface LooseWorkspaces {
  create(input: { path: string }): Promise<{ workspaceId: string }>
  list: {
    getSnapshot(): { items: readonly { workspaceId: string; path: string }[] }
  }
}

/** Structural subset of the client `uiWorkspace` service. */
interface LooseUiWorkspace {
  startSession(workspaceId?: string): void
}

/** How long to wait for the workspace mirror to include a fresh row. */
const MIRROR_TIMEOUT_MS = 4_000
/** How long to wait for the client services to be provided. */
const SERVICE_TIMEOUT_MS = 10_000

function delay(ms: number): Promise<void> {
  return new Promise(resolvePromise => { setTimeout(resolvePromise, ms) })
}

/** Wait until a client context service is provided (apply order is unconstrained). */
async function waitForService<T>(
  ctx: ClientContext,
  name: string,
  timeoutMs: number = SERVICE_TIMEOUT_MS,
): Promise<T | undefined> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const service = ctx.get(name) as T | undefined
    if (service !== undefined) return service
    if (Date.now() >= deadline) return undefined
    await delay(120)
  }
}

/**
 * Open (create or enter) a workspace for the deep-linked folder.
 * @param ctx - client context.
 * @param folder - absolute folder path from the launcher.
 * @returns whether the workspace was opened.
 */
async function openWorkspaceFromPath(ctx: ClientContext, folder: string): Promise<boolean> {
  const workspaces = await waitForService<LooseWorkspaces>(ctx, 'workspaces')
  if (workspaces === undefined) {
    console.warn('[dsh-open-in-dsh] workspaces service unavailable; cannot open folder')
    return false
  }
  const ui = await waitForService<LooseUiWorkspace>(ctx, 'uiWorkspace')
  if (ui === undefined) {
    console.warn('[dsh-open-in-dsh] uiWorkspace service unavailable')
    return false
  }
  let workspaceId: string
  try {
    workspaceId = (await workspaces.create({ path: folder })).workspaceId
  } catch (error) {
    console.warn(`[dsh-open-in-dsh] workspace create failed: ${String(error)}`)
    return false
  }
  if (!(await waitForWorkspace(workspaces, workspaceId))) {
    console.warn(`[dsh-open-in-dsh] workspace ${workspaceId} not mirrored in time`)
    return false
  }
  // Reuses an existing blank session rooted at the folder when present,
  // otherwise creates one: "进入该工作区并默认开启一个新对话".
  ui.startSession(workspaceId)
  return true
}

/** Poll the workspace mirror until it includes the created row. */
async function waitForWorkspace(workspaces: LooseWorkspaces, workspaceId: string): Promise<boolean> {
  const deadline = Date.now() + MIRROR_TIMEOUT_MS
  for (;;) {
    const items = workspaces.list?.getSnapshot?.().items
    if (Array.isArray(items) && items.some(item => item.workspaceId === workspaceId)) return true
    if (Date.now() >= deadline) return false
    await delay(80)
  }
}

/** Copy for the deep-link confirmation overlay (kept tiny; no locale plumbing needed). */
function pickCopy(): {
  title: string
  prompt: string
  accept: string
  cancel: string
  working: string
  failed: string
} {
  const zh = typeof navigator !== 'undefined' && /^zh/i.test(navigator.language ?? '')
  return zh
    ? {
      title: '在 DSH 中打开',
      prompt: '是否将以下目录添加为工作区？',
      accept: '确定',
      cancel: '取消',
      working: '正在创建并进入工作区…',
      failed: '打开失败，请重试。',
    }
    : {
      title: 'Open in DSH',
      prompt: 'Add the following directory as a workspace?',
      accept: 'Confirm',
      cancel: 'Cancel',
      working: 'Creating and entering the workspace…',
      failed: 'Failed to open. Please retry.',
    }
}

/** Read the single-use deep-link target, if present. */
function readDeepLinkTarget(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const target = new URLSearchParams(window.location.search).get(DEEP_LINK_QUERY)
  return target === null || target.length === 0 ? undefined : target
}

/** Remove the deep-link query so a reload never re-enters the folder. */
function clearDeepLinkTarget(): void {
  if (typeof window === 'undefined' || window.history?.replaceState === undefined) return
  window.history.replaceState(null, '', window.location.pathname + window.location.hash)
}

/**
 * Handle a deep link found on the current page by asking the user first:
 * confirm -> open the folder as a workspace; cancel -> open DSH normally.
 * Safe no-op when no deep link is present or the DOM is unavailable.
 * @param ctx - client context.
 */
export async function handleWorkspaceDeepLink(ctx: ClientContext): Promise<void> {
  const folder = readDeepLinkTarget()
  if (folder === undefined || typeof document === 'undefined') return
  const copy = pickCopy()
  await showConfirmOverlay({
    ...copy,
    body: folder,
    run: () => openWorkspaceFromPath(ctx, folder),
  })
  // Whether confirmed or cancelled, the deep link is single-use: a reload or a
  // later visit must never re-prompt for the same folder.
  clearDeepLinkTarget()
}
