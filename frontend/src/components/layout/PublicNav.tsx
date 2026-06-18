import React from 'react'
import { Link } from 'react-router-dom'
import { Brand } from './Brand'
import { useAuthStore } from '../../stores/authStore'

const dashboardForRole = (role?: string) => {
  if (role === 'staff') return '/staff'
  if (role === 'admin') return '/admin'
  if (role === 'superadmin') return '/superadmin'
  return '/dashboard'
}

export const PublicNav: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <nav className="sticky top-0 z-30 border-b border-black/10 bg-[#F4F1E9]/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Brand />
        <div className="flex items-center gap-3 sm:gap-7">
          <Link to="/venues" className="hidden text-sm font-semibold text-black/55 hover:text-black sm:block">Find a queue</Link>
          {isAuthenticated ? (
            <>
              <span className="hidden text-sm font-semibold text-black/50 sm:block">Hi, {user?.name?.split(' ')[0]}</span>
              <Link to={dashboardForRole(user?.role)} className="rounded-full bg-[#18201D] px-5 py-2.5 text-sm font-bold text-white">Dashboard</Link>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-black/55 hover:text-black">Sign in</Link>
              <Link to="/register" className="rounded-full bg-[#18201D] px-5 py-2.5 text-sm font-bold text-white">Join free</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
