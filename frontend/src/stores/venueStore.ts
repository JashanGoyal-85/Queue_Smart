import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface VenueState {
  selectedVenueId: string
  selectedVenueName: string
  setSelectedVenue: (id: string, name: string) => void
  clearSelectedVenue: () => void
}

/**
 * Persists the superadmin's currently-selected venue across page navigations.
 * Regular admins always use their own venue_id from their user profile, so
 * this store is primarily useful for the superadmin role.
 */
export const useVenueStore = create<VenueState>()(
  persist(
    (set) => ({
      selectedVenueId: '',
      selectedVenueName: '',
      setSelectedVenue: (id, name) => set({ selectedVenueId: id, selectedVenueName: name }),
      clearSelectedVenue: () => set({ selectedVenueId: '', selectedVenueName: '' }),
    }),
    { name: 'queuesmart-venue' }
  )
)
