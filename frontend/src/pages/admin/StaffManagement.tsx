import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { adminAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal, ConfirmModal } from '../../components/ui/Modal'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { TableSkeleton } from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import type { User } from '../../types'

export default function StaffManagement() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const venueId = user?.venue_id || ''
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'staff' })

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['venue-users', venueId],
    queryFn: () => adminAPI.getVenueUsers(venueId).then(r => r.data.data),
    enabled: !!venueId,
  })

  const inviteMutation = useMutation({
    mutationFn: () => adminAPI.inviteStaff(venueId, form),
    onSuccess: () => {
      toast.success(`${form.name} added as ${form.role}`)
      setInviteOpen(false)
      setForm({ name: '', email: '', role: 'staff' })
      queryClient.invalidateQueries({ queryKey: ['venue-users'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to invite'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => adminAPI.removeStaff(venueId, userId),
    onSuccess: () => { toast.success('Staff removed'); setRemoveId(null); queryClient.invalidateQueries({ queryKey: ['venue-users'] }) },
  })

  return (
    <Layout breadcrumb="Staff Management">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <Button variant="primary" icon={<UserPlus size={16} />} onClick={() => setInviteOpen(true)}>
            Add Staff
          </Button>
        </div>

        {isLoading ? <TableSkeleton rows={4} /> : (
          <div className="card overflow-hidden">
            {users.length === 0 ? (
              <div className="p-10 text-center text-gray-400">No staff members yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {users.map((u: User) => (
                  <div key={u.id} className="flex items-center gap-4 p-4">
                    <Avatar name={u.name} src={u.avatar_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                    <Badge color={u.role === 'admin' ? 'purple' : 'blue'}>{u.role}</Badge>
                    {u.id !== user?.id && (
                      <Button size="sm" variant="ghost" icon={<Trash2 size={13} />}
                        onClick={() => setRemoveId(u.id)} className="text-red-500 hover:bg-red-50">Remove</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Add Staff Member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={inviteMutation.isPending} onClick={() => inviteMutation.mutate()}>Add Member</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Select label="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            options={[{ value: 'staff', label: 'Staff' }, { value: 'admin', label: 'Admin' }]} />
          <p className="text-xs text-gray-400">A temporary password will be set. The user should change it on first login.</p>
        </div>
      </Modal>

      <ConfirmModal
        open={!!removeId}
        onClose={() => setRemoveId(null)}
        onConfirm={() => removeId && removeMutation.mutate(removeId)}
        title="Remove Staff"
        message="This will remove the staff member's access to this venue. They will not be deleted from the system."
        confirmLabel="Remove"
        danger
        loading={removeMutation.isPending}
      />
    </Layout>
  )
}
