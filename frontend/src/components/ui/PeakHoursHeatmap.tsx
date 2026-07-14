import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import { adminAPI } from '../../services/api'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getColor(value: number, max: number) {
  if (max === 0 || value === 0) return '#F3F4F6'
  const ratio = value / max
  if (ratio > 0.8) return '#1D4ED8'
  if (ratio > 0.6) return '#3B82F6'
  if (ratio > 0.4) return '#93C5FD'
  if (ratio > 0.2) return '#DBEAFE'
  return '#EFF6FF'
}

function formatHour(h: number) {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

interface Props {
  venueId: string
}

export function PeakHoursHeatmap({ venueId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['peak-hours', venueId],
    queryFn: () => adminAPI.getPeakHours(venueId).then(r => r.data.data),
    enabled: !!venueId,
  })

  if (!venueId) {
    return (
      <div className="card p-8 text-center text-gray-400 text-sm">
        <BarChart3 size={28} className="mx-auto mb-2 text-gray-300" />
        Select a venue to view Peak Hours data
      </div>
    )
  }

  const heatmapData: number[][] = data?.heatmap ?? Array(7).fill(null).map(() => Array(24).fill(0))
  const allValues = heatmapData.flat()
  const maxValue = Math.max(...allValues, 1)
  const hasData = allValues.some(v => v > 0)

  return (
    <div className="space-y-4">
      {/* Heatmap card */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900">Weekly Activity Heatmap</h2>
          </div>
          {!hasData && !isLoading && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-full">
              No data yet — activity will appear as tokens are issued
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {DAYS.map(d => (
              <div key={d} className="flex items-center gap-2">
                <div className="w-8 text-xs text-gray-400">{d}</div>
                <div className="flex-1 flex gap-0.5">
                  {HOURS.map(h => (
                    <div key={h} className="flex-1 h-6 rounded bg-gray-100 animate-pulse" style={{ minWidth: 10 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Hour labels */}
              <div className="flex mb-1 ml-8">
                {HOURS.filter(h => h % 3 === 0).map(h => (
                  <div key={h} className="text-[10px] text-gray-400 flex-1 text-center" style={{ minWidth: `${(100 / 24) * 3}%` }}>
                    {formatHour(h)}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {DAYS.map((day, dayIdx) => (
                <div key={day} className="flex items-center mb-1 gap-1">
                  <div className="text-[10px] text-gray-500 w-8 flex-shrink-0 text-right pr-1">{day}</div>
                  <div className="flex-1 flex gap-0.5">
                    {HOURS.map(h => {
                      const value = heatmapData[dayIdx]?.[h] ?? 0
                      return (
                        <div
                          key={h}
                          title={`${day} ${formatHour(h)} — ${value} token${value !== 1 ? 's' : ''}`}
                          className="flex-1 h-6 rounded-sm cursor-pointer transition-transform hover:scale-110"
                          style={{ backgroundColor: getColor(value, maxValue), minWidth: 10 }}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Legend */}
              <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
                <span>Low</span>
                {['#EFF6FF', '#DBEAFE', '#93C5FD', '#3B82F6', '#1D4ED8'].map(c => (
                  <div key={c} className="w-4 h-3 rounded-sm" style={{ backgroundColor: c }} />
                ))}
                <span>High</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary cards */}
      {data?.summary && hasData && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Busiest Day</p>
            <p className="text-xl font-bold text-gray-900">{data.summary.busiest_day || '—'}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Busiest Hour</p>
            <p className="text-xl font-bold text-gray-900">
              {data.summary.busiest_hour !== undefined ? formatHour(data.summary.busiest_hour) : '—'}
            </p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Peak Volume</p>
            <p className="text-xl font-bold text-gray-900">{data.summary.peak_volume ?? '—'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
