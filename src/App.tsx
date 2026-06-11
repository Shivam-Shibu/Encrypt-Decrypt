import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Lock, Unlock, History, Settings, Shield,
  ShieldCheck, Menu, X, Sun, Moon
} from 'lucide-react'
import { ToastProvider, useToast } from './components/ui/Toast'
import { EncryptPage } from './components/pages/EncryptPage'
import { DecryptPage } from './components/pages/DecryptPage'
import { HistoryPage } from './components/pages/HistoryPage'
import { SettingsPage } from './components/pages/SettingsPage'
import { useHistory } from './hooks/useHistory'
import { cn } from './lib/utils'
import { CyberBackdrop } from './components/ui/CyberBackdrop'

type Page = 'encrypt' | 'decrypt' | 'history' | 'settings'

const NAV_ITEMS = [
  { id: 'encrypt'  as Page, label: 'Encrypt Asset',  icon: Lock,     section: 'Operations' },
  { id: 'decrypt'  as Page, label: 'Decrypt Asset',  icon: Unlock,   section: 'Operations' },
  { id: 'history'  as Page, label: 'Audit Log',      icon: History,  section: 'Administration' },
  { id: 'settings' as Page, label: 'Console Config', icon: Settings, section: 'Administration' },
]

const pageVariants = {
  initial: { 
    opacity: 0, 
    rotateX: 4,
    rotateY: 8, 
    z: -40,
    transformPerspective: 1000 
  },
  animate: { 
    opacity: 1, 
    rotateX: 0,
    rotateY: 0, 
    z: 0, 
    transformPerspective: 1000,
    transition: { 
      duration: 0.4, 
      ease: [0.25, 1, 0.5, 1] 
    } 
  },
  exit: { 
    opacity: 0, 
    rotateX: -4,
    rotateY: -8, 
    z: -40, 
    transformPerspective: 1000,
    transition: { 
      duration: 0.3, 
      ease: [0.25, 1, 0.5, 1] 
    } 
  },
}

