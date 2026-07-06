import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  PlayCircle, PauseCircle, XCircle, Users, Clock,
  Building2, Phone, Star, CheckCircle, SkipForward,
  ArrowRightCircle, ChevronDown, ChevronUp as ChevronUpIcon,
  Clock3, CheckCheck, AlertCircle
} from 'lucide-react'
import { staffAPI } from '../../services/api'
import api from '../../services/api'
import { wsService } from '../../services/websocket'
import { useAuthStore } from '../../stores/authStore'
import { useVenueStore } from '../../stores/venueStore'
import { superAdminAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { Badge, statusToBadgeColor } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { CardSkeleton } from '../../components/ui/Spinner'
import { formatWaitTime } from '../../utils/formatters'
import toast from 'react-hot-toast'
import type { Queue, Token, Venue } from '../../types'

// ── Extend presets ────────────────────────────────────────────────────────────
const EXTEND_PRESETS = [
  { label: '+1 min', seconds: 60 },
  { label: '+3 min', seconds: 180 },
  { label: '+5 min', seconds: 300 },
  { label: '+10 min', seconds: 600 },
]

// ── Token status badge helper ─────────────────────────────────────────────────
const tokenStatusColor: Record<string, string> = {
  waiting:   'bg-blue-50 text-blue-700 border border-blue-100',
  called:    'bg-amber-50 text-amber-700 border border-amber-100',
  serving:   'bg-green-50 text-green-700 border border-green-100',
  completed: 'bg-gray-50 text-gray-500 border border-gray-100',
  cancelled: 'bg-red-50 text-red-500 border border-red-100',
  skipped:   'bg-gray-50 text-gray-400 border border-gray-100',
}
const tokenStatusIcon: Record<string, React.ReactNode> = {
  waiting:   <Clock3 size={11} />,
  called:    <AlertCircle size={11} />,
  serving:   <ArrowRightCircle size={11} />,
  completed: <CheckCheck size={11} />,
  cancelled: <XCircle size={11} />,
  skipped:   <SkipForward size={11} />,
}

// ── Inline queue panel (tokens + controls) ────────────────────────────────────
function QueuePanel({ queue }: { queue: Queue }) {
  const queryClient = useQueryClient()
  const [showAll, setShowAll] = useState(false)
  const [extendOpenId, setExtendOpenId] = useState<string | null>(null)

  const { data: tokens = [], isLoading } = useQuery<Token[]>({
    queryKey: ['dashboard-tokens', queue.id, showAll],
    queryFn: () => staffAPI.getQueueTokens(queue.id, showAll ? 'all' : 'active').then(r => r.data.data ?? []),
    refetchInterval: 8000,
  })

  // Real-time via WebSocket
  useEffect(() => {
    wsService.connect(queue.id, 'queue')
    wsService.on(queue.id, '*', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-tokens', queue.id] })
      queryClient.invalidateQueries({ queryKey: ['staff-queues'] })
    })
    return () => wsService.disconnect(queue.id)
  }, [queue.id])

  // ── Mutations ───────────────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-tokens', queue.id] })
    queryClient.invalidateQueries({ queryKey: ['staff-queues'] })
  }

  const callNextMut = useMutation({
    mutationFn: () => staffAPI.callNext(queue.id),
    onSuccess: (r) => { toast.success(`📢 Called ${r.data.data.display_code}`); invalidate() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'No tokens left'),
  })

  const completeMut = useMutation({
    mutationFn: (id: string) => staffAPI.completeToken(id),
    onSuccess: (_, id) => {
      invalidate()
      const waiting = tokens.filter((t: Token) => t.status === 'waiting' && t.id !== id)
      if (waiting.length > 0) {
        toast.custom((t) => (
          <div className={`flex items-center gap-3 bg-[#18201D] text-white px-4 py-3 rounded-xl shadow-xl border border-white/10`}>
            <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-sm">Turn completed ✓</p>
              <p className="text-xs text-white/60">{waiting.length} still waiting</p>
            </div>
            <button onClick={() => { toast.dismiss(t.id); callNextMut.mutate() }}
              className="flex items-center gap-1.5 bg-[#E85D32] hover:bg-[#d44f27] text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors">
              <ArrowRightCircle size={13} /> Call Next
            </button>
          </div>
        ), { duration: 8000, position: 'bottom-center' })
      } else {
        toast.success('✅ Turn done — queue is now empty!')
      }
    },
    onError: () => toast.error('Could not complete token'),
  })

  const skipMut = useMutation({
    mutationFn: (id: string) => staffAPI.skipToken(id),
    onSuccess: (_, id) => {
      invalidate()
      const waiting = tokens.filter((t: Token) => t.status === 'waiting' && t.id !== id)
      if (waiting.length > 0) {
        toast.custom((t) => (
          <div className={`flex items-center gap-3 bg-[#18201D] text-white px-4 py-3 rounded-xl shadow-xl border border-white/10`}>
            <SkipForward size={18} className="text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-sm">Token skipped</p>
              <p className="text-xs text-white/60">{waiting.length} still waiting</p>
            </div>
            <button onClick={() => { toast.dismiss(t.id); callNextMut.mutate() }}
              className="flex items-center gap-1.5 bg-[#E85D32] hover:bg-[#d44f27] text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors">
              <ArrowRightCircle size={13} /> Call Next
            </button>
          </div>
        ), { duration: 8000, position: 'bottom-center' })
      } else {
        toast.success('Queue is now empty')
      }
    },
    onError: () => toast.error('Could not skip token'),
  })

  const callMut = useMutation({
    mutationFn: (id: string) => staffAPI.callToken(id),
    onSuccess: (r) => { toast.success(`📢 Called ${r.data.data.display_code}`); invalidate() },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Could not call token'),
  })

  const priorityMut = useMutation({
    mutationFn: (id: string) => staffAPI.togglePriority(id),
    onSuccess: () => invalidate(),
  })

  const extendMut = useMutation({
    mutationFn: ({ id, addSeconds }: { id: string; addSeconds: number }) =>
      staffAPI.extendTokenTime(id, addSeconds),
    onSuccess: (_, vars) => {
      const p = EXTEND_PRESETS.find(p => p.seconds === vars.addSeconds)
      toast.success(`⏱ Extended by ${p?.label.replace('+', '') ?? vars.addSeconds + 's'}`)
      setExtendOpenId(null)
      invalidate()
    },
    onError: () => toast.error('Could not extend time'),
  })

  const statusMut = useMutation({
    mutationFn: (status: string) => staffAPI.updateQueueStatus(queue.id, status),
    onSuccess: () => { invalidate(); queryClient.invalidateQueries({ queryKey: ['staff-queues'] }) },
    onError: () => toast.error('Failed to update queue status'),
  })

  // Group tokens
  const activeTokens = tokens.filter((t: Token) => ['waiting', 'called', 'serving'].includes(t.status))
  const doneTokens   = tokens.filter((t: Token) => ['completed', 'cancelled', 'skipped'].includes(t.status))
  const waitingCount = tokens.filter((t: Token) => t.status === 'waiting').length
  const servedCount  = tokens.filter((t: Token) => t.status === 'completed').length

  return (
    <div className="card overflow-hidden border-t-4 border-t-[#E85D32]">
      {/* Queue header */}
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-bold text-gray-900">{queue.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge color={statusToBadgeColor(queue.status)} dot>{queue.status}</Badge>
              <span className="text-xs text-gray-400">{waitingCount} waiting · {servedCount} served</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Queue status controls */}
          {queue.status === 'active' && (
            <Button size="sm" variant="secondary" icon={<PauseCircle size={13} />}
              onClick={() => statusMut.mutate('paused')}>Pause</Button>
          )}
          {(queue.status === 'paused' || queue.status === 'inactive') && (
            <Button size="sm" variant="secondary" icon={<PlayCircle size={13} />}
              onClick={() => statusMut.mutate('active')}>Resume</Button>
          )}
          {queue.status !== 'closed' && (
            <Button size="sm" variant="danger" icon={<XCircle size={13} />}
              onClick={() => statusMut.mutate('closed')}>Close</Button>
          )}
          {/* Call Next */}
          <Button size="sm" variant="primary" icon={<ArrowRightCircle size={13} />}
            loading={callNextMut.isPending}
            disabled={waitingCount === 0 || queue.status !== 'active'}
            onClick={() => callNextMut.mutate()}>
            Call Next
          </Button>
        </div>
      </div>

      {/* Token list */}
      <div className="p-4 space-y-2">
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => (
            <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
          ))}</div>
        ) : activeTokens.length === 0 && doneTokens.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Users size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No tokens yet — queue is empty</p>
          </div>
        ) : (
          <>
            {/* Active tokens (waiting / called / serving) */}
            {activeTokens.length > 0 && (
              <div className="space-y-2">
                {activeTokens.map((t: Token, index: number) => (
                  <div key={t.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                      ${t.status === 'called' || t.status === 'serving'
                        ? 'bg-green-50/60 border-green-200'
                        : index === 0 ? 'bg-orange-50/40 border-orange-200' : 'bg-white border-gray-100'
                      }`}
                  >
                    {/* Position / status icon */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white border border-gray-200 text-sm font-bold text-gray-600">
                      {t.status === 'called' || t.status === 'serving' ? '▶' : index + 1}
                    </div>

                    {/* Token info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm">{t.display_code}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tokenStatusColor[t.status] || ''}`}>
                          {tokenStatusIcon[t.status]} {t.status}
                        </span>
                        {t.priority === 'priority' && (
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded-full">Priority</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        {t.guest_name && <span className="flex items-center gap-1"><Phone size={9} /> {t.guest_name}</span>}
                        {t.status === 'waiting' && (
                          <span className="flex items-center gap-1"><Clock size={9} /> ~{formatWaitTime(t.estimated_wait_seconds)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                      {/* Priority toggle (only for waiting) */}
                      {t.status === 'waiting' && (
                        <button onClick={() => priorityMut.mutate(t.id)}
                          title="Toggle priority"
                          className={`p-1.5 rounded-lg transition-colors ${t.priority === 'priority' ? 'text-purple-600 bg-purple-50' : 'text-gray-300 hover:text-purple-400 hover:bg-purple-50'}`}>
                          <Star size={14} />
                        </button>
                      )}

                      {/* Extend time (waiting + called) */}
                      {(t.status === 'waiting' || t.status === 'called') && (
                        <div className="relative">
                          <button
                            onClick={() => setExtendOpenId(extendOpenId === t.id ? null : t.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                          >
                            <Clock size={11} /> +Time
                          </button>
                          {extendOpenId === t.id && (
                            <div className="absolute right-0 bottom-full mb-1 z-30 bg-white border border-gray-100 rounded-xl shadow-xl p-1.5 min-w-[120px]">
                              <p className="text-[10px] text-gray-400 px-2 pb-1 font-semibold uppercase">Extend wait</p>
                              {EXTEND_PRESETS.map(p => (
                                <button key={p.seconds}
                                  onClick={() => extendMut.mutate({ id: t.id, addSeconds: p.seconds })}
                                  className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-amber-50 text-gray-700 hover:text-amber-700">
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Call (waiting only) */}
                      {t.status === 'waiting' && (
                        <Button size="sm" variant="secondary"
                          loading={callMut.isPending}
                          onClick={() => callMut.mutate(t.id)}>
                          Call
                        </Button>
                      )}

                      {/* Skip */}
                      {(t.status === 'waiting' || t.status === 'called' || t.status === 'serving') && (
                        <Button size="sm" variant="ghost"
                          icon={<SkipForward size={12} />}
                          loading={skipMut.isPending}
                          onClick={() => skipMut.mutate(t.id)}
                          className="text-gray-500 hover:bg-gray-100">
                          Skip
                        </Button>
                      )}

                      {/* Complete (called / serving) */}
                      {(t.status === 'called' || t.status === 'serving') && (
                        <Button size="sm" variant="primary"
                          icon={<CheckCircle size={12} />}
                          loading={completeMut.isPending}
                          onClick={() => completeMut.mutate(t.id)}>
                          Done
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Completed / cancelled tokens (collapsible) */}
            {(doneTokens.length > 0 || showAll) && (
              <div className="pt-2">
                <button
                  onClick={() => setShowAll(v => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors w-full py-1"
                >
                  {showAll ? <ChevronUpIcon size={14} /> : <ChevronDown size={14} />}
                  {showAll ? 'Hide' : 'Show'} completed / cancelled ({doneTokens.length})
                </button>
                {showAll && doneTokens.length > 0 && (
                  <div className="space-y-1 mt-1">
                    {doneTokens.map((t: Token) => (
                      <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 opacity-70">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100 text-gray-400">
                          {tokenStatusIcon[t.status]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-gray-600">{t.display_code}</span>
                          {t.guest_name && <span className="text-xs text-gray-400 ml-2">{t.guest_name}</span>}
                        </div>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tokenStatusColor[t.status] || ''}`}>
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Staff Dashboard ──────────────────────────────────────────────────────
export default function StaffDashboard() {
  const { user } = useAuthStore()
  const { selectedVenueId, selectedVenueName, setSelectedVenue } = useVenueStore()
  const queryClient = useQueryClient()
  const isSuperAdmin = user?.role === 'superadmin'
  const venueId = isSuperAdmin ? selectedVenueId : (user?.venue_id || '')

  // Fetch all venues for superadmin picker
  const { data: allVenues = [] } = useQuery<Venue[]>({
    queryKey: ['all-venues-staff-dash'],
    queryFn: () => superAdminAPI.listVenues().then(r => r.data.data),
    enabled: isSuperAdmin,
  })

  // Fetch queues
  const { data: queues = [], isLoading, error } = useQuery<Queue[]>({
    queryKey: ['staff-queues', venueId],
    queryFn: () => {
      const endpoint = isSuperAdmin && venueId
        ? `/staff/queues?venue_id=${venueId}`
        : '/staff/queues'
      return api.get(endpoint).then(r => r.data.data ?? [])
    },
    refetchInterval: 30000,
    enabled: !!venueId || !isSuperAdmin,
  })

  const handleVenueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    const name = allVenues.find((v: Venue) => v.id === id)?.name || ''
    setSelectedVenue(id, name)
    queryClient.invalidateQueries({ queryKey: ['staff-queues'] })
  }

  const totalWaiting = queues.reduce((s: number, q: Queue) => s + (q.current_count || 0), 0)

  return (
    <Layout breadcrumb="Staff Dashboard">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#E85D32]">Live floor</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#18201D]">Staff dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {queues.length} queue{queues.length !== 1 ? 's' : ''} · {totalWaiting} total waiting
            </p>
          </div>
          {isSuperAdmin && selectedVenueName && (
            <span className="text-sm font-medium text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full">
              {selectedVenueName}
            </span>
          )}
        </div>

        {/* Venue selector — superadmin only */}
        {isSuperAdmin && (
          <div className="card p-4 flex items-center gap-3">
            <Building2 size={18} className="text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Select Venue</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedVenueId}
                onChange={handleVenueChange}
              >
                <option value="">— Pick a venue —</option>
                {allVenues.map((v: Venue) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="card p-5 bg-red-50 border-red-100 text-red-700 text-sm">
            <p className="font-semibold">Could not load queues</p>
            <p className="text-xs mt-1 text-red-500">
              {(error as any)?.response?.data?.message || 'Make sure your account has a venue assigned.'}
            </p>
          </div>
        )}

        {/* No venue selected prompt */}
        {isSuperAdmin && !venueId && !error && (
          <div className="card p-12 text-center text-gray-400">
            <Building2 size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Select a venue above to manage its queues</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">{[1,2].map(i => <CardSkeleton key={i} />)}</div>
        )}

        {/* No queues */}
        {!isLoading && !error && queues.length === 0 && (!isSuperAdmin || venueId) && (
          <div className="card p-12 text-center text-gray-400">
            <Building2 size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-gray-600">No queues found</p>
            <p className="text-sm mt-1">
              {isSuperAdmin ? 'This venue has no queues yet. Create one from Admin Panel.' : 'No queues are assigned to your venue yet.'}
            </p>
          </div>
        )}

        {/* Queue panels — one per queue with full token management inline */}
        {!isLoading && queues.map((queue: Queue) => (
          <QueuePanel key={queue.id} queue={queue} />
        ))}
      </div>
    </Layout>
  )
}
