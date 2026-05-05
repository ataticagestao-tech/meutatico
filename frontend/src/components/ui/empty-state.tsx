'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type EmptyAccent =
  | 'sky'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'orange'
  | 'teal'
  | 'emerald'
  | 'pink'
  | 'indigo'
  | 'slate'

const ACCENT_TILE: Record<EmptyAccent, string> = {
  sky: 'bg-sky-50 ring-sky-200 dark:bg-sky-900/20 dark:ring-sky-800',
  amber: 'bg-amber-50 ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-800',
  rose: 'bg-rose-50 ring-rose-200 dark:bg-rose-900/20 dark:ring-rose-800',
  violet: 'bg-violet-50 ring-violet-200 dark:bg-violet-900/20 dark:ring-violet-800',
  orange: 'bg-orange-50 ring-orange-200 dark:bg-orange-900/20 dark:ring-orange-800',
  teal: 'bg-teal-50 ring-teal-200 dark:bg-teal-900/20 dark:ring-teal-800',
  emerald: 'bg-emerald-50 ring-emerald-200 dark:bg-emerald-900/20 dark:ring-emerald-800',
  pink: 'bg-pink-50 ring-pink-200 dark:bg-pink-900/20 dark:ring-pink-800',
  indigo: 'bg-indigo-50 ring-indigo-200 dark:bg-indigo-900/20 dark:ring-indigo-800',
  slate: 'bg-slate-100 ring-slate-200 dark:bg-slate-800/40 dark:ring-slate-700',
}

const ACCENT_ICON: Record<EmptyAccent, string> = {
  sky: 'text-sky-500',
  amber: 'text-amber-500',
  rose: 'text-rose-500',
  violet: 'text-violet-500',
  orange: 'text-orange-500',
  teal: 'text-teal-500',
  emerald: 'text-emerald-500',
  pink: 'text-pink-500',
  indigo: 'text-indigo-500',
  slate: 'text-slate-500',
}

interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  accent?: EmptyAccent
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  accent = 'sky',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-14',
        className,
      )}
    >
      {Icon && (
        <div className={cn('mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ring-1', ACCENT_TILE[accent])}>
          <Icon size={28} className={ACCENT_ICON[accent]} />
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-foreground-tertiary">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
