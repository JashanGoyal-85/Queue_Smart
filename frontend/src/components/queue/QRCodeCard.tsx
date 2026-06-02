import React from 'react'
import QRCode from 'react-qr-code'
import { Download, Share2 } from 'lucide-react'

interface QRCodeCardProps {
  displayCode: string
  qrValue: string
  subtitle?: string
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({ displayCode, qrValue, subtitle }) => {
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'My Queue Token', url: qrValue })
    } else {
      await navigator.clipboard.writeText(qrValue)
    }
  }

  return (
    <div className="card p-6 text-center space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Your Token</p>
        <div className="text-6xl font-bold text-blue-600 tracking-wider">{displayCode}</div>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex justify-center p-4 bg-gray-50 rounded-xl">
        <QRCode value={qrValue} size={140} fgColor="#1D4ED8" />
      </div>
      <div className="flex gap-2 justify-center">
        <button onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
          <Share2 size={14} /> Share
        </button>
      </div>
    </div>
  )
}
