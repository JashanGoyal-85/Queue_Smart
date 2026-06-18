import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, MapPin, Clock, Users, Filter } from 'lucide-react'
import { venueAPI } from '../../services/api'
import { CardSkeleton } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { VENUE_CATEGORIES } from '../../utils/constants'
import type { Venue } from '../../types'
import { PublicNav } from '../../components/layout/PublicNav'

export default function Venues() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['venues', search, category, city, page],
    queryFn: () => venueAPI.list({ q: search, category, city, page, limit: 12 }).then(r => r.data.data),
    placeholderData: (prev) => prev,
  })

  const venues: Venue[] = data?.venues || []

  return (
    <div className="min-h-screen bg-[#F4F1E9]">
      <PublicNav />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#E85D32]">Live directory</p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold tracking-[-0.045em] text-[#18201D] mb-3">Find your shortest wait.</h1>
        <p className="mb-8 max-w-xl text-sm leading-6 text-black/50">Browse places nearby, compare active queues, and take a number before you arrive.</p>

        {/* Filters */}
        <div className="card flex flex-wrap gap-3 mb-6 p-3">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search venues..."
              className="input w-full pl-9" />
          </div>
          <input value={city} onChange={e => { setCity(e.target.value); setPage(1) }}
            placeholder="City..."
            className="input w-36" />
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}
            className="input w-auto bg-white">
            <option value="">All categories</option>
            {VENUE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <button onClick={() => setCategory('')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${!category ? 'bg-[#18201D] text-white' : 'bg-white border border-black/10 text-black/55 hover:border-black/25'}`}>
            All
          </button>
          {VENUE_CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${category === c.value ? 'bg-[#18201D] text-white' : 'bg-white border border-black/10 text-black/55 hover:border-black/25'}`}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏢</div>
            <h3 className="font-semibold text-gray-900 mb-2">No venues found</h3>
            <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {venues.map(venue => (
              <Link key={venue.id} to={`/venues/${venue.slug}`} className="card-hover p-6 block group">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#F5C84C]/45 flex items-center justify-center flex-shrink-0 text-2xl">
                    {VENUE_CATEGORIES.find(c => c.value === venue.category)?.icon || '🏢'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{venue.name}</h3>
                    <Badge color={venue.is_active ? 'green' : 'gray'} dot className="text-xs mt-0.5">
                      {venue.category}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                  <MapPin size={12} />
                  <span>{venue.city}{venue.state ? `, ${venue.state}` : ''}</span>
                </div>
                {venue.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{venue.description}</p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Users size={11} /> {venue.queues?.length || 0} queues</span>
                  <span className="text-blue-600 font-medium">View queues →</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data?.total > 12 && (
          <div className="flex justify-center gap-2 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
            <span className="px-4 py-2 text-sm text-gray-600">Page {page}</span>
            <button onClick={() => setPage(p => p+1)} disabled={venues.length < 12}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
          </div>
        )}
      </div>
    </div>
  )
}
