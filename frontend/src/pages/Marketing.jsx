import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  PaperAirplaneIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  SparklesIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const campaigns = [
  {
    id: 1,
    name: 'Promo Weekend Speciale',
    targetDate: '2024-01-13',
    status: 'active',
    dayClassification: 'low',
    messagesSent: 245,
    delivered: 238,
    read: 186,
    conversions: 23,
    revenue: 1840,
  },
  {
    id: 2,
    name: 'Menù Degustazione',
    targetDate: '2024-01-10',
    status: 'completed',
    dayClassification: 'medium',
    messagesSent: 180,
    delivered: 175,
    read: 142,
    conversions: 18,
    revenue: 1620,
  },
  {
    id: 3,
    name: 'San Valentino Early Bird',
    targetDate: '2024-02-14',
    status: 'scheduled',
    dayClassification: 'high',
    messagesSent: 0,
    delivered: 0,
    read: 0,
    conversions: 0,
    revenue: 0,
  },
  {
    id: 4,
    name: 'Riattivazione Clienti Inattivi',
    targetDate: '2024-01-08',
    status: 'completed',
    dayClassification: 'low',
    messagesSent: 89,
    delivered: 84,
    read: 52,
    conversions: 8,
    revenue: 480,
  },
]

const performanceData = [
  { name: 'Lun', sent: 45, conversions: 5 },
  { name: 'Mar', sent: 32, conversions: 3 },
  { name: 'Mer', sent: 28, conversions: 4 },
  { name: 'Gio', sent: 56, conversions: 7 },
  { name: 'Ven', sent: 89, conversions: 12 },
  { name: 'Sab', sent: 120, conversions: 18 },
  { name: 'Dom', sent: 95, conversions: 14 },
]

const offerTypes = [
  {
    type: 'high_popularity',
    name: 'Piatto Preferito',
    description: 'Sconto su piatti Star',
    discount: '10%',
    icon: '⭐',
  },
  {
    type: 'high_margin',
    name: 'Scelta dello Chef',
    description: 'Piatti ad alto margine',
    discount: '15%',
    icon: '👨‍🍳',
  },
  {
    type: 'test_new',
    name: 'Novità da Provare',
    description: 'Promuovi piatti Puzzle',
    discount: '20%',
    icon: '✨',
  },
]

const statusConfig = {
  active: { label: 'Attiva', color: 'green', icon: CheckCircleIcon },
  scheduled: { label: 'Programmata', color: 'blue', icon: ClockIcon },
  completed: { label: 'Completata', color: 'gray', icon: CheckCircleIcon },
  draft: { label: 'Bozza', color: 'amber', icon: ClockIcon },
}

function CampaignCard({ campaign }) {
  const status = statusConfig[campaign.status]
  const StatusIcon = status.icon
  const deliveryRate = campaign.messagesSent > 0 ? (campaign.delivered / campaign.messagesSent * 100).toFixed(0) : 0
  const readRate = campaign.delivered > 0 ? (campaign.read / campaign.delivered * 100).toFixed(0) : 0
  const conversionRate = campaign.read > 0 ? (campaign.conversions / campaign.read * 100).toFixed(1) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-hover p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <CalendarDaysIcon className="w-4 h-4" />
              {new Date(campaign.targetDate).toLocaleDateString('it-IT')}
            </span>
            <span className={`badge ${
              campaign.dayClassification === 'low' ? 'badge-danger' :
              campaign.dayClassification === 'medium' ? 'badge-warning' : 'badge-success'
            }`}>
              Affluenza {campaign.dayClassification}
            </span>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium
          ${status.color === 'green' ? 'bg-green-50 text-green-700' :
            status.color === 'blue' ? 'bg-blue-50 text-blue-700' :
            status.color === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-700'
          }`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </span>
      </div>

      {campaign.status !== 'scheduled' && campaign.status !== 'draft' && (
        <>
          <div className="mt-4 grid grid-cols-4 gap-3">
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-lg font-semibold text-gray-900">{campaign.messagesSent}</p>
              <p className="text-xs text-gray-500">Inviati</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-lg font-semibold text-gray-900">{deliveryRate}%</p>
              <p className="text-xs text-gray-500">Delivery</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-lg font-semibold text-gray-900">{readRate}%</p>
              <p className="text-xs text-gray-500">Lettura</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-primary-50">
              <p className="text-lg font-semibold text-primary-700">{conversionRate}%</p>
              <p className="text-xs text-primary-600">Conversione</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              <span className="text-sm text-gray-500">Ricavi generati</span>
              <p className="text-lg font-bold text-green-600">€{campaign.revenue}</p>
            </div>
            <button className="btn btn-secondary text-xs py-1.5 px-3 gap-1">
              <EyeIcon className="w-4 h-4" />
              Dettagli
            </button>
          </div>
        </>
      )}

      {(campaign.status === 'scheduled' || campaign.status === 'draft') && (
        <div className="mt-4 flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
          <button className="btn btn-secondary text-xs py-1.5 px-3">
            Modifica
          </button>
          {campaign.status === 'scheduled' && (
            <button className="btn btn-primary text-xs py-1.5 px-3 gap-1">
              <PaperAirplaneIcon className="w-4 h-4" />
              Invia Ora
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default function Marketing() {
  const [showNewCampaign, setShowNewCampaign] = useState(false)

  const totalSent = campaigns.reduce((sum, c) => sum + c.messagesSent, 0)
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0)
  const totalRevenue = campaigns.reduce((sum, c) => sum + c.revenue, 0)
  const avgConversionRate = totalSent > 0 ? (totalConversions / totalSent * 100).toFixed(1) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-title">Marketing</h1>
          <p className="section-subtitle">Gestisci le campagne promozionali automatizzate</p>
        </div>
        <button
          onClick={() => setShowNewCampaign(true)}
          className="btn btn-primary gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Nuova Campagna
        </button>
      </div>

      {/* AI Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-5 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Campagna Suggerita dall'AI</h3>
            <p className="text-sm text-white/90 mt-1">
              Domani è prevista bassa affluenza. Consigliamo una campagna promozionale
              sui piatti "Star" rivolta ai clienti fedeli e potenziali.
            </p>
          </div>
          <button className="btn bg-white text-primary-600 hover:bg-white/90">
            Crea Campagna
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600">
              <PaperAirplaneIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalSent}</p>
              <p className="text-sm text-gray-500">Messaggi Inviati</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-50 text-green-600">
              <ArrowTrendingUpIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avgConversionRate}%</p>
              <p className="text-sm text-gray-500">Conversione Media</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalConversions}</p>
              <p className="text-sm text-gray-500">Prenotazioni Generate</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">€{totalRevenue}</p>
              <p className="text-sm text-gray-500">Ricavi Generati</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Performance Settimanale</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="sent" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorSent)" name="Inviati" />
                <Area type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} fill="none" name="Conversioni" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Offer Types */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tipi di Offerta</h3>
          <div className="space-y-3">
            {offerTypes.map((offer) => (
              <div key={offer.type} className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{offer.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{offer.name}</p>
                    <p className="text-xs text-gray-500">{offer.description}</p>
                  </div>
                  <span className="badge badge-primary">{offer.discount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaigns List */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Campagne Recenti</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      </div>
    </div>
  )
}
