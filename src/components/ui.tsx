import { useEffect, type ReactNode } from 'react'

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
  return <h2 className={`font-pixel text-[13px] text-accent uppercase mb-2 ${className}`}>{children}</h2>
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
  return <span className={`inline-block font-pixel text-[9px] px-1.5 py-1 leading-none uppercase ${map[color]} ${className}`}>{children}</span>
}

export function Bar({ value, max, color = 'var(--xp)', height = 14, className = '' }: { value: number; max: number; color?: string; height?: number; className?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  // Chunky segmented bar
  return (
    <div className={`relative bg-bg-2 border-[3px] border-ink/80 ${className}`} style={{ height }}>
      <div className="absolute inset-y-0 left-0 transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
      <div
        className="absolute inset-0"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 10px, rgb(0 0 0 / 0.35) 10px 12px)' }}
      />
    </div>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex items-center gap-3 min-h-[48px] w-full text-left">
      <span className={`relative inline-block w-14 h-8 border-[3px] ${on ? 'bg-accent border-ink' : 'bg-bg-2 border-edge'}`}>
        <span className={`absolute top-0.5 w-5 h-5 bg-ink transition-[left] duration-100 ${on ? 'left-7' : 'left-0.5'}`} />
      </span>
      {label && <span className="flex-1">{label}</span>}
    </button>
  )
}

export function Check({ on, onChange, children, disabled }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={() => onChange(!on)} className="flex items-center gap-3 min-h-[48px] w-full text-left py-1">
      <span className={`shrink-0 w-8 h-8 border-[3px] grid place-items-center font-pixel text-xs ${on ? 'bg-accent border-ink text-accent-ink' : 'bg-bg-2 border-edge'}`}>{on ? '✓' : ''}</span>
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
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70" onClick={onClose}>
      <div
        className="anim-slide-up bg-panel border-t-4 border-accent max-h-[88vh] overflow-y-auto pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-panel flex items-center justify-between px-4 py-3 border-b-4 border-edge z-10">
          <div className="font-pixel text-[12px] text-accent uppercase">{title}</div>
          <button onClick={onClose} className="font-pixel text-sm w-11 h-11 grid place-items-center bg-panel-2" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export function NumField({
  value,
  onChange,
  placeholder,
  step = 1,
  label,
  className = '',
  decimal = true,
}: {
  value: number | null | undefined
  onChange: (v: number | null) => void
  placeholder?: string
  step?: number
  label?: string
  className?: string
  decimal?: boolean
}) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="block text-sm text-muted mb-1">{label}</span>}
      <input
        className="px-input text-center"
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={value ?? ''}
        step={step}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value.replace(',', '.')
          if (raw === '') return onChange(null)
          const n = Number(raw)
          if (!Number.isNaN(n)) onChange(n)
        }}
      />
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
            className={`flex-1 h-12 font-pixel text-sm border-[3px] ${n <= value ? 'bg-xp text-black border-ink' : 'bg-bg-2 border-edge text-muted'}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
