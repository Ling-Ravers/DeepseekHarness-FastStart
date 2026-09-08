/**
 * Card controller: mirrors the bound `dsh-shell-integration` settings scope
 * into a snapshot store and writes the switch or the uninstall request
 * immediately (like a preference row) instead of staging a multi-field draft.
 */
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { ShellSettings } from '../shared/settings.ts';
/** Minimal projection of the settings scope used by this card. */
export interface ShellIntegrationCardState {
    /** Whether the Host serves the namespace (card renderable). */
    available: boolean;
    /** Whether the current settings document is writable. */
    writable: boolean;
    /** Whether a write is in flight. */
    saving: boolean;
    /** Whether the last write failed. */
    failed: boolean;
    /** Effective `enabled` value (user layer or composition default). */
    enabled: boolean;
    /** Effective `removed` value: the integration has been fully uninstalled. */
    removed: boolean;
}
/** Registration-side face injected into the card renderer. */
export interface ShellIntegrationCardFace {
    hooks: {
        /** Card snapshot bound by the renderer as `useShellIntegration`. */
        shellIntegration: SnapshotStore<ShellIntegrationCardState>;
    };
    /** Persist one switch state immediately (reinstalls when currently removed). */
    setEnabled: (enabled: boolean) => void;
    /** Request a full uninstall (menus, tray, scripts). Resolves to success. */
    purge: () => Promise<boolean>;
}
/** Structural subset of the scope snapshot this controller reads. */
interface ScopeSnapshot {
    status: string;
    writable: boolean;
    revision: number;
    value?: Partial<ShellSettings>;
}
/** Structural subset of the bound settings scope. */
export interface BoundScope {
    getSnapshot(): ScopeSnapshot;
    subscribe(listener: () => void): () => void;
    set(field: string, value: unknown): Promise<unknown>;
}
/**
 * Bridge one settings scope onto the expandable integration card.
 * @param scope - bound settings scope for the integration namespace.
 */
export declare class ShellIntegrationCardController {
    private readonly scope;
    private readonly store;
    private readonly unsubscribe;
    private action;
    private failed;
    /** @param scope - bound settings scope for the integration namespace. */
    constructor(scope: BoundScope);
    /** Stop observing settings and suppress late write settlements. */
    dispose(): void;
    /** Build the renderer face for this card. */
    inject(): ShellIntegrationCardFace;
    /**
     * Flip the quick-open switch. Enabling from the uninstalled state clears
     * `removed` first (reinstall), then persists `enabled` — the Host registers
     * the menu and starts the tray once both land.
     */
    private setEnabled;
    /**
     * Full uninstall: persist `removed` (the Host then unregisters every menu,
     * stops the tray, and deletes the generated scripts/logs). Returns whether
     * the request was persisted.
     */
    private purge;
    /** Whether a snapshot allows a write and none is in flight. */
    private writableSnapshot;
    private begin;
    private settle;
    private projection;
    private publish;
}
export {};
//# sourceMappingURL=card-controller.d.ts.map