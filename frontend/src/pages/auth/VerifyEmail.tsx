import React, { useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authAPI } from '../../services/api'
import { PageSpinner } from '../../components/ui/Spinner'
import { Brand } from '../../components/layout/Brand'
import { CheckCircle, XCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const code = searchParams.get('code') || ''

  const mutation = useMutation({
    mutationFn: () => authAPI.verifyEmail(code),
    onSuccess: () => {
      // After 2 seconds, redirect to login with a "verified" flag
      setTimeout(() => {
        navigate('/login?verified=1', { replace: true })
      }, 2000)
    },
  })

  useEffect(() => {
    if (code) mutation.mutate()
  }, [code])

  if (mutation.isPending) return <PageSpinner />

  return (
    <div className="auth-canvas min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="mb-7"><Brand /></div>
        </div>

        <div className="card p-8 text-center">
          {mutation.isSuccess ? (
            <>
              {/* Success state */}
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="text-green-600" size={40} />
              </div>
              <h1 className="text-2xl font-extrabold text-[#18201D] mb-2">Email verified! 🎉</h1>
              <p className="text-sm text-gray-500 mb-1">Your account is now fully active.</p>
              <p className="text-xs text-gray-400 mb-6">Redirecting you to sign in…</p>

              {/* Loading dots animation while redirecting */}
              <div className="flex justify-center gap-1.5 mb-6">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#E85D32] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>

              <Link to="/login?verified=1">
                <Button variant="primary" className="w-full">
                  Sign in now →
                </Button>
              </Link>
            </>
          ) : (
            <>
              {/* Error state */}
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <XCircle className="text-red-500" size={40} />
              </div>
              <h1 className="text-2xl font-extrabold text-[#18201D] mb-2">Link expired</h1>
              <p className="text-sm text-gray-500 mb-6">
                This verification link is invalid or has expired (links last 24 hours).
                Please register again to get a new link.
              </p>
              <Link to="/register">
                <Button variant="primary" className="w-full">
                  Register again
                </Button>
              </Link>
              <Link to="/login" className="block mt-3 text-sm text-blue-600 hover:underline">
                ← Back to login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
