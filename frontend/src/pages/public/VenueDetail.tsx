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
  if (!data) return <div className="min-h-screen flex items-center justify-center text-gray-500">Venue not found</div>

  const venue = data
  const catInfo = VENUE_CATEGORIES.find(c => c.value === venue.category)
  const activeQueues: Queue[] = (venue.queues || []).filter((q: Queue) => q.status !== 'closed')

  return (
    <div className="min-h-screen bg-[#F4F1E9]">
      <PublicNav />
      {/* Cover */}
      <div className="relative h-52 bg-[#18201D] overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        {venue.cover_url && <img src={venue.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
        <Link to="/venues" className="absolute top-4 left-4 flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium">
          <ArrowLeft size={16} /> All Venues
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8 pb-12">
        {/* Venue header */}
        <div className="card p-6 sm:p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#F5C84C] border-4 border-white shadow-md flex items-center justify-center text-3xl flex-shrink-0 -mt-10">
              {venue.logo_url ? <img src={venue.logo_url} alt="" className="w-full h-full object-cover rounded-xl" /> : catInfo?.icon || '🏢'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{venue.name}</h1>
                <Badge color={venue.is_active ? 'green' : 'red'} dot>{venue.is_active ? 'Open' : 'Closed'}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                {venue.address && <span className="flex items-center gap-1"><MapPin size={12} />{venue.address}, {venue.city}</span>}
                {venue.contact_phone && <span className="flex items-center gap-1"><Phone size={12} />{venue.contact_phone}</span>}
                {venue.contact_email && <span className="flex items-center gap-1"><Mail size={12} />{venue.contact_email}</span>}
              </div>
              {venue.description && <p className="text-sm text-gray-500 mt-2">{venue.description}</p>}
            </div>
          </div>
        </div>

        {/* Queues */}
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#E85D32]">Live service board</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#18201D] mb-4">Active queues ({activeQueues.length})</h2>
        {activeQueues.length === 0 ? (
          <div className="card p-10 text-center text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p>No active queues right now</p>
          </div>
        ) : (
          <div className="space-y-4">
            {(venue.queues || []).map((queue: Queue) => (
              <div key={queue.id} className="card p-5 sm:p-6 border-l-4 border-l-[#F5C84C]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-gray-900">{queue.name}</h3>
                      <Badge color={statusToBadgeColor(queue.status)} dot>
                        {queue.status.charAt(0).toUpperCase() + queue.status.slice(1)}
                      </Badge>
                      {queue.is_priority_enabled && <Badge color="purple">Priority Available</Badge>}
                    </div>
                    {queue.description && <p className="text-sm text-gray-500 mb-3">{queue.description}</p>}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Users size={13} />{queue.current_count} waiting</span>
                      <span className="flex items-center gap-1"><Clock size={13} />~{formatWaitTime(queue.avg_serve_time_seconds * queue.current_count)} wait</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
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
