import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, MapPin, Clock, Users, Filter } from 'lucide-react'
import { venueAPI } from '../../services/api'
import { CardSkeleton } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { VENUE_CATEGORIES } from '../../utils/constants'
import type { Venue } from '../../types'

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
    <div className="min-h-screen bg-white">
      {/* Top Nav */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="font-bold text-gray-900">QueueSmart</span>
          </Link>
          <div className="flex gap-3">
            <Link to="/login" className="text-sm text-gray-600 hover:text-blue-600">Sign in</Link>
            <Link to="/register" className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Register</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Find a venue</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search venues..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <input value={city} onChange={e => { setCity(e.target.value); setPage(1) }}
            placeholder="City..."
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36" />
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">All categories</option>
            {VENUE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 mb-8 flex-wrap">
          <button onClick={() => setCategory('')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!category ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            All
          </button>
          {VENUE_CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${category === c.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
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
              <Link key={venue.id} to={`/venues/${venue.slug}`} className="card-hover p-5 block">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-2xl">
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
