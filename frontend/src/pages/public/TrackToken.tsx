import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Clock, Users, CheckCircle, XCircle, Loader2, Bell, Monitor, AlertCircle } from 'lucide-react'
import { queueAPI } from '../../services/api'
import { wsService } from '../../services/websocket'
import { formatDateTime } from '../../utils/formatters'
import { Button } from '../../components/ui/Button'
import { QRCodeCard } from '../../components/queue/QRCodeCard'
import { PublicNav } from '../../components/layout/PublicNav'
import toast from 'react-hot-toast'

// ─── Deadline-based countdown ─────────────────────────────────────────────────
// readyAt is an ISO timestamp string from the server ("estimated_ready_at").
// remaining = max(0, readyAt - NOW) ticked every second.
//
//  ✅ Refresh-safe — same deadline → same countdown, NEVER resets to initial value
//  ✅ Live — WS time_extended updates readyAt in state → countdown jumps instantly
//  ✅ Cascades — downstream tokens get their own WS event with their shifted readyAt
function useDeadlineCountdown(readyAt: string | null) {
  const calcRemaining = (ra: string | null) =>
    ra ? Math.max(0, Math.floor((new Date(ra).getTime() - Date.now()) / 1000)) : 0

  const [remaining, setRemaining] = useState(() => calcRemaining(readyAt))
  const notifiedRef = useRef(false)

  useEffect(() => {
    // Immediately apply new deadline
    setRemaining(calcRemaining(readyAt))
    notifiedRef.current = false

    if (!readyAt) return

    const timer = setInterval(() => {
      const left = calcRemaining(readyAt)
      setRemaining(left)

      // 30-second alert — fire once per session
      if (left <= 30 && left > 0 && !notifiedRef.current) {
        notifiedRef.current = true
        toast.custom(
          (t) => (
            <div className={`flex items-center gap-3 bg-amber-500 text-white px-4 py-3 rounded-xl shadow-lg ${t.visible ? 'animate-fade-in' : ''}`}>
              <AlertCircle size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Get ready! 🔔</p>
                <p className="text-xs opacity-90">Your turn is almost here — less than 30 seconds!</p>
              </div>
            </div>
          ),
          { duration: 10000, position: 'top-center' }
        )
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('QueueSmart — Get Ready! 🔔', {
            body: 'Your turn is almost here — less than 30 seconds!',
            icon: '/favicon.ico',
          })
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [readyAt]) // re-runs every time deadline changes (e.g. after WS extension event)

  return remaining
}

// ─── Format countdown ─────────────────────────────────────────────────────────
function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Any moment now'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

// ─── Parse estimated_ready_at from any server shape ───────────────────────────
// The server may return a Time object (with "Time"/"Valid" keys from sql.NullTime)
// or a plain ISO string or a plain *time.Time JSON serialization.
function parseReadyAt(val: any): string | null {
  if (!val) return null
  if (typeof val === 'string') return val
  // sql.NullTime shape: { Time: "...", Valid: true }
  if (val.Valid === false) return null
  if (val.Time) return val.Time
  return null
}

// ─── Request browser notification permission ──────────────────────────────────
function useBrowserNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  )
  const request = async () => {
    if (!('Notification' in window)) return
    setPermission(await Notification.requestPermission())
  }
  return { permission, request }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TrackToken() {
  const { tokenId } = useParams<{ tokenId: string }>()
  const [isCalled, setIsCalled] = useState(false)

  // Deadline timestamp — single source of truth for the countdown.
  // Populated from the API on mount/poll, and updated live via WS.
  const [readyAt, setReadyAt] = useState<string | null>(null)

  const { permission, request: requestNotifPermission } = useBrowserNotificationPermission()

  // ── Fetch token details ──────────────────────────────────────────────────
  const { data: token, isLoading, refetch } = useQuery({
    queryKey: ['token', tokenId],
    queryFn: () => queueAPI.getToken(tokenId!).then(r => r.data.data),
    refetchInterval: 20000,
  })

  // ── Fetch position + deadline (only while waiting/called) ────────────────
  const { data: posData } = useQuery({
    queryKey: ['position', token?.queue_id, tokenId],
    queryFn: () => token
      ? queueAPI.getPosition(token.queue_id, tokenId!).then(r => r.data.data)
      : null,
    enabled: !!token && ['waiting', 'called'].includes(token?.status ?? ''),
    refetchInterval: 15000,
  })

  // Sync deadline from API polls into state
  useEffect(() => {
    const ra = parseReadyAt(posData?.estimated_ready_at)
      ?? parseReadyAt(token?.estimated_ready_at)
    if (ra) setReadyAt(ra)
  }, [posData?.estimated_ready_at, token?.estimated_ready_at])

  // ── Cancel ───────────────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: () => queueAPI.cancelToken(tokenId!).then(r => r.data.data),
    onSuccess: () => { toast.success('Token cancelled'); refetch() },
    onError: () => toast.error('Could not cancel token'),
  })

  // ── WebSocket real-time updates ──────────────────────────────────────────
  useEffect(() => {
    if (!tokenId) return
    wsService.connect(tokenId, 'token')

    wsService.on(tokenId, 'your_turn', () => {
      setIsCalled(true)
      toast.success('🎉 It\'s your turn!', { duration: 10000 })
      refetch()
    })

    wsService.on(tokenId, 'token.cancelled', () => refetch())

    // Staff extended time — update deadline INSTANTLY, no refresh needed.
    // Works for both the directly extended token AND cascaded downstream tokens
    // (each gets its own time_extended WS event with its individual readyAt).
    wsService.on(tokenId, 'time_extended', (data: any) => {
      const newReadyAt = parseReadyAt(data?.estimated_ready_at)
      if (newReadyAt) {
        setReadyAt(newReadyAt)  // ← countdown updates immediately
      }

      const added = data?.added_seconds ?? 0
      const mins = Math.round(added / 60)
      toast(
        mins >= 1
          ? `⏱ Wait extended by ${mins} min${mins !== 1 ? 's' : ''}`
          : `⏱ Wait extended by ${added}s`,
        { icon: '⏱', duration: 5000 }
      )
    })

    return () => wsService.disconnect(tokenId)
  }, [tokenId])

  useEffect(() => {
    if (token?.status === 'called') setIsCalled(true)
  }, [token?.status])

  // ── Live countdown (deadline-based) ─────────────────────────────────────
  const remaining = useDeadlineCountdown(readyAt)

  // ── Loading / not found ──────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-[#F4F1E9]">
      <PublicNav />
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-[#E85D32]" size={32} />
      </div>
    </div>
  )
  if (!token) return (
    <div className="min-h-screen bg-[#F4F1E9]">
      <PublicNav />
      <div className="flex items-center justify-center py-32 text-gray-500">Token not found</div>
    </div>
  )

  const trackUrl = `${window.location.origin}/track/${tokenId}`
  const isActive = ['waiting', 'called', 'serving'].includes(token.status)
  const isCompleted = token.status === 'completed'
  const isCancelled = ['cancelled', 'skipped'].includes(token.status)
  const isNearlyDue = remaining > 0 && remaining <= 30

  // ── "Your turn" screen ───────────────────────────────────────────────────
  if (isCalled && token.status === 'called') {
    return (
      <div className="min-h-screen bg-[#F4F1E9]">
        <PublicNav />
        <div className="flex items-center justify-center p-6 py-20">
          <div className="text-center max-w-sm animate-fade-in">
            <div className="relative inline-block mb-6">
              <div className="w-28 h-28 bg-green-500 rounded-full flex items-center justify-center pulse-green mx-auto">
                <CheckCircle className="text-white" size={56} />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-green-300 animate-ping" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">It's your turn! 🎉</h1>
            <p className="text-gray-500 mb-4">Token <span className="font-bold text-gray-900">{token.display_code}</span> has been called</p>
            {token.counter ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-5 py-3 text-lg font-bold text-blue-700">
                <Monitor size={20} /> Proceed to {token.counter.name}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Please proceed to the counter now</p>
            )}
            {token.called_at && (
              <p className="text-xs text-gray-400 mt-2">Called at {formatDateTime(token.called_at)}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Main tracking screen ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F1E9]">
      <PublicNav />
      <div className="max-w-md mx-auto px-4 pb-12 pt-6 space-y-4">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-1">{token.queue?.name}</p>
          <h1 className="text-2xl font-bold text-gray-900">
            {isCompleted ? 'Served! Thank you.' : isCancelled ? 'Token Cancelled' : 'Tracking your position'}
          </h1>
        </div>

        <QRCodeCard
          displayCode={token.display_code}
          qrValue={trackUrl}
          subtitle={token.guest_name ? `Guest: ${token.guest_name}` : undefined}
        />

        {/* ── Live stats card ────────────────────────────────────────────── */}
        {isActive && (
          <div className="card p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Position */}
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                  <Users size={11} /> Position
                </p>
                <p className="text-3xl font-bold text-blue-600">{posData?.position ?? '...'}</p>
                <p className="text-xs text-gray-400">ahead of you</p>
              </div>

              {/* Live countdown */}
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                  <Clock size={11} /> Est. Wait
                </p>
                <p className={`text-3xl font-bold tabular-nums transition-colors ${
                  isNearlyDue ? 'text-amber-500 animate-pulse' : 'text-gray-900'
                }`}>
                  {/* Show countdown if we have a deadline, else show '...' while loading */}
                  {readyAt ? formatCountdown(remaining) : '...'}
                </p>
                {isNearlyDue && (
                  <p className="text-xs font-semibold text-amber-500 mt-0.5">Get ready! 🔔</p>
                )}
              </div>
            </div>

            {/* Notification permission prompt */}
            {permission === 'default' && (
              <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3">
                <Bell size={16} className="text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-700">Get notified when it's almost your turn</p>
                  <p className="text-xs text-blue-500">We'll alert you 30 seconds before</p>
                </div>
                <button
                  onClick={requestNotifPermission}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded-lg transition-colors flex-shrink-0"
                >
                  Enable
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Completed ────────────────────────────────────────────────────── */}
        {isCompleted && (
          <div className="card p-5 bg-green-50 border-green-100 text-center">
            <CheckCircle className="text-green-500 mx-auto mb-2" size={28} />
            <p className="font-medium text-green-800">Service completed!</p>
            {token.actual_wait_seconds > 0 && (
              <p className="text-sm text-green-600 mt-1">
                Total wait: {formatCountdown(token.actual_wait_seconds)}
              </p>
            )}
          </div>
        )}

        {/* ── Cancelled / Skipped ──────────────────────────────────────────── */}
        {isCancelled && (
          <div className="card p-5 bg-red-50 border-red-100 text-center">
            <XCircle className="text-red-400 mx-auto mb-2" size={28} />
            <p className="font-medium text-red-700">This token has been {token.status}</p>
          </div>
        )}

        {isActive && !isCalled && (
          <Button variant="secondary" className="w-full" loading={cancelMutation.isPending}
            onClick={() => cancelMutation.mutate()}>
            Cancel my token
          </Button>
        )}

        <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
          <Bell size={10} /> Stay on this page for live updates
        </p>
      </div>
    </div>
  )
}
