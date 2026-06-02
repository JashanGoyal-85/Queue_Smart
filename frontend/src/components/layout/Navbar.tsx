import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Menu, Search, ChevronDown, User, Settings, LogOut } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { Avatar } from '../ui/Avatar'
import { useState } from 'react'

interface NavbarProps {
  onMenuClick: () => void
  breadcrumb?: string
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, breadcrumb }) => {
  const { user, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <header className="h-14 border-b border-gray-100 bg-white flex items-center px-4 gap-4 sticky top-0 z-30">
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500">
        <Menu size={20} />
      </button>

      <div className="flex-1">
        {breadcrumb && <p className="text-sm font-medium text-gray-600">{breadcrumb}</p>}
      </div>

      <div className="flex items-center gap-2">
        <Link to="/dashboard/notifications" className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <Avatar name={user?.name} src={user?.avatar_url} size="sm" />
            <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.name?.split(' ')[0]}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>
                <Link to="/dashboard/settings" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <Settings size={15} /> Profile & Settings
                </Link>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
