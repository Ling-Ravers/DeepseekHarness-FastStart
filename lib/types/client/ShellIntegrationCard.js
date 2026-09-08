import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Settings card: "DSH 快捷开启". Rendered by the Plugins settings partition
 * under the `settings.plugin.item` key equal to the namespace this card edits
 * (`dsh-shell-integration`), matching Host-side registration.
 *
 * The card is an expandable row: the header toggles a body that holds the
 * quick-open switch and a "彻底删除" (uninstall) action. Uninstall asks through
 * a centered confirmation overlay and, on confirm, persists `removed` — the
 * Host then removes every context-menu entry, stops the tray, and deletes the
 * generated scripts/logs.
 */
import { useState } from 'react';
import { showConfirmOverlay } from "./overlay.js";
import css from './ShellIntegrationCard.module.css';
/** Join class names, dropping empty values (css-module lookups may be undefined under noUncheckedIndexedAccess). */
function cls(...parts) {
    return parts.filter(part => part !== undefined && part.length > 0).join(' ');
}
/**
 * Render the shell-integration card.
 * @param props - composed slot props.
 * @returns the card, or null when the Host does not serve it.
 */
export function ShellIntegrationCard(props) {
    const { t } = props;
    const state = props.useShellIntegration(snapshot => snapshot);
    const [open, setOpen] = useState(true);
    if (!state.available)
        return null;
    const switchClass = state.enabled ? cls(css.switch, css.switchOn) : css.switch;
    const confirmDelete = async () => {
        await showConfirmOverlay({
            title: t('deleteTitle'),
            prompt: t('deletePrompt'),
            accept: t('accept'),
            cancel: t('cancel'),
            working: t('working'),
            failed: t('failed'),
            danger: true,
            run: () => props.purge(),
        });
    };
    return (_jsxs("div", { className: css.card, children: [_jsxs("button", { type: "button", className: css.head, "aria-expanded": open, "aria-label": t('expandLabel'), onClick: () => { setOpen(current => !current); }, children: [_jsx("span", { className: css.title, children: t('title') }), _jsx("span", { className: open ? cls(css.chevron, css.chevronOpen) : css.chevron, "aria-hidden": "true", children: "\u25BE" })] }), open
                ? (_jsxs("div", { className: css.body, children: [_jsxs("div", { className: css.row, children: [_jsx("span", { className: css.rowLabel, children: t('toggleLabel') }), _jsx("button", { type: "button", role: "switch", "aria-checked": state.enabled, "aria-label": t('toggleLabel'), className: switchClass, disabled: !state.writable || state.saving, onClick: () => { props.setEnabled(!state.enabled); }, children: _jsx("span", { className: css.thumb }) })] }), _jsx("div", { className: cls(css.row, css.deleteRow), children: state.removed
                                ? _jsx("span", { className: css.note, role: "status", children: t('removedNote') })
                                : (_jsx("button", { type: "button", className: css.deleteButton, disabled: !state.writable || state.saving, onClick: () => { void confirmDelete(); }, children: t('deleteLabel') })) }), state.failed
                            ? _jsx("div", { className: cls(css.foot, css.error), role: "alert", children: t('failed') })
                            : state.saving
                                ? _jsx("div", { className: css.foot, role: "status", children: t('saving') })
                                : null] }))
                : null] }));
}
//# sourceMappingURL=ShellIntegrationCard.js.map