import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, RefreshCw } from 'lucide-react'
import { scorePassword, generateSecurePassword } from '../../lib/crypto'
import { cn } from '../../lib/utils'

interface PasswordInputProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  showStrength?: boolean
  showGenerator?: boolean
  confirm?: boolean
  confirmValue?: string
  onConfirmChange?: (val: string) => void
  label?: string
  id?: string
}

const strengthConfig = [
  { label: 'Weak',   color: 'bg-red-500',    textColor: 'text-red-400',     width: 'w-1/4' },
  { label: 'Fair',   color: 'bg-amber-500',   textColor: 'text-amber-400',   width: 'w-2/4' },
  { label: 'Good',   color: 'bg-blue-500',    textColor: 'text-blue-400',    width: 'w-3/4' },
  { label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-400', width: 'w-full' },
]

export function PasswordInput({
  value,
  onChange,
  placeholder = 'Enter password...',
  showStrength = false,
  showGenerator = false,
  confirm = false,
  confirmValue = '',
  onConfirmChange,
  label,
  id,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const [confirmVisible, setConfirmVisible] = useState(false)

  const score = value ? scorePassword(value) : -1
  const strength = score >= 0 ? strengthConfig[score] : null

  const passwordsMatch = confirm ? (value === confirmValue) : true
  const showMismatch = confirm && confirmValue.length > 0 && !passwordsMatch

  return (
    <div className="space-y-3">
      {/* ── Main Password ── */}
      <div>
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={id}
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            autoComplete="new-password"
            className={cn(
              'w-full h-11 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 pr-10',
              'text-sm text-white placeholder:text-white/25 font-mono',
              'focus:outline-none focus:border-brand-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-brand-500/15',
              'transition-all duration-200'
            )}
          />
          <button
            type="button"
            onClick={() => setVisible(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
            tabIndex={-1}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* ── Strength Meter ── */}
      {showStrength && value && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1.5"
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full strength-bar-fill', strength?.color ?? 'bg-white/20')}
                initial={{ width: 0 }}
                animate={{ width: strength ? undefined : '0%' }}
                style={{ width: strength ? undefined : '0%' }}
              >
                {/* Tailwind width classes are applied dynamically */}
                <div className={cn('h-full', strength?.color, strength?.width ?? 'w-0')} />
              </motion.div>
            </div>
            <span className={cn('text-xs font-semibold w-12 text-right', strength?.textColor ?? 'text-white/30')}>
              {strength?.label ?? '—'}
            </span>
          </div>
          <div className="flex gap-1">
            {[0,1,2,3].map(i => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-all duration-400',
                  i <= score ? strengthConfig[score].color : 'bg-white/[0.06]'
                )}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Generator Button ── */}
      {showGenerator && (
        <button
          type="button"
          onClick={() => {
            const pwd = generateSecurePassword(20)
            onChange(pwd)
            if (onConfirmChange) onConfirmChange(pwd)
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors group"
        >
          <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
          Generate secure password
        </button>
      )}

      {/* ── Confirm Password ── */}
      {confirm && (
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={confirmVisible ? 'text' : 'password'}
              value={confirmValue}
              onChange={e => onConfirmChange?.(e.target.value)}
              placeholder="Confirm your password..."
              autoComplete="new-password"
              className={cn(
                'w-full h-11 bg-white/[0.04] border rounded-xl px-4 pr-10',
                'text-sm text-white placeholder:text-white/25 font-mono',
                'focus:outline-none focus:ring-2 transition-all duration-200',
                showMismatch
                  ? 'border-red-500/40 focus:border-red-500/60 focus:ring-red-500/15'
                  : confirmValue && passwordsMatch
                  ? 'border-emerald-500/40 focus:border-emerald-500/60 focus:ring-emerald-500/15'
                  : 'border-white/[0.08] focus:border-brand-500/50 focus:ring-brand-500/15'
              )}
            />
            <button
              type="button"
              onClick={() => setConfirmVisible(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
              tabIndex={-1}
            >
              {confirmVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <AnimatedHint
            show={!!confirmValue}
            match={passwordsMatch}
          />
        </div>
      )}
    </div>
  )
}

function AnimatedHint({ show, match }: { show: boolean; match: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={{ height: show ? 'auto' : 0, opacity: show ? 1 : 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <p className={cn(
        'text-xs font-medium mt-1.5',
        match ? 'text-emerald-400' : 'text-red-400'
      )}>
        {match ? '✓ Passwords match' : '✗ Passwords do not match'}
      </p>
    </motion.div>
  )
}