function AppInner() {
  const [page, setPage]           = useState<Page>('encrypt')
  const [isDark, setIsDark]       = useState(true)
  const [sidebarOpen, setSidebar] = useState(false)
  const { records, addRecord, clearHistory, exportHistory } = useHistory()
  const { toast } = useToast()

  const sections = ['Operations', 'Administration']

  function handleClearHistory() {
    clearHistory()
    toast('Audit log cleared', 'info')
  }

  function handleExportHistory() {
    exportHistory(records)
    toast('Audit log exported', 'success')
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-[#111111] z-10">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Shield size={16} className="text-black" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-bold text-white tracking-tight leading-none">SecureCrypt</p>
          <p className="text-[9px] text-slate-500 font-mono mt-1">SaaS CONSOLE v1.0.0</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        {sections.map(section => (
          <div key={section}>
            <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
              {section}
            </p>
            <div className="space-y-0.5">
              {NAV_ITEMS.filter(n => n.section === section).map(item => {
                const Icon = item.icon
                const isActive = page === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => { setPage(item.id); setSidebar(false) }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold',
                      'transition-all duration-200 text-left relative group',
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/15'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
                    )}
                  >
                    <Icon size={14} className={isActive ? 'text-emerald-400' : 'text-current'} />
                    <span>{item.label}</span>
                    {item.id === 'history' && records.length > 0 && (
                      <span className="ml-auto text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-md px-1.5 py-0.5 leading-none">
                        {records.length}
                      </span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="active-indicator"
                        className="absolute right-2.5 w-1 h-1 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer info in sidebar */}
      <div className="p-4 border-t border-white/[0.06] space-y-3">
        {/* Security status */}
        <div className="flex items-center gap-2.5 px-3 py-2 bg-emerald-950/20 border border-emerald-800/25 rounded-xl">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-emerald-300 leading-none">Zero-Trust Active</p>
            <p className="text-[8px] font-mono text-emerald-400/50 mt-1 truncate">AES-256-GCM LOCAL</p>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        {/* Privacy note */}
        <p className="text-[9px] text-slate-500 text-center px-1 leading-relaxed">
          Cryptographic processes run entirely offline in local memory.
        </p>
      </div>
    </div>
  )

  return (
    <div className={cn('min-h-screen ambient-bg relative overflow-hidden preserve-3d', isDark ? 'dark' : 'light')}>
      {/* High-Performance Cyber Backdrop */}
      <CyberBackdrop />

      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebar(false)}
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-56 border-r border-white/[0.06] z-30">
        {sidebar}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -240 }}
            animate={{ x: 0 }}
            exit={{ x: -240 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed left-0 top-0 bottom-0 w-56 z-50 lg:hidden flex flex-col"
            style={{ background: '#111111', borderRight: '1px solid rgba(255,255,255,0.08)' }}
          >
            {sidebar}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="lg:pl-56 flex flex-col min-h-screen relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-5 h-14 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <button
              onClick={() => setSidebar(v => !v)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.04] text-slate-400 hover:text-white transition-all"
            >
              {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
              <span className="text-slate-500 hidden sm:inline">SecureCrypt</span>
              <span className="text-slate-600 hidden sm:inline">/</span>
              <span className="font-semibold text-emerald-400 capitalize">{page}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Security indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-mono font-bold text-emerald-300 uppercase tracking-wider">AES-256-GCM Active</span>
            </div>

            {/* Theme toggle (kept for compatibility, stylized for SaaS console) */}
            <button
              onClick={() => setIsDark(v => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.02] border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all"
              title="Toggle theme"
            >
              {isDark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
            
            {/* Left 3 columns: Hero Header + Operation pages */}
            <div className="xl:col-span-3 space-y-6">
              
              {/* Premium Cybersecurity Hero Header */}
              <div className="border border-white/[0.06] bg-white/[0.01] rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[9px] font-mono font-bold tracking-widest text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2.5 py-1 rounded-md uppercase">
                      SECURECRYPT // CORE PROTOCOL ACTIVE
                    </span>
                    <h1 className="text-xl font-bold tracking-tight text-white mt-3">
                      Zero-Trust Cryptographic Asset Controller
                    </h1>
                    <p className="text-xs text-slate-400 mt-1.5 max-w-xl leading-relaxed">
                      Derive strong verification keys and encrypt or decrypt files in sandbox browser memory. No data is stored, and no server connections are made.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[9px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                      sandbox mode
                    </span>
                  </div>
                </div>
              </div>

              {/* Operations Forms */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  {page === 'encrypt' && (
                    <EncryptPage onHistoryAdd={addRecord} />
                  )}
                  {page === 'decrypt' && (
                    <DecryptPage onHistoryAdd={addRecord} />
                  )}
                  {page === 'history' && (
                    <HistoryPage
                      records={records}
                      onClear={handleClearHistory}
                      onExport={handleExportHistory}
                    />
                  )}
                  {page === 'settings' && (
                    <SettingsPage
                      isDark={isDark}
                      onThemeToggle={() => setIsDark(v => !v)}
                      onClearHistory={handleClearHistory}
                      onExportHistory={handleExportHistory}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right 1 column: Security Insights / Compliance Panel */}
            <div className="xl:col-span-1 space-y-6">
              <div className="glass rounded-2xl p-5 border border-white/[0.06] backdrop-blur-md relative overflow-hidden preserve-3d glow-border-3d">
                <h2 className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
                  <Shield className="text-emerald-400 shrink-0" size={12} />
                  Security Insights
                </h2>

                <div className="space-y-4">
                  {/* Compliance checklist */}
                  <div className="space-y-3">
                    <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">Compliance Checklist</p>
                    {[
                      { label: 'HIPAA compliant KDF', desc: 'PBKDF2-SHA256 derivation' },
                      { label: 'GDPR zero-upload model', desc: '100% offline local processing' },
                      { label: 'FIPS 140-2 authenticated', desc: 'AES-256-GCM cipher suite' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5 animate-pulse">
                          <svg viewBox="0 0 24 24" className="w-2 h-2 fill-none stroke-current" strokeWidth="3.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200 leading-none">{item.label}</p>
                          <p className="text-[9px] text-slate-500 mt-1">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-white/[0.06]" />

                  {/* Cryptographic specifics */}
                  <div className="space-y-2.5">
                    <p className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">Cryptographic Parameters</p>
                    <div className="grid grid-cols-2 gap-2 text-left">
                      <div className="bg-white/[0.01] border border-white/[0.04] rounded-lg p-2.5">
                        <p className="text-[8px] text-slate-500 font-mono font-bold leading-none">KEY SIZE</p>
                        <p className="text-xs font-mono font-bold text-slate-300 mt-1">256 bits</p>
                      </div>
                      <div className="bg-white/[0.01] border border-white/[0.04] rounded-lg p-2.5">
                        <p className="text-[8px] text-slate-500 font-mono font-bold leading-none">SALT SIZE</p>
                        <p className="text-xs font-mono font-bold text-slate-300 mt-1">128 bits</p>
                      </div>
                      <div className="bg-white/[0.01] border border-white/[0.04] rounded-lg p-2.5 col-span-2">
                        <p className="text-[8px] text-slate-500 font-mono font-bold leading-none">ITERATION COUNT</p>
                        <p className="text-xs font-mono font-bold text-slate-300 mt-1">100,000 PBKDF2</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-white/[0.06]" />

                  {/* Tamper check explanation */}
                  <div className="bg-emerald-950/10 border border-emerald-900/20 rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                      <p className="text-xs font-bold text-emerald-300">Audited Integrity</p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      Authentication tags guarantee ciphertext integrity. Tampered files will automatically fail decryption.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 px-6 bg-[#0A0A0A] border-t border-white/[0.04] flex items-center justify-between flex-wrap gap-2 relative z-10">
          <p className="text-[10px] text-slate-500 font-mono">
            SecureCrypt © 2024 · Zero-Trust Encryption Architecture
          </p>
          <p className="text-[10px] text-slate-500 font-mono">
            AES-256-GCM · React + TS + Vite
          </p>
        </footer>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}
