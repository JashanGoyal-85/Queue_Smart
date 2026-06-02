import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { adminAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Layout } from '../../components/layout/Layout'
import { Input, Textarea, Select } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'

export default function CreateQueue() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [form, setForm] = useState({
    name: '', description: '', category: 'general',
    max_capacity: 100, avg_serve_time_seconds: 180, is_priority_enabled: false
  })

  const mutation = useMutation({
    mutationFn: () => adminAPI.createQueue(form),
    onSuccess: () => { toast.success('Queue created!'); navigate('/admin') },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create queue'),
  })

  const update = (key: string, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  return (
    <Layout breadcrumb="Create Queue">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Queue</h1>
        <div className="card p-6 space-y-5">
          <Input label="Queue Name *" value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. General Consultation" />
          <Textarea label="Description" value={form.description} onChange={e => update('description', e.target.value)} placeholder="Brief description of this queue..." />
          <Input label="Category" value={form.category} onChange={e => update('category', e.target.value)} placeholder="e.g. General, Specialist, VIP" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Max Capacity" type="number" value={form.max_capacity}
              onChange={e => update('max_capacity', parseInt(e.target.value))} min={1} />
            <Input label="Avg Serve Time (seconds)" type="number" value={form.avg_serve_time_seconds}
              onChange={e => update('avg_serve_time_seconds', parseInt(e.target.value))} min={30} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`relative w-11 h-6 rounded-full transition-colors ${form.is_priority_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
              onClick={() => update('is_priority_enabled', !form.is_priority_enabled)}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_priority_enabled ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">Enable Priority Queue</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="primary" loading={mutation.isPending} onClick={() => mutation.mutate()}>
              Create Queue
            </Button>
            <Button variant="secondary" onClick={() => navigate('/admin')}>Cancel</Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
