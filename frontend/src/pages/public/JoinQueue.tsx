import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Users, Clock, CheckCircle, ArrowLeft } from 'lucide-react'
import { queueAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { QRCodeCard } from '../../components/queue/QRCodeCard'
import { Badge, statusToBadgeColor } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatWaitTime } from '../../utils/formatters'
import toast from 'react-hot-toast'
import type { Token } from '../../types'

export default function JoinQueue() {
  const { queueId } = useParams<{ queueId: string }>()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [joined, setJoined] = useState<Token | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')

  const { data: queueData, isLoading } = useQuery({
    queryKey: ['queue', queueId],
    queryFn: () => queueAPI.get(queueId!).then(r => r.data.data),
    refetchInterval: 10000,
  })

  const joinMutation = useMutation({
    mutationFn: (data: { guest_name?: string; guest_phone?: string }) =>
      queueAPI.join(queueId!, data).then(r => r.data.data),
    onSuccess: (token: Token) => {
      setJoined(token)
      toast.success('You\'ve joined the queue!')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to join queue'),
  })

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated && (!guestName || !guestPhone)) {
      toast.error('Please enter your name and phone')
      return
    }
    joinMutation.mutate({ guest_name: guestName, guest_phone: guestPhone })
  }

  if (isLoading) return <PageSpinner />

  const queue = queueData
  const trackUrl = joined ? `${window.location.origin}/track/${joined.id}` : ''

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to={`/venues`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft size={14} /> Back
        </Link>

        {joined ? (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <h1 className="text-xl font-bold text-gray-900">You're in the queue!</h1>
              <p className="text-sm text-gray-500 mt-1">{queue?.name}</p>
            </div>

            <QRCodeCard
              displayCode={joined.display_code}
              qrValue={trackUrl}
              subtitle={`Position: ${joined.token_number} • Est. wait: ${formatWaitTime(joined.estimated_wait_seconds)}`}
            />

            <Button variant="primary" className="w-full" onClick={() => navigate(`/track/${joined.id}`)}>
              Track my position live →
            </Button>
          </div>
        ) : (
          <div className="card p-6 animate-fade-in">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Join Queue</h1>
            <p className="text-sm text-gray-500 mb-5">{queue?.name || 'Loading...'}</p>

            {queue && (
              <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Currently waiting</p>
                  <p className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
                    <Users size={16} className="text-blue-500" />{queue.current_count}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Est. wait time</p>
                  <p className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
                    <Clock size={16} className="text-blue-500" />
                    {formatWaitTime(queue.avg_serve_time_seconds * queue.current_count)}
                  </p>
                </div>
              </div>
            )}

            {queue?.status !== 'active' && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-700">
                This queue is currently {queue?.status}. You may not be able to join.
              </div>
            )}

            {isAuthenticated ? (
              <Button variant="primary" className="w-full" loading={joinMutation.isPending} onClick={() => joinMutation.mutate({})}>
                Join Now — One Click
              </Button>
            ) : (
              <form onSubmit={handleJoin} className="space-y-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Guest Join (No account needed)</p>
                <Input label="Your Name" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Enter your name" required />
                <Input label="Phone Number" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+1 234 567 8900" type="tel" required />
                <Button type="submit" variant="primary" className="w-full" loading={joinMutation.isPending}>
                  Join Queue
                </Button>
                <p className="text-center text-xs text-gray-400">
                  Have an account? <Link to={`/login?redirect=/join/${queueId}`} className="text-blue-600">Sign in</Link> for a better experience
                </p>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
