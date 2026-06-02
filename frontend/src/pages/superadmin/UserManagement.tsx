import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { superAdminAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { TableSkeleton } from '../../components/ui/Spinner'
import { formatDate } from '../../utils/formatters'
import { ROLE_COLORS } from '../../utils/constants'
import toast from 'react-hot-toast'
import type { User } from '../../types'

export default function UserManagement() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [editUser, setEditUser] = useState<User | null>(null)
  const [newRole, setNewRole] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['all-users', search, roleFilter],
    queryFn: () => superAdminAPI.listUsers(roleFilter || undefined, search || undefined).then(r => r.data.data),
  })

  const updateRoleMutation = useMutation({
    mutationFn: () => superAdminAPI.updateUserRole(editUser!.id, { role: newRole }),
    onSuccess: () => {
      toast.success('Role updated')
      setEditUser(null)
      queryClient.invalidateQueries({ queryKey: ['all-users'] })
    },
    onError: () => toast.error('Failed to update role'),
  })

  const users: User[] = data?.users || []
  const total: number = data?.total || 0

  const roleColorMap: Record<string, 'gray' | 'blue' | 'purple' | 'red'> = {
    user: 'gray', staff: 'blue', admin: 'purple', superadmin: 'red'
  }

  return (
    <Layout breadcrumb="User Management">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">{total} total users</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
            <option value="superadmin">SuperAdmin</option>
          </select>
        </div>

        {isLoading ? <TableSkeleton rows={6} /> : (
          <div className="card overflow-hidden">
            <div className="divide-y divide-gray-50">
              {users.map((u: User) => (
                <div key={u.id} className="flex items-center gap-4 p-4">
                  <Avatar name={u.name} src={u.avatar_url} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <Badge color={roleColorMap[u.role] || 'gray'}>{u.role}</Badge>
                      {u.is_verified && <Badge color="green" dot>Verified</Badge>}
                    </div>
                    <p className="text-xs text-gray-400">{u.email} · Joined {formatDate(u.created_at)}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setEditUser(u); setNewRole(u.role) }}>
                    Change Role
                  </Button>
                </div>
              ))}
              {users.length === 0 && (
                <div className="p-10 text-center text-gray-400">No users found</div>
              )}
            </div>
          </div>
        )}
      </div>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Change User Role" size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button variant="primary" loading={updateRoleMutation.isPending} onClick={() => updateRoleMutation.mutate()}>
              Update Role
            </Button>
          </>
        }
      >
        {editUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Avatar name={editUser.name} size="sm" />
              <div>
                <p className="font-medium text-sm text-gray-900">{editUser.name}</p>
                <p className="text-xs text-gray-500">{editUser.email}</p>
              </div>
            </div>
            <Select label="New Role" value={newRole} onChange={e => setNewRole(e.target.value)}
              options={[
                { value: 'user', label: 'User' },
                { value: 'staff', label: 'Staff' },
                { value: 'admin', label: 'Admin' },
                { value: 'superadmin', label: 'SuperAdmin' },
              ]}
            />
          </div>
        )}
      </Modal>
    </Layout>
  )
}
