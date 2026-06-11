import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Trash2, Download, Lock, Unlock, CheckCircle, XCircle, Filter } from 'lucide-react'
import { Button } from '../ui/Button'
import { formatBytes } from '../../lib/crypto'
import { formatDate, cn } from '../../lib/utils'
import type { HistoryRecord } from '../../hooks/useHistory'

interface HistoryPageProps {
  records: HistoryRecord[]
  onClear: () => void
  onExport: (records: HistoryRecord[]) => void
}

type FilterType = 'all' | 'encrypt' | 'decrypt'

export function HistoryPage({ records, onClear, onExport }: HistoryPageProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = r.fileName.toLowerCase().includes(search.toLowerCase())
      const matchesFilter = filter === 'all' || r.operation === filter
      return matchesSearch && matchesFilter
    })
  }, [records, search, filter])

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">File History</h1>
          <p className="text-sm text-white/40 mt-0.5">All encryption and decryption operations — stored locally</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport(filtered)}
            disabled={filtered.length === 0}
          >
            <Download size={13} />
            Export JSON
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onClear}
            disabled={records.length === 0}
          >
            <Trash2 size={13} />
            Clear All
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: records.length,                          color: 'text-white' },
          { label: 'Encrypted', value: records.filter(r => r.operation === 'encrypt').length, color: 'text-brand-400' },
          { label: 'Decrypted', value: records.filter(r => r.operation === 'decrypt').length, color: 'text-emerald-400' },
          { label: 'Errors',    value: records.filter(r => r.status === 'error').length,       color: 'text-red-400' },
        ].map(stat => (
          <div key={stat.label} className="glass rounded-xl p-4 text-center">
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by filename…"
            className={cn(
              'w-full h-9 bg-white/[0.04] border border-white/[0.08] rounded-xl',
              'pl-9 pr-4 text-sm text-white/80 placeholder:text-white/25',
              'focus:outline-none focus:border-brand-500/40 focus:bg-white/[0.06] transition-all'
            )}
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1 p-1 bg-white/[0.04] border border-white/[0.06] rounded-xl">
          {(['all', 'encrypt', 'decrypt'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize',
                filter === f
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                  : 'text-white/40 hover:text-white/70'
              )}
            >
              {f === 'all' ? 'All' : f === 'encrypt' ? 'Encrypted' : 'Decrypted'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/30">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Filter size={24} strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white/50">
                {records.length === 0 ? 'No history yet' : 'No results found'}
              </p>
              <p className="text-xs mt-1">
                {records.length === 0
                  ? 'Start encrypting files to see your history here'
                  : 'Try a different search term or filter'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['File Name', 'Operation', 'Timestamp', 'Size', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-white/30">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((record, i) => (
                    <motion.tr
                      key={record.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-white/80 max-w-[200px] block truncate" title={record.fileName}>
                          {record.fileName}
                        </span>
                        {record.outputName && (
                          <span className="text-[10px] text-white/30 mt-0.5 block truncate">
                            → {record.outputName}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border',
                          record.operation === 'encrypt'
                            ? 'bg-brand-500/10 text-brand-300 border-brand-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        )}>
                          {record.operation === 'encrypt'
                            ? <><Lock size={10} /> Encrypted</>
                            : <><Unlock size={10} /> Decrypted</>
                          }
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-white/40 whitespace-nowrap">
                        {formatDate(record.timestamp)}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-white/40">
                        {formatBytes(record.size)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn(
                          'inline-flex items-center gap-1 text-xs font-semibold',
                          record.status === 'success' ? 'text-emerald-400' : 'text-red-400'
                        )}>
                          {record.status === 'success'
                            ? <><CheckCircle size={12} /> Success</>
                            : <><XCircle    size={12} /> Failed</>
                          }
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-white/25 text-center">
        History is stored locally in your browser — never sent to any server
      </p>
    </div>
  )
}
