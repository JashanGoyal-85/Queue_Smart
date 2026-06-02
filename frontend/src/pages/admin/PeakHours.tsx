import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { adminAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { PageSpinner } from '../../components/ui/Spinner'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getColor(value: number, max: number) {
  if (max === 0) return '#F9FAFB'
  const ratio = value / max
  if (ratio > 0.8) return '#1D4ED8'
  if (ratio > 0.6) return '#3B82F6'
  if (ratio > 0.4) return '#93C5FD'
  if (ratio > 0.2) return '#DBEAFE'
  if (ratio > 0) return '#EFF6FF'
  return '#F9FAFB'
}

export default function PeakHours() {
  const { user } = useAuthStore()
  const venueId = user?.venue_id || ''

  const { data, isLoading } = useQuery({
    queryKey: ['peak-hours', venueId],
    queryFn: () => adminAPI.getPeakHours(venueId).then(r => r.data.data),
    enabled: !!venueId,
  })

  if (isLoading) return <Layout breadcrumb="Peak Hours"><PageSpinner /></Layout>

  const heatmapData: number[][] = data?.heatmap || Array(7).fill(null).map(() => Array(24).fill(0))
  const allValues: number[] = heatmapData.flat()
  const maxValue = Math.max(...allValues, 1)

  return (
    <Layout breadcrumb="Peak Hours">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Peak Hours Analysis</h1>
          <p className="text-sm text-gray-500 mt-0.5">Identify busiest times to staff appropriately</p>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Weekly Heatmap</h2>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Hour labels */}
              <div className="flex mb-1 ml-10">
                {HOURS.filter(h => h % 3 === 0).map(h => (
                  <div key={h} className="text-xs text-gray-400" style={{ width: `${(100 / 24) * 3}%` }}>
                    {h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`}
                  </div>
                ))}
              </div>

              {/* Heatmap rows */}
              {DAYS.map((day, dayIdx) => (
                <div key={day} className="flex items-center mb-1">
                  <div className="text-xs text-gray-500 w-10 flex-shrink-0">{day}</div>
                  <div className="flex-1 flex gap-0.5">
                    {HOURS.map(h => {
                      const value = heatmapData[dayIdx]?.[h] || 0
                      return (
                        <div key={h} title={`${day} ${h}:00 — ${value} tokens`}
                          className="flex-1 h-7 rounded cursor-pointer transition-opacity hover:opacity-80"
                          style={{ backgroundColor: getColor(value, maxValue), minWidth: '12px' }}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-4 text-xs text-gray-500">
            <span>Low</span>
            {['#EFF6FF', '#DBEAFE', '#93C5FD', '#3B82F6', '#1D4ED8'].map(c => (
              <div key={c} className="w-5 h-4 rounded" style={{ backgroundColor: c }} />
            ))}
            <span>High</span>
          </div>
        </div>

        {data?.summary && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">Busiest Day</p>
              <p className="text-lg font-bold text-gray-900">{data.summary.busiest_day || '—'}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">Busiest Hour</p>
              <p className="text-lg font-bold text-gray-900">{data.summary.busiest_hour !== undefined ? `${data.summary.busiest_hour}:00` : '—'}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 mb-1">Peak Volume</p>
              <p className="text-lg font-bold text-gray-900">{data.summary.peak_volume || '—'}</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
