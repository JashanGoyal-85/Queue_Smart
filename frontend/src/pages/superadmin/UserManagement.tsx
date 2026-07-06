import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Building2, Mail, Clock, CheckCircle, UserPlus } from 'lucide-react'
import { superAdminAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { TableSkeleton } from '../../components/ui/Spinner'
import { formatDate, timeAgo } from '../../utils/formatters'
import toast from 'react-hot-toast'
import type { User, Venue } from '../../types'

type ModalMode = 'role' | 'venue' | null

export default function UserManagement() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [newRole, setNewRole] = useState('')
  const [newVenueId, setNewVenueId] = useState('')

  // All users
  const { data, isLoading } = useQuery({
    queryKey: ['all-users', search, roleFilter],
    queryFn: () => superAdminAPI.listUsers(roleFilter || undefined, search || undefined).then(r => r.data.data),
  })

  // All venues (for venue picker)
  const { data: venues = [] } = useQuery<Venue[]>({
    queryKey: ['all-venues-picker'],
    queryFn: () => superAdminAPI.listVenues().then(r => r.data.data),
  })

  // Update role
  const updateRoleMut = useMutation({
    mutationFn: () => superAdminAPI.updateUserRole(selectedUser!.id, { role: newRole }),
    onSuccess: () => {
      toast.success('Role updated')
      setModalMode(null)
      queryClient.invalidateQueries({ queryKey: ['all-users'] })
    },
    onError: () => toast.error('Failed to update role'),
  })

  // Assign venue
  const assignVenueMut = useMutation({
    mutationFn: () => superAdminAPI.assignVenue(selectedUser!.id, newVenueId),
    onSuccess: () => {
      toast.success('Venue assigned!')
      setModalMode(null)
      queryClient.invalidateQueries({ queryKey: ['all-users'] })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to assign venue'),
  })

  const openRole = (u: User) => { setSelectedUser(u); setNewRole(u.role); setModalMode('role') }
  const openVenue = (u: User) => { setSelectedUser(u); setNewVenueId(u.venue_id || ''); setModalMode('venue') }
  const closeModal = () => { setModalMode(null); setSelectedUser(null) }

  const users: User[] = data?.users || []
  const total: number = data?.total || 0

  const roleColorMap: Record<string, 'gray' | 'blue' | 'purple' | 'red'> = {
    user: 'gray', staff: 'blue', admin: 'purple', superadmin: 'red',
  }

  const getVenueName = (vid: string | null) => {
    if (!vid) return null
    return venues.find((v: Venue) => v.id === vid)?.name || 'Unknown venue'
  }

  return (
    <Layout breadcrumb="User Management">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#E85D32]">Platform control</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#18201D]">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total users</p>
        </div>

        {/* Info banner */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800 flex items-start gap-3">
          <UserPlus size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Staff & Admin Venue Assignment</p>
            <p className="text-blue-600 mt-0.5">
              Use <strong>Assign Venue</strong> to link a staff or admin member to their venue.
              Staff can only see and manage queues for their assigned venue.
              To invite new staff, go to <strong>Admin Panel → Staff Management</strong> inside a venue.
            </p>
          </div>
        </div>

        {/* Search & filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
            <option value="superadmin">SuperAdmin</option>
          </select>
        </div>

        {/* User list */}
        {isLoading ? <TableSkeleton rows={6} /> : (
          <div className="card overflow-hidden">
            <div className="divide-y divide-gray-50">
              {users.map((u: User) => {
                const venueName = getVenueName(u.venue_id)
                const needsVenue = (u.role === 'staff' || u.role === 'admin') && !u.venue_id

                return (
                  <div key={u.id} className={`flex items-center gap-4 p-4 ${needsVenue ? 'bg-amber-50/40' : ''}`}>
                    <Avatar name={u.name} src={u.avatar_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{u.name}</p>
                        <Badge color={roleColorMap[u.role] || 'gray'}>{u.role}</Badge>
                        {u.is_verified && <Badge color="green" dot>Verified</Badge>}
                        {needsVenue && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                            No venue assigned
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <p className="text-xs text-gray-400">{u.email}</p>
                        {venueName && (
                          <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                            <Building2 size={10} /> {venueName}
                          </span>
                        )}
                        <p className="text-xs text-gray-400">Joined {formatDate(u.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {(u.role === 'staff' || u.role === 'admin') && (
                        <Button
                          size="sm"
                          variant={needsVenue ? 'primary' : 'secondary'}
                          icon={<Building2 size={13} />}
                          onClick={() => openVenue(u)}
                        >
                          {needsVenue ? 'Assign Venue' : 'Change Venue'}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openRole(u)}>
                        Change Role
                      </Button>
                    </div>
                  </div>
                )
              })}
              {users.length === 0 && (
                <div className="p-10 text-center text-gray-400">No users found</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Change Role Modal ── */}
      <Modal open={modalMode === 'role'} onClose={closeModal} title="Change User Role" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" loading={updateRoleMut.isPending} onClick={() => updateRoleMut.mutate()}>
              Update Role
            </Button>
          </>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Avatar name={selectedUser.name} size="sm" />
              <div>
                <p className="font-semibold text-sm text-gray-900">{selectedUser.name}</p>
                <p className="text-xs text-gray-500">{selectedUser.email}</p>
              </div>
            </div>
            <Select
              label="New Role"
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              options={[
                { value: 'user', label: 'User' },
                { value: 'staff', label: 'Staff' },
                { value: 'admin', label: 'Admin' },
                { value: 'superadmin', label: 'SuperAdmin' },
              ]}
            />
            {(newRole === 'staff' || newRole === 'admin') && !selectedUser.venue_id && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2">
                ⚠ Remember to assign a venue to this {newRole} using the "Assign Venue" button.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* ── Assign Venue Modal ── */}
      <Modal open={modalMode === 'venue'} onClose={closeModal} title="Assign Venue" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button
              variant="primary"
              loading={assignVenueMut.isPending}
              disabled={!newVenueId}
              onClick={() => assignVenueMut.mutate()}
            >
              Assign Venue
            </Button>
          </>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <Avatar name={selectedUser.name} size="sm" />
              <div>
                <p className="font-semibold text-sm text-gray-900">{selectedUser.name}</p>
                <p className="text-xs text-gray-500">
                  {selectedUser.role} · {selectedUser.email}
                </p>
              </div>
            </div>

            {selectedUser.venue_id && (
              <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-xl p-3">
                <Building2 size={14} />
                <span>Currently: <strong>{getVenueName(selectedUser.venue_id)}</strong></span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Select Venue</label>
              <select
                value={newVenueId}
                onChange={e => setNewVenueId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Pick a venue —</option>
                {venues.map((v: Venue) => (
                  <option key={v.id} value={v.id}>{v.name} {!v.is_active ? '(inactive)' : ''}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                This {selectedUser.role} will only be able to manage queues for the selected venue.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
