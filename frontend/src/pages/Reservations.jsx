import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  UsersIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { format, addDays, isSameDay, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { it } from 'date-fns/locale'
import { reservationsApi } from '../services/api'

const statusConfig = {
  confirmed: {
    label: 'Confermata',
    icon: CheckCircleIcon,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  pending: {
    label: 'In attesa',
    icon: ExclamationCircleIcon,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  cancelled: {
    label: 'Cancellata',
    icon: XCircleIcon,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
  seated: {
    label: 'Al tavolo',
    icon: CheckCircleIcon,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  completed: {
    label: 'Completata',
    icon: CheckCircleIcon,
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
  },
}

function MiniCalendar({ selectedDate, onDateSelect }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
        <h3 className="font-semibold text-gray-900">
          {format(currentWeekStart, 'MMMM yyyy', { locale: it })}
        </h3>
        <button
          onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate)
          const isToday = isSameDay(day, new Date())

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(day)}
              className={`
                calendar-day
                ${isSelected ? 'selected' : ''}
                ${isToday && !isSelected ? 'today' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ReservationCard({ reservation, onConfirm, onCancel, onCheckIn }) {
  const status = statusConfig[reservation.status] || statusConfig.pending
  const StatusIcon = status.icon
  const [actionLoading, setActionLoading] = useState(null)

  const handleConfirm = async () => {
    setActionLoading('confirm')
    await onConfirm(reservation.confirmation_code)
    setActionLoading(null)
  }

  const handleCancel = async () => {
    setActionLoading('cancel')
    await onCancel(reservation.confirmation_code)
    setActionLoading(null)
  }

  const handleCheckIn = async () => {
    setActionLoading('checkin')
    await onCheckIn(reservation.confirmation_code)
    setActionLoading(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-hover p-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-50 text-primary-600 font-semibold text-sm">
            {reservation.time}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{reservation.customer_name}</h4>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <UsersIcon className="w-4 h-4" />
                {reservation.party_size}
              </span>
              {reservation.table && (
                <span>Tavolo {reservation.table}</span>
              )}
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${status.bgColor} ${status.textColor}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {reservation.confirmation_code}
        </div>
        <div className="flex gap-2">
          {reservation.status === 'pending' && (
            <>
              <button
                className="btn btn-secondary text-xs py-1.5 px-3"
                onClick={handleCancel}
                disabled={actionLoading === 'cancel'}
              >
                {actionLoading === 'cancel' ? '...' : 'Rifiuta'}
              </button>
              <button
                className="btn btn-primary text-xs py-1.5 px-3"
                onClick={handleConfirm}
                disabled={actionLoading === 'confirm'}
              >
                {actionLoading === 'confirm' ? '...' : 'Conferma'}
              </button>
            </>
          )}
          {reservation.status === 'confirmed' && (
            <button
              className="btn btn-primary text-xs py-1.5 px-3"
              onClick={handleCheckIn}
              disabled={actionLoading === 'checkin'}
            >
              {actionLoading === 'checkin' ? '...' : 'Check-in'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function CapacityCard({ capacity }) {
  if (!capacity) return null

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Capacita Giornaliera</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Tavoli Totali</span>
          <span className="font-semibold">{capacity.total_tables}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Capacita Totale</span>
          <span className="font-semibold">{capacity.total_capacity} posti</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Prenotati</span>
          <span className="font-semibold">{capacity.total_covers_reserved} coperti</span>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-gray-600">Disponibilita</span>
            <span className="font-semibold text-primary-600">{Math.round(capacity.availability_percentage)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full"
              style={{ width: `${100 - capacity.availability_percentage}%` }}
            />
          </div>
        </div>

        {capacity.lunch && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Pranzo</p>
            <div className="text-sm text-gray-600">
              {capacity.lunch.reservations} prenotazioni, {capacity.lunch.covers} coperti
            </div>
          </div>
        )}

        {capacity.dinner && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700 mb-2">Cena</p>
            <div className="text-sm text-gray-600">
              {capacity.dinner.reservations} prenotazioni, {capacity.dinner.covers} coperti
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-200" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-gray-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Reservations() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reservations, setReservations] = useState([])
  const [capacity, setCapacity] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [reservationsRes, capacityRes] = await Promise.allSettled([
        reservationsApi.getByDate(dateStr),
        reservationsApi.getDailyCapacity(dateStr),
      ])

      setReservations(reservationsRes.status === 'fulfilled' ? reservationsRes.value : [])
      setCapacity(capacityRes.status === 'fulfilled' ? capacityRes.value : null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [dateStr])

  const handleConfirm = async (confirmationCode) => {
    try {
      await reservationsApi.confirm(confirmationCode)
      fetchData()
    } catch (err) {
      console.error('Error confirming reservation:', err)
    }
  }

  const handleCancel = async (confirmationCode) => {
    try {
      await reservationsApi.cancel(confirmationCode)
      fetchData()
    } catch (err) {
      console.error('Error cancelling reservation:', err)
    }
  }

  const handleCheckIn = async (confirmationCode) => {
    try {
      await reservationsApi.checkIn(confirmationCode)
      fetchData()
    } catch (err) {
      console.error('Error checking in reservation:', err)
    }
  }

  // Filter reservations
  const filteredReservations = reservations.filter(r => {
    const matchesSearch = r.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.confirmation_code?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Compute stats
  const stats = {
    total: reservations.length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    pending: reservations.filter(r => r.status === 'pending').length,
    totalCovers: reservations.reduce((sum, r) => sum + (r.party_size || 0), 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-title">Prenotazioni</h1>
          <p className="section-subtitle">
            {format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn btn-secondary gap-2"
            onClick={fetchData}
            disabled={loading}
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
          <button className="btn btn-primary gap-2">
            <PlusIcon className="w-4 h-4" />
            Nuova Prenotazione
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          Errore: {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <MiniCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />
          <CapacityCard capacity={capacity} />
        </div>

        {/* Right Column - Reservations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Prenotazioni</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              <p className="text-sm text-gray-500">Confermate</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              <p className="text-sm text-gray-500">In attesa</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-2xl font-bold text-primary-600">{stats.totalCovers}</p>
              <p className="text-sm text-gray-500">Coperti</p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca prenotazione..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-10"
                />
              </div>
              <select
                className="input w-40"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tutte</option>
                <option value="confirmed">Confermate</option>
                <option value="pending">In attesa</option>
                <option value="seated">Al tavolo</option>
              </select>
            </div>
          </div>

          {/* Reservation List */}
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <div className="space-y-3">
              {filteredReservations.length === 0 ? (
                <div className="card p-12 text-center">
                  <CalendarDaysIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {reservations.length === 0
                      ? 'Nessuna prenotazione per questa data'
                      : 'Nessuna prenotazione corrisponde ai filtri'}
                  </p>
                </div>
              ) : (
                filteredReservations.map((reservation) => (
                  <ReservationCard
                    key={reservation.confirmation_code}
                    reservation={reservation}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    onCheckIn={handleCheckIn}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
