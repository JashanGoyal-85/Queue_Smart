import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange'
  dot?: boolean
  className?: string
}

const colors = {
  blue: 'bg-blue-50 text-blue-700 border border-blue-100',
  green: 'bg-green-50 text-green-700 border border-green-100',
  yellow: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
  red: 'bg-red-50 text-red-700 border border-red-100',
  gray: 'bg-gray-50 text-gray-600 border border-gray-100',
  purple: 'bg-purple-50 text-purple-700 border border-purple-100',
  orange: 'bg-orange-50 text-orange-700 border border-orange-100',
}

const dotColors = {
  blue: 'bg-blue-500', green: 'bg-green-500', yellow: 'bg-yellow-500',
  red: 'bg-red-500', gray: 'bg-gray-400', purple: 'bg-purple-500', orange: 'bg-orange-500',
}

export const Badge: React.FC<BadgeProps> = ({ children, color = 'gray', dot, className = '' }) => (
  <span className={`badge ${colors[color]} ${className}`}>
    {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[color]}`} />}
    {children}
  </span>
)

export const statusToBadgeColor = (status: string): BadgeProps['color'] => {
  const map: Record<string, BadgeProps['color']> = {
    active: 'green', inactive: 'gray', paused: 'yellow', closed: 'red',
    waiting: 'blue', called: 'green', serving: 'yellow', completed: 'gray',
    cancelled: 'red', skipped: 'orange', priority: 'purple', normal: 'gray',
    user: 'gray', staff: 'blue', admin: 'purple', superadmin: 'red',
  }
  return map[status] || 'gray'
}
