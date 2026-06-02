import React from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { authAPI } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const mutation = useMutation({
    mutationFn: () => authAPI.resetPassword({ token, password }),
    onSuccess: () => { toast.success('Password reset!'); navigate('/login') },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Reset failed'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    if (password.length < 6) { toast.error('Password too short'); return }
    mutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">New password</h1>
          <p className="text-gray-500 text-sm mt-1">Choose a strong password</p>
        </div>
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="New Password" type="password" leftIcon={<Lock size={14} />}
              value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" />
            <Input label="Confirm Password" type="password" leftIcon={<Lock size={14} />}
              value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" />
            <Button type="submit" variant="primary" className="w-full" loading={mutation.isPending}>
              Reset Password
            </Button>
            <Link to="/login" className="block text-center text-sm text-gray-500 hover:text-gray-700">← Back to login</Link>
          </form>
        </div>
      </div>
    </div>
  )
}
