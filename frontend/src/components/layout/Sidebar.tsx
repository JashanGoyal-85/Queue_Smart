import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Ticket, Bell, LogOut, Users, Building2,
  ClipboardList, BarChart3, Shield, ChevronLeft, ChevronRight,
  X, User, KeyRound, ChevronUp, Eye, EyeOff
} from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { userAPI } from '../../services/api'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import toast from 'react-hot-toast'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles?: string[]
}

// Settings intentionally removed — accessible via the profile panel below
const navItems: NavItem[] = [
  // User
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} />, roles: ['user', 'staff', 'admin', 'superadmin'] },
  { label: 'My Tokens', href: '/dashboard/tokens', icon: <Ticket size={18} />, roles: ['user'] },
  { label: 'Notifications', href: '/dashboard/notifications', icon: <Bell size={18} />, roles: ['user', 'staff', 'admin', 'superadmin'] },
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

// ─── Inline Profile Panel ────────────────────────────────────────────────────
function ProfilePanel({ onClose }: { onClose: () => void }) {
  const { user, updateUser, logout } = useAuthStore()
  const navigate = useNavigate()

  const [tab, setTab] = useState<'profile' | 'password'>('profile')
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)

  const profileMut = useMutation({
    mutationFn: () => userAPI.updateMe({ name, phone }),
    onSuccess: (res) => { updateUser(res.data.data); toast.success('Profile updated!') },
    onError: () => toast.error('Failed to update profile'),
  })

  const passwordMut = useMutation({
    mutationFn: () => userAPI.changePassword({ old_password: oldPw, new_password: newPw }),
    onSuccess: () => {
      toast.success('Password changed!')
      setOldPw(''); setNewPw(''); setConfirmPw('')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to change password'),
  })

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return }
    if (newPw.length < 6) { toast.error('Minimum 6 characters'); return }
    passwordMut.mutate()
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const roleColor = user?.role === 'superadmin' ? 'red' : user?.role === 'admin' ? 'purple' : user?.role === 'staff' ? 'blue' : 'gray'

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-1 mx-2 bg-[#1e2922] rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
      style={{ maxHeight: '75vh', overflowY: 'auto' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name} src={user?.avatar_url} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-white/40 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Role badge */}
      <div className="px-4 py-2 flex items-center gap-2">
        <Badge color={roleColor as any}>{user?.role}</Badge>
        {user?.is_verified && <Badge color="green" dot>Verified</Badge>}
      </div>

      {/* Tabs */}
      <div className="flex mx-4 mb-3 bg-white/5 rounded-xl p-0.5">
        {(['profile', 'password'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors
              ${tab === t ? 'bg-[#E85D32] text-white' : 'text-white/50 hover:text-white'}`}>
            {t === 'profile' ? <User size={11} /> : <KeyRound size={11} />}
            {t === 'profile' ? 'Profile' : 'Password'}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#E85D32]/60" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#E85D32]/60" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">Email</label>
            <input value={user?.email || ''} disabled
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/30 cursor-not-allowed" />
          </div>
          <button onClick={() => profileMut.mutate()} disabled={profileMut.isPending}
            className="w-full bg-[#E85D32] hover:bg-[#d44f27] disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm transition-colors">
            {profileMut.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Password tab */}
      {tab === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="px-4 pb-4 space-y-3">
          {[
            { label: 'Current Password', val: oldPw, set: setOldPw },
            { label: 'New Password', val: newPw, set: setNewPw },
            { label: 'Confirm New Password', val: confirmPw, set: setConfirmPw },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wide">{label}</label>
              <div className="relative mt-1">
                <input type={showPw ? 'text' : 'password'} value={val} onChange={e => set(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 pr-8 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#E85D32]/60" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={passwordMut.isPending}
            className="w-full bg-[#E85D32] hover:bg-[#d44f27] disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm transition-colors">
            {passwordMut.isPending ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      )}

      {/* Logout */}
      <div className="px-4 pb-4">
        <button onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-[#F5C84C]/80 hover:text-[#F5C84C] hover:bg-white/5 py-2 rounded-xl text-sm font-medium transition-colors border border-white/10">
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export const Sidebar: React.FC<{
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}> = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }
  const visibleItems = navItems.filter(item => !item.roles || item.roles.includes(user?.role || 'user'))

  const SidebarContent = ({ showToggle = false }: { showToggle?: boolean }) => (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className={`flex items-center border-b border-white/10 px-4 py-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className={`flex items-center gap-3 ${collapsed ? '' : 'flex-1 min-w-0'}`}>
          <div className="w-9 h-9 bg-[#E85D32] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-extrabold text-[11px]">QS</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="block font-extrabold text-white text-base tracking-tight truncate">QueueSmart</span>
              <span className="block font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">Operations</span>
            </div>
          )}
        </div>
        {showToggle && (
          <button onClick={onToggle}
            className="flex-shrink-0 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = location.pathname === item.href
          return (
            <Link key={item.href} to={item.href} onClick={onMobileClose}
              className={`sidebar-link ${active ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
              title={collapsed ? item.label : undefined}>
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer: clickable profile → settings panel */}
      <div className="border-t border-white/10 p-3 relative">
        {/* Profile panel (pops up above) */}
        {profileOpen && !collapsed && <ProfilePanel onClose={() => setProfileOpen(false)} />}

        {/* Clickable profile row */}
        {!collapsed ? (
          <button
            onClick={() => setProfileOpen(v => !v)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group
              ${profileOpen ? 'bg-white/10' : 'hover:bg-white/8'}`}
          >
            <Avatar name={user?.name} src={user?.avatar_url} size="sm" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-white/35 capitalize">{user?.role}</p>
            </div>
            <ChevronUp size={14}
              className={`text-white/30 group-hover:text-white/60 transition-all duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>
        ) : (
          /* Collapsed: just avatar button */
          <div className="flex flex-col gap-1 items-center">
            <button onClick={() => setProfileOpen(v => !v)}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors" title="Profile & Settings">
              <Avatar name={user?.name} src={user?.avatar_url} size="sm" />
            </button>
            <button onClick={handleLogout}
              className="sidebar-link w-full justify-center px-2 text-white/45 hover:bg-white/10 hover:text-[#F5C84C]"
              title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className={`hidden lg:flex flex-col bg-[#18201D] transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-[72px]' : 'w-64'}`}>
        <SidebarContent showToggle />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={onMobileClose} />
          <div className="relative w-72 bg-[#18201D] h-full shadow-xl text-white">
            <button onClick={onMobileClose} className="absolute top-4 right-4 p-1 rounded-lg text-white/60 hover:bg-white/10">
              <X size={18} />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  )
}
