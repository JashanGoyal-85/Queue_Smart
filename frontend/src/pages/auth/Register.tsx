import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { User, Mail, Lock, Phone, CheckCircle } from 'lucide-react'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import toast from 'react-hot-toast'
import { Brand } from '../../components/layout/Brand'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

type FormData = z.infer<typeof schema>

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

export default function Register() {
  const { } = useAuthStore()
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      authAPI.register({ name: data.name, email: data.email, password: data.password, phone: data.phone })
        .then(r => r.data.data),
    onSuccess: (_data, variables) => {
      // DO NOT call setAuth here — user must verify email before gaining access
      setRegisteredEmail(variables.email)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Registration failed'),
  })

  const handleGoogleLogin = () => {
    window.location.href = authAPI.googleLoginURL()
  }

  // ── Email verification sent screen ──────────────────────────────────────────
  if (registeredEmail) {
    return (
      <div className="auth-canvas min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in text-center">
          <div className="mb-7"><Brand /></div>

          {/* Big check icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={40} />
          </div>

          <h1 className="text-2xl font-extrabold text-[#18201D] mb-2">Check your inbox!</h1>
          <p className="text-sm text-gray-500 mb-1">We've sent a verification link to:</p>
          <p className="text-sm font-bold text-[#E85D32] bg-orange-50 rounded-xl py-2 px-4 inline-block mb-6">
            {registeredEmail}
          </p>

          <div className="card p-5 text-left space-y-3 mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">What to do next</p>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">1</span>
              </div>
              <p className="text-sm text-gray-600">Open your email inbox</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">2</span>
              </div>
              <p className="text-sm text-gray-600">
                Find the email from <strong>QueueSmart</strong> — subject:{' '}
                <em>"Verify your QueueSmart email address"</em>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-blue-600">3</span>
              </div>
              <p className="text-sm text-gray-600">Click the verification link — you're all set!</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-5">
            Didn't receive it? Check your <strong>spam folder</strong>. The link expires in 24 hours.
          </p>

          <Link to="/login">
            <Button variant="primary" className="w-full">
              Back to Login
            </Button>
          </Link>
          <p className="text-xs text-gray-400 mt-3">
            Once you verify, come back here to sign in.
          </p>
        </div>
      </div>
    )
  }

  // ── Registration form ────────────────────────────────────────────────────────
  return (
    <div className="auth-canvas min-h-screen flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="mb-7"><Brand /></div>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#E85D32]">Start saving time</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#18201D]">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Your place in line, without standing in it.</p>
        </div>

        <div className="card p-7">
          {/* Google Sign-Up */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium text-gray-700 shadow-sm mb-5"
          >
            <GoogleLogo />
            Sign up with Google
          </button>

          <p className="text-center text-xs text-green-600 bg-green-50 rounded-lg py-2 px-3 mb-4">
            ✓ Google accounts are instantly verified — no email confirmation needed
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">or sign up with email</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <Input label="Full Name" leftIcon={<User size={14} />} placeholder="John Doe" error={errors.name?.message} required {...register('name')} />
            <Input label="Email" type="email" leftIcon={<Mail size={14} />} placeholder="you@example.com" error={errors.email?.message} required {...register('email')} />
            <Input label="Phone (optional)" type="tel" leftIcon={<Phone size={14} />} placeholder="+91 98765 43210" error={errors.phone?.message} {...register('phone')} />
            <Input label="Password" type="password" leftIcon={<Lock size={14} />} placeholder="At least 6 characters" error={errors.password?.message} required {...register('password')} />
            <Input label="Confirm Password" type="password" leftIcon={<Lock size={14} />} placeholder="Repeat password" error={errors.confirmPassword?.message} required {...register('confirmPassword')} />
            <Button type="submit" variant="primary" className="w-full" loading={mutation.isPending}>
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
