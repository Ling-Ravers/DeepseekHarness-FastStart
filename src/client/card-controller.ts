/**
 * Card controller: mirrors the bound `dsh-shell-integration` settings scope
 * into a snapshot store and writes the switch or the delete request
 * immediately (like a preference row) instead of staging a multi-field draft.
 */

import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { ShellSettings } from '../shared/settings.ts'

/** Minimal projection of the settings scope used by this card. */
export interface ShellIntegrationCardState {
  /** Whether the Host serves the namespace (card renderable). */
  available: boolean
  /** Whether the current settings document is writable. */
  writable: boolean
  /** Whether a write is in flight. */
  saving: boolean
  /** Whether the last write failed. */
  failed: boolean
  /** Effective `enabled` value (user layer or composition default). */
  enabled: boolean
  /**
   * Effective `removed` value: a permanent uninstall was requested, so the
   * card hides entirely (no placeholder, no "reinstall by switch").
   */
  removed: boolean
}

/** Registration-side face injected into the card renderer. */
export interface ShellIntegrationCardFace {
  hooks: {
    /** Card snapshot bound by the renderer as `useShellIntegration`. */
    shellIntegration: SnapshotStore<ShellIntegrationCardState>
  }
  /** Persist one switch state immediately. */
  setEnabled: (enabled: boolean) => void
  /** Request the permanent uninstall (Host deletes menus, tray, files, mounts). Resolves to success. */
  purge: () => Promise<boolean>
}

/** Structural subset of the scope snapshot this controller reads. */
interface ScopeSnapshot {
  status: string
  writable: boolean
  revision: number
  value?: Partial<ShellSettings>
}

/** Structural subset of the bound settings scope. */
export interface BoundScope {
  getSnapshot(): ScopeSnapshot
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<unknown>
}

/** The write in flight: no two card actions race the scope. */
type PendingAction = 'none' | 'enabled' | 'purge'

/**
 * Bridge one settings scope onto the expandable integration card.
 * @param scope - bound settings scope for the integration namespace.
 */
export class ShellIntegrationCardController {
  private readonly store: SnapshotStore<ShellIntegrationCardState>
  private readonly unsubscribe: () => void
  private action: PendingAction = 'none'
  private failed = false
  private disposed = false
  /** Invoked once a permanent uninstall was persisted (card should vanish). */
  private onPurged: (() => void) | undefined

  /** @param scope - bound settings scope for the integration namespace. */
  constructor(private readonly scope: BoundScope) {
    this.store = createSnapshotStore(this.projection())
    this.unsubscribe = scope.subscribe(() => { this.publish() })
  }

  /**
   * Register a callback that runs after a permanent uninstall was persisted,
   * so the registration side can drop the settings-card entry immediately.
   * @param callback - runs once, at most.
   */
  afterPurge(callback: () => void): void {
    this.onPurged = callback
  }

  /** Stop observing settings and suppress late write settlements. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.unsubscribe()
  }

  /** Build the renderer face for this card. */
  inject(): ShellIntegrationCardFace {
    return {
      hooks: { shellIntegration: this.store },
      setEnabled: (enabled) => { void this.setEnabled(enabled) },
      purge: () => this.purge(),
    }
  }

  /**
   * Flip the quick-open switch. Once the plugin is uninstalled (`removed`) the
   * card is gone and no re-enable path exists — a deliberate reinstall is a
   * fresh mount, not a switch flip.
   */
  private async setEnabled(enabled: boolean): Promise<void> {
    const snapshot = this.scope.getSnapshot()
    if (!this.writableSnapshot(snapshot)) return
    if (snapshot.value?.removed === true) return
    if (snapshot.value?.enabled === enabled) return
    this.begin('enabled')
    try {
      await this.scope.set('enabled', enabled)
    } catch {
      this.failed = true
    }
    this.settle()
  }

  /**
   * Request the permanent uninstall: persist `removed` — the Host then
   * unregisters every menu, stops the tray, deletes the generated scripts,
   * removes its own mount rows, and deletes the installed files. Returns
   * whether the request was persisted.
   */
  private async purge(): Promise<boolean> {
    const snapshot = this.scope.getSnapshot()
    if (!this.writableSnapshot(snapshot)) return false
    if (snapshot.value?.removed === true) return true
    this.begin('purge')
    try {
      await this.scope.set('removed', true)
      this.onPurged?.()
      return true
    } catch {
      this.failed = true
      return false
    } finally {
      this.settle()
    }
  }

  /** Whether a snapshot allows a write and none is in flight. */
  private writableSnapshot(snapshot: ScopeSnapshot): boolean {
    return snapshot.status === 'ready' && snapshot.writable && this.action === 'none'
  }

  private begin(action: PendingAction): void {
    this.action = action
    this.failed = false
    this.publish()
  }

  private settle(): void {
    this.action = 'none'
    this.publish()
  }

  private projection(): ShellIntegrationCardState {
    const snapshot = this.scope.getSnapshot()
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      saving: this.action !== 'none',
      failed: this.failed,
      enabled: snapshot.value?.enabled ?? false,
      removed: snapshot.value?.removed === true,
    }
  }

  private publish(): void {
    if (this.disposed) return
    this.store.set(this.projection())
  }
}
