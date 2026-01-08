import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  CurrencyEuroIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { reservationsApi, predictionsApi, menuApi, customersApi } from '../services/api'

const classificationLabels = {
  low: 'bassa',
  medium: 'media',
  high: 'alta',
  very_high: 'molto alta',
}

const menuEngineeringColors = {
  star: '#10b981',
  plow_horse: '#f59e0b',
  puzzle: '#6366f1',
  dog: '#ef4444',
}

function StatCard({ stat, index, loading }) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="card p-6"
      >
        <div className="animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-gray-200" />
          <div className="mt-4 h-8 w-20 bg-gray-200 rounded" />
          <div className="mt-2 h-4 w-24 bg-gray-100 rounded" />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="card p-6"
    >
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${colorClasses[stat.color]}`}>
          <stat.icon className="w-5 h-5" />
        </div>
        {stat.change && (
          <span className={`
            inline-flex items-center gap-1 text-xs font-medium
            ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}
          `}>
            {stat.changeType === 'increase' ? (
              <ArrowUpIcon className="w-3 h-3" />
            ) : (
              <ArrowDownIcon className="w-3 h-3" />
            )}
            {stat.change}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
        <p className="text-sm text-gray-500 mt-1">{stat.name}</p>
      </div>
    </motion.div>
  )
}

function LoadingCard({ title }) {
  return (
    <div className="card p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-32 bg-gray-100 rounded" />
      </div>
    </div>
  )
}

function ErrorCard({ title, error, onRetry }) {
  return (
    <div className="card p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="text-center py-8">
        <ExclamationCircleIcon className="w-12 h-12 text-red-300 mx-auto" />
        <p className="text-gray-500 mt-2">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn btn-secondary mt-4 text-sm">
            Riprova
          </button>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState({
    reservations: [],
    capacity: null,
    predictions: [],
    menuAnalysis: null,
    segments: [],
  })

  const today = new Date().toISOString().split('T')[0]

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [
        reservationsRes,
        capacityRes,
        predictionsRes,
        menuAnalysisRes,
        segmentsRes,
      ] = await Promise.allSettled([
        reservationsApi.getByDate(today),
        reservationsApi.getDailyCapacity(today),
        predictionsApi.generate(today, 7, true),
        menuApi.analyze(null, null),
        customersApi.getSegmentsSummary(),
      ])

      setData({
        reservations: reservationsRes.status === 'fulfilled' ? reservationsRes.value : [],
        capacity: capacityRes.status === 'fulfilled' ? capacityRes.value : null,
        predictions: predictionsRes.status === 'fulfilled' ? predictionsRes.value : [],
        menuAnalysis: menuAnalysisRes.status === 'fulfilled' ? menuAnalysisRes.value : null,
        segments: segmentsRes.status === 'fulfilled' ? segmentsRes.value : [],
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Compute stats from API data
  const todayPrediction = data.predictions?.[0] || null
  const todayReservations = data.reservations || []
  const capacity = data.capacity

  const stats = [
    {
      name: 'Coperti Previsti',
      value: todayPrediction ? todayPrediction.predicted_covers : '-',
      change: todayPrediction ? `${Math.round(todayPrediction.confidence_score * 100)}% conf.` : null,
      changeType: 'increase',
      icon: UsersIcon,
      color: 'primary',
    },
    {
      name: 'Ricavi Previsti',
      value: todayPrediction ? `€${Math.round(todayPrediction.predicted_revenue).toLocaleString()}` : '-',
      icon: CurrencyEuroIcon,
      color: 'green',
    },
    {
      name: 'Prenotazioni Oggi',
      value: todayReservations.length,
      change: capacity ? `${capacity.total_covers_reserved} coperti` : null,
      changeType: 'increase',
      icon: CalendarDaysIcon,
      color: 'blue',
    },
    {
      name: 'Tasso Occupazione',
      value: capacity ? `${Math.round(100 - capacity.availability_percentage)}%` : '-',
      icon: ChartBarIcon,
      color: 'amber',
    },
  ]

  // Prepare weekly chart data from predictions
  const weeklyData = data.predictions?.slice(0, 7).map((p, i) => {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
    const date = new Date(p.date)
    return {
      name: dayNames[date.getDay()],
      coperti: p.predicted_covers,
      ricavi: Math.round(p.predicted_revenue),
    }
  }) || []

  // Menu Engineering data from analysis
  const menuEngineering = data.menuAnalysis?.engineering_results
    ? Object.entries(
        data.menuAnalysis.engineering_results.reduce((acc, item) => {
          const cls = item.classification.toLowerCase()
          acc[cls] = (acc[cls] || 0) + 1
          return acc
        }, {})
      ).map(([name, value]) => ({
        name: name === 'star' ? 'Star' :
              name === 'plow_horse' ? 'Plow Horse' :
              name === 'puzzle' ? 'Puzzle' : 'Dog',
        value,
        color: menuEngineeringColors[name] || '#94a3b8',
      }))
    : [
        { name: 'Star', value: 0, color: '#10b981' },
        { name: 'Plow Horse', value: 0, color: '#f59e0b' },
        { name: 'Puzzle', value: 0, color: '#6366f1' },
        { name: 'Dog', value: 0, color: '#ef4444' },
      ]

  // Top dishes from menu analysis
  const topDishes = data.menuAnalysis?.engineering_results
    ?.sort((a, b) => b.quantity_sold - a.quantity_sold)
    .slice(0, 4)
    .map((item, i) => ({
      name: item.name,
      sales: item.quantity_sold,
      trend: item.popularity_index > 1 ? 'up' : item.popularity_index < 0.8 ? 'down' : 'stable',
    })) || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">Panoramica delle performance del tuo ristorante</p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="btn btn-secondary text-sm"
        >
          {loading ? 'Caricamento...' : 'Aggiorna'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          Errore nel caricamento dei dati: {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={stat.name} stat={stat} index={index} loading={loading} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        {loading ? (
          <LoadingCard title="Andamento Settimanale" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-6 lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-gray-900">Previsioni Settimanali</h3>
                <p className="text-sm text-gray-500">Coperti previsti per i prossimi 7 giorni</p>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary-500" />
                  Coperti
                </span>
              </div>
            </div>
            <div className="h-72">
              {weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="colorCoperti" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="coperti"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCoperti)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Nessun dato disponibile
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* AI Prediction */}
        {loading ? (
          <LoadingCard title="Previsione AI" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Previsione AI</h3>
                <p className="text-sm text-gray-500">Per oggi</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-primary-50">
                <p className="text-sm text-primary-600 font-medium">Coperti Previsti</p>
                <p className="text-3xl font-bold text-primary-700 mt-1">
                  {todayPrediction?.predicted_covers || '-'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge badge-primary">
                    Affluenza {classificationLabels[todayPrediction?.day_classification] || '-'}
                  </span>
                  <span className="text-xs text-primary-600">
                    {todayPrediction ? `${Math.round(todayPrediction.confidence_score * 100)}% confidenza` : ''}
                  </span>
                </div>
              </div>

              {todayPrediction?.weather_impact && (
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-600 font-medium">Impatto Meteo</p>
                  <p className="text-gray-900 mt-1">
                    {todayPrediction.weather_impact > 0 ? '+' : ''}{Math.round(todayPrediction.weather_impact * 100)}%
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Range Previsto</p>
                <p className="text-sm text-gray-700 mt-1">
                  {todayPrediction
                    ? `${todayPrediction.covers_range.lower} - ${todayPrediction.covers_range.upper} coperti`
                    : 'Nessuna previsione disponibile'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Reservations */}
        {loading ? (
          <LoadingCard title="Prossime Prenotazioni" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Prenotazioni Oggi</h3>
              <a href="/app/reservations" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Vedi tutte
              </a>
            </div>
            <div className="space-y-3">
              {todayReservations.length > 0 ? (
                todayReservations.slice(0, 5).map((res, index) => (
                  <div
                    key={res.confirmation_code || index}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium">
                      {res.time}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{res.customer_name}</p>
                      <p className="text-xs text-gray-500">{res.party_size} persone</p>
                    </div>
                    <span className={`badge ${res.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`}>
                      {res.status === 'confirmed' ? 'Confermata' :
                       res.status === 'seated' ? 'Accolto' :
                       res.status === 'pending' ? 'In attesa' : res.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Nessuna prenotazione per oggi
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Menu Engineering */}
        {loading ? (
          <LoadingCard title="Menu Engineering" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Menu Engineering</h3>
              <a href="/app/menu" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Analisi completa
              </a>
            </div>
            <div className="flex items-center justify-center h-48">
              {menuEngineering.some(m => m.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={menuEngineering}
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {menuEngineering.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-400 text-sm text-center">
                  Esegui un'analisi del menu<br/>per visualizzare i dati
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {menuEngineering.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600">{item.name}</span>
                  <span className="text-sm font-medium text-gray-900 ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Top Dishes */}
        {loading ? (
          <LoadingCard title="Piatti più Venduti" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Piatti più Venduti</h3>
              <span className="text-sm text-gray-500">Periodo analisi</span>
            </div>
            <div className="space-y-4">
              {topDishes.length > 0 ? (
                topDishes.map((dish, index) => (
                  <div key={dish.name} className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{dish.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{dish.sales}</span>
                      {dish.trend === 'up' && <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />}
                      {dish.trend === 'down' && <ArrowTrendingUpIcon className="w-4 h-4 text-red-500 rotate-180" />}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Nessun dato disponibile
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
