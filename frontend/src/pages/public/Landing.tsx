import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Clock, Users, Star, ArrowRight, ChevronRight, Building2, Scissors, Landmark, UtensilsCrossed, Plus } from 'lucide-react'

const features = [
  { icon: '⚡', title: 'Real-time Updates', desc: 'Live queue status and position tracking via WebSocket connections' },
  { icon: '📱', title: 'QR Code Entry', desc: 'Scan to join. No app downloads needed — works in any browser' },
  { icon: '🎯', title: 'Smart Predictions', desc: 'AI-powered wait time estimates based on historical patterns' },
  { icon: '🔔', title: 'Instant Alerts', desc: 'Get notified the moment your turn is approaching' },
]

const steps = [
  { step: '01', title: 'Find a venue', desc: 'Search for hospitals, banks, salons, or any registered venue near you' },
  { step: '02', title: 'Join the queue', desc: 'Scan the QR code or enter your details — no account required' },
  { step: '03', title: 'Relax & wait', desc: 'Get real-time updates. We\'ll alert you when your turn is near' },
]

const categories = [
  { icon: <Plus className="w-6 h-6 text-red-500" />, label: 'Hospital', value: 'hospital', bg: 'bg-red-50' },
  { icon: <Building2 className="w-6 h-6 text-blue-500" />, label: 'Bank', value: 'bank', bg: 'bg-blue-50' },
  { icon: <Scissors className="w-6 h-6 text-purple-500" />, label: 'Salon', value: 'salon', bg: 'bg-purple-50' },
  { icon: <UtensilsCrossed className="w-6 h-6 text-orange-500" />, label: 'Canteen', value: 'canteen', bg: 'bg-orange-50' },
  { icon: <Landmark className="w-6 h-6 text-green-500" />, label: 'Government', value: 'government', bg: 'bg-green-50' },
]

export default function Landing() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/venues?q=${encodeURIComponent(search)}`)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">QueueSmart</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link to="/venues" className="hover:text-blue-600 transition-colors">Find Venues</Link>
            <Link to="/login" className="hover:text-blue-600 transition-colors">Sign in</Link>
            <Link to="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-6 border border-blue-100">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
          Live queue tracking available now
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Skip the queue.<br />
          <span className="text-blue-600">Save your time.</span>
        </h1>
        <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
          Join queues at hospitals, banks, salons, and more — from your phone. Get notified when it's your turn.
        </p>
        <form onSubmit={handleSearch} className="flex items-center gap-3 max-w-xl mx-auto">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by venue name or city..."
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <button type="submit" className="px-6 py-3.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap">
            Search <ArrowRight size={16} />
          </button>
        </form>
      </section>

      {/* Stats */}
      <section className="border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-3 gap-8 text-center">
          {[['50k+', 'Queues Joined'], ['200+', 'Venues Active'], ['98%', 'Satisfaction Rate']].map(([num, label]) => (
            <div key={label}>
              <div className="text-3xl font-bold text-gray-900 mb-1">{num}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Browse by category</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {categories.map((cat) => (
            <Link key={cat.value} to={`/venues?category=${cat.value}`}
              className="flex items-center gap-3 px-5 py-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-200 bg-white group">
              <div className={`w-10 h-10 ${cat.bg} rounded-lg flex items-center justify-center`}>{cat.icon}</div>
              <span className="font-medium text-gray-700 group-hover:text-blue-600">{cat.label}</span>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400" />
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50/50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-12 text-center">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.step} className="relative">
                <div className="text-4xl font-black text-blue-100 mb-3">{step.step}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-12 text-center">Everything you need</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card-hover p-5">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-6xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to skip the wait?</h2>
          <p className="text-blue-100 mb-8 text-lg">Join thousands who save time every day with QueueSmart</p>
          <div className="flex gap-4 justify-center">
            <Link to="/register" className="px-8 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors">
              Create free account
            </Link>
            <Link to="/venues" className="px-8 py-3 border border-blue-400 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              Browse venues
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">Q</span>
            </div>
            <span>QueueSmart © 2024</span>
          </div>
          <div className="flex gap-6">
            <Link to="/venues" className="hover:text-gray-600">Find Venues</Link>
            <Link to="/login" className="hover:text-gray-600">Sign in</Link>
            <Link to="/register" className="hover:text-gray-600">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
