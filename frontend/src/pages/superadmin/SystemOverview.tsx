import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, Users, Activity } from 'lucide-react'
import { superAdminAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { StatCardSkeleton } from '../../components/ui/Spinner'

export default function SystemOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['system-stats'],
    queryFn: () => superAdminAPI.getSystemStats().then(r => r.data.data),
    refetchInterval: 30000,
  })

  return (
    <Layout breadcrumb="System Overview">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">QueueSmart Platform Admin</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {isLoading ? [1,2,3].map(i => <StatCardSkeleton key={i} />) : (
            <>
              <div className="stat-card">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                  <Users size={20} className="text-blue-600" />
                </div>
                <p className="text-xs text-gray-500">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.total_users?.toLocaleString() || 0}</p>
              </div>
              <div className="stat-card">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
                  <Building2 size={20} className="text-green-600" />
                </div>
                <p className="text-xs text-gray-500">Active Venues</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.total_venues || 0}</p>
              </div>
              <div className="stat-card">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
                  <Activity size={20} className="text-purple-600" />
                </div>
                <p className="text-xs text-gray-500">Platform</p>
                <p className="text-xl font-bold text-gray-900">{stats?.platform || 'QueueSmart'}</p>
              </div>
            </>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: '+ Create Venue', href: '/superadmin/venues' },
                { label: '👥 Manage Users', href: '/superadmin/users' },
                { label: '🏢 All Venues', href: '/superadmin/venues' },
              ].map(item => (
                <a key={item.href} href={item.href}
                  className="block w-full text-left px-4 py-2.5 rounded-lg border border-gray-100 hover:bg-blue-50 hover:border-blue-100 text-sm text-gray-700 transition-colors">
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3">System Health</h2>
            <div className="space-y-3">
              {[
                { label: 'API Server', status: 'Operational' },
                { label: 'Database', status: 'Operational' },
                { label: 'Redis', status: 'Operational' },
                { label: 'WebSocket', status: 'Operational' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> {item.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
