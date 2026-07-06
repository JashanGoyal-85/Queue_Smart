import React, { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Brand } from '../../components/layout/Brand'

// This page handles the redirect from Google OAuth.
// URL: /auth/callback?access_token=xxx&refresh_token=xxx&error=yyy
export default function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const error = searchParams.get('error')
    if (error) {
      const messages: Record<string, string> = {
        invalid_state:       'Security check failed. Please try again.',
        oauth_exchange_failed: 'Google login failed. Please try again.',
        userinfo_failed:     'Could not fetch your Google profile.',
        account_deactivated: 'Your account has been deactivated.',
        create_failed:       'Could not create your account. Please try again.',
      }
      toast.error(messages[error] || 'Google login failed.')
      navigate('/login', { replace: true })
      return
    }

    const accessToken  = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')

    if (!accessToken || !refreshToken) {
      toast.error('Invalid callback — missing tokens.')
      navigate('/login', { replace: true })
      return
    }

    // Fetch the user profile using the access token
    authAPI.me(accessToken)
      .then(res => {
        const user = res.data.data
        setAuth(user, accessToken, refreshToken)
        toast.success(`Welcome, ${user.name}! 🎉`)
        // Role-based redirect
        if (['staff','admin','superadmin'].includes(user.role)) {
          navigate('/staff', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      })
      .catch(() => {
        toast.error('Failed to load your profile. Please try again.')
        navigate('/login', { replace: true })
      })
  }, [])

  return (
    <div className="auth-canvas min-h-screen flex items-center justify-center p-4">
      <div className="text-center animate-fade-in">
        <div className="mb-6"><Brand /></div>
        {/* Google-coloured spinner */}
        <div className="relative w-14 h-14 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#4285F4] border-r-[#34A853] animate-spin" />
        </div>
        <p className="text-sm font-medium text-gray-700">Signing you in with Google…</p>
        <p className="text-xs text-gray-400 mt-1">You'll be redirected in a moment</p>
      </div>
    </div>
  )
}
