/**
 * Settings card: "DSH 快捷开启". Rendered by the Plugins settings partition
 * under the `settings.plugin.item` key equal to the namespace this card edits
 * (`dsh-shell-integration`), matching Host-side registration.
 *
 * The card mirrors the Plugins block's own card chrome (name + state chip +
 * chevron header, disclosing controls in place): the header toggles a body
 * that holds the quick-open switch and the "彻底删除" (delete) action. The
 * trailing chip reports the live state (已启用 / 已停用). Deleting is a real
 * uninstall, not a disable: it asks through a centered confirmation overlay
 * and, on confirm, persists `removed` — the Host then removes every
 * context-menu entry, stops the tray, deletes the generated scripts/logs and
 * installed files, and removes this plugin's own mount rows so it never loads
 * again. As soon as `removed` lands the card unmounts itself (and the
 * registration side drops the slot entry), so no placeholder remains.
 */

import { useId, useState } from 'react'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ShellIntegrationCardFace } from './card-controller.ts'
import { LOCALE_NS, type ShellLocaleKey } from './locales.ts'
import { showConfirmOverlay } from './overlay.ts'
import css from './ShellIntegrationCard.module.css'

/** Full component props for the shell-integration settings card. */
type ShellIntegrationCardProps =
  InjectFace<ShellIntegrationCardFace>
  & PropsLocale<typeof LOCALE_NS>

/** Join class names, dropping empty values (css-module lookups may be undefined under noUncheckedIndexedAccess). */
function cls(...parts: Array<string | undefined>): string {
  return parts.filter(part => part !== undefined && part.length > 0).join(' ')
}

/**
 * Outline chevron-down glyph identical to the Plugins block's card chevron
 * (`IconChevronDownOutline14`); the header rotates it 180° while open.
 */
function ChevronDown({ className }: { className: string | undefined }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

/**
 * Render the shell-integration card.
 * @param props - composed slot props.
 * @returns the card, or null when the Host does not serve it or the plugin
 * was permanently uninstalled (`removed`).
 */
export function ShellIntegrationCard(props: ShellIntegrationCardProps) {
  const { t } = props
  const state = props.useShellIntegration(snapshot => snapshot)
  const bodyId = useId()
  const [open, setOpen] = useState(false)
  // A permanent uninstall hides the card entirely: no "已卸载" placeholder, no
  // reinstall switch — the plugin is gone once the Host finishes and restarts.
  if (!state.available || state.removed) return null

  const chipState = state.enabled
    ? { label: t('enabledTag'), kind: 'enabled' as const }
    : { label: t('disabledTag'), kind: 'disabled' as const }

  const switchClass = state.enabled ? cls(css.switch, css.switchOn) : css.switch
  const confirmDelete = async (): Promise<void> => {
    await showConfirmOverlay({
      title: t('deleteTitle'),
      prompt: t('deletePrompt'),
      accept: t('accept'),
      cancel: t('cancel'),
      working: t('working'),
      failed: t('failed'),
      danger: true,
      run: () => props.purge(),
    })
  }

  return (
    <li className={open ? cls(css.card, css.cardOpen) : css.card}>
      <button
        type="button"
        className={css.header}
        aria-expanded={open}
        aria-controls={bodyId}
        aria-label={`${t('expandLabel')}: ${t('title')}`}
        onClick={() => { setOpen(current => !current) }}
      >
        <span className={css.headText}>
          <span className={css.name}>{t('title')}</span>
        </span>
        <span className={css.tag} data-kind={chipState.kind}>{chipState.label}</span>
        <ChevronDown
          className={open ? cls(css.chevron, css.chevronOpen) : css.chevron}
        />
      </button>
      {open
        ? (
          <div className={css.body} id={bodyId}>
            <div className={css.row}>
              <span className={css.rowLabel}>{t('toggleLabel')}</span>
              <button
                type="button"
                role="switch"
                aria-checked={state.enabled}
                aria-label={t('toggleLabel')}
                className={switchClass}
                disabled={!state.writable || state.saving}
                onClick={() => { props.setEnabled(!state.enabled) }}
              >
                <span className={css.thumb} />
              </button>
            </div>
            <div className={css.footer}>
              {state.failed
                ? <p className={css.failed} role="alert">{t('failed')}</p>
                : state.saving
                  ? <p className={css.note} role="status">{t('saving')}</p>
                  : <span className={css.spacer} />}
              <button
                type="button"
                className={css.danger}
                disabled={!state.writable || state.saving}
                onClick={() => { void confirmDelete() }}
              >
                {t('deleteLabel')}
              </button>
            </div>
          </div>
        )
        : null}
    </li>
  )
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Shell-integration card copy. */
    [LOCALE_NS]: ShellLocaleKey
  }
}
