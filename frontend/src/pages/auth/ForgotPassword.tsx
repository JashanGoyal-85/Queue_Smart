import React from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { authAPI } from '../../services/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { Brand } from '../../components/layout/Brand'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const mutation = useMutation({
    mutationFn: () => authAPI.forgotPassword(email),
    onSuccess: () => { setSent(true); toast.success('Reset email sent!') },
    onError: () => setSent(true),
  })

  return (
    <div className="auth-canvas min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="mb-7"><Brand /></div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#18201D]">Reset password</h1>
          <p className="text-gray-500 text-sm mt-1">We'll send you a reset link</p>
        </div>
        <div className="card p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📧</div>
              <p className="font-medium text-gray-900 mb-1">Check your inbox</p>
              <p className="text-sm text-gray-500">If that email is registered, a reset link is on its way.</p>
              <Link to="/login" className="block mt-4 text-sm text-blue-600 hover:underline">← Back to login</Link>
            </div>
          ) : (
            <div className="space-y-4">
              <Input label="Email" type="email" leftIcon={<Mail size={14} />} value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
              <Button variant="primary" className="w-full" loading={mutation.isPending}
                onClick={() => mutation.mutate()}>Send Reset Link</Button>
              <Link to="/login" className="block text-center text-sm text-gray-500 hover:text-gray-700">← Back to login</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
