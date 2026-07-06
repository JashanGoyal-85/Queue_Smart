import React, { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Lock, CheckCircle, AlertTriangle } from 'lucide-react'
import { authAPI } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Brand } from '../../components/layout/Brand'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)

  const mutation = useMutation({
    mutationFn: () => authAPI.resetPassword({ token, password }),
    onSuccess: () => {
      setDone(true)
      setTimeout(() => navigate('/login?reset=1'), 2500)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Reset link is invalid or has expired'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    mutation.mutate()
  }

  // No token in URL — user navigated here directly
  if (!token) {
    return (
      <div className="auth-canvas min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in text-center">
          <div className="mb-7"><Brand /></div>
          <div className="card p-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-amber-500" size={32} />
            </div>
            <h1 className="text-xl font-bold text-[#18201D] mb-2">Invalid reset link</h1>
            <p className="text-sm text-gray-500 mb-5">
              This link is missing a reset token. Please request a new password reset link.
            </p>
            <Link to="/forgot-password">
              <Button variant="primary" className="w-full">Request new link</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Success screen
  if (done) {
    return (
      <div className="auth-canvas min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in text-center">
          <div className="mb-7"><Brand /></div>
          <div className="card p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h1 className="text-xl font-bold text-[#18201D] mb-2">Password updated!</h1>
            <p className="text-sm text-gray-500 mb-1">Your password has been changed successfully.</p>
            <p className="text-xs text-gray-400 mb-5">Redirecting you to sign in…</p>
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-[#E85D32] animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-canvas min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="mb-7"><Brand /></div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#E85D32]">Account recovery</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#18201D]">New password</h1>
          <p className="text-gray-500 text-sm mt-1">Choose a strong password for your account</p>
        </div>

        <div className="card p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              leftIcon={<Lock size={14} />}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              leftIcon={<Lock size={14} />}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
            />
            <Button type="submit" variant="primary" className="w-full" loading={mutation.isPending}>
              Reset Password
            </Button>
            <Link to="/login" className="block text-center text-sm text-gray-500 hover:text-gray-700">
              ← Back to login
            </Link>
          </form>
        </div>
      </div>
    </div>
  )
}
