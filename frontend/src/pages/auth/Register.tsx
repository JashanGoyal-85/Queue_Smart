import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { User, Mail, Lock, Phone } from 'lucide-react'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

type FormData = z.infer<typeof schema>

export default function Register() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => authAPI.register({ name: data.name, email: data.email, password: data.password, phone: data.phone }).then(r => r.data.data),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token, data.refresh_token)
      toast.success('Account created! Welcome to QueueSmart.')
      navigate('/dashboard')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Registration failed'),
  })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">Q</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">QueueSmart</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Join thousands saving time daily</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <Input label="Full Name" leftIcon={<User size={14} />} placeholder="John Doe" error={errors.name?.message} {...register('name')} />
            <Input label="Email" type="email" leftIcon={<Mail size={14} />} placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            <Input label="Phone (optional)" type="tel" leftIcon={<Phone size={14} />} placeholder="+1 234 567 8900" error={errors.phone?.message} {...register('phone')} />
            <Input label="Password" type="password" leftIcon={<Lock size={14} />} placeholder="At least 6 characters" error={errors.password?.message} {...register('password')} />
            <Input label="Confirm Password" type="password" leftIcon={<Lock size={14} />} placeholder="Repeat password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
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
