import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Filter } from 'lucide-react'
import { userAPI, queueAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { TokenCard } from '../../components/token/TokenCard'
import { TableSkeleton } from '../../components/ui/Spinner'
import { Pagination } from '../../components/ui/Table'
import { ConfirmModal } from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import type { Token } from '../../types'

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'waiting,called,serving' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled,skipped' },
]

export default function MyTokens() {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [cancelTokenId, setCancelTokenId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['my-tokens', page, statusFilter],
    queryFn: () => userAPI.getMyTokens(page, 10).then(r => r.data.data),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => queueAPI.cancelToken(id),
    onSuccess: () => {
      toast.success('Token cancelled')
      setCancelTokenId(null)
      queryClient.invalidateQueries({ queryKey: ['my-tokens'] })
    },
    onError: () => toast.error('Could not cancel token'),
  })

  const tokens: Token[] = data?.tokens || []
  const total: number = data?.total || 0

  const filtered = statusFilter
    ? tokens.filter(t => statusFilter.split(',').includes(t.status))
    : tokens

  return (
    <Layout breadcrumb="My Tokens">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Tokens</h1>
          <Link to="/venues" className="btn-primary py-2 text-sm">+ Join Queue</Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === f.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="text-4xl mb-3">🎟️</div>
            <p className="font-medium text-gray-900 mb-1">No tokens found</p>
            <p className="text-sm text-gray-500">Try a different filter or join a queue</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(t => (
              <Link key={t.id} to={`/track/${t.id}`}>
                <TokenCard token={t} showActions onCancel={() => setCancelTokenId(t.id)} />
              </Link>
            ))}
          </div>
        )}

        <Pagination page={page} total={total} limit={10} onChange={setPage} />

        <ConfirmModal
          open={!!cancelTokenId}
          onClose={() => setCancelTokenId(null)}
          onConfirm={() => cancelTokenId && cancelMutation.mutate(cancelTokenId)}
          title="Cancel Token"
          message="Are you sure you want to cancel this token? You'll lose your position in the queue."
          confirmLabel="Yes, Cancel"
          danger
          loading={cancelMutation.isPending}
        />
      </div>
    </Layout>
  )
}
