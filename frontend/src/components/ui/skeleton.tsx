import * as React from 'react'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-background-tertiary',
        className,
      )}
      {...props}
    />
  )
}

interface SkeletonTableProps {
  rows?: number
  columns?: number
  className?: string
}

function SkeletonTable({ rows = 5, columns = 5, className }: SkeletonTableProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn(
                'h-4',
                c === 0 ? 'w-8 rounded-full h-8 shrink-0' : 'flex-1',
                c === columns - 1 && 'max-w-[80px]',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonTable }
