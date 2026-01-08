import { useState, useEffect } from 'react'
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
  EyeIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
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
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { marketingApi } from '../services/api'

const statusConfig = {
  active: { label: 'Attiva', color: 'green', icon: CheckCircleIcon },
  scheduled: { label: 'Programmata', color: 'blue', icon: ClockIcon },
  completed: { label: 'Completata', color: 'gray', icon: CheckCircleIcon },
  draft: { label: 'Bozza', color: 'amber', icon: ClockIcon },
  cancelled: { label: 'Cancellata', color: 'red', icon: XCircleIcon },
}

const offerTypes = [
  { type: 'high_popularity', name: 'Piatto Preferito', description: 'Sconto su piatti Star', discount: '10%', icon: '' },
  { type: 'high_margin', name: 'Scelta dello Chef', description: 'Piatti ad alto margine', discount: '15%', icon: '' },
  { type: 'test_new', name: 'Novità da Provare', description: 'Promuovi piatti Puzzle', discount: '20%', icon: '' },
]

function CampaignCard({ campaign, onExecute }) {
  const status = statusConfig[campaign.status] || statusConfig.draft
  const StatusIcon = status.icon
  const [executing, setExecuting] = useState(false)

  const deliveryRate = campaign.messages_sent > 0 && campaign.messages_delivered
    ? (campaign.messages_delivered / campaign.messages_sent * 100).toFixed(0) : 0
  const conversionRate = campaign.messages_sent > 0 && campaign.reservations_made
    ? (campaign.reservations_made / campaign.messages_sent * 100).toFixed(1) : 0

  const handleExecute = async () => {
    setExecuting(true)
    try {
      await onExecute(campaign.id)
    } finally {
      setExecuting(false)
    }
  }

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
              {campaign.target_date ? format(new Date(campaign.target_date), 'd MMM yyyy', { locale: it }) : 'N/A'}
            </span>
            {campaign.day_classification && (
              <span className={`badge ${
                campaign.day_classification === 'low' ? 'badge-danger' :
                campaign.day_classification === 'medium' ? 'badge-warning' : 'badge-success'
              }`}>
                {campaign.day_classification}
              </span>
            )}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium
          ${status.color === 'green' ? 'bg-green-50 text-green-700' :
            status.color === 'blue' ? 'bg-blue-50 text-blue-700' :
            status.color === 'amber' ? 'bg-amber-50 text-amber-700' :
            status.color === 'red' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
          }`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </span>
      </div>

      {campaign.status !== 'scheduled' && campaign.status !== 'draft' && campaign.messages_sent > 0 && (
        <>
          <div className="mt-4 grid grid-cols-4 gap-3">
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-lg font-semibold text-gray-900">{campaign.messages_sent}</p>
              <p className="text-xs text-gray-500">Inviati</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-lg font-semibold text-gray-900">{deliveryRate}%</p>
              <p className="text-xs text-gray-500">Delivery</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-lg font-semibold text-gray-900">{campaign.reservations_made || 0}</p>
              <p className="text-xs text-gray-500">Prenotazioni</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-primary-50">
              <p className="text-lg font-semibold text-primary-700">{conversionRate}%</p>
              <p className="text-xs text-primary-600">Conversione</p>
            </div>
          </div>

          {campaign.revenue_generated > 0 && (
            <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
              <div>
                <span className="text-sm text-gray-500">Ricavi generati</span>
                <p className="text-lg font-bold text-green-600">€{campaign.revenue_generated.toFixed(0)}</p>
              </div>
              <button className="btn btn-secondary text-xs py-1.5 px-3 gap-1">
                <EyeIcon className="w-4 h-4" />
                Dettagli
              </button>
            </div>
          )}
        </>
      )}

      {(campaign.status === 'scheduled' || campaign.status === 'draft') && (
        <div className="mt-4 flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
          <button className="btn btn-secondary text-xs py-1.5 px-3">
            Modifica
          </button>
          <button
            className="btn btn-primary text-xs py-1.5 px-3 gap-1"
            onClick={handleExecute}
            disabled={executing}
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            {executing ? 'Invio...' : 'Esegui'}
          </button>
        </div>
      )}
    </motion.div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-5 w-40 bg-gray-200 rounded" />
              <div className="h-4 w-28 bg-gray-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-gray-200 rounded-lg" />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="p-2 rounded-lg bg-gray-50">
                <div className="h-5 w-8 bg-gray-200 rounded mx-auto mb-1" />
                <div className="h-3 w-12 bg-gray-100 rounded mx-auto" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Marketing() {
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchCampaigns = async () => {
    setLoading(true)
    setError(null)
    try {
      const status = statusFilter !== 'all' ? statusFilter : null
      const data = await marketingApi.listCampaigns(status, 50)
      setCampaigns(data || [])
    } catch (err) {
      setError(err.message)
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteCampaign = async (campaignId) => {
    try {
      await marketingApi.executeCampaign(campaignId)
      fetchCampaigns()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCreateCampaign = async () => {
    setCreating(true)
    try {
      const today = new Date()
      const targetDate = new Date(today.setDate(today.getDate() + 3)).toISOString().split('T')[0]
      await marketingApi.createCampaign(targetDate, `Campagna ${format(new Date(), 'd MMM', { locale: it })}`)
      fetchCampaigns()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [statusFilter])

  // Stats
  const totalSent = campaigns.reduce((sum, c) => sum + (c.messages_sent || 0), 0)
  const totalConversions = campaigns.reduce((sum, c) => sum + (c.reservations_made || 0), 0)
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.revenue_generated || 0), 0)
  const avgConversionRate = totalSent > 0 ? (totalConversions / totalSent * 100).toFixed(1) : 0

  // Chart data
  const performanceData = campaigns.slice(0, 7).reverse().map(c => ({
    name: c.target_date ? format(new Date(c.target_date), 'd/M', { locale: it }) : '-',
    sent: c.messages_sent || 0,
    conversions: c.reservations_made || 0,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-title">Marketing</h1>
          <p className="section-subtitle">Gestisci le campagne promozionali automatizzate</p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn btn-secondary gap-2"
            onClick={fetchCampaigns}
            disabled={loading}
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
          <button
            onClick={handleCreateCampaign}
            disabled={creating}
            className="btn btn-primary gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            {creating ? 'Creazione...' : 'Nuova Campagna'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchCampaigns} className="btn btn-secondary text-xs">Riprova</button>
        </div>
      )}

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
              L'AI analizza i giorni di bassa affluenza e suggerisce campagne mirate
              per aumentare le prenotazioni nei momenti meno affollati.
            </p>
          </div>
          <button
            className="btn bg-white text-primary-600 hover:bg-white/90"
            onClick={handleCreateCampaign}
            disabled={creating}
          >
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
              <p className="text-2xl font-bold text-green-600">€{totalRevenue.toFixed(0)}</p>
              <p className="text-sm text-gray-500">Ricavi Generati</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Performance Campagne</h3>
          <div className="h-64">
            {performanceData.length > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Nessun dato disponibile
              </div>
            )}
          </div>
        </div>

        {/* Offer Types */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tipi di Offerta</h3>
          <div className="space-y-3">
            {offerTypes.map((offer) => (
              <div key={offer.type} className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
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

      {/* Filter */}
      <div className="card p-4">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { id: 'all', name: 'Tutte' },
            { id: 'draft', name: 'Bozze' },
            { id: 'scheduled', name: 'Programmate' },
            { id: 'active', name: 'Attive' },
            { id: 'completed', name: 'Completate' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === filter.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.name}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns List */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Campagne</h3>
        {loading ? (
          <LoadingSkeleton />
        ) : campaigns.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onExecute={handleExecuteCampaign}
              />
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <PaperAirplaneIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nessuna campagna trovata. Crea la tua prima campagna marketing!</p>
          </div>
        )}
      </div>
    </div>
  )
}
