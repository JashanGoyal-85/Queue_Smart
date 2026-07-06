import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle, Eye, EyeOff, Loader2, AlertCircle, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

type InviteInfo = {
  email: string
  name: string
  role: string
  venue_name: string
  expires_at: string
}

type Step = 'loading' | 'form' | 'done' | 'error'

export default function AcceptInvite() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''

  const [step, setStep] = useState<Step>('loading')
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setErrorMsg('No invitation token found in the link.')
      setStep('error')
      return
    }
    api.get(`/auth/invite/validate?token=${token}`)
      .then(r => {
        const d: InviteInfo = r.data.data
        setInfo(d)
        setName(d.name)
        setStep('form')
      })
      .catch(err => {
        setErrorMsg(err.response?.data?.message || 'Invalid or expired invitation link.')
        setStep('error')
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post('/auth/invite/accept', { token, name, password })
      toast.success(res.data.message || 'Account created!')
      setStep('done')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept invitation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#18201D] via-[#1e2922] to-[#18201D] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-[#E85D32] rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">Q</span>
            </div>
            <span className="text-white font-bold text-xl">QueueSmart</span>
          </div>
          <p className="text-white/40 text-sm">Staff Invitation</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Loading */}
          {step === 'loading' && (
            <div className="p-10 text-center">
              <Loader2 size={32} className="mx-auto mb-3 text-[#E85D32] animate-spin" />
              <p className="text-gray-600 font-medium">Validating your invitation…</p>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="p-10 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} className="text-red-500" />
              </div>
              <h2 className="font-bold text-gray-900 mb-2">Invitation Invalid</h2>
              <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
              <Link to="/login" className="text-sm text-blue-600 hover:underline">
                Go to Login →
              </Link>
            </div>
          )}

          {/* Success */}
          {step === 'done' && (
            <div className="p-10 text-center">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <h2 className="font-bold text-gray-900 mb-2">You're all set! 🎉</h2>
              <p className="text-sm text-gray-500 mb-1">Your account has been created.</p>
              <p className="text-sm text-gray-500 mb-6">
                Log in with <strong>{info?.email}</strong> and the password you just set.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-[#E85D32] hover:bg-[#d44f27] text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Go to Login
              </button>
            </div>
          )}

          {/* Form */}
          {step === 'form' && info && (
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              {/* Invite banner */}
              <div className="bg-[#FFF0E8] border border-[#E85D32]/20 rounded-xl p-4 flex items-start gap-3">
                <Building2 size={20} className="text-[#E85D32] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#18201D]">
                    Invited to join <strong>{info.venue_name}</strong>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Role: <span className="capitalize font-medium text-gray-700">{info.role}</span>
                    &nbsp;·&nbsp; {info.email}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900">Set up your account</h2>
                <p className="text-sm text-gray-500 mt-0.5">Create a password to get started</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E85D32]/30 focus:border-[#E85D32]"
                  placeholder="Your full name"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#E85D32]/30 focus:border-[#E85D32]"
                    placeholder="At least 6 characters"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#E85D32]/30 focus:border-[#E85D32] ${
                    confirm && password !== confirm ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="Repeat your password"
                />
                {confirm && password !== confirm && (
                  <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || (!!confirm && password !== confirm)}
                className="w-full bg-[#E85D32] hover:bg-[#d44f27] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Create My Account
              </button>

              <p className="text-center text-xs text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
