import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Unlock, Key, ShieldAlert, CheckCircle, XCircle, Info } from 'lucide-react'
import { Card, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { DropZone, type FileInfo } from '../ui/DropZone'
import { PasswordInput } from '../ui/PasswordInput'
import { decryptFile, downloadBlob, formatBytes } from '../../lib/crypto'
import { useToast } from '../ui/Toast'
import type { HistoryRecord } from '../../hooks/useHistory'
import { cn } from '../../lib/utils'

interface DecryptPageProps {
  onHistoryAdd: (record: Omit<HistoryRecord, 'id' | 'timestamp'>) => void
}

type Status = 'idle' | 'decrypting' | 'success' | 'error'

interface ResultInfo {
  status: 'success' | 'error'
  title: string
  message: string
  errorType?: string
  outputName?: string
  outputSize?: number
}

const ERROR_MESSAGES: Record<string, { title: string; hint: string }> = {
  wrong_password: {
    title: 'Wrong Password',
    hint: 'The password you entered is incorrect. Please use the exact password that was used to encrypt this file.',
  },
  invalid_format: {
    title: 'Invalid File Format',
    hint: 'This file was not encrypted by SecureCrypt or has been corrupted. Only files with the .enc extension (encrypted by SecureCrypt) can be decrypted here.',
  },
  corrupted: {
    title: 'File Corrupted',
    hint: 'The file appears to be corrupted. The authentication tag verification failed.',
  },
  unknown: {
    title: 'Decryption Failed',
    hint: 'An unexpected error occurred during decryption.',
  },
}

export function DecryptPage({ onHistoryAdd }: DecryptPageProps) {
  const { toast } = useToast()
  const [file, setFile] = useState<FileInfo | null>(null)
  const [password, setPassword] = useState('')
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ResultInfo | null>(null)

  const canDecrypt = !!file && password.length >= 1

  async function handleDecrypt() {
    if (!file || !canDecrypt) return

    setStatus('decrypting')
    setResult(null)
    setProgress(0)

    const stages = [
      { pct: 20, delay: 0 },
      { pct: 45, delay: 150 },
      { pct: 75, delay: 400 },
      { pct: 90, delay: 700 },
    ]

    for (const stage of stages) {
      await new Promise(r => setTimeout(r, stage.delay))
      setProgress(stage.pct)
    }

    const decResult = await decryptFile(file.data, password)
    setProgress(100)

    if (decResult.success && decResult.data) {
      // Determine output filename (strip .enc if present)
      const outputName = file.name.toLowerCase().endsWith('.enc')
        ? file.name.slice(0, -4)
        : `decrypted_${file.name}`

      downloadBlob(decResult.data, outputName)

      setResult({
        status: 'success',
        title: 'File Decrypted Successfully',
        message: `${file.name} → ${outputName}`,
        outputName,
        outputSize: decResult.data.length,
      })
      setStatus('success')

      onHistoryAdd({
        fileName: file.name,
        operation: 'decrypt',
        size: file.size,
        status: 'success',
        outputName,
      })

      toast(`"${file.name}" decrypted successfully!`, 'success')
    } else {
      const errType = decResult.errorType ?? 'unknown'
      const errConfig = ERROR_MESSAGES[errType] ?? ERROR_MESSAGES.unknown

      setResult({
        status: 'error',
        title: errConfig.title,
        message: errConfig.hint,
        errorType: errType,
      })
      setStatus('error')

      onHistoryAdd({
        fileName: file.name,
        operation: 'decrypt',
        size: file.size,
        status: 'error',
      })

      toast(errConfig.title, 'error')
    }

    setTimeout(() => setProgress(0), 3000)
  }

  function handleClear() {
    setFile(null)
    setPassword('')
    setResult(null)
    setStatus('idle')
    setProgress(0)
  }

  return (
    <div className="space-y-5">
      {/* Page title */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Decrypt Digital Asset</h1>
          <p className="text-xs text-slate-400 mt-0.5">Restore encrypted assets instantly — completely client-side</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <Unlock size={13} className="text-emerald-400" />
          <span className="text-[10px] font-mono font-bold text-emerald-300">DECRYPTION</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── File Card ── */}
        <Card>
          <CardHeader
            icon={<ShieldAlert size={16} />}
            title="Encrypted File"
            description="Select a .enc file previously encrypted with SecureCrypt"
          />
          <DropZone
            selectedFile={file}
            onFile={setFile}
            onClear={() => { setFile(null); setResult(null); setStatus('idle') }}
            accent="emerald"
            placeholder="Drop encrypted file here"
            subtext="Supports .enc files created by SecureCrypt"
            icon={
              <svg viewBox="0 0 48 48" width="40" height="40" fill="none">
                <rect x="10" y="8" width="28" height="32" rx="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
                <rect x="16" y="22" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M18 22v-3a6 6 0 0112 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="24" cy="27" r="1.5" fill="currentColor" />
              </svg>
            }
          />
        </Card>

        {/* ── Password Card ── */}
        <Card>
          <CardHeader
            icon={<Key size={16} />}
            title="Enter Password"
            description="Use the exact password that was used to encrypt the file"
          />
          <PasswordInput
            value={password}
            onChange={setPassword}
            label="Decryption Password"
            id="dec-password"
            placeholder="Enter your decryption password..."
          />

          {/* Info Box */}
          <div className="mt-4 flex gap-3 p-3 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl">
            <Info size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">
              AES-256-GCM authentication ensures tamper detection.
              If the password is wrong, decryption will fail safely — no data corruption.
            </p>
          </div>
        </Card>
      </div>

      {/* ── Progress Bar ── */}
      <AnimatePresence>
        {status === 'decrypting' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-xl px-5 py-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-white/60 font-mono">Decrypting…</span>
              <span className="text-xs font-bold text-emerald-300">{progress}%</span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden relative shimmer-bar">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full absolute inset-y-0 left-0"
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
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,   scale: 1 }}
            exit={{    opacity: 0, scale: 0.97 }}
            className={cn(
              'flex items-start gap-4 p-4 rounded-xl border',
              result.status === 'success'
                ? 'bg-emerald-500/8 border-emerald-500/25'
                : 'bg-red-500/8 border-red-500/25'
            )}
          >
            {result.status === 'success' ? (
              <CheckCircle size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={cn('text-sm font-semibold', result.status === 'success' ? 'text-emerald-300' : 'text-red-300')}>
                {result.title}
              </p>
              <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{result.message}</p>
              {result.status === 'success' && result.outputSize && (
                <p className="text-xs text-white/30 mt-1 font-mono">
                  {formatBytes(result.outputSize)} decrypted · saved to your downloads
                </p>
              )}
            </div>
            <button
              onClick={() => setResult(null)}
              className="text-white/20 hover:text-white/60 transition-colors shrink-0"
            >
              <XCircle size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Action Bar ── */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <Button variant="ghost" size="md" onClick={handleClear}>
          Clear All
        </Button>
        <Button
          variant="success"
          size="lg"
          disabled={!canDecrypt}
          loading={status === 'decrypting'}
          onClick={handleDecrypt}
        >
          <Unlock size={16} />
          {status === 'decrypting' ? 'Decrypting…' : 'Decrypt File'}
        </Button>
      </div>
    </div>
  )
}
