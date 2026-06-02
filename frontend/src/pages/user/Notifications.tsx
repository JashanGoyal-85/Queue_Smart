import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { userAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { TableSkeleton } from '../../components/ui/Spinner'
import { timeAgo } from '../../utils/formatters'
import type { Notification } from '../../types'

const notifTypeColors: Record<string, string> = {
  token_called: 'bg-green-500',
  queue_update: 'bg-blue-500',
  system: 'bg-gray-400',
  announcement: 'bg-purple-500',
}

export default function Notifications() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => userAPI.getNotifications().then(r => r.data.data),
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

  return (
    <Layout breadcrumb="Notifications">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {notifications.some(n => !n.is_read) && (
            <Button variant="ghost" size="sm" icon={<CheckCheck size={14} />}
              onClick={() => markAllMutation.mutate()} loading={markAllMutation.isPending}>
              Mark all read
            </Button>
          )}
        </div>

        {isLoading ? <TableSkeleton rows={4} /> : notifications.length === 0 ? (
          <div className="card p-10 text-center">
            <Bell className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="font-medium text-gray-900 mb-1">All caught up!</p>
            <p className="text-sm text-gray-500">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} onClick={() => !n.is_read && markReadMutation.mutate(n.id)}
                className={`card p-4 flex items-start gap-4 cursor-pointer transition-colors hover:bg-gray-50 ${!n.is_read ? 'border-blue-100 bg-blue-50/30' : ''}`}>
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? (notifTypeColors[n.type] || 'bg-blue-500') : 'bg-gray-200'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!n.is_read ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
