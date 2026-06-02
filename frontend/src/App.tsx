import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Public pages
import Landing from './pages/public/Landing'
import Venues from './pages/public/Venues'
import VenueDetail from './pages/public/VenueDetail'
import JoinQueue from './pages/public/JoinQueue'
import TrackToken from './pages/public/TrackToken'

// Auth pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import VerifyEmail from './pages/auth/VerifyEmail'

// User dashboard
import Dashboard from './pages/user/Dashboard'
import MyTokens from './pages/user/MyTokens'
import Notifications from './pages/user/Notifications'
import Settings from './pages/user/Settings'

// Staff pages
import StaffDashboard from './pages/staff/StaffDashboard'
import QueueManagement from './pages/staff/QueueManagement'
import StaffAnalytics from './pages/staff/Analytics'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import QueueSettings from './pages/admin/QueueSettings'
import CreateQueue from './pages/admin/CreateQueue'
import StaffManagement from './pages/admin/StaffManagement'
import PeakHours from './pages/admin/PeakHours'

// SuperAdmin pages
import SystemOverview from './pages/superadmin/SystemOverview'
import VenueManagement from './pages/superadmin/VenueManagement'
import UserManagement from './pages/superadmin/UserManagement'

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/venues" element={<Venues />} />
        <Route path="/venues/:slug" element={<VenueDetail />} />
        <Route path="/join/:queueId" element={<JoinQueue />} />
        <Route path="/track/:tokenId" element={<TrackToken />} />

        {/* Auth */}
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* User */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/dashboard/tokens" element={<ProtectedRoute><MyTokens /></ProtectedRoute>} />
        <Route path="/dashboard/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Staff */}
        <Route path="/staff" element={<ProtectedRoute roles={['staff','admin','superadmin']}><StaffDashboard /></ProtectedRoute>} />
        <Route path="/staff/queue/:id" element={<ProtectedRoute roles={['staff','admin','superadmin']}><QueueManagement /></ProtectedRoute>} />
        <Route path="/staff/analytics" element={<ProtectedRoute roles={['staff','admin','superadmin']}><StaffAnalytics /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin','superadmin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/queues/new" element={<ProtectedRoute roles={['admin','superadmin']}><CreateQueue /></ProtectedRoute>} />
        <Route path="/admin/queues/:id/settings" element={<ProtectedRoute roles={['admin','superadmin']}><QueueSettings /></ProtectedRoute>} />
        <Route path="/admin/staff" element={<ProtectedRoute roles={['admin','superadmin']}><StaffManagement /></ProtectedRoute>} />
        <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin','superadmin']}><PeakHours /></ProtectedRoute>} />

        {/* SuperAdmin */}
        <Route path="/superadmin" element={<ProtectedRoute roles={['superadmin']}><SystemOverview /></ProtectedRoute>} />
        <Route path="/superadmin/venues" element={<ProtectedRoute roles={['superadmin']}><VenueManagement /></ProtectedRoute>} />
        <Route path="/superadmin/users" element={<ProtectedRoute roles={['superadmin']}><UserManagement /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
