import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { Skeleton } from './Spinner'

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  width?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  onSort?: (key: string, dir: 'asc' | 'desc') => void
  sortKey?: string
  sortDir?: 'asc' | 'desc'
}

export function Table<T extends { id?: string }>({
  columns, data, loading, emptyMessage = 'No data found', emptyIcon, onSort, sortKey, sortDir
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide ${col.sortable ? 'cursor-pointer hover:text-gray-700 select-none' : ''} ${col.width || ''}`}
                onClick={() => col.sortable && onSort?.(String(col.key), sortDir === 'asc' ? 'desc' : 'asc')}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  {emptyIcon || <span className="text-3xl">📭</span>}
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={(row as any).id || i} className="hover:bg-gray-50/50 transition-colors">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3 text-gray-700">
                    {col.render ? col.render(row) : String((row as any)[col.key] ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

interface PaginationProps {
  page: number
  total: number
  limit: number
  onChange: (page: number) => void
}

export const Pagination: React.FC<PaginationProps> = ({ page, total, limit, onChange }) => {
  const totalPages = Math.ceil(total / limit)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-gray-500">Showing {(page-1)*limit+1}–{Math.min(page*limit,total)} of {total}</span>
      <div className="flex gap-1">
        <button onClick={() => onChange(page-1)} disabled={page===1}
          className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">← Prev</button>
        {Array.from({length: Math.min(5, totalPages)}, (_, i) => {
          const p = Math.max(1, Math.min(page-2, totalPages-4)) + i
          return (
            <button key={p} onClick={() => onChange(p)}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${p===page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}>{p}</button>
          )
        })}
        <button onClick={() => onChange(page+1)} disabled={page===totalPages}
          className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">Next →</button>
      </div>
    </div>
  )
}
