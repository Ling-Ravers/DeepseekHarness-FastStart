/**
 * Card controller: mirrors the bound `dsh-shell-integration` settings scope
 * into a snapshot store and writes the switch or the uninstall request
 * immediately (like a preference row) instead of staging a multi-field draft.
 */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store';
/**
 * Bridge one settings scope onto the expandable integration card.
 * @param scope - bound settings scope for the integration namespace.
 */
export class ShellIntegrationCardController {
    scope;
    store;
    unsubscribe;
    action = 'none';
    failed = false;
    /** @param scope - bound settings scope for the integration namespace. */
    constructor(scope) {
        this.scope = scope;
        this.store = createSnapshotStore(this.projection());
        this.unsubscribe = scope.subscribe(() => { this.publish(); });
    }
    /** Stop observing settings and suppress late write settlements. */
    dispose() {
        this.unsubscribe();
    }
    /** Build the renderer face for this card. */
    inject() {
        return {
            hooks: { shellIntegration: this.store },
            setEnabled: (enabled) => { void this.setEnabled(enabled); },
            purge: () => this.purge(),
        };
    }
    /**
     * Flip the quick-open switch. Enabling from the uninstalled state clears
     * `removed` first (reinstall), then persists `enabled` — the Host registers
     * the menu and starts the tray once both land.
     */
    async setEnabled(enabled) {
        const snapshot = this.scope.getSnapshot();
        if (!this.writableSnapshot(snapshot))
            return;
        const removed = snapshot.value?.removed === true;
        if (snapshot.value?.enabled === enabled && (!enabled || !removed))
            return;
        this.begin('enabled');
        try {
            if (enabled && removed)
                await this.scope.set('removed', false);
            if (snapshot.value?.enabled !== enabled)
                await this.scope.set('enabled', enabled);
        }
        catch {
            this.failed = true;
        }
        this.settle();
    }
    /**
     * Full uninstall: persist `removed` (the Host then unregisters every menu,
     * stops the tray, and deletes the generated scripts/logs). Returns whether
     * the request was persisted.
     */
    async purge() {
        const snapshot = this.scope.getSnapshot();
        if (!this.writableSnapshot(snapshot))
            return false;
        if (snapshot.value?.removed === true)
            return true;
        this.begin('purge');
        try {
            await this.scope.set('removed', true);
            await this.scope.set('enabled', false);
            return true;
        }
        catch {
            this.failed = true;
            return false;
        }
        finally {
            this.settle();
        }
    }
    /** Whether a snapshot allows a write and none is in flight. */
    writableSnapshot(snapshot) {
        return snapshot.status === 'ready' && snapshot.writable && this.action === 'none';
    }
    begin(action) {
        this.action = action;
        this.failed = false;
        this.publish();
    }
    settle() {
        this.action = 'none';
        this.publish();
    }
    projection() {
        const snapshot = this.scope.getSnapshot();
        return {
            available: snapshot.status === 'ready',
            writable: snapshot.writable,
            saving: this.action !== 'none',
            failed: this.failed,
            enabled: snapshot.value?.enabled ?? false,
            removed: snapshot.value?.removed === true,
        };
    }
    publish() {
        this.store.set(this.projection());
    }
}
//# sourceMappingURL=card-controller.js.map