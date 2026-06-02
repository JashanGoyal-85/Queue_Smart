import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { staffAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { PageSpinner } from '../../components/ui/Spinner'
import type { Queue } from '../../types'

export default function StaffAnalytics() {
  const { data: queues = [], isLoading } = useQuery({
    queryKey: ['staff-queues'],
    queryFn: () => staffAPI.getQueues().then(r => r.data.data),
  })

  const { data: analyticsData = [] } = useQuery({
    queryKey: ['staff-analytics-all', queues.map((q: Queue) => q.id)],
    queryFn: async () => {
      const results = await Promise.all(queues.map((q: Queue) =>
        staffAPI.getAnalytics(q.id).then(r => ({ ...r.data.data, queue_name: q.name }))
      ))
      return results
    },
    enabled: queues.length > 0,
  })

  if (isLoading) return <Layout breadcrumb="Analytics"><PageSpinner /></Layout>

  return (
    <Layout breadcrumb="Analytics">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Queue Analytics</h1>

        {analyticsData.length === 0 ? (
          <div className="card p-10 text-center text-gray-400">
            <div className="text-4xl mb-3">📊</div>
            <p>No analytics data yet</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-4">
              {analyticsData.map((a: any) => (
                <div key={a.queue_name} className="card p-5">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm">{a.queue_name}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Waiting</span><span className="font-medium">{a.waiting}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Completed</span><span className="font-medium text-green-600">{a.completed}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Cancelled</span><span className="font-medium text-red-500">{a.cancelled}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total</span><span className="font-bold">{a.total}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Today's Overview</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="queue_name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="waiting" name="Waiting" fill="#3B82F6" radius={[4,4,0,0]} />
                  <Bar dataKey="completed" name="Completed" fill="#16A34A" radius={[4,4,0,0]} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#DC2626" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
