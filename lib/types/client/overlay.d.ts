/**
 * Centered confirmation overlay, built with plain DOM so no extra renderer
 * dependency rides the card bundle. Shared by the `?dsh-open=<path>` deep-link
 * prompt and the card's uninstall confirmation.
 */
/** Human copy for one confirmation overlay. */
export interface OverlayCopy {
    title: string;
    /** Optional explanatory paragraph under the title. */
    prompt?: string;
    /** Optional monospace body block (e.g. the deep-linked folder path). */
    body?: string;
    accept: string;
    cancel: string;
    /** Shown while {@link run} is in flight. */
    working: string;
    /** Shown when {@link run} resolved false; the dialog stays open. */
    failed: string;
}
/** Options for {@link showConfirmOverlay}. */
export interface ConfirmOverlayOptions extends OverlayCopy {
    /** Emphasize the confirm button with the destructive palette. */
    danger?: boolean;
    /**
     * The action to run on confirm. Resolve true to close the dialog; resolve
     * false to keep it open and surface {@link failed}.
     */
    run: () => Promise<boolean>;
}
/**
 * Show one centered confirmation dialog and resolve when it closes (either
 * the confirm action succeeded or the user cancelled). Escape and a backdrop
 * click cancel; Escape also fires when the confirm button is focused.
 * @param options - copy and the confirm action.
 * @returns a promise settling once the dialog is removed.
 */
export declare function showConfirmOverlay(options: ConfirmOverlayOptions): Promise<void>;
//# sourceMappingURL=overlay.d.ts.map