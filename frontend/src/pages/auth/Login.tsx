import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Mail, Lock } from 'lucide-react'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import toast from 'react-hot-toast'
import { Brand } from '../../components/layout/Brand'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})

type FormData = z.infer<typeof schema>

// Google logo SVG (official colours)
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export default function Login() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  // Show error from Google OAuth redirect if present
  const oauthError = searchParams.get('error')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => authAPI.login(data).then(r => r.data.data),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token, data.refresh_token)
      toast.success(`Welcome back, ${data.user.name}!`)
      navigate(redirect)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Invalid credentials'),
  })

  const handleGoogleLogin = () => {
    window.location.href = authAPI.googleLoginURL()
  }

  return (
    <div className="auth-canvas min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="mb-7"><Brand /></div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#E85D32]">Member access</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#18201D]">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Password reset success */}
        {searchParams.get('reset') === '1' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 text-center flex items-center justify-center gap-2">
            <span>🔐</span>
            <span><strong>Password reset successfully!</strong> Please sign in with your new password.</span>
          </div>
        )}

        {/* Email just verified — celebrate! */}
        {searchParams.get('verified') === '1' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 text-center flex items-center justify-center gap-2">
            <span>✅</span>
            <span><strong>Email verified!</strong> You can now sign in.</span>
          </div>
        )}

        {oauthError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 text-center">
            Google login failed. Please try again or use email/password.
          </div>
        )}

        <div className="card p-7">
          {/* Google Sign-In button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium text-gray-700 shadow-sm mb-5"
          >
            <GoogleLogo />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">or with email</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <Input label="Email" type="email" leftIcon={<Mail size={14} />}
              placeholder="you@example.com" error={errors.email?.message} required {...register('email')} />
            <Input label="Password" type="password" leftIcon={<Lock size={14} />}
              placeholder="Your password" error={errors.password?.message} required {...register('password')} />
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">Forgot password?</Link>
            </div>
            <Button type="submit" variant="primary" className="w-full" loading={mutation.isPending}>
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 font-medium hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  )
}
