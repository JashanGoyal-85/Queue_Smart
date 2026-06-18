import React from 'react'
import { Clock, CheckCircle, XCircle, AlertCircle, Phone, Monitor } from 'lucide-react'
import type { Token } from '../../types'
import { Badge, statusToBadgeColor } from '../ui/Badge'
import { formatWaitTime, formatDateTime } from '../../utils/formatters'

interface TokenCardProps {
  token: Token
  showActions?: boolean
  onCancel?: () => void
}

const statusIcons: Record<string, React.ReactNode> = {
  waiting: <Clock size={20} className="text-blue-500" />,
  called: <AlertCircle size={20} className="text-green-500" />,
  serving: <AlertCircle size={20} className="text-yellow-500" />,
  completed: <CheckCircle size={20} className="text-gray-400" />,
  cancelled: <XCircle size={20} className="text-red-400" />,
  skipped: <XCircle size={20} className="text-orange-400" />,
}

const statusBg: Record<string, string> = {
  waiting: 'border-blue-100 bg-blue-50/30',
  called: 'border-green-100 bg-green-50/30',
  serving: 'border-yellow-100 bg-yellow-50/30',
  completed: 'border-gray-100 bg-gray-50/30',
  cancelled: 'border-red-100 bg-red-50/30',
  skipped: 'border-orange-100 bg-orange-50/30',
}

export const TokenCard: React.FC<TokenCardProps> = ({ token, showActions, onCancel }) => {
  const isActive = ['waiting', 'called', 'serving'].includes(token.status)

  return (
    <div className={`rounded-xl border-2 p-5 transition-all duration-300 ${statusBg[token.status] || 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {statusIcons[token.status]}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">{token.display_code}</span>
              {token.priority === 'priority' && (
                <Badge color="purple">Priority</Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {token.queue?.name || 'Queue'} • Joined {formatDateTime(token.joined_at)}
            </p>
          </div>
        </div>
        <Badge color={statusToBadgeColor(token.status)} dot>
          {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
        </Badge>
      </div>

      {isActive && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-white/70 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-0.5">Est. Wait</p>
            <p className="font-semibold text-gray-900">{formatWaitTime(token.estimated_wait_seconds)}</p>
          </div>
          {token.guest_phone && (
            <div className="bg-white/70 rounded-lg p-3 flex items-center gap-2">
              <Phone size={14} className="text-gray-400" />
              <span className="text-sm text-gray-700">{token.guest_phone}</span>
            </div>
          )}
        </div>
      )}

      {token.counter && ['called', 'serving'].includes(token.status) && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
          <Monitor size={14} /> Proceed to {token.counter.name}
        </div>
      )}

      {token.status === 'completed' && token.actual_wait_seconds > 0 && (
        <div className="mt-3 text-sm text-gray-500">
          Total wait: <span className="font-medium text-gray-700">{formatWaitTime(token.actual_wait_seconds)}</span>
        </div>
      )}

      {showActions && isActive && onCancel && (
        <button onClick={onCancel}
          className="mt-4 w-full py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
          Cancel Token
        </button>
      )}
    </div>
  )
}
