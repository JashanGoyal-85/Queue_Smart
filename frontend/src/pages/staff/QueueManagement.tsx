import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Phone, Star, CheckCircle, SkipForward, ArrowRight,
  Monitor, Plus, Power, Clock, ChevronUp, ArrowRightCircle
} from 'lucide-react'
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

const EXTEND_PRESETS = [
  { label: '+1 min', seconds: 60 },
  { label: '+3 min', seconds: 180 },
  { label: '+5 min', seconds: 300 },
  { label: '+10 min', seconds: 600 },
]

export default function QueueManagement() {
  const { id: queueId } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [selectedCounterId, setSelectedCounterId] = useState('')
  const [newCounterName, setNewCounterName] = useState('')
  const [extendOpenId, setExtendOpenId] = useState<string | null>(null)

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

  const activeCounters = counters.filter((c: Counter) => c.is_active)
  useEffect(() => {
    if (!activeCounters.some((c: Counter) => c.id === selectedCounterId)) {
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

  // ── Call Next ──────────────────────────────────────────────────────────────
  const callNextMut = useMutation({
    mutationFn: () => staffAPI.callNext(queueId!, selectedCounterId || undefined),
    onSuccess: (r) => {
      toast.success(`📢 Called ${r.data.data.display_code}`, { duration: 4000 })
      queryClient.invalidateQueries({ queryKey: ['queue-tokens'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'No tokens left to call'),
  })

  // ── Complete token → immediately offer "Call Next" ─────────────────────────
  const completeMut = useMutation({
    mutationFn: (id: string) => staffAPI.completeToken(id),
    onSuccess: (_, completedId) => {
      queryClient.invalidateQueries({ queryKey: ['queue-tokens'] })

      // Check if there are still waiting tokens
      const stillWaiting = tokens.filter(
        (t: Token) => t.status === 'waiting' && t.id !== completedId
      )

      if (stillWaiting.length > 0) {
        // Offer to call next immediately via a toast with a button
        toast.custom(
          (t) => (
            <div className={`flex items-center gap-3 bg-[#18201D] text-white px-4 py-3 rounded-xl shadow-xl border border-white/10 ${t.visible ? 'animate-fade-in' : ''}`}>
              <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-sm">Turn completed ✓</p>
                <p className="text-xs text-white/60">{stillWaiting.length} still waiting</p>
              </div>
              <button
                onClick={() => {
                  toast.dismiss(t.id)
                  callNextMut.mutate()
                }}
                className="flex items-center gap-1.5 bg-[#E85D32] hover:bg-[#d44f27] text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowRightCircle size={14} />
                Call Next
              </button>
            </div>
          ),
          { duration: 8000, position: 'bottom-center' }
        )
      } else {
        toast.success('✅ Turn completed — queue is now empty!')
      }
    },
    onError: () => toast.error('Failed to complete token'),
  })

  // ── Skip token ─────────────────────────────────────────────────────────────
  const skipMut = useMutation({
    mutationFn: (id: string) => staffAPI.skipToken(id),
    onSuccess: (_, skippedId) => {
      queryClient.invalidateQueries({ queryKey: ['queue-tokens'] })
      const stillWaiting = tokens.filter(
        (t: Token) => t.status === 'waiting' && t.id !== skippedId
      )
      if (stillWaiting.length > 0) {
        toast.custom(
          (t) => (
            <div className={`flex items-center gap-3 bg-[#18201D] text-white px-4 py-3 rounded-xl shadow-xl border border-white/10 ${t.visible ? 'animate-fade-in' : ''}`}>
              <SkipForward size={18} className="text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-sm">Token skipped</p>
                <p className="text-xs text-white/60">{stillWaiting.length} still waiting</p>
              </div>
              <button
                onClick={() => {
                  toast.dismiss(t.id)
                  callNextMut.mutate()
                }}
                className="flex items-center gap-1.5 bg-[#E85D32] hover:bg-[#d44f27] text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowRightCircle size={14} />
                Call Next
              </button>
            </div>
          ),
          { duration: 8000, position: 'bottom-center' }
        )
      } else {
        toast.success('⏭ Skipped — queue is now empty')
      }
    },
    onError: () => toast.error('Failed to skip token'),
  })

  const callMut = useMutation({
    mutationFn: (id: string) => staffAPI.callToken(id, selectedCounterId || undefined),
    onSuccess: (r) => { toast.success(`📢 Called ${r.data.data.display_code}`); queryClient.invalidateQueries({ queryKey: ['queue-tokens'] }) },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Could not call token'),
  })
  const priorityMut = useMutation({
    mutationFn: (id: string) => staffAPI.togglePriority(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queue-tokens'] }),
  })
  const extendMut = useMutation({
    mutationFn: ({ id, addSeconds }: { id: string; addSeconds: number }) =>
      staffAPI.extendTokenTime(id, addSeconds),
    onSuccess: (_, vars) => {
      const preset = EXTEND_PRESETS.find(p => p.seconds === vars.addSeconds)
      toast.success(`⏱ Extended by ${preset?.label.replace('+', '') ?? vars.addSeconds + 's'}`)
      setExtendOpenId(null)
      queryClient.invalidateQueries({ queryKey: ['queue-tokens'] })
    },
    onError: () => toast.error('Could not extend wait time'),
  })
  const createCounterMut = useMutation({
    mutationFn: () => staffAPI.createCounter(queueId!, newCounterName.trim()),
    onSuccess: () => { setNewCounterName(''); toast.success('Counter added'); queryClient.invalidateQueries({ queryKey: ['queue-counters', queueId] }) },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Could not add counter'),
  })
  const toggleCounterMut = useMutation({
    mutationFn: (counter: Counter) => staffAPI.updateCounter(counter.id, { is_active: !counter.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queue-counters', queueId] }),
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Could not update counter'),
  })

  const waiting = tokens.filter((t: Token) => t.status === 'waiting')
  const called = tokens.filter((t: Token) => ['called', 'serving'].includes(t.status))
  const isServing = called.length > 0

  return (
    <Layout breadcrumb="Queue Management">
      {/* Extra bottom padding so sticky bar doesn't overlap content */}
      <div className="max-w-4xl mx-auto space-y-6 pb-24">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#E85D32]">Counter control</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#18201D]">Queue tokens</h1>
          </div>
          {analytics && (
            <div className="flex gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />{analytics.completed} done</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />{analytics.waiting} waiting</span>
            </div>
          )}
        </div>

        {/* Counter selector */}
        <div className="card p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <Select
                label="Calling from counter"
                value={selectedCounterId}
                onChange={e => setSelectedCounterId(e.target.value)}
                options={activeCounters.length
                  ? activeCounters.map((c: Counter) => ({ value: c.id, label: c.name }))
                  : [{ value: '', label: 'Unassigned (legacy mode)' }]}
              />
            </div>
          </div>

          {/* Counters */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700"><Monitor size={16} /> Counters</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {counters.map((counter: Counter) => {
                const serving = called.find((t: Token) => t.counter_id === counter.id)
                return (
                  <button key={counter.id} type="button"
                    onClick={() => toggleCounterMut.mutate(counter)}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${counter.is_active ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Power size={12} className={counter.is_active ? 'text-green-600' : 'text-gray-400'} />
                      {counter.name}
                    </span>
                    <span className="text-xs text-gray-500">{serving ? `Serving ${serving.display_code}` : counter.is_active ? 'Available' : 'Inactive'}</span>
                  </button>
                )
              })}
              {counters.length === 0 && <span className="text-sm text-gray-400">No counters yet.</span>}
            </div>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (newCounterName.trim()) createCounterMut.mutate() }}>
              <Input value={newCounterName} onChange={e => setNewCounterName(e.target.value)} placeholder="e.g. Counter 1" />
              <Button type="submit" variant="secondary" icon={<Plus size={14} />} loading={createCounterMut.isPending} disabled={!newCounterName.trim()}>Add</Button>
            </form>
          </div>
        </div>

        {/* ── Currently Serving ──────────────────────────────────────────────── */}
        {called.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Currently Serving</h2>
            <div className="space-y-2">
              {called.map((t: Token) => (
                <div key={t.id} className="card border-green-200 bg-green-50/40 p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-green-700">{t.display_code}</div>
                      <div>
                        <Badge color="green" dot>{t.status}</Badge>
                        {t.counter && <p className="text-xs font-medium text-blue-600 mt-1">{t.counter.name}</p>}
                        {t.guest_name && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Phone size={11} /> {t.guest_name}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" icon={<SkipForward size={13} />}
                        loading={skipMut.isPending} onClick={() => skipMut.mutate(t.id)}>
                        Skip
                      </Button>
                      <Button size="sm" variant="primary" icon={<CheckCircle size={14} />}
                        loading={completeMut.isPending} onClick={() => completeMut.mutate(t.id)}>
                        Complete & Call Next
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Waiting Queue ──────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Waiting Queue ({waiting.length})
          </h2>
          {isLoading ? <TableSkeleton rows={5} /> : waiting.length === 0 ? (
            <div className="card p-8 text-center text-gray-400">
              <CheckCircle size={28} className="mx-auto mb-2 text-green-300" />
              <p className="font-medium">Queue is empty</p>
              <p className="text-sm mt-1">All tokens have been served. Great work!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {waiting.map((t: Token, index: number) => (
                <div key={t.id} className={`card p-4 flex items-center gap-4 ${index === 0 ? 'border-[#E85D32]/30 bg-orange-50/30' : ''}`}>
                  <div className={`text-sm font-bold w-6 text-center flex-shrink-0 ${index === 0 ? 'text-[#E85D32]' : 'text-gray-400'}`}>
                    {index === 0 ? '▶' : index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900">{t.display_code}</span>
                      {index === 0 && <span className="text-[10px] font-semibold text-[#E85D32] bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">NEXT UP</span>}
                      {t.priority === 'priority' && <Badge color="purple">Priority</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                      {t.guest_name && <span className="flex items-center gap-1"><Phone size={10} /> {t.guest_name}</span>}
                      <span className="flex items-center gap-1"><Clock size={10} /> ~{formatWaitTime(t.estimated_wait_seconds)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end items-center">
                    {/* Priority */}
                    <button onClick={() => priorityMut.mutate(t.id)} title="Toggle priority"
                      className={`p-1.5 rounded-lg transition-colors ${t.priority === 'priority' ? 'text-purple-600 bg-purple-50' : 'text-gray-300 hover:text-purple-500'}`}>
                      <Star size={15} />
                    </button>

                    {/* Extend wait */}
                    <div className="relative">
                      <button
                        onClick={() => setExtendOpenId(extendOpenId === t.id ? null : t.id)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-200"
                      >
                        <ChevronUp size={12} /><Clock size={12} /> Extend
                      </button>
                      {extendOpenId === t.id && (
                        <div className="absolute right-0 bottom-full mb-1 z-20 bg-white border border-gray-100 rounded-xl shadow-lg p-2 min-w-[130px]">
                          <p className="text-xs text-gray-400 px-2 pb-1.5 font-medium">Add wait time</p>
                          {EXTEND_PRESETS.map(preset => (
                            <button key={preset.seconds}
                              onClick={() => extendMut.mutate({ id: t.id, addSeconds: preset.seconds })}
                              className="w-full text-left text-sm px-2 py-1.5 rounded-lg hover:bg-amber-50 text-gray-700 hover:text-amber-700 transition-colors">
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

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

      {/* ── Sticky "Call Next" action bar (always visible at bottom) ─────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-gray-100 shadow-lg px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            {isServing ? (
              <p className="text-sm font-semibold text-gray-800">
                Currently serving: <span className="text-green-700">{called.map((t: Token) => t.display_code).join(', ')}</span>
              </p>
            ) : waiting.length > 0 ? (
              <p className="text-sm font-semibold text-gray-800">
                Next up: <span className="text-[#E85D32] font-bold">{waiting[0]?.display_code}</span>
                <span className="text-gray-400 font-normal ml-2">— {waiting.length} waiting</span>
              </p>
            ) : (
              <p className="text-sm text-gray-400">Queue is empty — all done!</p>
            )}
          </div>
          <Button
            variant="primary"
            icon={<ArrowRightCircle size={16} />}
            loading={callNextMut.isPending}
            disabled={waiting.length === 0}
            onClick={() => callNextMut.mutate()}
            className="flex-shrink-0 px-5"
          >
            Call Next Token
          </Button>
        </div>
      </div>
    </Layout>
  )
}
