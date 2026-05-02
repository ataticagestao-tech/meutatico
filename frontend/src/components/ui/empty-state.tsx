'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-14',
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-background-secondary border border-border">
          <Icon size={26} className="text-foreground-tertiary" />
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
