import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText, Search, Filter, User, Clock, Shield } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { adminAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { TableSkeleton } from '../../components/ui/Spinner'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create_queue:       { label: 'Queue Created',      color: 'bg-green-100 text-green-700' },
  update_queue:       { label: 'Queue Updated',      color: 'bg-blue-100 text-blue-700' },
  delete_queue:       { label: 'Queue Deleted',      color: 'bg-red-100 text-red-700' },
  call_token:         { label: 'Token Called',       color: 'bg-purple-100 text-purple-700' },
  complete_token:     { label: 'Token Completed',    color: 'bg-green-100 text-green-700' },
  skip_token:         { label: 'Token Skipped',      color: 'bg-orange-100 text-orange-700' },
  extend_token_time:  { label: 'Time Extended',      color: 'bg-amber-100 text-amber-700' },
  toggle_priority:    { label: 'Priority Toggled',   color: 'bg-indigo-100 text-indigo-700' },
  invite_staff:       { label: 'Staff Invited',      color: 'bg-teal-100 text-teal-700' },
  remove_staff:       { label: 'Staff Removed',      color: 'bg-red-100 text-red-700' },
  update_queue_status:{ label: 'Status Changed',     color: 'bg-yellow-100 text-yellow-700' },
  update_user_role:   { label: 'Role Changed',       color: 'bg-pink-100 text-pink-700' },
  assign_venue:       { label: 'Venue Assigned',     color: 'bg-cyan-100 text-cyan-700' },
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_LABELS[action]
  if (!meta) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        {action.replace(/_/g, ' ')}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.color}`}>
      {meta.label}
    </span>
  )
}

const ALL_ACTIONS = Object.keys(ACTION_LABELS)

export default function AuditLogs() {
  const { user } = useAuthStore()
  const [actionFilter, setActionFilter] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', actionFilter],
    queryFn: () => adminAPI.getAuditLogs(actionFilter || undefined).then(r => r.data.data),
    refetchInterval: 30000,
  })

  const logs: any[] = data?.logs ?? []

  // Client-side search across user name, email, entity type
  const filtered = logs.filter(log => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      log.user?.name?.toLowerCase().includes(q) ||
      log.user?.email?.toLowerCase().includes(q) ||
      log.entity_type?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q)
    )
  })

  return (
    <Layout breadcrumb="Audit Logs">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={20} className="text-[#E85D32]" />
              <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            </div>
            <p className="text-sm text-gray-500">
              Track all admin and staff activity for security and compliance
            </p>
          </div>
          {data?.total !== undefined && (
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{data.total}</p>
              <p className="text-xs text-gray-400">total events</p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user, email, or entity…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="pl-8 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer"
            >
              <option value="">All Actions</option>
              {ALL_ACTIONS.map(a => (
                <option key={a} value={a}>{ACTION_LABELS[a].label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <ScrollText size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-500 font-medium">No audit events found</p>
              <p className="text-sm text-gray-400 mt-1">
                {search || actionFilter ? 'Try adjusting your filters' : 'Activity will appear here as actions are performed'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Performed By</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Entity</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">IP</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E85D32] to-[#F87C53] flex items-center justify-center flex-shrink-0">
                            <User size={12} className="text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 leading-tight">{log.user?.name || '—'}</p>
                            <p className="text-xs text-gray-400">{log.user?.email || log.user_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {log.entity_type ? (
                          <span className="text-gray-600">
                            {log.entity_type}
                            {log.entity_id && (
                              <span className="text-gray-400 text-xs ml-1 font-mono">
                                #{log.entity_id.slice(0, 8)}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-gray-400 font-mono">{log.ip_address || '—'}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 text-xs text-gray-400">
                          <Clock size={11} />
                          {formatDate(log.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Showing {filtered.length} of {logs.length} events
                  {actionFilter || search ? ' (filtered)' : ''}
                </p>
                <p className="text-xs text-gray-400">Auto-refreshes every 30 seconds</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
