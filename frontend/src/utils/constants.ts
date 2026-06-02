export const VENUE_CATEGORIES = [
  { value: 'hospital', label: 'Hospital', icon: '🏥' },
  { value: 'bank', label: 'Bank', icon: '🏦' },
  { value: 'salon', label: 'Salon', icon: '✂️' },
  { value: 'canteen', label: 'Canteen', icon: '🍽️' },
  { value: 'government', label: 'Government', icon: '🏛️' },
  { value: 'other', label: 'Other', icon: '🏢' },
]

export const TOKEN_STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-blue-50 text-blue-700 border-blue-100',
  called: 'bg-green-50 text-green-700 border-green-100',
  serving: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  completed: 'bg-gray-50 text-gray-600 border-gray-100',
  skipped: 'bg-orange-50 text-orange-700 border-orange-100',
  cancelled: 'bg-red-50 text-red-700 border-red-100',
}

export const QUEUE_STATUS_COLORS: Record<string, string> = {
  inactive: 'bg-gray-50 text-gray-600',
  active: 'bg-green-50 text-green-700',
  paused: 'bg-yellow-50 text-yellow-700',
  closed: 'bg-red-50 text-red-700',
}

export const ROLE_COLORS: Record<string, string> = {
  user: 'bg-gray-50 text-gray-600',
  staff: 'bg-blue-50 text-blue-700',
  admin: 'bg-purple-50 text-purple-700',
  superadmin: 'bg-red-50 text-red-700',
}

export const API_BASE = '/api/v1'
