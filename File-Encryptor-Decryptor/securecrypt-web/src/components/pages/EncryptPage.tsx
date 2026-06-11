import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, FolderOpen, Shield, CheckCircle, XCircle, Zap } from 'lucide-react'
import { Card, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { DropZone, type FileInfo } from '../ui/DropZone'
import { PasswordInput } from '../ui/PasswordInput'
import { encryptFile, downloadBlob, formatBytes } from '../../lib/crypto'
import { useToast } from '../ui/Toast'
import type { HistoryRecord } from '../../hooks/useHistory'
import { cn } from '../../lib/utils'

interface EncryptPageProps {
  onHistoryAdd: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => void
}

type Status = 'idle' | 'encrypting' | 'success' | 'error'

interface ResultInfo {
  status: 'success' | 'error'
  title: string
  message: string
  outputName?: string
  outputSize?: number
}

export function EncryptPage({ onHistoryAdd }: EncryptPageProps) {
  const { toast } = useToast()
  const [file, setFile] = useState<FileInfo | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ResultInfo | null>(null)

  const canEncrypt = !!file && password.length >= 6 && password === confirmPassword

  async function handleEncrypt() {
    if (!file || !canEncrypt) return

    setStatus('encrypting')
    setResult(null)
    setProgress(0)

    // Simulated progress stages
    const stages = [
      { pct: 15, label: 'Reading file...', delay: 0 },
      { pct: 40, label: 'Deriving key (PBKDF2-SHA256)...', delay: 200 },
      { pct: 75, label: 'Encrypting (AES-256-GCM)...', delay: 400 },
      { pct: 90, label: 'Finalizing...', delay: 800 },
    ]

    for (const stage of stages) {
      await new Promise(r => setTimeout(r, stage.delay))
      setProgress(stage.pct)
    }

    const encResult = await encryptFile(file.data, password)
    setProgress(100)

    if (encResult.success && encResult.data) {
      const outputName = file.name + '.enc'
      downloadBlob(encResult.data, outputName)

      setResult({
        status: 'success',
        title: 'File Encrypted Successfully',
        message: `${file.name} → ${outputName}`,
        outputName,
        outputSize: encResult.data.length,
      })
      setStatus('success')

      onHistoryAdd({
        fileName: file.name,
        operation: 'encrypt',
        size: file.size,
        status: 'success',
        outputName,
      })

      toast(`"${file.name}" encrypted successfully!`, 'success')
    } else {
      setResult({
        status: 'error',
        title: 'Encryption Failed',
        message: encResult.error ?? 'An unexpected error occurred.',
      })
      setStatus('error')

      onHistoryAdd({
        fileName: file.name,
        operation: 'encrypt',
        size: file.size,
        status: 'error',
      })

      toast('Encryption failed', 'error')
    }

    setTimeout(() => setProgress(0), 3000)
  }

  function handleClear() {
    setFile(null)
    setPassword('')
    setConfirmPassword('')
    setResult(null)
    setStatus('idle')
    setProgress(0)
  }

  return (
    <div className="space-y-5">
      {/* Page title */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Encrypt Digital Asset</h1>
          <p className="text-xs text-slate-400 mt-0.5">Secure your files locally with AES-256-GCM encryption</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <Shield size={13} className="text-emerald-400" />
          <span className="text-[10px] font-mono font-bold text-emerald-300">AES-256-GCM</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── File Selection Card ── */}
        <Card>
          <CardHeader
            icon={<FolderOpen size={16} />}
            title="Select File"
            description="Any file type supported — max size limited by your browser"
          />
          <DropZone
            selectedFile={file}
            onFile={setFile}
            onClear={() => { setFile(null); setResult(null); setStatus('idle') }}
            accent="brand"
            placeholder="Drop any file here"
            subtext="Supports all file types — documents, images, videos, archives"
          />
        </Card>

        {/* ── Password Card ── */}
        <Card>
          <CardHeader
            icon={<Lock size={16} />}
            title="Set Password"
            description="Minimum 6 characters — use the generator for maximum security"
          />
          <PasswordInput
            value={password}
            onChange={setPassword}
            label="Encryption Password"
            id="enc-password"
            placeholder="Enter a strong password..."
            showStrength
            showGenerator
            confirm
            confirmValue={confirmPassword}
            onConfirmChange={setConfirmPassword}
          />
        </Card>
      </div>

      {/* ── Algorithm Specs ── */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <Zap size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">AES-256-GCM</p>
              <p className="text-xs text-slate-400">Authenticated Encryption</p>
            </div>
          </div>
          <div className="flex-1 h-px bg-white/[0.05]" />
          {[
            { k: 'Algorithm', v: 'AES-256-GCM' },
            { k: 'Key Size',  v: '256-bit' },
            { k: 'KDF',       v: 'PBKDF2' },
            { k: 'Iterations', v: '100,000' },
            { k: 'Salt',      v: '128-bit random' },
            { k: 'Auth Tag',  v: '128-bit GCM' },
          ].map(({ k, v }) => (
            <div key={k} className="text-center">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{k}</p>
              <p className="text-xs font-bold text-emerald-300 font-mono mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Progress Bar ── */}
      <AnimatePresence>
        {status === 'encrypting' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-xl px-5 py-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white/60 font-mono">Encrypting…</span>
              <span className="text-xs font-bold text-emerald-300">{progress}%</span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden relative shimmer-bar">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full absolute inset-y-0 left-0"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result Alert ── */}
      <AnimatePresence>
        {result && (
          <ResultAlert result={result} onDismiss={() => setResult(null)} />
        )}
      </AnimatePresence>

      {/* ── Action Bar ── */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <Button variant="ghost" size="md" onClick={handleClear}>
          Clear All
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={!canEncrypt}
          loading={status === 'encrypting'}
          onClick={handleEncrypt}
        >
          <Lock size={16} />
          {status === 'encrypting' ? 'Encrypting…' : 'Encrypt File'}
        </Button>
      </div>
    </div>
  )
}

function ResultAlert({
  result,
  onDismiss,
}: {
  result: ResultInfo
  onDismiss: () => void
}) {
  const isSuccess = result.status === 'success'
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0,   scale: 1 }}
      exit={{    opacity: 0, y: -8,  scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'flex items-start gap-4 p-4 rounded-xl border',
        isSuccess
          ? 'bg-emerald-500/8 border-emerald-500/25'
          : 'bg-red-500/8 border-red-500/25'
      )}
    >
      {isSuccess ? (
        <CheckCircle size={20} className="text-emerald-400 shrink-0 mt-0.5" />
      ) : (
        <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', isSuccess ? 'text-emerald-300' : 'text-red-300')}>
          {result.title}
        </p>
        <p className="text-xs text-white/50 mt-0.5 break-all">{result.message}</p>
        {isSuccess && result.outputSize && (
          <p className="text-xs text-white/30 mt-1 font-mono">
            {formatBytes(result.outputSize)} encrypted · downloaded to your device
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="text-white/20 hover:text-white/60 transition-colors shrink-0"
      >
        <XCircle size={16} />
      </button>
    </motion.div>
  )
}
