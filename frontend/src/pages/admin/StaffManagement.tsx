import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Trash2, Building2, Mail, Clock, CheckCircle } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useVenueStore } from '../../stores/venueStore'
import { adminAPI, superAdminAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal, ConfirmModal } from '../../components/ui/Modal'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { TableSkeleton } from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import type { User, Venue } from '../../types'

export default function StaffManagement() {
  const { user } = useAuthStore()
  const { selectedVenueId, selectedVenueName, setSelectedVenue } = useVenueStore()
  const queryClient = useQueryClient()
  const isSuperAdmin = user?.role === 'superadmin'

  // For regular admins, use their own venue_id; for superadmin, use the store.
  const venueId = isSuperAdmin ? selectedVenueId : (user?.venue_id || '')

  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'staff' })

  // Fetch all venues (superadmin only, for the dropdown)
  const { data: allVenues = [] } = useQuery<Venue[]>({
    queryKey: ['all-venues-for-staff'],
    queryFn: () => superAdminAPI.listVenues().then(r => r.data.data),
    enabled: isSuperAdmin,
  })

  // Fetch staff for the currently selected venue
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['venue-users', venueId],
    queryFn: () => adminAPI.getVenueUsers(venueId).then(r => r.data.data ?? []),
    enabled: !!venueId,
  })

  // Fetch pending invites for the venue
  const { data: invites = [] } = useQuery<any[]>({
    queryKey: ['venue-invites', venueId],
    queryFn: () => adminAPI.getVenueInvites(venueId).then(r => r.data.data ?? []),
    enabled: !!venueId,
  })
  const pendingInvites = invites.filter((i: any) => !i.accepted_at)

  const handleVenueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    const name = allVenues.find((v: Venue) => v.id === id)?.name || ''
    setSelectedVenue(id, name)
    queryClient.invalidateQueries({ queryKey: ['venue-users'] })
  }

  const inviteMutation = useMutation({
    mutationFn: () => adminAPI.inviteStaff(venueId, form),
    onSuccess: () => {
      toast.success(`Invitation sent to ${form.email}!`)
      setInviteOpen(false)
      setForm({ name: '', email: '', role: 'staff' })
      queryClient.invalidateQueries({ queryKey: ['venue-users'] })
      queryClient.invalidateQueries({ queryKey: ['venue-invites'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to send invitation'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => adminAPI.removeStaff(venueId, userId),
    onSuccess: () => {
      toast.success('Staff removed')
      setRemoveId(null)
      queryClient.invalidateQueries({ queryKey: ['venue-users'] })
    },
    onError: () => toast.error('Failed to remove staff'),
  })

  return (
    <Layout breadcrumb="Staff Management">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <Button
            variant="primary"
            icon={<UserPlus size={16} />}
            onClick={() => setInviteOpen(true)}
            disabled={!venueId}
          >
            Add Staff
          </Button>
        </div>

        {/* Venue selector — superadmin only */}
        {isSuperAdmin && (
          <div className="card p-4 flex items-center gap-3">
            <Building2 size={18} className="text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                Select Venue to Manage
              </label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={venueId}
                onChange={handleVenueChange}
              >
                <option value="">— Pick a venue —</option>
                {allVenues.map((v: Venue) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Staff list */}
        {!venueId ? (
          <div className="card p-10 text-center text-gray-400">
            {isSuperAdmin
              ? 'Select a venue above to view and manage its staff.'
              : 'No venue is assigned to your account.'}
          </div>
        ) : isLoading ? (
          <TableSkeleton rows={4} />
        ) : (
          <div className="card overflow-hidden">
            {isSuperAdmin && selectedVenueName && (
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                <p className="text-xs font-semibold text-blue-700">
                  Staff for: {selectedVenueName}
                </p>
              </div>
            )}
            {users.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                No staff members yet — click "Add Staff" to invite someone.
              </div>
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
                      <Button
                        size="sm" variant="ghost" icon={<Trash2 size={13} />}
                        onClick={() => setRemoveId(u.id)}
                        className="text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Invitations */}
        {venueId && pendingInvites.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
              <Clock size={13} className="text-amber-600" />
              <p className="text-xs font-semibold text-amber-700">
                {pendingInvites.length} pending invitation{pendingInvites.length !== 1 ? 's' : ''} (not yet accepted)
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingInvites.map((inv: any) => (
                <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Mail size={14} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{inv.name}</p>
                    <p className="text-xs text-gray-400">{inv.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      {inv.role}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                      <Clock size={10} /> awaiting
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Add Staff Member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={inviteMutation.isPending}
              onClick={() => inviteMutation.mutate()}
              disabled={!form.name || !form.email}
            >
              Add Member
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {isSuperAdmin && selectedVenueName && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm text-blue-700">
              Adding staff to: <strong>{selectedVenueName}</strong>
            </div>
          )}
          <Input
            label="Full Name"
            required
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Jane Smith"
          />
          <Input
            label="Email"
            required
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="jane@example.com"
          />
          <Select
            label="Role"
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            options={[
              { value: 'staff', label: 'Staff' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
            <Mail size={13} className="mt-0.5 flex-shrink-0" />
            <p>
              An invitation email will be sent to <strong>{form.email || 'this address'}</strong>.
              They must click the link to set their password and activate their account.
              The link expires after <strong>72 hours</strong>.
            </p>
          </div>
        </div>
      </Modal>

      {/* Remove confirm */}
      <ConfirmModal
        open={!!removeId}
        onClose={() => setRemoveId(null)}
        onConfirm={() => removeId && removeMutation.mutate(removeId)}
        title="Remove Staff Member"
        message="This will remove the staff member's access to this venue. Their account won't be deleted."
        confirmLabel="Remove"
        danger
        loading={removeMutation.isPending}
      />
    </Layout>
  )
}
