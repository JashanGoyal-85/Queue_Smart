import React from 'react'
import { Link } from 'react-router-dom'

export const Brand: React.FC<{ compact?: boolean; light?: boolean }> = ({ compact = false, light = false }) => (
  <Link to="/" className="inline-flex items-center gap-3">
    <span className={`grid ${compact ? 'h-9 w-9 text-[10px]' : 'h-10 w-10 text-[11px]'} place-items-center rounded-full bg-[#E85D32] font-extrabold text-white`}>QS</span>
    {!compact && (
      <span>
        <span className={`block text-base font-extrabold tracking-tight ${light ? 'text-white' : 'text-[#18201D]'}`}>QueueSmart</span>
        <span className={`block font-mono text-[8px] uppercase tracking-[0.2em] ${light ? 'text-white/40' : 'text-black/40'}`}>Your time, returned</span>
      </span>
    )}
  </Link>
)
