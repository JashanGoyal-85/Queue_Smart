import { formatDistanceToNow, format, differenceInSeconds } from 'date-fns'

export const formatDate = (date: string | Date) => format(new Date(date), 'MMM d, yyyy')
export const formatDateTime = (date: string | Date) => format(new Date(date), 'MMM d, yyyy h:mm a')
export const formatTime = (date: string | Date) => format(new Date(date), 'h:mm a')
export const timeAgo = (date: string | Date) => formatDistanceToNow(new Date(date), { addSuffix: true })

export const formatWaitTime = (seconds: number): string => {
  if (seconds <= 0) return 'Ready now'
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''}`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return `${hrs}h ${remainMins}m`
}

export const formatDuration = (start: string, end: string): string => {
  const secs = differenceInSeconds(new Date(end), new Date(start))
  return formatWaitTime(secs)
}

export const getInitials = (name: string): string => {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export const truncate = (str: string, len: number) =>
  str.length > len ? str.slice(0, len) + '...' : str

export const slugify = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
