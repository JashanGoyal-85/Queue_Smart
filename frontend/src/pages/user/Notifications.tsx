import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Ticket, CheckCircle, XCircle, Clock, Info, Megaphone, AlertCircle } from 'lucide-react'
import { userAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { TableSkeleton } from '../../components/ui/Spinner'
import { timeAgo } from '../../utils/formatters'
import { Link } from 'react-router-dom'
import type { Notification } from '../../types'

// ── Icon & color per notification type ───────────────────────────────────────
const notifMeta: Record<string, { icon: React.ReactNode; dot: string; bg: string }> = {
  token_called: {
    icon: <Bell size={16} className="text-green-600" />,
    dot: 'bg-green-500',
    bg: 'bg-green-50',
  },
  queue_update: {
    icon: <Ticket size={16} className="text-blue-600" />,
    dot: 'bg-blue-500',
    bg: 'bg-blue-50',
  },
  system: {
    icon: <Info size={16} className="text-gray-500" />,
    dot: 'bg-gray-400',
    bg: 'bg-gray-50',
  },
  announcement: {
    icon: <Megaphone size={16} className="text-purple-600" />,
    dot: 'bg-purple-500',
    bg: 'bg-purple-50',
  },
  warning: {
    icon: <AlertCircle size={16} className="text-amber-500" />,
    dot: 'bg-amber-400',
    bg: 'bg-amber-50',
  },
}

const defaultMeta = {
  icon: <Bell size={16} className="text-blue-500" />,
  dot: 'bg-blue-500',
  bg: 'bg-blue-50',
}

function NotificationItem({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const meta = notifMeta[n.type] ?? defaultMeta
  return (
    <div
      onClick={() => !n.is_read && onRead(n.id)}
      className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer
        ${!n.is_read
          ? `border-blue-100 ${meta.bg} hover:border-blue-200`
          : 'border-gray-100 bg-white hover:bg-gray-50'
        }`}
    >
      {/* Type icon circle */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${!n.is_read ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
        {meta.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-semibold leading-snug ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
            {n.title}
          </p>
          {!n.is_read && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />}
        </div>
        {n.body && (
          <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
      </div>
    </div>
  )
}

// ── Recent token activity fallback ────────────────────────────────────────────
function RecentActivity() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-tokens-notif'],
    queryFn: () => userAPI.getMyTokens(1, 10).then(r => r.data.data),
  })

  const tokens = data?.tokens || []
  if (isLoading || tokens.length === 0) return null

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Recent Queue Activity</span>
        <div className="h-px flex-1 bg-gray-100" />
      </div>
      <div className="space-y-2">
        {tokens.map((t: any) => {
          const statusMeta: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
            completed: { icon: <CheckCircle size={15} className="text-green-500" />, color: 'text-green-600', label: 'Served' },
            cancelled: { icon: <XCircle size={15} className="text-red-400" />, color: 'text-red-500', label: 'Cancelled' },
            waiting: { icon: <Clock size={15} className="text-amber-500" />, color: 'text-amber-600', label: 'Waiting' },
            called: { icon: <Bell size={15} className="text-blue-500" />, color: 'text-blue-600', label: 'Called' },
            skipped: { icon: <XCircle size={15} className="text-gray-400" />, color: 'text-gray-500', label: 'Skipped' },
          }
          const sm = statusMeta[t.status] ?? statusMeta.waiting
          return (
            <Link key={t.id} to={`/track/${t.id}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                {sm.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{t.display_code}</p>
                <p className="text-xs text-gray-400">{t.queue?.name || 'Queue'}</p>
              </div>
              <span className={`text-xs font-semibold ${sm.color}`}>{sm.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Notifications() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => userAPI.getNotifications().then(r => r.data.data),
    refetchInterval: 30000, // auto-refresh every 30s
  })

  const markAllMutation = useMutation({
    mutationFn: () => userAPI.markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => userAPI.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const notifications: Notification[] = data?.notifications || []
  const unreadCount: number = data?.unread || 0

  return (
    <Layout breadcrumb="Notifications">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" icon={<CheckCheck size={14} />}
              onClick={() => markAllMutation.mutate()} loading={markAllMutation.isPending}>
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification list */}
        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : notifications.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="text-gray-300" size={28} />
            </div>
            <p className="font-semibold text-gray-900 mb-1">No notifications yet</p>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              You'll get notified here when your queue token is called, or when there are queue updates.
            </p>
          </div>
        ) : (
          <>
            {/* Group: Unread */}
            {notifications.filter(n => !n.is_read).length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Unread</p>
                <div className="space-y-2">
                  {notifications.filter(n => !n.is_read).map(n => (
                    <NotificationItem key={n.id} n={n} onRead={id => markReadMutation.mutate(id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Group: Read */}
            {notifications.filter(n => n.is_read).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Earlier</p>
                <div className="space-y-2">
                  {notifications.filter(n => n.is_read).map(n => (
                    <NotificationItem key={n.id} n={n} onRead={id => markReadMutation.mutate(id)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Always show recent queue activity */}
        <RecentActivity />
      </div>
    </Layout>
  )
}
