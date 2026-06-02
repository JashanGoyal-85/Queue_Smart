import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staffAPI, adminAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { Input, Textarea } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { PageSpinner } from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

export default function QueueSettings() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: queue, isLoading } = useQuery({
    queryKey: ['queue-detail', id],
    queryFn: () => staffAPI.getQueueTokens(id!).then(() => staffAPI.getQueues().then(r =>
      r.data.data.find((q: any) => q.id === id)
    )),
  })

  const [form, setForm] = useState<any>(null)

  React.useEffect(() => {
    if (queue && !form) setForm(queue)
  }, [queue])

  const updateMutation = useMutation({
    mutationFn: () => adminAPI.updateQueue(id!, form),
    onSuccess: () => {
      toast.success('Queue updated')
      queryClient.invalidateQueries({ queryKey: ['staff-queues'] })
      navigate('/admin')
    },
    onError: () => toast.error('Failed to update'),
  })

  if (isLoading || !form) return <Layout breadcrumb="Queue Settings"><PageSpinner /></Layout>

  const update = (key: string, value: unknown) => setForm((f: any) => ({ ...f, [key]: value }))

  return (
    <Layout breadcrumb="Queue Settings">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Queue Settings</h1>
        <div className="card p-6 space-y-5">
          <Input label="Queue Name" value={form.name || ''} onChange={e => update('name', e.target.value)} />
          <Textarea label="Description" value={form.description || ''} onChange={e => update('description', e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Max Capacity" type="number" value={form.max_capacity || 100}
              onChange={e => update('max_capacity', parseInt(e.target.value))} />
            <Input label="Avg Serve Time (sec)" type="number" value={form.avg_serve_time_seconds || 180}
              onChange={e => update('avg_serve_time_seconds', parseInt(e.target.value))} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`relative w-11 h-6 rounded-full transition-colors ${form.is_priority_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
              onClick={() => update('is_priority_enabled', !form.is_priority_enabled)}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_priority_enabled ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">Enable Priority Queue</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="primary" loading={updateMutation.isPending} onClick={() => updateMutation.mutate()}>Save Changes</Button>
            <Button variant="secondary" onClick={() => navigate('/admin')}>Cancel</Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
