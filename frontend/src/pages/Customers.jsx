import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  UserPlusIcon,
  StarIcon,
  HeartIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CurrencyEuroIcon,
  CheckIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import { customersApi } from '../services/api'
import Modal from '../components/Modal'

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
  new: {
    label: 'Nuovo',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    icon: SparklesIcon,
  },
}

function SegmentBadge({ segment }) {
  const config = segmentConfig[segment] || segmentConfig.inactive
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  )
}

function CustomerCard({ customer }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-hover p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-semibold">
            {customer.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{customer.name}</h3>
            <p className="text-sm text-gray-500">{customer.phone}</p>
          </div>
        </div>
        {customer.segment_id && <SegmentBadge segment={customer.segment_type || 'inactive'} />}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500">ID</p>
          <p className="text-lg font-semibold text-gray-900">#{customer.id}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Segmento</p>
          <p className="text-lg font-semibold text-gray-900">{customer.segment_id || '-'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">CLV</p>
          <p className="text-lg font-semibold text-primary-600">€{customer.clv_score?.toFixed(0) || '0'}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {customer.whatsapp_number ? `WhatsApp: ${customer.whatsapp_number}` : 'No WhatsApp'}
        </span>
        <button className="btn btn-secondary text-xs py-1.5 px-3">
          Vedi Profilo
        </button>
      </div>
    </motion.div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="space-y-2">
              <div className="h-5 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, j) => (
              <div key={j}>
                <div className="h-3 w-12 bg-gray-100 rounded mb-1" />
                <div className="h-6 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const initialFormData = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  whatsapp_number: '',
  marketing_consent: false,
}

export default function Customers() {
  const [activeSegment, setActiveSegment] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [segmenting, setSegmenting] = useState(false)
  const [error, setError] = useState(null)
  const [customers, setCustomers] = useState([])
  const [segmentsSummary, setSegmentsSummary] = useState([])

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [formSuccess, setFormSuccess] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [customersRes, segmentsRes] = await Promise.allSettled([
        customersApi.list(),
        customersApi.getSegmentsSummary(),
      ])

      setCustomers(customersRes.status === 'fulfilled' ? customersRes.value : [])
      setSegmentsSummary(segmentsRes.status === 'fulfilled' ? segmentsRes.value : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const runSegmentation = async () => {
    setSegmenting(true)
    try {
      await customersApi.runSegmentation()
      await fetchData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSegmenting(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenModal = () => {
    setFormData(initialFormData)
    setFormError('')
    setFormSuccess(false)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setFormData(initialFormData)
    setFormError('')
    setFormSuccess(false)
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormLoading(true)

    // Validation
    if (!formData.first_name.trim()) {
      setFormError('Il nome è obbligatorio')
      setFormLoading(false)
      return
    }
    if (!formData.phone.trim()) {
      setFormError('Il numero di telefono è obbligatorio')
      setFormLoading(false)
      return
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFormError('Inserisci un\'email valida')
      setFormLoading(false)
      return
    }

    try {
      await customersApi.createCustomer(formData)
      setFormSuccess(true)

      // Refresh data after adding
      setTimeout(() => {
        handleCloseModal()
        fetchData()
      }, 1500)
    } catch (err) {
      setFormError(err.message || 'Errore nella creazione del cliente')
    } finally {
      setFormLoading(false)
    }
  }

  // Build segments from API data
  const segments = [
    { id: 'all', name: 'Tutti', count: customers.length, color: 'gray' },
    ...segmentsSummary.map(seg => ({
      id: seg.type,
      name: seg.segment,
      count: seg.customer_count,
      color: segmentConfig[seg.type]?.textColor || 'gray',
      icon: segmentConfig[seg.type]?.icon,
    })),
  ]

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const matchesSegment = activeSegment === 'all' ||
      (c.segment_id && segmentsSummary.find(s => s.type === activeSegment)?.segment === c.segment_id)
    const matchesSearch = c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch && (activeSegment === 'all' || matchesSegment)
  })

  // Stats
  const totalClv = customers.reduce((sum, c) => sum + (c.clv_score || 0), 0)
  const atRiskCount = segmentsSummary.find(s => s.type === 'at_risk')?.customer_count || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-title">Clienti</h1>
          <p className="section-subtitle">Gestisci la tua base clienti e segmentazione</p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn btn-secondary gap-2"
            onClick={runSegmentation}
            disabled={segmenting}
          >
            <ArrowPathIcon className={`w-4 h-4 ${segmenting ? 'animate-spin' : ''}`} />
            {segmenting ? 'Segmentazione...' : 'Aggiorna Segmenti'}
          </button>
          <button className="btn btn-primary gap-2" onClick={handleOpenModal}>
            <UserPlusIcon className="w-4 h-4" />
            Nuovo Cliente
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="btn btn-secondary text-xs">Riprova</button>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
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
              <p className="text-2xl font-bold text-gray-900">
                €{totalClv >= 1000 ? `${(totalClv/1000).toFixed(1)}k` : totalClv.toFixed(0)}
              </p>
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
              <p className="text-2xl font-bold text-gray-900">{segmentsSummary.length}</p>
              <p className="text-sm text-gray-500">Segmenti</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
              <ExclamationTriangleIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{atRiskCount}</p>
              <p className="text-sm text-gray-500">A Rischio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Segments Summary Cards */}
      {segmentsSummary.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {segmentsSummary.map(seg => {
            const config = segmentConfig[seg.type] || segmentConfig.inactive
            const Icon = config.icon
            return (
              <div key={seg.type} className={`card p-4 ${config.bgColor} border ${config.borderColor}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/60">
                    <Icon className={`w-5 h-5 ${config.textColor}`} />
                  </div>
                  <div>
                    <p className={`text-xl font-bold ${config.textColor}`}>{seg.customer_count}</p>
                    <p className="text-sm text-gray-600">{seg.segment}</p>
                  </div>
                </div>
                {seg.total_value > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Valore: €{seg.total_value.toFixed(0)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Search and Filter */}
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
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCustomers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      )}

      {!loading && filteredCustomers.length === 0 && (
        <div className="card p-12 text-center">
          <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {customers.length === 0
              ? 'Nessun cliente nel database. Aggiungi clienti tramite prenotazioni o manualmente.'
              : 'Nessun cliente trovato con i filtri selezionati'}
          </p>
        </div>
      )}

      {/* Create Customer Modal */}
      <Modal isOpen={showModal} onClose={handleCloseModal} title="Nuovo Cliente" size="md">
        {formSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Cliente aggiunto!</h3>
            <p className="text-gray-500 mt-2">Il cliente è stato inserito nel database</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleFormChange}
                  className="input"
                  placeholder="Mario"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleFormChange}
                  className="input"
                  placeholder="Rossi"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefono *</label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  className="input pl-10"
                  placeholder="+39 333 1234567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  className="input pl-10"
                  placeholder="mario@email.it"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input
                type="tel"
                name="whatsapp_number"
                value={formData.whatsapp_number}
                onChange={handleFormChange}
                className="input"
                placeholder="+39 333 1234567"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="marketing_consent"
                checked={formData.marketing_consent}
                onChange={handleFormChange}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Consenso per comunicazioni marketing</span>
            </label>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCloseModal}
                className="btn btn-secondary flex-1"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="btn btn-primary flex-1 gap-2"
              >
                {formLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="w-4 h-4" />
                    Aggiungi Cliente
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
