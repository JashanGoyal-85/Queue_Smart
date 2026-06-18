import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Phone, Star, CheckCircle, SkipForward, ArrowRight, Monitor, Plus, Power } from 'lucide-react'
import { staffAPI } from '../../services/api'
import { wsService } from '../../services/websocket'
import { Layout } from '../../components/layout/Layout'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { TableSkeleton } from '../../components/ui/Spinner'
import { formatWaitTime } from '../../utils/formatters'
import toast from 'react-hot-toast'
import type { Counter, Token } from '../../types'

export default function QueueManagement() {
  const { id: queueId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [selectedCounterId, setSelectedCounterId] = useState('')
  const [newCounterName, setNewCounterName] = useState('')

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['queue-tokens', queueId],
    queryFn: () => staffAPI.getQueueTokens(queueId!).then(r => r.data.data),
    refetchInterval: 10000,
  })

  const { data: analytics } = useQuery({
    queryKey: ['queue-analytics', queueId],
    queryFn: () => staffAPI.getAnalytics(queueId!).then(r => r.data.data),
  })

  const { data: counters = [] } = useQuery({
    queryKey: ['queue-counters', queueId],
    queryFn: () => staffAPI.getCounters(queueId!).then(r => r.data.data),
  })

  const activeCounters = counters.filter((counter: Counter) => counter.is_active)
  useEffect(() => {
    if (!activeCounters.some((counter: Counter) => counter.id === selectedCounterId)) {
      setSelectedCounterId(activeCounters[0]?.id ?? '')
    }
  }, [counters, selectedCounterId])

  useEffect(() => {
    if (!queueId) return
    wsService.connect(queueId, 'queue')
    wsService.on(queueId, '*', () => {
      queryClient.invalidateQueries({ queryKey: ['queue-tokens', queueId] })
      queryClient.invalidateQueries({ queryKey: ['queue-analytics', queueId] })
    })
    return () => wsService.disconnect(queueId)
  }, [queueId])

  const callMut = useMutation({
    mutationFn: (id: string) => staffAPI.callToken(id, selectedCounterId || undefined),
    onSuccess: (r) => { toast.success(`Called ${r.data.data.display_code}`); queryClient.invalidateQueries({ queryKey: ['queue-tokens'] }) },
    onError: (error: any) => toast.error(error.response?.data?.message ?? 'Could not call token'),
  })
  const callNextMut = useMutation({
    mutationFn: () => staffAPI.callNext(queueId!, selectedCounterId || undefined),
    onSuccess: (r) => { toast.success(`Called ${r.data.data.display_code}`); queryClient.invalidateQueries({ queryKey: ['queue-tokens'] }) },
    onError: (error: any) => toast.error(error.response?.data?.message ?? 'Could not call next token'),
  })
  const completeMut = useMutation({ mutationFn: (id: string) => staffAPI.completeToken(id), onSuccess: () => { toast.success('Token completed'); queryClient.invalidateQueries({ queryKey: ['queue-tokens'] }) } })
  const skipMut = useMutation({ mutationFn: (id: string) => staffAPI.skipToken(id), onSuccess: () => { toast.success('Token skipped'); queryClient.invalidateQueries({ queryKey: ['queue-tokens'] }) } })
  const priorityMut = useMutation({ mutationFn: (id: string) => staffAPI.togglePriority(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queue-tokens'] }) })
  const createCounterMut = useMutation({
    mutationFn: () => staffAPI.createCounter(queueId!, newCounterName.trim()),
    onSuccess: () => {
      setNewCounterName('')
      toast.success('Counter added')
      queryClient.invalidateQueries({ queryKey: ['queue-counters', queueId] })
    },
    onError: (error: any) => toast.error(error.response?.data?.message ?? 'Could not add counter'),
  })
  const toggleCounterMut = useMutation({
    mutationFn: (counter: Counter) => staffAPI.updateCounter(counter.id, { is_active: !counter.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queue-counters', queueId] }),
    onError: (error: any) => toast.error(error.response?.data?.message ?? 'Could not update counter'),
  })

  const waiting = tokens.filter((t: Token) => t.status === 'waiting')
  const called = tokens.filter((t: Token) => ['called', 'serving'].includes(t.status))

  return (
    <Layout breadcrumb="Queue Management">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#E85D32]">Counter control</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#18201D]">Queue tokens</h1></div>
          {analytics && (
            <div className="flex gap-4 text-sm text-gray-500">
              <span>{analytics.completed} done</span>
              <span>{analytics.waiting} waiting</span>
              <span>{analytics.cancelled} cancelled</span>
            </div>
          )}
        </div>

        <div className="card p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <Select
                label="Calling from counter"
                value={selectedCounterId}
                onChange={event => setSelectedCounterId(event.target.value)}
                options={activeCounters.length
                  ? activeCounters.map((counter: Counter) => ({ value: counter.id, label: counter.name }))
                  : [{ value: '', label: 'Unassigned (legacy mode)' }]}
              />
            </div>
            <Button
              icon={<ArrowRight size={14} />}
              loading={callNextMut.isPending}
              disabled={waiting.length === 0}
              onClick={() => callNextMut.mutate()}
            >
              Call Next
            </Button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
              <Monitor size={16} /> Counters
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {counters.map((counter: Counter) => {
                const serving = called.find((token: Token) => token.counter_id === counter.id)
                return (
                  <button
                    key={counter.id}
                    type="button"
                    onClick={() => toggleCounterMut.mutate(counter)}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${counter.is_active ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Power size={12} className={counter.is_active ? 'text-green-600' : 'text-gray-400'} />
                      {counter.name}
                    </span>
                    <span className="text-xs text-gray-500">{serving ? `Serving ${serving.display_code}` : counter.is_active ? 'Available' : 'Inactive'}</span>
                  </button>
                )
              })}
              {counters.length === 0 && <span className="text-sm text-gray-400">No counters configured yet.</span>}
            </div>
            <form className="flex gap-2" onSubmit={event => { event.preventDefault(); if (newCounterName.trim()) createCounterMut.mutate() }}>
              <Input value={newCounterName} onChange={event => setNewCounterName(event.target.value)} placeholder="e.g. Counter 1" />
              <Button type="submit" variant="secondary" icon={<Plus size={14} />} loading={createCounterMut.isPending} disabled={!newCounterName.trim()}>Add</Button>
            </form>
            <p className="mt-2 text-xs text-gray-400">Click a counter card to activate or deactivate it.</p>
          </div>
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
                      {t.counter && <p className="text-xs font-medium text-blue-600 mt-1">{t.counter.name}</p>}
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
