import { useState, useCallback } from 'react'

export interface HistoryRecord {
  id: string
  fileName: string
  operation: 'encrypt' | 'decrypt'
  timestamp: string
  size: number
  status: 'success' | 'error'
  outputName?: string
}

const STORAGE_KEY = 'sc_history'

function loadFromStorage(): HistoryRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as HistoryRecord[]
  } catch {
    return []
  }
}

function saveToStorage(records: HistoryRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  } catch {
    // Ignore storage errors (private browsing, quota exceeded)
  }
}

export function useHistory() {
  const [records, setRecords] = useState<HistoryRecord[]>(loadFromStorage)

  const addRecord = useCallback((record: Omit<HistoryRecord, 'id' | 'timestamp'>) => {
    const newRecord: HistoryRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      ...record,
    }
    setRecords(prev => {
      const updated = [newRecord, ...prev].slice(0, 500) // cap at 500
      saveToStorage(updated)
      return updated
    })
  }, [])

  const clearHistory = useCallback(() => {
    setRecords([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const exportHistory = useCallback((records: HistoryRecord[]) => {
    const json = JSON.stringify(records, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `securecrypt-history-${Date.now()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }, [])

  return { records, addRecord, clearHistory, exportHistory }
}
