import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Phone, Mail, Users, Clock, QrCode, ArrowLeft } from 'lucide-react'
import { venueAPI } from '../../services/api'
import { Badge, statusToBadgeColor } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { formatWaitTime } from '../../utils/formatters'
import { VENUE_CATEGORIES } from '../../utils/constants'
import type { Queue } from '../../types'
import { PublicNav } from '../../components/layout/PublicNav'

export default function VenueDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { data, isLoading } = useQuery({
    queryKey: ['venue', slug],
    queryFn: () => venueAPI.get(slug!).then(r => r.data.data),
  })

  if (isLoading) return <PageSpinner />
  if (!data) return (
    <div className="min-h-screen bg-[#F4F1E9]">
      <PublicNav />
      <div className="flex items-center justify-center py-32 text-gray-500">Venue not found</div>
    </div>
  )

  const venue = data
  const catInfo = VENUE_CATEGORIES.find(c => c.value === venue.category)
  const activeQueues: Queue[] = (venue.queues || []).filter((q: Queue) => q.status !== 'closed')

  return (
    <div className="min-h-screen bg-[#F4F1E9]">
      <PublicNav />

      <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-8 pb-16">

        {/* Back link */}
        <Link to="/venues"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#18201D] mb-6 transition-colors">
          <ArrowLeft size={15} /> All Venues
        </Link>

        {/* Venue header card */}
        <div className="card p-6 sm:p-8 mb-8">
          <div className="flex items-start gap-5">
            {/* Logo / category icon */}
            <div className="w-16 h-16 rounded-2xl bg-[#F5C84C] border-4 border-white shadow-md flex items-center justify-center text-3xl flex-shrink-0">
              {venue.logo_url
                ? <img src={venue.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                : <span>{catInfo?.icon || '🏢'}</span>
              }
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl font-extrabold text-[#18201D]">{venue.name}</h1>
                <Badge color={venue.is_active ? 'green' : 'red'} dot>
                  {venue.is_active ? 'Open' : 'Closed'}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500 mt-1">
                {venue.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-gray-400" />
                    {venue.address}{venue.city ? `, ${venue.city}` : ''}
                  </span>
                )}
                {venue.contact_phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} className="text-gray-400" />
                    {venue.contact_phone}
                  </span>
                )}
                {venue.contact_email && (
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} className="text-gray-400" />
                    {venue.contact_email}
                  </span>
                )}
              </div>

              {venue.description && (
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{venue.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Queues section */}
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#E85D32]">
          Live service board
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#18201D] mb-5">
          Active queues ({activeQueues.length})
        </h2>

        {activeQueues.length === 0 ? (
          <div className="card p-12 text-center text-gray-400">
            <div className="text-5xl mb-4">📭</div>
            <p className="font-medium">No active queues right now</p>
            <p className="text-sm mt-1">Check back later or contact the venue directly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(venue.queues || []).map((queue: Queue) => (
              <div key={queue.id} className="card p-5 sm:p-6 border-l-4 border-l-[#F5C84C] hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3 className="font-bold text-gray-900 text-base">{queue.name}</h3>
                      <Badge color={statusToBadgeColor(queue.status)} dot>
                        {queue.status.charAt(0).toUpperCase() + queue.status.slice(1)}
                      </Badge>
                      {queue.is_priority_enabled && (
                        <Badge color="purple">Priority Available</Badge>
                      )}
                    </div>
                    {queue.description && (
                      <p className="text-sm text-gray-500 mb-3">{queue.description}</p>
                    )}
                    <div className="flex items-center gap-5 text-sm text-gray-500 mt-2">
                      <span className="flex items-center gap-1.5">
                        <Users size={13} className="text-gray-400" />
                        {queue.current_count} waiting
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-gray-400" />
                        ~{formatWaitTime(queue.avg_serve_time_seconds * queue.current_count)} wait
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {queue.status === 'active' && (
                      <Link to={`/join/${queue.id}`}
                        className="px-5 py-2.5 bg-[#18201D] text-white text-sm font-bold rounded-xl hover:bg-[#2D3834] transition-colors text-center">
                        Join Queue
                      </Link>
                    )}
                    <Link to={`/join/${queue.id}`}
                      className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 justify-center">
                      <QrCode size={14} /> QR Code
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
