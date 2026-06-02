import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Settings, Trash2, PlayCircle, PauseCircle } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { staffAPI, adminAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { Badge, statusToBadgeColor } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmModal } from '../../components/ui/Modal'
import { CardSkeleton } from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import type { Queue } from '../../types'
import { useState } from 'react'

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: queues = [], isLoading } = useQuery({
    queryKey: ['staff-queues'],
    queryFn: () => staffAPI.getQueues().then(r => r.data.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminAPI.deleteQueue(id),
    onSuccess: () => { toast.success('Queue deleted'); setDeleteId(null); queryClient.invalidateQueries({ queryKey: ['staff-queues'] }) },
    onError: () => toast.error('Failed to delete queue'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => staffAPI.updateQueueStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-queues'] }),
  })

  return (
    <Layout breadcrumb="Admin Panel">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-0.5">{user?.name} · Managing venue</p>
          </div>
          <Link to="/admin/queues/new">
            <Button variant="primary" icon={<Plus size={16} />}>New Queue</Button>
          </Link>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Peak Hours', href: '/admin/analytics', emoji: '📊' },
            { label: 'Staff Mgmt', href: '/admin/staff', emoji: '👥' },
            { label: 'Create Queue', href: '/admin/queues/new', emoji: '➕' },
            { label: 'Audit Logs', href: '/admin/audit', emoji: '📋' },
          ].map(item => (
            <Link key={item.href} to={item.href} className="card-hover p-4 text-center">
              <div className="text-2xl mb-1">{item.emoji}</div>
              <p className="text-sm font-medium text-gray-700">{item.label}</p>
            </Link>
          ))}
        </div>

        {/* Queue management */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Manage Queues</h2>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <CardSkeleton key={i} />)}</div>
          ) : queues.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="text-4xl mb-3">➕</div>
              <p className="text-gray-500 mb-3">No queues yet. Create your first one.</p>
              <Link to="/admin/queues/new"><Button variant="primary">Create Queue</Button></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {queues.map((q: Queue) => (
                <div key={q.id} className="card p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{q.name}</span>
                      <Badge color={statusToBadgeColor(q.status)} dot>{q.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{q.current_count} waiting · max {q.max_capacity}</p>
                  </div>
                  <div className="flex gap-2">
                    {q.status !== 'active' && (
                      <Button size="sm" variant="secondary" icon={<PlayCircle size={13} />}
                        onClick={() => statusMutation.mutate({ id: q.id, status: 'active' })}>Open</Button>
                    )}
                    {q.status === 'active' && (
                      <Button size="sm" variant="secondary" icon={<PauseCircle size={13} />}
                        onClick={() => statusMutation.mutate({ id: q.id, status: 'paused' })}>Pause</Button>
                    )}
                    <Link to={`/admin/queues/${q.id}/settings`}>
                      <Button size="sm" variant="ghost" icon={<Settings size={13} />}>Edit</Button>
                    </Link>
                    <Button size="sm" variant="danger" icon={<Trash2 size={13} />}
                      onClick={() => setDeleteId(q.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Queue"
        message="This will permanently delete the queue and all its data. Are you sure?"
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />
    </Layout>
  )
}
