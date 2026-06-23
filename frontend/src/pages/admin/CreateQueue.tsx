import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { adminAPI, superAdminAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useVenueStore } from '../../stores/venueStore'
import { Layout } from '../../components/layout/Layout'
import { Input, Textarea } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Venue } from '../../types'

export default function CreateQueue() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { selectedVenueId, selectedVenueName, setSelectedVenue } = useVenueStore()
  const isSuperAdmin = user?.role === 'superadmin'

  // For superadmin use the persisted venue store; for regular admin use their profile venue
  const venueId = isSuperAdmin ? selectedVenueId : (user?.venue_id || '')

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    max_capacity: 100,
    avg_serve_time_seconds: 180,
    is_priority_enabled: false,
  })

  // Fetch all venues for superadmin picker
  const { data: allVenues = [] } = useQuery<Venue[]>({
    queryKey: ['all-venues-for-queue'],
    queryFn: () => superAdminAPI.listVenues().then(r => r.data.data),
    enabled: isSuperAdmin,
  })

  const handleVenueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    const name = allVenues.find((v: Venue) => v.id === id)?.name || ''
    setSelectedVenue(id, name)
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload: any = { ...form }
      if (isSuperAdmin && venueId) payload.venue_id = venueId
      return adminAPI.createQueue(payload)
    },
    onSuccess: () => {
      toast.success('Queue created successfully!')
      navigate('/admin')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create queue'),
  })

  const update = (key: string, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }))

  const canSubmit = form.name.trim().length > 0 && (!isSuperAdmin || !!venueId)

  return (
    <Layout breadcrumb="Create Queue">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Queue</h1>

        <div className="card p-6 space-y-5">

          {/* Venue selector — superadmin only */}
          {isSuperAdmin && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <Building2 size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <label className="block text-xs font-semibold text-blue-700 mb-1.5 uppercase tracking-wide">
                  Select Venue *
                </label>
                <select
                  className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={venueId}
                  onChange={handleVenueChange}
                >
                  <option value="">— Pick a venue for this queue —</option>
                  {allVenues.map((v: Venue) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
                {!venueId && (
                  <p className="text-xs text-blue-500 mt-1">You must select a venue to create a queue.</p>
                )}
                {venueId && selectedVenueName && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">✓ Creating queue in: {selectedVenueName}</p>
                )}
              </div>
            </div>
          )}

          <Input
            label="Queue Name *"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            placeholder="e.g. General Consultation"
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={e => update('description', e.target.value)}
            placeholder="Brief description of this queue..."
          />
          <Input
            label="Category"
            value={form.category}
            onChange={e => update('category', e.target.value)}
            placeholder="e.g. General, Specialist, VIP"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Capacity"
              type="number"
              value={form.max_capacity}
              onChange={e => update('max_capacity', Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
            />
            <Input
              label="Avg Serve Time (seconds)"
              type="number"
              value={form.avg_serve_time_seconds}
              onChange={e => update('avg_serve_time_seconds', Math.max(30, parseInt(e.target.value) || 30))}
              min={30}
            />
          </div>

          {/* Priority toggle */}
          <div className="flex items-center gap-3 cursor-pointer"
            onClick={() => update('is_priority_enabled', !form.is_priority_enabled)}>
            <div className={`relative w-11 h-6 rounded-full transition-colors ${form.is_priority_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_priority_enabled ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">Enable Priority Queue</span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="primary"
              loading={mutation.isPending}
              onClick={() => mutation.mutate()}
              disabled={!canSubmit}
            >
              Create Queue
            </Button>
            <Button variant="secondary" onClick={() => navigate('/admin')}>Cancel</Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
