import React from 'react'
import { getInitials } from '../../utils/formatters'

interface AvatarProps {
  name?: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' }

const colors = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-green-100 text-green-700',
  'bg-yellow-100 text-yellow-700', 'bg-red-100 text-red-700', 'bg-pink-100 text-pink-700']

const getColor = (name: string) => colors[(name.charCodeAt(0) || 0) % colors.length]

export const Avatar: React.FC<AvatarProps> = ({ name = 'U', src, size = 'md', className = '' }) => {
  if (src) {
    return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover ring-2 ring-white ${className}`} />
  }
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold ${getColor(name)} ring-2 ring-white ${className}`}>
      {getInitials(name)}
    </div>
  )
}
