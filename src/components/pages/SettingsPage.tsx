import { useState } from 'react'
import { Sun, Shield, Database, Info, Trash2, Download, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

interface SettingsPageProps {
  isDark: boolean
  onThemeToggle: () => void
  onClearHistory: () => void
  onExportHistory: () => void
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-white/[0.05] last:border-0">
      <div>
        <p className="text-sm font-medium text-white/80">{label}</p>
        <p className="text-xs text-white/35 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full border transition-all duration-300 shrink-0',
          checked
            ? 'bg-brand-500/20 border-brand-500/40'
            : 'bg-white/[0.05] border-white/10'
        )}
      >
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full transition-colors duration-300',
            checked ? 'bg-brand-400 left-[calc(100%-22px)] shadow-lg shadow-brand-500/40' : 'bg-white/30 left-0.5'
          )}
        />
      </button>
    </div>
  )
}

export function SettingsPage({ isDark, onThemeToggle, onClearHistory, onExportHistory }: SettingsPageProps) {
  const [autoClear, setAutoClear] = useState(true)
  const [animations, setAnimations] = useState(true)
  const [rememberPath, setRememberPath] = useState(false)

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-sm text-white/40 mt-0.5">Customize SecureCrypt to your preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Appearance ── */}
        <Card>
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/[0.06]">
            <div className="w-9 h-9 rounded-lg bg-brand-500/15 border border-brand-500/20 flex items-center justify-center">
              <Sun size={16} className="text-brand-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">Appearance</h2>
          </div>

          <Toggle
            checked={isDark}
            onChange={onThemeToggle}
            label="Dark Mode"
            description="Use dark theme for the interface"
          />
          <Toggle
            checked={animations}
            onChange={setAnimations}
            label="Animations"
            description="Enable smooth UI transitions and micro-interactions"
          />
        </Card>

        {/* ── Security ── */}
        <Card>
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/[0.06]">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <Shield size={16} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">Security</h2>
          </div>

          <Toggle
            checked={autoClear}
            onChange={setAutoClear}
            label="Auto-clear Password"
            description="Clear password fields after successful encryption"
          />
          <Toggle
            checked={rememberPath}
            onChange={setRememberPath}
            label="Remember Output Path"
            description="Remember last used output folder (browser only)"
          />
        </Card>

        {/* ── Data Management ── */}
        <Card>
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/[0.06]">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
              <Database size={16} className="text-amber-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">Data Management</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <p className="text-sm font-medium text-white/80">Export History</p>
                <p className="text-xs text-white/35 mt-0.5">Download your operation log as JSON</p>
              </div>
              <Button variant="outline" size="sm" onClick={onExportHistory}>
                <Download size={13} />
                Export
              </Button>
            </div>
            <div className="h-px bg-white/[0.05]" />
            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <p className="text-sm font-medium text-white/80">Clear History</p>
                <p className="text-xs text-white/35 mt-0.5">Permanently delete all operation records</p>
              </div>
              <Button variant="danger" size="sm" onClick={onClearHistory}>
                <Trash2 size={13} />
                Clear
              </Button>
            </div>
          </div>
        </Card>

        {/* ── About ── */}
        <Card>
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/[0.06]">
            <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
              <Info size={16} className="text-purple-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">About SecureCrypt</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-brand-500/20 flex items-center justify-center">
                <Shield size={22} className="text-brand-400" />
              </div>
              <div>
                <p className="text-base font-bold text-white">SecureCrypt</p>
                <p className="text-xs text-white/40 font-mono">v1.0.0 — Web Edition</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { k: 'Encryption',    v: 'AES-256-GCM' },
                { k: 'Key Derivation', v: 'PBKDF2-SHA256' },
                { k: 'Iterations',    v: '100,000' },
                { k: 'Auth Tag',      v: '128-bit GCM' },
                { k: 'Salt',          v: '128-bit random' },
                { k: 'Platform',      v: 'Web Crypto API' },
              ].map(({ k, v }) => (
                <div key={k} className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-2.5">
                  <p className="text-[10px] text-white/35 uppercase tracking-wider">{k}</p>
                  <p className="text-xs font-bold text-brand-300 font-mono mt-0.5">{v}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 p-3 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl">
              <Zap size={12} className="text-emerald-400 shrink-0" />
              <p className="text-xs text-white/45">
                100% browser-side encryption — your files never leave your device.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
