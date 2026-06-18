import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlayCircle, PauseCircle, XCircle, ChevronRight, Users, Clock, Building2 } from 'lucide-react'
import { staffAPI } from '../../services/api'
import { wsService } from '../../services/websocket'
import { Layout } from '../../components/layout/Layout'
import { Badge, statusToBadgeColor } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { CardSkeleton } from '../../components/ui/Spinner'
import { formatWaitTime } from '../../utils/formatters'
import toast from 'react-hot-toast'
import type { Queue } from '../../types'

export default function StaffDashboard() {
  const queryClient = useQueryClient()

  const { data: queues = [], isLoading } = useQuery({
    queryKey: ['staff-queues'],
    queryFn: () => staffAPI.getQueues().then(r => r.data.data),
    refetchInterval: 15000,
  })

  // Subscribe to updates
  useEffect(() => {
    queues.forEach((q: Queue) => {
      wsService.connect(q.id, 'queue')
      wsService.on(q.id, '*', () => queryClient.invalidateQueries({ queryKey: ['staff-queues'] }))
    })
    return () => queues.forEach((q: Queue) => wsService.disconnect(q.id))
  }, [queues.length])

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => staffAPI.updateQueueStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-queues'] }),
    onError: () => toast.error('Failed to update queue status'),
  })

  const callNextMutation = useMutation({
    mutationFn: (queueId: string) => staffAPI.callNext(queueId).then(r => r.data.data),
    onSuccess: (token) => {
      toast.success(`Called token ${token.display_code}!`)
      queryClient.invalidateQueries({ queryKey: ['staff-queues'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'No tokens to call'),
  })

  const waiting = queues.reduce((sum: number, q: Queue) => sum + q.current_count, 0)

  return (
    <Layout breadcrumb="Staff Dashboard">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#E85D32]">Live floor</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#18201D]">Staff dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">{queues.length} queues · {waiting} total waiting</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <CardSkeleton key={i} />)}</div>
        ) : queues.length === 0 ? (
          <div className="card p-10 text-center">
            <Building2 size={32} className="mx-auto mb-3 text-black/30" />
            <p className="text-gray-500">No queues assigned to your venue</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {queues.map((queue: Queue) => (
              <div key={queue.id} className="card p-5 space-y-4 border-t-4 border-t-[#F5C84C]">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{queue.name}</h3>
                    <Badge color={statusToBadgeColor(queue.status)} dot className="mt-1">
                      {queue.status}
                    </Badge>
                  </div>
                  <Link to={`/staff/queue/${queue.id}`} className="text-sm text-blue-600 flex items-center gap-0.5 hover:underline">
                    Manage <ChevronRight size={14} />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <Users size={14} className="text-gray-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-900">{queue.current_count}</p>
                    <p className="text-xs text-gray-400">Waiting</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <Clock size={14} className="text-gray-400 mx-auto mb-1" />
                    <p className="text-xl font-bold text-gray-900">{formatWaitTime(queue.avg_serve_time_seconds)}</p>
                    <p className="text-xs text-gray-400">Avg time</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {queue.status === 'active' && (
                    <>
                      <Button size="sm" variant="primary" loading={callNextMutation.isPending}
                        onClick={() => callNextMutation.mutate(queue.id)}>Call Next</Button>
                      <Button size="sm" variant="secondary" icon={<PauseCircle size={14} />}
                        onClick={() => statusMutation.mutate({ id: queue.id, status: 'paused' })}>Pause</Button>
                    </>
                  )}
                  {queue.status === 'paused' && (
                    <Button size="sm" variant="primary" icon={<PlayCircle size={14} />}
                      onClick={() => statusMutation.mutate({ id: queue.id, status: 'active' })}>Resume</Button>
                  )}
                  {(queue.status === 'inactive' || queue.status === 'paused') && (
                    <Button size="sm" variant="primary" icon={<PlayCircle size={14} />}
                      onClick={() => statusMutation.mutate({ id: queue.id, status: 'active' })}>Open</Button>
                  )}
                  {queue.status !== 'closed' && (
                    <Button size="sm" variant="danger" icon={<XCircle size={14} />}
                      onClick={() => statusMutation.mutate({ id: queue.id, status: 'closed' })}>Close</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
