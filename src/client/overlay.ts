/**
 * Centered confirmation overlay, built with plain DOM so no extra renderer
 * dependency rides the card bundle. Shared by the `?dsh-open=<path>` deep-link
 * prompt and the card's uninstall confirmation.
 */

import css from './Overlay.module.css'

/** Human copy for one confirmation overlay. */
export interface OverlayCopy {
  title: string
  /** Optional explanatory paragraph under the title. */
  prompt?: string
  /** Optional monospace body block (e.g. the deep-linked folder path). */
  body?: string
  accept: string
  cancel: string
  /** Shown while {@link run} is in flight. */
  working: string
  /** Shown when {@link run} resolved false; the dialog stays open. */
  failed: string
}

/** Options for {@link showConfirmOverlay}. */
export interface ConfirmOverlayOptions extends OverlayCopy {
  /** Emphasize the confirm button with the destructive palette. */
  danger?: boolean
  /**
   * The action to run on confirm. Resolve true to close the dialog; resolve
   * false to keep it open and surface {@link failed}.
   */
  run: () => Promise<boolean>
}

/** Join class names, dropping empty values (css-module lookups may be undefined under noUncheckedIndexedAccess). */
function cls(...parts: Array<string | undefined>): string {
  return parts.filter(part => part !== undefined && part.length > 0).join(' ')
}

let dialogSequence = 0

/**
 * Show one centered confirmation dialog and resolve when it closes (either
 * the confirm action succeeded or the user cancelled). Escape and a backdrop
 * click cancel; Escape also fires when the confirm button is focused.
 * @param options - copy and the confirm action.
 * @returns a promise settling once the dialog is removed.
 */
export function showConfirmOverlay(options: ConfirmOverlayOptions): Promise<void> {
  return new Promise((resolveClose) => {
    if (typeof document === 'undefined') {
      resolveClose()
      return
    }
    const sequence = dialogSequence++
    const titleId = `dsh-confirm-title-${sequence}`

    const backdrop = document.createElement('div')
    backdrop.className = cls(css.backdrop)
    backdrop.setAttribute('role', 'dialog')
    backdrop.setAttribute('aria-modal', 'true')
    backdrop.setAttribute('aria-labelledby', titleId)

    const card = document.createElement('div')
    card.className = cls(css.card)

    const title = document.createElement('div')
    title.id = titleId
    title.className = cls(css.title)
    title.textContent = options.title

    card.append(title)

    if (options.prompt !== undefined) {
      const prompt = document.createElement('div')
      prompt.className = cls(css.prompt)
      prompt.textContent = options.prompt
      card.append(prompt)
    }
    if (options.body !== undefined) {
      const body = document.createElement('div')
      body.className = cls(css.path)
      body.textContent = options.body
      card.append(body)
    }

    const status = document.createElement('div')
    status.className = cls(css.status)
    status.setAttribute('role', 'status')

    const actions = document.createElement('div')
    actions.className = cls(css.actions)

    const cancelButton = document.createElement('button')
    cancelButton.type = 'button'
    cancelButton.className = cls(css.button, css.secondary)
    cancelButton.textContent = options.cancel

    const confirmButton = document.createElement('button')
    confirmButton.type = 'button'
    confirmButton.className = cls(css.button, options.danger === true ? css.danger : css.primary)
    confirmButton.textContent = options.accept

    actions.append(cancelButton, confirmButton)
    card.append(status, actions)
    backdrop.append(card)
    document.body.append(backdrop)
    confirmButton.focus()

    let closed = false
    const close = (): void => {
      if (closed) return
      closed = true
      document.removeEventListener('keydown', onKeyDown)
      backdrop.remove()
      resolveClose()
    }
    const cancel = (): void => { close() }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') cancel()
    }
    document.addEventListener('keydown', onKeyDown)
    backdrop.addEventListener('mousedown', (event) => {
      if (event.target === backdrop) cancel()
    })

    const confirm = async (): Promise<void> => {
      confirmButton.disabled = true
      cancelButton.disabled = true
      status.textContent = options.working
      const ok = await options.run()
      if (ok) {
        close()
        return
      }
      status.textContent = options.failed
      status.className = cls(css.status, css.error)
      confirmButton.disabled = false
      cancelButton.disabled = false
    }
    confirmButton.addEventListener('click', () => { void confirm() })
    cancelButton.addEventListener('click', cancel)
  })
}
