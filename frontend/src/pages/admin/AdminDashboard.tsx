import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Settings, Trash2, PlayCircle, PauseCircle,
  BarChart3, Users, ClipboardPlus, ScrollText, QrCode, X, Building2
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useVenueStore } from '../../stores/venueStore'
import { staffAPI, adminAPI, queueAPI, superAdminAPI } from '../../services/api'
import api from '../../services/api'
import { Layout } from '../../components/layout/Layout'
import { Badge, statusToBadgeColor } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmModal } from '../../components/ui/Modal'
import { CardSkeleton } from '../../components/ui/Spinner'
import toast from 'react-hot-toast'
import type { Queue, Venue } from '../../types'

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const { selectedVenueId, selectedVenueName, setSelectedVenue } = useVenueStore()
  const queryClient = useQueryClient()
  const isSuperAdmin = user?.role === 'superadmin'

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [qrQueue, setQrQueue] = useState<Queue | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)

  // For regular admins their venueId comes from their profile; for superadmin from the store.
  const venueId = isSuperAdmin ? selectedVenueId : (user?.venue_id || '')

  // Fetch all venues list (superadmin only)
  const { data: allVenues = [] } = useQuery<Venue[]>({
    queryKey: ['all-venues-admin-dashboard'],
    queryFn: () => superAdminAPI.listVenues().then(r => r.data.data),
    enabled: isSuperAdmin,
  })

  // Fetch queues for the active venue
  const { data: queues = [], isLoading } = useQuery<Queue[]>({
    queryKey: ['admin-queues', venueId],
    queryFn: () => {
      const endpoint = isSuperAdmin && venueId
        ? `/staff/queues?venue_id=${venueId}`
        : '/staff/queues'
      return api.get(endpoint).then(r => r.data.data ?? [])
    },
    enabled: !!venueId,
  })

  const handleVenueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    const name = allVenues.find((v: Venue) => v.id === id)?.name || ''
    setSelectedVenue(id, name)
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminAPI.deleteQueue(id),
    onSuccess: () => {
      toast.success('Queue deleted')
      setDeleteId(null)
      queryClient.invalidateQueries({ queryKey: ['admin-queues'] })
    },
    onError: () => toast.error('Failed to delete queue'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      staffAPI.updateQueueStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-queues'] }),
  })

  const handleShowQR = async (q: Queue) => {
    setQrQueue(q)
    setQrUrl(null)
    setQrLoading(true)
    try {
      const res = await queueAPI.getQR(q.id)
      setQrUrl(URL.createObjectURL(res.data))
    } catch {
      toast.error('Failed to load QR code')
      setQrQueue(null)
    } finally {
      setQrLoading(false)
    }
  }

  const handleCloseQR = () => {
    if (qrUrl) URL.revokeObjectURL(qrUrl)
    setQrQueue(null)
    setQrUrl(null)
  }

  return (
    <Layout breadcrumb="Admin Panel">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#E85D32]">Venue operations</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#18201D]">Admin panel</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {user?.name} · {isSuperAdmin && selectedVenueName ? selectedVenueName : 'Managing venue'}
            </p>
          </div>
          <Link to="/admin/queues/new">
            <Button variant="primary" icon={<Plus size={16} />}>New Queue</Button>
          </Link>
        </div>

        {/* Venue selector — superadmin only */}
        {isSuperAdmin && (
          <div className="card p-4 flex items-center gap-3">
            <Building2 size={18} className="text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                Select Venue to Manage
              </label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedVenueId}
                onChange={handleVenueChange}
              >
                <option value="">— Pick a venue —</option>
                {allVenues.map((v: Venue) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Peak Hours', href: '/admin/analytics', icon: BarChart3 },
            { label: 'Staff Mgmt', href: '/admin/staff', icon: Users },
            { label: 'Create Queue', href: '/admin/queues/new', icon: ClipboardPlus },
            { label: 'Audit Logs', href: '/admin/audit', icon: ScrollText },
          ].map(item => (
            <Link key={item.href} to={item.href} className="card-hover p-4 text-center">
              <item.icon size={20} className="mx-auto mb-3 text-[#E85D32]" />
              <p className="text-sm font-bold text-[#18201D]">{item.label}</p>
            </Link>
          ))}
        </div>

        {/* Queue list */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Manage Queues</h2>

          {isSuperAdmin && !venueId ? (
            <div className="card p-10 text-center text-gray-400">
              Select a venue above to view and manage its queues.
            </div>
          ) : isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <CardSkeleton key={i} />)}</div>
          ) : queues.length === 0 ? (
            <div className="card p-10 text-center">
              <ClipboardPlus size={32} className="mx-auto mb-3 text-black/30" />
              <p className="text-gray-500 mb-3">No queues yet. Create your first one.</p>
              <Link to="/admin/queues/new"><Button variant="primary">Create Queue</Button></Link>
            </div>
          ) : (
            <div className="space-y-3">
              {queues.map((q: Queue) => (
                <div key={q.id} className="card p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{q.name}</span>
                      <Badge color={statusToBadgeColor(q.status)} dot>{q.status}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{q.current_count} waiting · max {q.max_capacity}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {q.status !== 'active' && (
                      <Button size="sm" variant="secondary" icon={<PlayCircle size={13} />}
                        onClick={() => statusMutation.mutate({ id: q.id, status: 'active' })}>Open</Button>
                    )}
                    {q.status === 'active' && (
                      <Button size="sm" variant="secondary" icon={<PauseCircle size={13} />}
                        onClick={() => statusMutation.mutate({ id: q.id, status: 'paused' })}>Pause</Button>
                    )}
                    <Button size="sm" variant="ghost" icon={<QrCode size={13} />}
                      onClick={() => handleShowQR(q)}
                      className="text-blue-600 hover:bg-blue-50">
                      QR Code
                    </Button>
                    <Link to={`/admin/queues/${q.id}/settings`}>
                      <Button size="sm" variant="ghost" icon={<Settings size={13} />}>Edit</Button>
                    </Link>
                    <Button size="sm" variant="danger" icon={<Trash2 size={13} />}
                      onClick={() => setDeleteId(q.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Queue"
        message="This will permanently delete the queue and all its data. Are you sure?"
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      />

      {/* QR Code Modal */}
      {qrQueue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900">Queue QR Code</h3>
                <p className="text-xs text-gray-400 mt-0.5">{qrQueue.name}</p>
              </div>
              <button onClick={handleCloseQR}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              {qrLoading ? (
                <div className="w-48 h-48 bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
                  <QrCode size={32} className="text-gray-300" />
                </div>
              ) : qrUrl ? (
                <img src={qrUrl} alt={`QR for ${qrQueue.name}`}
                  className="w-48 h-48 rounded-xl border border-gray-200 shadow-sm" />
              ) : null}
              <div className="text-center space-y-1 w-full">
                <p className="text-sm font-medium text-gray-700">Share this with visitors to join the queue</p>
                <div className="bg-gray-50 rounded-lg px-3 py-2 mt-1">
                  <p className="text-xs text-gray-400 font-mono break-all">
                    {window.location.origin}/join/{qrQueue.id}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 w-full">
                {qrUrl && (
                  <a href={qrUrl}
                    download={`qr-${qrQueue.name.replace(/\s+/g, '-').toLowerCase()}.png`}
                    className="flex-1">
                    <Button variant="primary" className="w-full">⬇ Download PNG</Button>
                  </a>
                )}
                <Button variant="secondary" onClick={handleCloseQR} className="flex-1">Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
