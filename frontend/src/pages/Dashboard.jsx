import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  UsersIcon,
  CurrencyEuroIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  SparklesIcon,
  ClockIcon,
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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

// Mock data
const stats = [
  {
    name: 'Coperti Oggi',
    value: '127',
    change: '+12%',
    changeType: 'increase',
    icon: UsersIcon,
    color: 'primary',
  },
  {
    name: 'Ricavi Oggi',
    value: '€4.450',
    change: '+8%',
    changeType: 'increase',
    icon: CurrencyEuroIcon,
    color: 'green',
  },
  {
    name: 'Prenotazioni',
    value: '24',
    change: '+5',
    changeType: 'increase',
    icon: CalendarDaysIcon,
    color: 'blue',
  },
  {
    name: 'Tasso Occupazione',
    value: '78%',
    change: '-3%',
    changeType: 'decrease',
    icon: ChartBarIcon,
    color: 'amber',
  },
]

const weeklyData = [
  { name: 'Lun', coperti: 85, ricavi: 2975 },
  { name: 'Mar', coperti: 72, ricavi: 2520 },
  { name: 'Mer', coperti: 98, ricavi: 3430 },
  { name: 'Gio', coperti: 105, ricavi: 3675 },
  { name: 'Ven', coperti: 145, ricavi: 5075 },
  { name: 'Sab', coperti: 168, ricavi: 5880 },
  { name: 'Dom', coperti: 127, ricavi: 4445 },
]

const menuEngineering = [
  { name: 'Star', value: 12, color: '#10b981' },
  { name: 'Plow Horse', value: 8, color: '#f59e0b' },
  { name: 'Puzzle', value: 6, color: '#6366f1' },
  { name: 'Dog', value: 4, color: '#ef4444' },
]

const todayPrediction = {
  expectedCovers: 142,
  classification: 'alta',
  confidence: 87,
  weather: 'Soleggiato, 18°C',
}

const upcomingReservations = [
  { time: '12:30', name: 'Famiglia Bianchi', guests: 4, status: 'confirmed' },
  { time: '13:00', name: 'Marco Verdi', guests: 2, status: 'confirmed' },
  { time: '19:30', name: 'Anna Russo', guests: 6, status: 'pending' },
  { time: '20:00', name: 'Gruppo Azienda XY', guests: 12, status: 'confirmed' },
  { time: '20:30', name: 'Luigi Neri', guests: 2, status: 'confirmed' },
]

const topDishes = [
  { name: 'Carbonara Tradizionale', sales: 45, trend: 'up' },
  { name: 'Tagliata di Manzo', sales: 38, trend: 'up' },
  { name: 'Tiramisù', sales: 32, trend: 'stable' },
  { name: 'Antipasto Misto', sales: 28, trend: 'down' },
]

function StatCard({ stat, index }) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
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
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
        <p className="text-sm text-gray-500 mt-1">{stat.name}</p>
      </div>
    </motion.div>
  )
}

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="section-title">Dashboard</h1>
        <p className="section-subtitle">Panoramica delle performance del tuo ristorante</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={stat.name} stat={stat} index={index} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900">Andamento Settimanale</h3>
              <p className="text-sm text-gray-500">Coperti e ricavi ultimi 7 giorni</p>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary-500" />
                Coperti
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-accent-500" />
                Ricavi
              </span>
            </div>
          </div>
          <div className="h-72">
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
          </div>
        </motion.div>

        {/* AI Prediction */}
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
              <p className="text-3xl font-bold text-primary-700 mt-1">{todayPrediction.expectedCovers}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-primary">Affluenza {todayPrediction.classification}</span>
                <span className="text-xs text-primary-600">{todayPrediction.confidence}% confidenza</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-sm text-gray-600 font-medium">Meteo</p>
              <p className="text-gray-900 mt-1">{todayPrediction.weather}</p>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">Consiglio</p>
              <p className="text-sm text-gray-700 mt-1">
                Alta affluenza prevista. Considera di rinforzare lo staff per il servizio serale.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Reservations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Prossime Prenotazioni</h3>
            <a href="/app/reservations" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Vedi tutte
            </a>
          </div>
          <div className="space-y-3">
            {upcomingReservations.map((res, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium">
                  {res.time}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{res.name}</p>
                  <p className="text-xs text-gray-500">{res.guests} persone</p>
                </div>
                <span className={`badge ${res.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`}>
                  {res.status === 'confirmed' ? 'Confermata' : 'In attesa'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Menu Engineering */}
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

        {/* Top Dishes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Piatti più Venduti</h3>
            <span className="text-sm text-gray-500">Oggi</span>
          </div>
          <div className="space-y-4">
            {topDishes.map((dish, index) => (
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
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
