import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, Users, CheckCircle, XCircle, Loader2, Bell } from 'lucide-react'
import { queueAPI } from '../../services/api'
import { wsService } from '../../services/websocket'
import { formatWaitTime, formatDateTime } from '../../utils/formatters'
import { Button } from '../../components/ui/Button'
import { QRCodeCard } from '../../components/queue/QRCodeCard'
import toast from 'react-hot-toast'

export default function TrackToken() {
  const { tokenId } = useParams<{ tokenId: string }>()
  const queryClient = useQueryClient()
  const [position, setPosition] = useState<number | null>(null)
  const [isCalled, setIsCalled] = useState(false)

  const { data: token, isLoading, refetch } = useQuery({
    queryKey: ['token', tokenId],
    queryFn: () => queueAPI.getToken(tokenId!).then(r => r.data.data),
    refetchInterval: 15000,
  })

  const { data: posData } = useQuery({
    queryKey: ['position', token?.queue_id, tokenId],
    queryFn: () => token ? queueAPI.getPosition(token.queue_id, tokenId!).then(r => r.data.data) : null,
    enabled: !!token && ['waiting', 'called'].includes(token?.status),
    refetchInterval: 10000,
  })

  const cancelMutation = useMutation({
    mutationFn: () => queueAPI.cancelToken(tokenId!).then(r => r.data.data),
    onSuccess: () => { toast.success('Token cancelled'); refetch() },
    onError: () => toast.error('Could not cancel token'),
  })

  useEffect(() => {
    if (!tokenId) return
    wsService.connect(tokenId, 'token')
    wsService.on(tokenId, 'your_turn', () => {
      setIsCalled(true)
      toast.success('🎉 It\'s your turn!', { duration: 10000 })
      refetch()
    })
    wsService.on(tokenId, 'token.cancelled', () => refetch())
    return () => wsService.disconnect(tokenId)
  }, [tokenId])

  useEffect(() => {
    if (posData) setPosition(posData.position)
  }, [posData])

  useEffect(() => {
    if (token?.status === 'called') setIsCalled(true)
  }, [token?.status])

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  )

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">Token not found</div>
  )

  const trackUrl = `${window.location.origin}/track/${tokenId}`
  const isActive = ['waiting', 'called', 'serving'].includes(token.status)
  const isCompleted = token.status === 'completed'
  const isCancelled = ['cancelled', 'skipped'].includes(token.status)

  // "Your turn" celebration screen
  if (isCalled && token.status === 'called') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center max-w-sm animate-fade-in">
          <div className="relative inline-block mb-6">
            <div className="w-28 h-28 bg-green-500 rounded-full flex items-center justify-center pulse-green mx-auto">
              <CheckCircle className="text-white" size={56} />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-green-300 animate-ping" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">It's your turn! 🎉</h1>
          <p className="text-gray-500 mb-4">Token <span className="font-bold text-gray-900">{token.display_code}</span> has been called</p>
          <p className="text-sm text-gray-400">Please proceed to the counter now</p>
          {token.called_at && (
            <p className="text-xs text-gray-400 mt-2">Called at {formatDateTime(token.called_at)}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-4 pt-8">
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

        {isActive && (
          <div className="card p-5 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1"><Users size={11} /> Position</p>
              <p className="text-3xl font-bold text-blue-600">{position ?? '...'}</p>
              <p className="text-xs text-gray-400">ahead of you</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1"><Clock size={11} /> Est. Wait</p>
              <p className="text-3xl font-bold text-gray-900">
                {posData ? formatWaitTime(posData.estimated_wait_seconds) : '...'}
              </p>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="card p-5 bg-green-50 border-green-100 text-center">
            <CheckCircle className="text-green-500 mx-auto mb-2" size={28} />
            <p className="font-medium text-green-800">Service completed!</p>
            {token.actual_wait_seconds > 0 && (
              <p className="text-sm text-green-600 mt-1">
                Total wait: {formatWaitTime(token.actual_wait_seconds)}
              </p>
            )}
          </div>
        )}

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
