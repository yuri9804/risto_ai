import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  UserPlusIcon,
  StarIcon,
  HeartIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  CurrencyEuroIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'

const segments = [
  { id: 'all', name: 'Tutti', count: 1245, color: 'gray' },
  { id: 'vip', name: 'VIP', count: 48, color: 'yellow', icon: StarIcon },
  { id: 'loyal', name: 'Fedeli', count: 186, color: 'green', icon: HeartIcon },
  { id: 'potential', name: 'Potenziali', count: 312, color: 'blue', icon: SparklesIcon },
  { id: 'at_risk', name: 'A Rischio', count: 89, color: 'red', icon: ExclamationTriangleIcon },
  { id: 'inactive', name: 'Inattivi', count: 234, color: 'gray', icon: UserIcon },
]

const customers = [
  {
    id: 1,
    name: 'Marco Bianchi',
    email: 'marco.bianchi@email.com',
    phone: '+39 333 1234567',
    segment: 'vip',
    totalVisits: 45,
    totalSpend: 2850,
    avgSpend: 63.33,
    lastVisit: '2024-01-05',
    clvScore: 4200,
    loyaltyScore: 92,
    favoriteItems: ['Carbonara', 'Tiramisù'],
  },
  {
    id: 2,
    name: 'Anna Verdi',
    email: 'anna.verdi@email.com',
    phone: '+39 339 9876543',
    segment: 'loyal',
    totalVisits: 28,
    totalSpend: 1680,
    avgSpend: 60.00,
    lastVisit: '2024-01-03',
    clvScore: 2400,
    loyaltyScore: 78,
    favoriteItems: ['Risotto ai Funghi', 'Tagliata'],
  },
  {
    id: 3,
    name: 'Luigi Rossi',
    email: 'luigi.rossi@email.com',
    phone: '+39 347 5555555',
    segment: 'potential',
    totalVisits: 8,
    totalSpend: 520,
    avgSpend: 65.00,
    lastVisit: '2024-01-02',
    clvScore: 1200,
    loyaltyScore: 55,
    favoriteItems: ['Antipasto Misto'],
  },
  {
    id: 4,
    name: 'Carla Neri',
    email: 'carla.neri@email.com',
    phone: '+39 320 1111111',
    segment: 'at_risk',
    totalVisits: 15,
    totalSpend: 890,
    avgSpend: 59.33,
    lastVisit: '2023-11-15',
    clvScore: 800,
    loyaltyScore: 35,
    favoriteItems: ['Pizza Margherita'],
  },
  {
    id: 5,
    name: 'Giuseppe Gialli',
    email: 'giuseppe.g@email.com',
    phone: '+39 328 2222222',
    segment: 'inactive',
    totalVisits: 3,
    totalSpend: 150,
    avgSpend: 50.00,
    lastVisit: '2023-08-20',
    clvScore: 200,
    loyaltyScore: 15,
    favoriteItems: [],
  },
]

const segmentConfig = {
  vip: {
    label: 'VIP',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
    icon: StarIcon,
  },
  loyal: {
    label: 'Fedele',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    icon: HeartIcon,
  },
  potential: {
    label: 'Potenziale',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    icon: SparklesIcon,
  },
  at_risk: {
    label: 'A Rischio',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: ExclamationTriangleIcon,
  },
  inactive: {
    label: 'Inattivo',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    icon: UserIcon,
  },
}

function SegmentBadge({ segment }) {
  const config = segmentConfig[segment]
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  )
}

function CustomerCard({ customer }) {
  const config = segmentConfig[customer.segment]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-hover p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-semibold">
            {customer.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{customer.name}</h3>
            <p className="text-sm text-gray-500">{customer.email}</p>
          </div>
        </div>
        <SegmentBadge segment={customer.segment} />
      </div>

      <div className="mt-5 grid grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-gray-500">Visite</p>
          <p className="text-lg font-semibold text-gray-900">{customer.totalVisits}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Totale Speso</p>
          <p className="text-lg font-semibold text-gray-900">€{customer.totalSpend}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Media</p>
          <p className="text-lg font-semibold text-gray-900">€{customer.avgSpend.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">CLV</p>
          <p className="text-lg font-semibold text-primary-600">€{customer.clvScore}</p>
        </div>
      </div>

      {/* Loyalty Score Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">Fedeltà</span>
          <span className="font-medium text-gray-700">{customer.loyaltyScore}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              customer.loyaltyScore >= 70 ? 'bg-green-500' :
              customer.loyaltyScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${customer.loyaltyScore}%` }}
          />
        </div>
      </div>

      {customer.favoriteItems.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-2">Piatti preferiti</p>
          <div className="flex flex-wrap gap-1.5">
            {customer.favoriteItems.map((item, i) => (
              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Ultima visita: {new Date(customer.lastVisit).toLocaleDateString('it-IT')}
        </span>
        <button className="btn btn-secondary text-xs py-1.5 px-3">
          Vedi Profilo
        </button>
      </div>
    </motion.div>
  )
}

export default function Customers() {
  const [activeSegment, setActiveSegment] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCustomers = customers.filter(c => {
    const matchesSegment = activeSegment === 'all' || c.segment === activeSegment
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.email.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSegment && matchesSearch
  })

  const totalClv = customers.reduce((sum, c) => sum + c.clvScore, 0)
  const avgLoyalty = Math.round(customers.reduce((sum, c) => sum + c.loyaltyScore, 0) / customers.length)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-title">Clienti</h1>
          <p className="section-subtitle">Gestisci la tua base clienti e segmentazione</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary gap-2">
            <ArrowPathIcon className="w-4 h-4" />
            Aggiorna Segmenti
          </button>
          <button className="btn btn-primary gap-2">
            <UserPlusIcon className="w-4 h-4" />
            Nuovo Cliente
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">1,245</p>
              <p className="text-sm text-gray-500">Clienti Totali</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-50 text-green-600">
              <CurrencyEuroIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">€{(totalClv/1000).toFixed(0)}k</p>
              <p className="text-sm text-gray-500">CLV Totale</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <HeartIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avgLoyalty}%</p>
              <p className="text-sm text-gray-500">Fedeltà Media</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
              <ExclamationTriangleIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">89</p>
              <p className="text-sm text-gray-500">A Rischio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Segment Tabs */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca clienti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Segment Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {segments.map((seg) => {
              const Icon = seg.icon
              return (
                <button
                  key={seg.id}
                  onClick={() => setActiveSegment(seg.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                    ${activeSegment === seg.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {seg.name}
                  <span className={`
                    px-1.5 py-0.5 rounded-md text-xs
                    ${activeSegment === seg.id
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {seg.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredCustomers.map((customer) => (
          <CustomerCard key={customer.id} customer={customer} />
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="card p-12 text-center">
          <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nessun cliente trovato</p>
        </div>
      )}
    </div>
  )
}
