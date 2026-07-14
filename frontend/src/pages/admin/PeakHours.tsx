import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { superAdminAPI } from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { PeakHoursHeatmap } from '../../components/ui/PeakHoursHeatmap'
import type { Venue } from '../../types'

export default function PeakHours() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'superadmin'
  const [pickedVenueId, setPickedVenueId] = useState('')

  // Admins/staff use their assigned venue; superadmin picks from dropdown
  const venueId = isSuperAdmin ? pickedVenueId : (user?.venue_id || '')

  const { data: venues = [] } = useQuery<Venue[]>({
    queryKey: ['all-venues-peak'],
    queryFn: () => superAdminAPI.listVenues().then(r => r.data.data),
    enabled: isSuperAdmin,
  })

  return (
    <Layout breadcrumb="Peak Hours">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Peak Hours Analysis</h1>
            <p className="text-sm text-gray-500 mt-0.5">Identify busiest times to staff appropriately</p>
          </div>

          {/* Venue picker — superadmin only */}
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <Building2 size={15} className="text-gray-400" />
              <select
                value={pickedVenueId}
                onChange={e => setPickedVenueId(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">— Select a venue —</option>
                {venues.map((v: Venue) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <PeakHoursHeatmap venueId={venueId} />
      </div>
    </Layout>
  )
}
