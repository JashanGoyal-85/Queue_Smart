import React from 'react'
import { Loader2 } from 'lucide-react'

export const Spinner: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <Loader2 size={size} className={`animate-spin text-blue-600 ${className}`} />
)

export const PageSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-[300px]">
    <Spinner size={32} />
  </div>
)

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton rounded-lg ${className}`} />
)

export const CardSkeleton: React.FC = () => (
  <div className="card p-5 space-y-3">
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-4/5" />
    <div className="flex gap-2 pt-2">
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-7 w-16" />
    </div>
  </div>
)

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 p-3 border border-gray-100 rounded-lg">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/5" />
        <Skeleton className="h-4 w-1/6" />
      </div>
    ))}
  </div>
)

export const StatCardSkeleton: React.FC = () => (
  <div className="card p-5 space-y-2">
    <Skeleton className="h-3 w-1/2" />
    <Skeleton className="h-8 w-2/3" />
    <Skeleton className="h-3 w-1/3" />
  </div>
)
