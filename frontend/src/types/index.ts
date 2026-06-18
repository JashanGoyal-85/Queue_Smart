export interface User {
  id: string
  name: string
  email: string
  phone: string
  avatar_url: string
  role: 'user' | 'staff' | 'admin' | 'superadmin'
  venue_id: string | null
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface Venue {
  id: string
  name: string
  slug: string
  description: string
  address: string
  city: string
  state: string
  country: string
  category: 'hospital' | 'bank' | 'salon' | 'canteen' | 'government' | 'other'
  logo_url: string
  cover_url: string
  contact_email: string
  contact_phone: string
  is_active: boolean
  created_at: string
  queues?: Queue[]
}

export interface Queue {
  id: string
  venue_id: string
  name: string
  description: string
  category: string
  status: 'inactive' | 'active' | 'paused' | 'closed'
  max_capacity: number
  current_count: number
  avg_serve_time_seconds: number
  is_priority_enabled: boolean
  scheduled_open: string | null
  scheduled_close: string | null
  created_at: string
  updated_at: string
  venue?: Venue
  counters?: Counter[]
}

export interface Counter {
  id: string
  queue_id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Token {
  id: string
  queue_id: string
  counter_id: string | null
  user_id: string | null
  token_number: number
  display_code: string
  status: 'waiting' | 'called' | 'serving' | 'completed' | 'skipped' | 'cancelled'
  priority: 'normal' | 'priority'
  estimated_wait_seconds: number
  actual_wait_seconds: number
  notes: string
  guest_name: string
  guest_phone: string
  joined_at: string
  called_at: string | null
  served_at: string | null
  completed_at: string | null
  created_at: string
  queue?: Queue
  counter?: Counter
  user?: User
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: 'token_called' | 'queue_update' | 'system' | 'announcement'
  is_read: boolean
  metadata: string
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  metadata: string
  ip_address: string
  created_at: string
  user?: User
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
  errors?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface QueueAnalytics {
  id: string
  queue_id: string
  venue_id: string
  date: string
  hour: number
  tokens_issued: number
  tokens_completed: number
  tokens_cancelled: number
  avg_wait_seconds: number
  peak_concurrent: number
}

export interface Stats {
  total_joined: number
  completed: number
  avg_wait_seconds: number
  time_saved_seconds: number
}
