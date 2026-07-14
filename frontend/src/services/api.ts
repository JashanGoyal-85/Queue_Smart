import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

// 1. Define the exact Render backend URL here
// (This guarantees it never tries to call Vercel)
const BASE_URL = 'https://queue-smart-is27.onrender.com/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
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
        // 2. Fix the loose axios call to use BASE_URL
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
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
  
  // 3. Fix the loose axios call to use BASE_URL
  me: (token: string) => axios.get(`${BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  
  // 4. Fix Google Login to explicitly redirect to Render
  googleLoginURL: () => `${BASE_URL}/auth/google`,
}

// ... Keep the rest of your file (userAPI, venueAPI, etc.) exactly the same ...