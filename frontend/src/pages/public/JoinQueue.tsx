import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Users, Clock, CheckCircle, ArrowLeft, Zap } from 'lucide-react'
import { queueAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { QRCodeCard } from '../../components/queue/QRCodeCard'
import { PageSpinner } from '../../components/ui/Spinner'
import { PublicNav } from '../../components/layout/PublicNav'
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
  const [wantsPriority, setWantsPriority] = useState(false)

  const { data: queueData, isLoading } = useQuery({
    queryKey: ['queue', queueId],
    queryFn: () => queueAPI.get(queueId!).then(r => r.data.data),
    refetchInterval: 10000,
  })

  const joinMutation = useMutation({
    mutationFn: (data: { guest_name?: string; guest_phone?: string; priority?: boolean }) =>
      queueAPI.join(queueId!, data).then(r => r.data.data),
    onSuccess: (token: Token) => {
      setJoined(token)
      toast.success(token.priority === 'priority'
        ? '⚡ Priority token issued!'
        : "You've joined the queue!")
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to join queue'),
  })

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated && (!guestName || !guestPhone)) {
      toast.error('Please enter your name and phone')
      return
    }
    joinMutation.mutate({
      guest_name: guestName,
      guest_phone: guestPhone,
      priority: wantsPriority,
    })
  }

  if (isLoading) return <PageSpinner />

  const queue = queueData
  const trackUrl = joined ? `${window.location.origin}/track/${joined.id}` : ''
  const isPriorityToken = joined?.priority === 'priority'

  return (
    <div className="min-h-screen bg-[#F4F1E9]">
      <PublicNav />
      <div className="flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-md">
          <Link to={`/venues`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft size={14} /> Back to venues
          </Link>

          {joined ? (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center mb-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isPriorityToken ? 'bg-amber-100' : 'bg-green-100'}`}>
                  {isPriorityToken
                    ? <Zap className="text-amber-600" size={24} />
                    : <CheckCircle className="text-green-600" size={24} />}
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  {isPriorityToken ? '⚡ Priority token issued!' : "You're in the queue!"}
                </h1>
                <p className="text-sm text-gray-500 mt-1">{queue?.name}</p>
                {isPriorityToken && (
                  <p className="text-xs text-amber-600 font-medium mt-1 bg-amber-50 px-3 py-1 rounded-full inline-block">
                    You are ahead of regular tokens
                  </p>
                )}
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
            <div className="card p-6 sm:p-8 animate-fade-in">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#E85D32]">Take a digital number</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#18201D] mb-1">Join queue</h1>
              <p className="text-sm text-gray-500 mb-5">{queue?.name || 'Loading...'}</p>

              {/* Live stats */}
              {queue && (
                <div className="grid grid-cols-2 gap-px mb-6 overflow-hidden rounded-2xl bg-black/10">
                  <div className="bg-[#F4F1E9] p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Currently waiting</p>
                    <p className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
                      <Users size={16} className="text-blue-500" />{queue.current_count}
                    </p>
                  </div>
                  <div className="bg-[#F4F1E9] p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Est. wait time</p>
                    <p className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
                      <Clock size={16} className="text-blue-500" />
                      {formatWaitTime(queue.avg_serve_time_seconds * queue.current_count)}
                    </p>
                  </div>
                </div>
              )}

              {/* Priority toggle — only shown if the queue has it enabled */}
              {queue?.is_priority_enabled && (
                <button
                  type="button"
                  onClick={() => setWantsPriority(v => !v)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all mb-5
                    ${wantsPriority
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-gray-100 bg-white hover:border-gray-200'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                    ${wantsPriority ? 'bg-amber-400' : 'bg-gray-100'}`}>
                    <Zap size={18} className={wantsPriority ? 'text-white' : 'text-gray-400'} />
                  </div>
                  <div className="text-left flex-1">
                    <p className={`text-sm font-bold ${wantsPriority ? 'text-amber-700' : 'text-gray-700'}`}>
                      Request Priority
                    </p>
                    <p className="text-xs text-gray-400">
                      For senior citizens, differently-abled, or urgent cases
                    </p>
                  </div>
                  {/* Toggle indicator */}
                  <div className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 relative
                    ${wantsPriority ? 'bg-amber-400' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all
                      ${wantsPriority ? 'left-6' : 'left-1'}`} />
                  </div>
                </button>
              )}

              {queue?.status !== 'active' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-sm text-yellow-700">
                  This queue is currently {queue?.status}. You may not be able to join.
                </div>
              )}

              {isAuthenticated ? (
                <Button
                  variant="primary"
                  className={`w-full ${wantsPriority ? '!bg-amber-500 hover:!bg-amber-600' : ''}`}
                  loading={joinMutation.isPending}
                  onClick={() => joinMutation.mutate({ priority: wantsPriority })}
                >
                  {wantsPriority ? '⚡ Join with Priority' : 'Join Now — One Click'}
                </Button>
              ) : (
                <form onSubmit={handleJoin} className="space-y-4">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Guest Join (No account needed)</p>
                  <Input label="Your Name" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Enter your name" required />
                  <Input label="Phone Number" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+91 98765 43210" type="tel" required />
                  <Button
                    type="submit"
                    variant="primary"
                    className={`w-full ${wantsPriority ? '!bg-amber-500 hover:!bg-amber-600' : ''}`}
                    loading={joinMutation.isPending}
                  >
                    {wantsPriority ? '⚡ Join with Priority' : 'Join Queue'}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
