import React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { authAPI } from '../../services/api'
import { PageSpinner } from '../../components/ui/Spinner'
import toast from 'react-hot-toast'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code') || ''

  const mutation = useMutation({
    mutationFn: () => authAPI.verifyEmail(code),
    onSuccess: () => toast.success('Email verified!'),
    onError: () => toast.error('Verification failed or expired'),
  })

  useEffect(() => { if (code) mutation.mutate() }, [code])

  if (mutation.isPending) return <PageSpinner />

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card p-8 text-center max-w-sm w-full animate-fade-in">
        {mutation.isSuccess ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Email verified!</h1>
            <p className="text-sm text-gray-500 mb-4">Your account is now fully active.</p>
            <Link to="/dashboard" className="btn-primary w-full">Go to Dashboard</Link>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verification failed</h1>
            <p className="text-sm text-gray-500 mb-4">The link may be expired or invalid.</p>
            <Link to="/login" className="text-blue-600 text-sm hover:underline">← Back to login</Link>
          </>
        )}
      </div>
    </div>
  )
}
