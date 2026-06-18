import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, Building2, Check, ChevronRight, CircleDot, Clock3,
  HeartPulse, Landmark, QrCode, Scissors, Search, Sparkles,
  UtensilsCrossed, Zap,
} from 'lucide-react'
import { PublicNav } from '../../components/layout/PublicNav'

const categories = [
  { icon: HeartPulse, label: 'Health', value: 'hospital' },
  { icon: Building2, label: 'Banking', value: 'bank' },
  { icon: Scissors, label: 'Personal care', value: 'salon' },
  { icon: UtensilsCrossed, label: 'Food', value: 'canteen' },
  { icon: Landmark, label: 'Public services', value: 'government' },
]

const steps = [
  ['01', 'Pick a place', 'Find a nearby venue and see which queues are moving.'],
  ['02', 'Take a number', 'Join with one tap or scan the QR code at the entrance.'],
  ['03', 'Go live your life', 'We keep your place and tell you when it is time to return.'],
]

export default function Landing() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    navigate(`/venues?q=${encodeURIComponent(search)}`)
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#F4F1E9] text-[#18201D]">
      <PublicNav />

      <main>
        <section className="relative border-b border-black/10">
          <div className="pointer-events-none absolute inset-0 opacity-[0.055]" style={{ backgroundImage: 'linear-gradient(#18201D 1px, transparent 1px), linear-gradient(90deg, #18201D 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-28">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/65 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]">
                <CircleDot size={13} className="text-[#E85D32]" /> Live queues. Zero guesswork.
              </div>
              <h1 className="max-w-3xl text-[3.4rem] font-extrabold leading-[0.92] tracking-[-0.065em] sm:text-7xl lg:text-[5.6rem]">
                Waiting rooms<br />are <span className="font-display font-normal italic text-[#E85D32]">optional.</span>
              </h1>
              <p className="mt-7 max-w-xl text-base font-medium leading-7 text-black/55 sm:text-lg">
                Take a digital number, wander off, and come back at the right moment. No app. No crowd. No watching the door.
              </p>
              <form onSubmit={handleSearch} className="mt-9 flex max-w-xl flex-col gap-3 rounded-2xl border border-black/10 bg-white p-2 shadow-[0_18px_60px_rgba(24,32,29,.10)] sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/35" size={18} />
                  <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Venue, area or service" className="h-12 w-full bg-transparent pl-11 pr-4 text-sm font-medium outline-none placeholder:text-black/35" />
                </div>
                <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#E85D32] px-6 text-sm font-bold text-white transition-colors hover:bg-[#C74722]">
                  Find my queue <ArrowRight size={16} />
                </button>
              </form>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.12em] text-black/45">
                <span className="flex items-center gap-1.5"><Check size={12} /> Guest access</span>
                <span className="flex items-center gap-1.5"><Check size={12} /> Live position</span>
                <span className="flex items-center gap-1.5"><Check size={12} /> No download</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-lg lg:mr-0">
              <div className="absolute -left-5 -top-5 h-28 w-28 rounded-full bg-[#F5C84C] sm:-left-10 sm:-top-10" />
              <div className="relative rotate-1 rounded-[2rem] bg-[#18201D] p-4 text-white shadow-[0_30px_80px_rgba(24,32,29,.25)] sm:p-6">
                <div className="flex items-center justify-between border-b border-white/15 pb-5">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">Live board · City Care</p>
                    <p className="mt-1 text-lg font-bold">General consultation</p>
                  </div>
                  <span className="rounded-full bg-[#B8E36C] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-[#18201D]">Open</span>
                </div>
                <div className="grid grid-cols-[1fr_auto] items-end gap-6 py-7">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">Now serving</p>
                    <p className="mt-2 font-mono text-7xl font-semibold tracking-[-0.08em] sm:text-8xl">A042</p>
                  </div>
                  <div className="pb-2 text-right">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-white/45">Counter</p>
                    <p className="font-mono text-3xl font-semibold text-[#F5C84C]">03</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-white/15 rounded-2xl bg-white/[0.07] py-4 text-center">
                  <div><p className="font-mono text-xl font-semibold">07</p><p className="mt-1 text-[10px] text-white/40">ahead</p></div>
                  <div><p className="font-mono text-xl font-semibold">~18m</p><p className="mt-1 text-[10px] text-white/40">wait</p></div>
                  <div><p className="font-mono text-xl font-semibold">3</p><p className="mt-1 text-[10px] text-white/40">counters</p></div>
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#E85D32] p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/15"><Zap size={19} /></div>
                  <div><p className="text-sm font-bold">Your turn is getting close</p><p className="text-xs text-white/65">We will nudge you again at 3 people ahead.</p></div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-3 grid h-20 w-20 -rotate-6 place-items-center rounded-2xl border border-black/10 bg-white shadow-lg sm:-right-7 sm:h-24 sm:w-24">
                <QrCode size={44} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 bg-[#F5C84C]">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-5 sm:px-8">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em]">Browse by service</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(({ icon: Icon, label, value }) => (
                <Link key={value} to={`/venues?category=${value}`} className="flex items-center gap-2 rounded-full border border-black/15 bg-[#F9DB76] px-4 py-2 text-xs font-bold transition-colors hover:bg-white">
                  <Icon size={14} /> {label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 md:py-28">
          <div className="grid gap-10 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E85D32]">The whole idea</p>
              <h2 className="mt-4 max-w-sm text-4xl font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-5xl">Keep your place.<br /><span className="font-display font-normal italic">Lose the line.</span></h2>
            </div>
            <div className="grid border-t border-black/15 md:grid-cols-3">
              {steps.map(([number, title, copy]) => (
                <div key={number} className="border-b border-black/15 py-7 md:border-b-0 md:border-r md:px-7 first:md:pl-0 last:md:border-r-0">
                  <span className="font-mono text-xs font-semibold text-[#E85D32]">{number}</span>
                  <h3 className="mt-8 text-xl font-extrabold tracking-tight">{title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-black/50">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#18201D] text-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 md:py-24 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E85D32]"><Sparkles size={22} /></div>
              <h2 className="mt-7 text-4xl font-extrabold leading-tight tracking-[-0.04em] sm:text-5xl">Less waiting.<br />Better days.</h2>
              <p className="mt-5 max-w-md text-base leading-7 text-white/55">QueueSmart works in the browser you already have. Join as a guest, watch your position move, and arrive when someone is actually ready for you.</p>
            </div>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-white/15">
              {[
                [Clock3, 'Live estimates', 'Wait times update as the room changes.'],
                [QrCode, 'Walk-up friendly', 'One QR scan gets the line moving.'],
                [Zap, 'Timely nudges', 'Alerts arrive before your number is called.'],
                [Building2, 'Made for venues', 'Counters, staff, analytics and control.'],
              ].map(([Icon, title, copy]: any) => (
                <div key={title} className="bg-[#202A26] p-6 sm:p-8">
                  <Icon size={20} className="text-[#F5C84C]" />
                  <h3 className="mt-8 font-bold">{title}</h3>
                  <p className="mt-2 text-xs leading-5 text-white/45">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#E85D32] text-white">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-14 sm:px-8 md:flex-row md:items-center">
            <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">Your time is yours</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight">Ready to leave the line?</h2></div>
            <Link to="/venues" className="group flex items-center gap-4 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#18201D]">Find a queue <ChevronRight size={17} className="transition-transform group-hover:translate-x-1" /></Link>
          </div>
        </section>
      </main>

      <footer className="bg-[#F4F1E9]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-xs font-semibold text-black/45 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} QueueSmart. Waiting, redesigned.</p>
          <div className="flex gap-6"><Link to="/">Home</Link><Link to="/venues">Venues</Link></div>
        </div>
      </footer>
    </div>
  )
}
