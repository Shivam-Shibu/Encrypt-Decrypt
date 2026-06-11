import { useState, useCallback, type DragEvent, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface FileInfo {
  name: string
  size: number
  data: Uint8Array
}

interface DropZoneProps {
  onFile: (info: FileInfo) => void
  onClear: () => void
  selectedFile: FileInfo | null
  accent?: 'brand' | 'emerald'
  placeholder?: string
  subtext?: string
  icon?: ReactNode
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getExtBadge(filename: string): string {
  const ext = filename.split('.').pop()?.toUpperCase() ?? 'FILE'
  return ext.slice(0, 4)
}

export function DropZone({
  onFile,
  onClear,
  selectedFile,
  accent = 'brand',
  placeholder = 'Drop file here',
  subtext = 'or click to browse your computer',
  icon,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const colors = accent === 'brand'
    ? {
        border:  'border-brand-500/40',
        bg:      'bg-brand-500/5',
        icon:    'text-brand-400',
        badge:   'bg-brand-500/15 border-brand-500/20 text-brand-300',
      }
    : {
        border:  'border-emerald-500/40',
        bg:      'bg-emerald-500/5',
        icon:    'text-emerald-400',
        badge:   'bg-emerald-500/15 border-emerald-500/20 text-emerald-300',
      }

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (!file) return
      const data = new Uint8Array(await file.arrayBuffer())
      onFile({ name: file.name, size: file.size, data })
    },
    [onFile],
  )

  const handleClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const data = new Uint8Array(await file.arrayBuffer())
      onFile({ name: file.name, size: file.size, data })
    }
    input.click()
  }, [onFile])

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={selectedFile ? undefined : handleClick}
      className={cn(
        'relative rounded-xl border-2 border-dashed transition-all duration-300 overflow-hidden',
        selectedFile
          ? cn(colors.border, colors.bg, 'cursor-default p-4')
          : 'border-white/10 bg-white/[0.02] cursor-pointer hover:border-white/20 hover:bg-white/[0.04] min-h-[160px]',
        isDragging && cn(colors.border, colors.bg, 'drop-active'),
      )}
    >
      <AnimatePresence mode="wait">
        {!selectedFile ? (
          /* ── Empty state ── */
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center gap-3 py-10 px-6 text-center"
          >
            <div className={cn('float-anim', colors.icon)}>
              {icon ?? <Upload size={40} strokeWidth={1.5} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-white/80">{placeholder}</p>
              <p className="text-xs text-white/35 mt-1">{subtext}</p>
            </div>
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium mt-1',
                colors.badge,
              )}
            >
              <Upload size={11} />
              Browse File
            </div>
          </motion.div>
        ) : (
          /* ── File selected state ── */
          <motion.div
            key="selected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="flex items-center gap-3"
          >
            <div
              className={cn(
                'w-12 h-12 rounded-xl border flex items-center justify-center shrink-0',
                colors.badge,
              )}
            >
              <span className="text-[10px] font-bold font-mono tracking-wider leading-none">
                {getExtBadge(selectedFile.name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{selectedFile.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white/40 bg-white/[0.05] px-2 py-0.5 rounded-md border border-white/[0.06]">
                  {formatBytes(selectedFile.size)}
                </span>
                <span className={cn('text-xs px-2 py-0.5 rounded-md border', colors.badge)}>
                  Ready
                </span>
              </div>
            </div>
            <button
              onClick={e => {
                e.stopPropagation()
                onClear()
              }}
              className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all shrink-0"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'absolute inset-0 flex items-center justify-center rounded-xl backdrop-blur-sm',
              colors.bg,
            )}
          >
            <div className={cn('text-center', colors.icon)}>
              <Upload size={32} strokeWidth={1.5} />
              <p className="text-sm font-semibold mt-2 text-white/70">Release to upload</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
