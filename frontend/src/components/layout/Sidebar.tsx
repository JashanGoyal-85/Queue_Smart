import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Ticket, Bell, Settings, LogOut, Users, Building2,
  ClipboardList, BarChart3, Shield, ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { Avatar } from '../ui/Avatar'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles?: string[]
}

const navItems: NavItem[] = [
  // User
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} />, roles: ['user', 'staff', 'admin', 'superadmin'] },
  { label: 'My Tokens', href: '/dashboard/tokens', icon: <Ticket size={18} />, roles: ['user'] },
  { label: 'Notifications', href: '/dashboard/notifications', icon: <Bell size={18} />, roles: ['user', 'staff', 'admin', 'superadmin'] },
  { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={18} />, roles: ['user', 'staff', 'admin', 'superadmin'] },
  // Staff
  { label: 'Staff Dashboard', href: '/staff', icon: <ClipboardList size={18} />, roles: ['staff', 'admin', 'superadmin'] },
  { label: 'Analytics', href: '/staff/analytics', icon: <BarChart3 size={18} />, roles: ['staff', 'admin', 'superadmin'] },
  // Admin
  { label: 'Admin Panel', href: '/admin', icon: <Shield size={18} />, roles: ['admin', 'superadmin'] },
  { label: 'Create Queue', href: '/admin/queues/new', icon: <ClipboardList size={18} />, roles: ['admin', 'superadmin'] },
  { label: 'Staff Mgmt', href: '/admin/staff', icon: <Users size={18} />, roles: ['admin', 'superadmin'] },
  { label: 'Peak Hours', href: '/admin/analytics', icon: <BarChart3 size={18} />, roles: ['admin', 'superadmin'] },
  // SuperAdmin
  { label: 'System', href: '/superadmin', icon: <LayoutDashboard size={18} />, roles: ['superadmin'] },
  { label: 'All Venues', href: '/superadmin/venues', icon: <Building2 size={18} />, roles: ['superadmin'] },
  { label: 'All Users', href: '/superadmin/users', icon: <Users size={18} />, roles: ['superadmin'] },
]

export const Sidebar: React.FC<{ collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onMobileClose: () => void }> = ({
  collapsed, onToggle, mobileOpen, onMobileClose
}) => {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }
  const visibleItems = navItems.filter(item => !item.roles || item.roles.includes(user?.role || 'user'))

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-gray-100 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">Q</span>
        </div>
        {!collapsed && <span className="font-bold text-gray-900 text-lg">QueueSmart</span>}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} to={item.href} onClick={onMobileClose}
              className={`sidebar-link ${active ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className={`border-t border-gray-100 p-3 space-y-1`}>
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <Avatar name={user?.name} src={user?.avatar_url} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
        )}
        <button onClick={handleLogout}
          className={`sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600 ${collapsed ? 'justify-center px-2' : ''}`}>
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className={`hidden lg:flex flex-col border-r border-gray-100 bg-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} relative`}>
        <SidebarContent />
        <button onClick={onToggle}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 z-10">
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={onMobileClose} />
          <div className="relative w-64 bg-white h-full shadow-xl">
            <button onClick={onMobileClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100">
              <X size={18} />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}
