import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, ToggleLeft, ToggleRight } from 'lucide-react'
import { superAdminAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Input, Textarea, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { TableSkeleton } from '../../components/ui/Spinner'
import { VENUE_CATEGORIES } from '../../utils/constants'
import toast from 'react-hot-toast'
import type { Venue } from '../../types'

const EMPTY = { name: '', slug: '', description: '', address: '', city: '', state: '', country: '', category: 'other', contact_email: '', contact_phone: '' }

export default function VenueManagement() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editVenue, setEditVenue] = useState<Venue | null>(null)
  const [form, setForm] = useState<any>(EMPTY)

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['all-venues'],
    queryFn: () => superAdminAPI.listVenues().then(r => r.data.data),
  })

  const openCreate = () => { setEditVenue(null); setForm(EMPTY); setModalOpen(true) }
  const openEdit = (v: Venue) => { setEditVenue(v); setForm(v); setModalOpen(true) }

  const createMutation = useMutation({
    mutationFn: () => superAdminAPI.createVenue(form),
    onSuccess: () => { toast.success('Venue created'); setModalOpen(false); queryClient.invalidateQueries({ queryKey: ['all-venues'] }) },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create venue'),
  })

  const updateMutation = useMutation({
    mutationFn: () => superAdminAPI.updateVenue(editVenue!.id, form),
    onSuccess: () => { toast.success('Venue updated'); setModalOpen(false); queryClient.invalidateQueries({ queryKey: ['all-venues'] }) },
    onError: () => toast.error('Failed to update venue'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => superAdminAPI.updateVenue(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-venues'] }),
  })

  const update = (k: string, v: unknown) => setForm((f: any) => ({ ...f, [k]: v }))

  return (
    <Layout breadcrumb="Venue Management">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Venue Management</h1>
          <Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>Create Venue</Button>
        </div>

        {isLoading ? <TableSkeleton rows={5} /> : (
          <div className="card overflow-hidden">
            {venues.length === 0 ? (
              <div className="p-10 text-center text-gray-400">No venues yet. Create one to get started.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {venues.map((v: Venue) => (
                  <div key={v.id} className="flex items-center gap-4 p-4">
                    <div className="text-2xl w-10 text-center flex-shrink-0">
                      {VENUE_CATEGORIES.find(c => c.value === v.category)?.icon || '🏢'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{v.name}</p>
                        <Badge color={v.is_active ? 'green' : 'red'} dot>{v.is_active ? 'Active' : 'Inactive'}</Badge>
                      </div>
                      <p className="text-xs text-gray-400">{v.slug} · {v.city}{v.state ? `, ${v.state}` : ''}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" icon={<Edit2 size={13} />} onClick={() => openEdit(v)}>Edit</Button>
                      <button onClick={() => toggleMutation.mutate({ id: v.id, is_active: !v.is_active })}
                        className={`p-2 rounded-lg transition-colors ${v.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                        {v.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editVenue ? 'Edit Venue' : 'Create Venue'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={createMutation.isPending || updateMutation.isPending}
              onClick={() => editVenue ? updateMutation.mutate() : createMutation.mutate()}>
              {editVenue ? 'Save Changes' : 'Create Venue'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="Venue Name" required value={form.name} onChange={e => update('name', e.target.value)} />
          <Input label="Slug" required value={form.slug} onChange={e => update('slug', e.target.value)} placeholder="my-venue" />
          <Input label="City" value={form.city} onChange={e => update('city', e.target.value)} />
          <Input label="State" value={form.state} onChange={e => update('state', e.target.value)} />
          <Input label="Country" value={form.country} onChange={e => update('country', e.target.value)} />
          <Select label="Category" value={form.category} onChange={e => update('category', e.target.value)}
            options={VENUE_CATEGORIES.map(c => ({ value: c.value, label: `${c.icon} ${c.label}` }))} />
          <Input label="Contact Email" type="email" value={form.contact_email} onChange={e => update('contact_email', e.target.value)} />
          <Input label="Contact Phone" value={form.contact_phone} onChange={e => update('contact_phone', e.target.value)} />
          <div className="col-span-2">
            <Textarea label="Address" value={form.address} onChange={e => update('address', e.target.value)} />
          </div>
          <div className="col-span-2">
            <Textarea label="Description" value={form.description} onChange={e => update('description', e.target.value)} />
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
