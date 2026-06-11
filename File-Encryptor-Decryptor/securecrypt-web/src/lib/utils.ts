/** Merges class names, handling conditionals cleanly */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Formats a date string for display in history */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day:   'numeric',
    hour:  '2-digit',
    minute:'2-digit',
  }).format(d)
}

/** Returns 1-4 char uppercase extension badge */
export function getExtBadge(filename: string): string {
  const ext = filename.split('.').pop()?.toUpperCase() ?? 'FILE'
  return ext.slice(0, 4)
}
