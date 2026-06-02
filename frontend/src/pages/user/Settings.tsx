import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { userAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user, updateUser } = useAuthStore()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  const profileMutation = useMutation({
    mutationFn: () => userAPI.updateMe({ name, phone }),
    onSuccess: (res) => { updateUser(res.data.data); toast.success('Profile updated') },
    onError: () => toast.error('Failed to update profile'),
  })

  const passwordMutation = useMutation({
    mutationFn: () => userAPI.changePassword({ old_password: oldPw, new_password: newPw }),
    onSuccess: () => { toast.success('Password changed'); setOldPw(''); setNewPw(''); setConfirmPw('') },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to change password'),
  })

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPw !== confirmPw) { toast.error('Passwords do not match'); return }
    if (newPw.length < 6) { toast.error('Password too short'); return }
    passwordMutation.mutate()
  }

  return (
    <Layout breadcrumb="Settings">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>

        {/* Profile card */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
            <Avatar name={user?.name} src={user?.avatar_url} size="lg" />
            <div>
              <p className="font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge color={user?.role === 'superadmin' ? 'red' : user?.role === 'admin' ? 'purple' : user?.role === 'staff' ? 'blue' : 'gray'}>
                  {user?.role}
                </Badge>
                {user?.is_verified && <Badge color="green" dot>Verified</Badge>}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} />
            <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} type="tel" />
            <Input label="Email" value={user?.email || ''} disabled helper="Email cannot be changed" />
            <Button variant="primary" loading={profileMutation.isPending}
              onClick={() => profileMutation.mutate()}>Save Changes</Button>
          </div>
        </div>

        {/* Password card */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input label="Current Password" type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} />
            <Input label="New Password" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} helper="At least 6 characters" />
            <Input label="Confirm New Password" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
            <Button type="submit" variant="primary" loading={passwordMutation.isPending}>Change Password</Button>
          </form>
        </div>
      </div>
    </Layout>
  )
}
