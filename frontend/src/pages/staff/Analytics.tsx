import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { staffAPI, adminAPI, superAdminAPI } from '../../services/api'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { useVenueStore } from '../../stores/venueStore'
import { Layout } from '../../components/layout/Layout'
import { PageSpinner } from '../../components/ui/Spinner'
import { Building2, Users, CheckCircle, XCircle, Clock, TrendingUp, BarChart3 } from 'lucide-react'
import { formatWaitTime } from '../../utils/formatters'
import type { Queue, Venue } from '../../types'

const COLORS = ['#E85D32', '#16A34A', '#DC2626', '#3B82F6']

const StatBox = ({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) => (
  <div className="card p-5 relative overflow-hidden">
    <div className={`absolute right-0 top-0 h-16 w-16 translate-x-5 -translate-y-5 rounded-full opacity-20`} style={{ background: color }} />
    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: color + '20' }}>
      <span style={{ color }}>{icon}</span>
    </div>
    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-black/40 font-medium">{label}</p>
    <p className="text-2xl font-extrabold text-[#18201D] mt-1">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
)

export default function StaffAnalytics() {
  const { user } = useAuthStore()
  const { selectedVenueId, selectedVenueName, setSelectedVenue } = useVenueStore()
  const isSuperAdmin = user?.role === 'superadmin'

  // For regular staff/admin, use their own venue from profile
  const venueId = isSuperAdmin ? selectedVenueId : (user?.venue_id || '')

  // Fetch all venues (superadmin only)
  const { data: allVenues = [] } = useQuery<Venue[]>({
    queryKey: ['all-venues-analytics'],
    queryFn: () => superAdminAPI.listVenues().then(r => r.data.data),
    enabled: isSuperAdmin,
  })

  // Fetch queues for selected venue
  const { data: queues = [], isLoading: queuesLoading } = useQuery<Queue[]>({
    queryKey: ['analytics-queues', venueId],
    queryFn: () => {
      const endpoint = isSuperAdmin && venueId
        ? `/staff/queues?venue_id=${venueId}`
        : '/staff/queues'
      return api.get(endpoint).then(r => r.data.data ?? [])
    },
    enabled: !!venueId || !isSuperAdmin,
  })

  // Fetch analytics for each queue
  const { data: analyticsData = [], isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics-all', queues.map((q: Queue) => q.id)],
    queryFn: async () => {
      const results = await Promise.all(
        queues.map((q: Queue) =>
          staffAPI.getAnalytics(q.id).then(r => ({
            ...r.data.data,
            queue_name: q.name,
            queue_id: q.id,
            max_capacity: q.max_capacity,
            avg_serve_time: q.avg_serve_time_seconds,
            status: q.status,
          }))
        )
      )
      return results
    },
    enabled: queues.length > 0,
  })

  // Fetch venue-level stats (admin+)
  const { data: venueStats } = useQuery({
    queryKey: ['venue-stats', venueId],
    queryFn: () => adminAPI.getVenueStats(venueId).then(r => r.data.data),
    enabled: !!venueId && (user?.role === 'admin' || user?.role === 'superadmin'),
  })

  const handleVenueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    const name = allVenues.find((v: Venue) => v.id === id)?.name || ''
    setSelectedVenue(id, name)
  }

  const isLoading = queuesLoading || analyticsLoading

  // Aggregate totals
  const totals = analyticsData.reduce(
    (acc: any, a: any) => ({
      waiting: acc.waiting + (a.waiting || 0),
      completed: acc.completed + (a.completed || 0),
      cancelled: acc.cancelled + (a.cancelled || 0),
      total: acc.total + (a.total || 0),
    }),
    { waiting: 0, completed: 0, cancelled: 0, total: 0 }
  )

  const pieData = [
    { name: 'Completed', value: totals.completed },
    { name: 'Waiting', value: totals.waiting },
    { name: 'Cancelled', value: totals.cancelled },
  ].filter(d => d.value > 0)

  const completionRate = totals.total > 0
    ? Math.round((totals.completed / totals.total) * 100)
    : 0

  if (isLoading) return <Layout breadcrumb="Analytics"><PageSpinner /></Layout>

  return (
    <Layout breadcrumb="Analytics">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#E85D32]">Performance desk</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#18201D]">Queue analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isSuperAdmin && selectedVenueName ? `Venue: ${selectedVenueName}` : 'Your venue performance at a glance'}
          </p>
        </div>

        {/* Venue selector — superadmin only */}
        {isSuperAdmin && (
          <div className="card p-4 flex items-center gap-3">
            <Building2 size={18} className="text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Select Venue</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedVenueId}
                onChange={handleVenueChange}
              >
                <option value="">— Pick a venue —</option>
                {allVenues.map((v: Venue) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* No venue selected prompt */}
        {isSuperAdmin && !venueId && (
          <div className="card p-12 text-center text-gray-400">
            <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Select a venue above to see its analytics</p>
          </div>
        )}

        {(!isSuperAdmin || venueId) && (
          <>
            {/* Stat summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatBox icon={<Users size={20} />} label="Total Tokens" value={totals.total} color="#3B82F6" />
              <StatBox icon={<CheckCircle size={20} />} label="Completed" value={totals.completed} sub={`${completionRate}% rate`} color="#16A34A" />
              <StatBox icon={<Clock size={20} />} label="Still Waiting" value={totals.waiting} color="#F59E0B" />
              <StatBox icon={<XCircle size={20} />} label="Cancelled" value={totals.cancelled} color="#DC2626" />
            </div>

            {analyticsData.length === 0 ? (
              <div className="card p-12 text-center">
                <BarChart3 size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-900 mb-1">No data yet</p>
                <p className="text-sm text-gray-500">
                  Analytics will appear here once tokens start being issued and served in your queues.
                </p>
              </div>
            ) : (
              <>
                {/* Bar chart — per queue breakdown */}
                <div className="card p-6">
                  <h2 className="font-semibold text-gray-900 mb-1">Queue Breakdown</h2>
                  <p className="text-xs text-gray-400 mb-4">Tokens by status across all queues</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={analyticsData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="queue_name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
                      />
                      <Bar dataKey="waiting" name="Waiting" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" name="Completed" fill="#16A34A" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cancelled" name="Cancelled" fill="#DC2626" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Pie chart — distribution */}
                  {pieData.length > 0 && (
                    <div className="card p-6">
                      <h2 className="font-semibold text-gray-900 mb-1">Token Distribution</h2>
                      <p className="text-xs text-gray-400 mb-4">Overall status split</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((_, index) => (
                              <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                          <Legend iconType="circle" iconSize={10} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Per-queue detail cards */}
                  <div className="space-y-3">
                    <h2 className="font-semibold text-gray-900">Per Queue Detail</h2>
                    {analyticsData.map((a: any) => {
                      const rate = a.total > 0 ? Math.round((a.completed / a.total) * 100) : 0
                      return (
                        <div key={a.queue_id} className="card p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-800 text-sm">{a.queue_name}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              a.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>{a.status}</span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${rate}%` }} />
                          </div>
                          <div className="grid grid-cols-4 gap-1 text-center">
                            {[
                              { label: 'Wait', value: a.waiting, color: 'text-amber-600' },
                              { label: 'Done', value: a.completed, color: 'text-green-600' },
                              { label: 'Skip', value: a.cancelled, color: 'text-red-500' },
                              { label: 'Rate', value: `${rate}%`, color: 'text-blue-600' },
                            ].map(stat => (
                              <div key={stat.label}>
                                <p className={`font-bold text-sm ${stat.color}`}>{stat.value}</p>
                                <p className="text-[10px] text-gray-400">{stat.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Venue-level stats (if available) */}
                {venueStats && (
                  <div className="card p-5">
                    <h2 className="font-semibold text-gray-900 mb-3">Venue Overview</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      {Object.entries(venueStats).map(([key, val]) => (
                        <div key={key} className="bg-gray-50 rounded-xl p-3">
                          <p className="text-lg font-bold text-gray-900">{String(val)}</p>
                          <p className="text-xs text-gray-400 capitalize">{key.replace(/_/g, ' ')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
