import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Phone, Star, CheckCircle, SkipForward, ArrowRight } from 'lucide-react'
import { staffAPI } from '../../services/api'
import { wsService } from '../../services/websocket'
import { Layout } from '../../components/layout/Layout'
import { Badge, statusToBadgeColor } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { TableSkeleton } from '../../components/ui/Spinner'
import { formatWaitTime } from '../../utils/formatters'
import toast from 'react-hot-toast'
import type { Token } from '../../types'

export default function QueueManagement() {
  const { id: queueId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['queue-tokens', queueId],
    queryFn: () => staffAPI.getQueueTokens(queueId!).then(r => r.data.data),
    refetchInterval: 10000,
  })

  const { data: analytics } = useQuery({
    queryKey: ['queue-analytics', queueId],
    queryFn: () => staffAPI.getAnalytics(queueId!).then(r => r.data.data),
  })

  useEffect(() => {
    if (!queueId) return
    wsService.connect(queueId, 'queue')
    wsService.on(queueId, '*', () => {
      queryClient.invalidateQueries({ queryKey: ['queue-tokens', queueId] })
      queryClient.invalidateQueries({ queryKey: ['queue-analytics', queueId] })
    })
    return () => wsService.disconnect(queueId)
  }, [queueId])

  const mut = (fn: (id: string) => Promise<any>, successMsg: string) => useMutation({
    mutationFn: fn,
    onSuccess: () => { toast.success(successMsg); queryClient.invalidateQueries({ queryKey: ['queue-tokens', queueId] }) },
    onError: () => toast.error('Action failed'),
  })

  const callMut = useMutation({ mutationFn: (id: string) => staffAPI.callToken(id), onSuccess: (r) => { toast.success(`Called ${r.data.data.display_code}`); queryClient.invalidateQueries({ queryKey: ['queue-tokens'] }) } })
  const completeMut = useMutation({ mutationFn: (id: string) => staffAPI.completeToken(id), onSuccess: () => { toast.success('Token completed'); queryClient.invalidateQueries({ queryKey: ['queue-tokens'] }) } })
  const skipMut = useMutation({ mutationFn: (id: string) => staffAPI.skipToken(id), onSuccess: () => { toast.success('Token skipped'); queryClient.invalidateQueries({ queryKey: ['queue-tokens'] }) } })
  const priorityMut = useMutation({ mutationFn: (id: string) => staffAPI.togglePriority(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queue-tokens'] }) })

  const waiting = tokens.filter((t: Token) => t.status === 'waiting')
  const called = tokens.filter((t: Token) => ['called', 'serving'].includes(t.status))

  return (
    <Layout breadcrumb="Queue Management">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Queue Tokens</h1>
          {analytics && (
            <div className="flex gap-4 text-sm text-gray-500">
              <span>✅ {analytics.completed} done</span>
              <span>⏳ {analytics.waiting} waiting</span>
              <span>❌ {analytics.cancelled} cancelled</span>
            </div>
          )}
        </div>

        {/* Currently serving */}
        {called.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Currently Serving</h2>
            <div className="space-y-2">
              {called.map((t: Token) => (
                <div key={t.id} className="card border-green-200 bg-green-50/30 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-bold text-green-700">{t.display_code}</div>
                    <div>
                      <Badge color="green" dot>{t.status}</Badge>
                      {t.guest_name && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Phone size={11} /> {t.guest_name}</p>}
                    </div>
                  </div>
                  <Button size="sm" variant="primary" icon={<CheckCircle size={14} />}
                    loading={completeMut.isPending} onClick={() => completeMut.mutate(t.id)}>Complete</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting list */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Waiting Queue ({waiting.length})
          </h2>
          {isLoading ? <TableSkeleton rows={5} /> : waiting.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">
              <p>Queue is empty</p>
            </div>
          ) : (
            <div className="space-y-2">
              {waiting.map((t: Token, index: number) => (
                <div key={t.id} className="card p-4 flex items-center gap-4">
                  <div className="text-sm font-bold text-gray-400 w-6 text-center">{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{t.display_code}</span>
                      {t.priority === 'priority' && <Badge color="purple">Priority</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      {t.guest_name && <span className="flex items-center gap-1"><Phone size={10} /> {t.guest_name}</span>}
                      <span>~{formatWaitTime(t.estimated_wait_seconds)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => priorityMut.mutate(t.id)}
                      title="Toggle priority"
                      className={`p-1.5 rounded-lg transition-colors ${t.priority === 'priority' ? 'text-purple-600 bg-purple-50' : 'text-gray-300 hover:text-purple-500'}`}>
                      <Star size={15} />
                    </button>
                    <Button size="sm" variant="secondary" icon={<SkipForward size={13} />}
                      onClick={() => skipMut.mutate(t.id)}>Skip</Button>
                    <Button size="sm" variant="primary" icon={<ArrowRight size={13} />}
                      loading={callMut.isPending} onClick={() => callMut.mutate(t.id)}>Call</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
