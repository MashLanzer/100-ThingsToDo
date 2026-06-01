export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  emoji?: string
}

type ShowFn = (opts: ConfirmOptions) => Promise<boolean>
let _show: ShowFn | null = null

export function registerConfirm(fn: ShowFn) { _show = fn }

export function showConfirm(opts: ConfirmOptions): Promise<boolean> {
  if (_show) return _show(opts)
  return Promise.resolve(window.confirm(opts.message ?? opts.title))
}
