import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        const res = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken })
        useAuthStore.getState().setAccessToken(res.data.data.access_token)
        original.headers.Authorization = `Bearer ${res.data.data.access_token}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Invite (public — no auth)
export const inviteAPI = {
  validate: (token: string) => api.get(`/auth/invite/validate?token=${token}`),
  accept: (data: { token: string; name: string; password: string }) =>
    api.post('/auth/invite/accept', data),
}

// Auth
export const authAPI = {
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refresh_token: refreshToken }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; password: string }) => api.post('/auth/reset-password', data),
  verifyEmail: (code: string) => api.get(`/auth/verify-email?code=${code}`),
  // Used by GoogleCallback — fetch profile with an explicit token (store may not be set yet)
  me: (token: string) => axios.get('/api/v1/me', {
    headers: { Authorization: `Bearer ${token}` }
  }),
  // Redirect URL for initiating Google OAuth
  googleLoginURL: () => '/api/v1/auth/google',
}

// User
export const userAPI = {
  getMe: () => api.get('/me'),
  updateMe: (data: { name?: string; phone?: string; avatar_url?: string }) => api.put('/me', data),
  changePassword: (data: { old_password: string; new_password: string }) => api.put('/me/password', data),
  getMyTokens: (page = 1, limit = 20) => api.get(`/me/tokens?page=${page}&limit=${limit}`),
  getMyStats: () => api.get('/me/stats'),
  getNotifications: (page = 1) => api.get(`/me/notifications?page=${page}`),
  markNotificationRead: (id: string) => api.put(`/me/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/me/notifications/read-all'),
}

// Venues
export const venueAPI = {
  list: (params?: { page?: number; limit?: number; city?: string; category?: string; q?: string }) =>
    api.get('/venues', { params }),
  get: (slug: string) => api.get(`/venues/${slug}`),
}

// Queues
export const queueAPI = {
  get: (id: string) => api.get(`/queues/${id}`),
  join: (id: string, data: { guest_name?: string; guest_phone?: string; priority?: boolean }) =>
    api.post(`/queues/${id}/join`, data),
  getPosition: (queueId: string, tokenId: string) => api.get(`/queues/${queueId}/position/${tokenId}`),
  getQR: (id: string) => api.get(`/queues/${id}/qr`, { responseType: 'blob' }),
  getToken: (id: string) => api.get(`/tokens/${id}`),
  cancelToken: (id: string) => api.post(`/tokens/${id}/cancel`),
}

// Staff
export const staffAPI = {
  getQueues: () => api.get('/staff/queues'),
  getQueueTokens: (id: string, status?: 'all' | 'active') => api.get(`/staff/queues/${id}/tokens${status === 'all' ? '?status=all' : ''}`),
  getCounters: (queueId: string) => api.get(`/staff/queues/${queueId}/counters`),
  createCounter: (queueId: string, name: string) => api.post(`/staff/queues/${queueId}/counters`, { name }),
  updateCounter: (id: string, data: { name?: string; is_active?: boolean }) => api.put(`/staff/counters/${id}`, data),
  callToken: (id: string, counterId?: string) => api.post(`/staff/tokens/${id}/call`, { counter_id: counterId }),
  callNext: (queueId: string, counterId?: string) => api.post(`/staff/queues/${queueId}/call-next`, { counter_id: counterId }),
  completeToken: (id: string) => api.post(`/staff/tokens/${id}/complete`),
  skipToken: (id: string) => api.post(`/staff/tokens/${id}/skip`),
  togglePriority: (id: string) => api.post(`/staff/tokens/${id}/priority`),
  updateQueueStatus: (id: string, status: string) => api.put(`/staff/queues/${id}/status`, { status }),
  getAnalytics: (id: string) => api.get(`/staff/queues/${id}/analytics`),
  extendTokenTime: (id: string, addSeconds: number) => api.patch(`/staff/tokens/${id}/extend`, { add_seconds: addSeconds }),
}

// Admin
export const adminAPI = {
  createQueue: (data: object) => api.post('/admin/queues', data),
  updateQueue: (id: string, data: object) => api.put(`/admin/queues/${id}`, data),
  deleteQueue: (id: string) => api.delete(`/admin/queues/${id}`),
  getVenueStats: (venueId: string, from?: string, to?: string) =>
    api.get(`/admin/venues/${venueId}/stats`, { params: { from, to } }),
  getPeakHours: (venueId: string) => api.get(`/admin/venues/${venueId}/peak-hours`),
  getVenueUsers: (venueId: string) => api.get(`/admin/venues/${venueId}/users`),
  getVenueInvites: (venueId: string) => api.get(`/admin/venues/${venueId}/invites`),
  inviteStaff: (venueId: string, data: { name: string; email: string; role?: string }) =>
    api.post(`/admin/venues/${venueId}/users`, data),
  removeStaff: (venueId: string, userId: string) => api.delete(`/admin/venues/${venueId}/users/${userId}`),
  getAuditLogs: (action?: string) => api.get('/admin/audit-logs', { params: { action } }),
}

// SuperAdmin
export const superAdminAPI = {
  createVenue: (data: object) => api.post('/superadmin/venues', data),
  listVenues: () => api.get('/superadmin/venues'),
  updateVenue: (id: string, data: object) => api.put(`/superadmin/venues/${id}`, data),
  listUsers: (role?: string, q?: string) => api.get('/superadmin/users', { params: { role, q } }),
  updateUserRole: (id: string, data: { role: string; venue_id?: string }) =>
    api.put(`/superadmin/users/${id}/role`, data),
  assignVenue: (userId: string, venueId: string) =>
    api.put(`/superadmin/users/${userId}/venue`, { venue_id: venueId }),
  getSystemStats: () => api.get('/superadmin/system-stats'),
}
