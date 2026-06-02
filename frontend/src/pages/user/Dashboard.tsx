import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Ticket, Clock, CheckCircle, TrendingUp, Plus, Search } from 'lucide-react'
import { userAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import { Layout } from '../../components/layout/Layout'
import { TokenCard } from '../../components/token/TokenCard'
import { StatCardSkeleton, CardSkeleton } from '../../components/ui/Spinner'
import { formatWaitTime } from '../../utils/formatters'
import type { Token, Stats } from '../../types'

const StatCard = ({ icon, label, value, sub, color = 'blue' }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string }) => (
  <div className="stat-card">
    <div className={`w-10 h-10 bg-${color}-50 rounded-xl flex items-center justify-center mb-3`}>{icon}</div>
    <p className="text-xs text-gray-500 font-medium">{label}</p>
    <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
)

export default function Dashboard() {
  const { user } = useAuthStore()

  const { data: tokensData, isLoading: tokensLoading } = useQuery({
    queryKey: ['my-tokens', 1],
    queryFn: () => userAPI.getMyTokens(1, 5).then(r => r.data.data),
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['my-stats'],
    queryFn: () => userAPI.getMyStats().then(r => r.data.data as Stats),
  })

  const activeTokens: Token[] = (tokensData?.tokens || []).filter((t: Token) =>
    ['waiting', 'called', 'serving'].includes(t.status)
  )
  const recentTokens: Token[] = (tokensData?.tokens || []).slice(0, 3)

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <Layout breadcrumb="Dashboard">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{greeting}, {user?.name?.split(' ')[0]}! 👋</h1>
            <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with your queues</p>
          </div>
          <Link to="/venues" className="btn-primary py-2">
            <Plus size={16} /> Join a Queue
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? [1,2,3,4].map(i => <StatCardSkeleton key={i} />) : (
            <>
              <StatCard icon={<Ticket size={20} className="text-blue-600" />} label="Total Joined" value={stats?.total_joined || 0} color="blue" />
              <StatCard icon={<CheckCircle size={20} className="text-green-600" />} label="Completed" value={stats?.completed || 0} color="green" />
              <StatCard icon={<Clock size={20} className="text-orange-500" />} label="Avg Wait" value={stats?.avg_wait_seconds ? formatWaitTime(stats.avg_wait_seconds) : '—'} color="orange" />
              <StatCard icon={<TrendingUp size={20} className="text-purple-600" />} label="Time Saved" value={stats?.time_saved_seconds ? formatWaitTime(stats.time_saved_seconds) : '—'} color="purple" />
            </>
          )}
        </div>

        {/* Active tokens */}
        {activeTokens.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> Active Queue Positions
            </h2>
            <div className="space-y-3">
              {activeTokens.map(t => (
                <Link key={t.id} to={`/track/${t.id}`}>
                  <TokenCard token={t} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
            <Link to="/dashboard/tokens" className="text-sm text-blue-600 hover:underline">View all →</Link>
          </div>
          {tokensLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <CardSkeleton key={i} />)}</div>
          ) : recentTokens.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="text-4xl mb-3">🎟️</div>
              <p className="font-medium text-gray-900 mb-1">No queue history yet</p>
              <p className="text-sm text-gray-500 mb-4">Browse venues and join your first queue</p>
              <Link to="/venues" className="btn-primary inline-flex w-auto px-5 py-2">Find a Venue</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTokens.map(t => <TokenCard key={t.id} token={t} />)}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
