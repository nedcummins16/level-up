import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { isNumberDraft, parseNumberText } from '../lib/numbers'

export function Panel({ children, className = '', accent = false, onClick }: { children: ReactNode; className?: string; accent?: boolean; onClick?: () => void }) {
  return (
    <div className={`px-box ${accent ? 'px-box-accent' : ''} p-3 ${className}`} onClick={onClick}>
      {children}
    </div>
  )
}

type BtnVariant = 'primary' | 'ghost' | 'danger' | 'gold'

export function Btn({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled,
  type = 'button',
  small,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: BtnVariant
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
  small?: boolean
}) {
  const v = variant === 'ghost' ? 'px-btn-ghost' : variant === 'danger' ? 'px-btn-danger' : variant === 'gold' ? 'px-btn-gold' : ''
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`px-btn ${v} ${small ? '!min-h-[44px] !text-[11px] !px-3' : ''} ${className}`}>
      {children}
    </button>
  )
}

export function H({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h2 className={`font-pixel text-[13px] tracking-[0.22em] text-accent uppercase mb-2 ${className}`}>{children}</h2>
}

export function Badge({ children, color = 'accent', className = '' }: { children: ReactNode; color?: 'accent' | 'xp' | 'muted' | 'danger' | 'good' | 'accent-2'; className?: string }) {
  const map = {
    accent: 'bg-accent text-accent-ink',
    xp: 'bg-xp text-black',
    muted: 'bg-panel-2 text-muted',
    danger: 'bg-danger text-white',
    good: 'bg-good text-black',
    'accent-2': 'bg-accent-2 text-black',
  }
  return <span className={`cut-sm inline-block font-pixel text-[11px] tracking-[0.12em] px-2 py-1.5 leading-none uppercase ${map[color]} ${className}`}>{children}</span>
}

export function Bar({ value, max, color = 'var(--accent)', height = 8, className = '' }: { value: number; max: number; color?: string; height?: number; className?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className={`relative bg-panel-2 ${className}`} style={{ height }}>
      <div className="absolute inset-y-0 left-0 transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex items-center gap-3 min-h-[48px] w-full text-left">
      <span className={`cut-sm relative inline-block w-14 h-8 ${on ? 'bg-accent' : 'bg-panel-2'}`}>
        <span className={`absolute top-1.5 w-5 h-5 transition-[left] duration-100 ${on ? 'left-7 bg-accent-ink' : 'left-1.5 bg-muted'}`} />
      </span>
      {label && <span className="flex-1">{label}</span>}
    </button>
  )
}

export function Check({ on, onChange, children, disabled }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!on)} className="flex items-center gap-3 min-h-[48px] w-full text-left py-1">
      <span className={`cut-sm shrink-0 w-8 h-8 grid place-items-center font-pixel text-sm ${on ? 'bg-good text-accent-ink' : 'bg-panel-2 border-b-2 border-edge'}`}>{on ? '✓' : ''}</span>
      <span className={`flex-1 ${on ? 'text-muted line-through' : ''}`}>{children}</span>
    </button>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
  if (!open) return null
  // Portal to <body>: panels use clip-path, which would otherwise clip the sheet.
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70" onClick={onClose}>
      <div
        className="anim-slide-up bg-panel border-t-[3px] border-accent max-h-[88vh] overflow-y-auto pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-panel flex items-center justify-between px-4 py-3 border-b border-edge z-10">
          <div className="font-pixel text-[16px] text-accent uppercase">{title}</div>
          <button onClick={onClose} className="cut-sm font-pixel text-sm w-11 h-11 grid place-items-center bg-panel-2" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * A number box that keeps what you're typing, so "58." stays on screen until you add the 4.
 * Calls onChange with the number (null when empty).
 */
export function NumberInput({
  value,
  onChange,
  decimal = true,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> & {
  value: number | null | undefined
  onChange: (v: number | null) => void
  decimal?: boolean
}) {
  const v = value ?? null
  const [text, setText] = useState(v === null ? '' : String(v))
  const [seen, setSeen] = useState(v)
  // The value changed from outside (e.g. a new suggestion): show it, unless it's what we're typing.
  if (v !== seen) {
    setSeen(v)
    if (parseNumberText(text) !== v) setText(v === null ? '' : String(v))
  }
  return (
    <input
      {...rest}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={text}
      onChange={(e) => {
        const t = e.target.value
        if (!isNumberDraft(t, decimal)) return
        setText(t)
        const n = parseNumberText(t)
        if (n !== undefined) onChange(n)
      }}
    />
  )
}

export function NumField({
  value,
  onChange,
  placeholder,
  label,
  className = '',
  decimal = true,
}: {
  value: number | null | undefined
  onChange: (v: number | null) => void
  placeholder?: string
  label?: string
  className?: string
  decimal?: boolean
}) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-sm text-muted mb-1">{label}</span>}
      <NumberInput className="px-input text-center" value={value} onChange={onChange} placeholder={placeholder} decimal={decimal} />
    </label>
  )
}

export function Stars({ value, onChange, max = 5, label }: { value: number; onChange: (v: number) => void; max?: number; label: string }) {
  return (
    <div className="mb-3">
      <div className="text-sm text-muted mb-1">{label}</div>
      <div className="flex gap-2">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`cut-sm flex-1 h-12 font-pixel text-base ${n <= value ? 'bg-accent text-accent-ink' : 'bg-panel-2 text-muted'}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
