import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  UsersIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { format, addDays, subDays, isSameDay, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { it } from 'date-fns/locale'

const timeSlots = [
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
]

const tables = [
  { id: 1, number: '1', capacity: 2, status: 'available' },
  { id: 2, number: '2', capacity: 4, status: 'reserved' },
  { id: 3, number: '3', capacity: 4, status: 'occupied' },
  { id: 4, number: '4', capacity: 6, status: 'available' },
  { id: 5, number: '5', capacity: 2, status: 'reserved' },
  { id: 6, number: '6', capacity: 8, status: 'available' },
]

const reservations = [
  {
    id: 1,
    confirmationCode: 'RST12345',
    customerName: 'Marco Bianchi',
    customerPhone: '+39 333 1234567',
    date: new Date(),
    time: '12:30',
    partySize: 4,
    tableNumber: '2',
    status: 'confirmed',
    specialRequests: 'Tavolo vicino alla finestra',
    source: 'whatsapp',
  },
  {
    id: 2,
    confirmationCode: 'RST12346',
    customerName: 'Anna Verdi',
    customerPhone: '+39 339 9876543',
    date: new Date(),
    time: '13:00',
    partySize: 2,
    tableNumber: '5',
    status: 'confirmed',
    source: 'website',
  },
  {
    id: 3,
    confirmationCode: 'RST12347',
    customerName: 'Famiglia Rossi',
    customerPhone: '+39 347 5555555',
    date: new Date(),
    time: '19:30',
    partySize: 6,
    tableNumber: null,
    status: 'pending',
    source: 'phone',
  },
  {
    id: 4,
    confirmationCode: 'RST12348',
    customerName: 'Luigi Neri',
    customerPhone: '+39 320 1111111',
    date: new Date(),
    time: '20:00',
    partySize: 2,
    status: 'confirmed',
    tableNumber: '1',
    source: 'whatsapp',
  },
  {
    id: 5,
    confirmationCode: 'RST12349',
    customerName: 'Gruppo Azienda XY',
    customerPhone: '+39 02 12345678',
    date: new Date(),
    time: '20:30',
    partySize: 12,
    status: 'confirmed',
    tableNumber: '6',
    occasion: 'Cena aziendale',
    source: 'phone',
  },
]

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

function ReservationCard({ reservation }) {
  const status = statusConfig[reservation.status]
  const StatusIcon = status.icon

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
            <h4 className="font-semibold text-gray-900">{reservation.customerName}</h4>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <UsersIcon className="w-4 h-4" />
                {reservation.partySize}
              </span>
              {reservation.tableNumber && (
                <span>Tavolo {reservation.tableNumber}</span>
              )}
            </div>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${status.bgColor} ${status.textColor}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </span>
      </div>

      {(reservation.specialRequests || reservation.occasion) && (
        <div className="mt-3 p-2.5 rounded-lg bg-gray-50 text-sm text-gray-600">
          {reservation.occasion && <p className="font-medium">{reservation.occasion}</p>}
          {reservation.specialRequests && <p>{reservation.specialRequests}</p>}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <PhoneIcon className="w-4 h-4" />
          {reservation.customerPhone}
        </div>
        <div className="flex gap-2">
          {reservation.status === 'pending' && (
            <>
              <button className="btn btn-secondary text-xs py-1.5 px-3">
                Rifiuta
              </button>
              <button className="btn btn-primary text-xs py-1.5 px-3">
                Conferma
              </button>
            </>
          )}
          {reservation.status === 'confirmed' && (
            <button className="btn btn-primary text-xs py-1.5 px-3">
              Check-in
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function TableMap() {
  return (
    <div className="card p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Mappa Tavoli</h3>
      <div className="grid grid-cols-3 gap-4">
        {tables.map((table) => {
          const statusColors = {
            available: 'bg-green-100 border-green-300 text-green-700',
            reserved: 'bg-amber-100 border-amber-300 text-amber-700',
            occupied: 'bg-red-100 border-red-300 text-red-700',
          }

          return (
            <button
              key={table.id}
              className={`
                p-4 rounded-xl border-2 text-center transition-all hover:shadow-md
                ${statusColors[table.status]}
              `}
            >
              <p className="text-lg font-bold">{table.number}</p>
              <p className="text-xs mt-1">{table.capacity} posti</p>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-100">
        <span className="flex items-center gap-2 text-sm text-gray-600">
          <span className="w-3 h-3 rounded-full bg-green-400" />
          Disponibile
        </span>
        <span className="flex items-center gap-2 text-sm text-gray-600">
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          Prenotato
        </span>
        <span className="flex items-center gap-2 text-sm text-gray-600">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          Occupato
        </span>
      </div>
    </div>
  )
}

export default function Reservations() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState('list') // 'list' or 'timeline'

  const todayReservations = reservations.filter(r =>
    isSameDay(r.date, selectedDate)
  )

  const stats = {
    total: todayReservations.length,
    confirmed: todayReservations.filter(r => r.status === 'confirmed').length,
    pending: todayReservations.filter(r => r.status === 'pending').length,
    totalCovers: todayReservations.reduce((sum, r) => sum + r.partySize, 0),
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
        <button className="btn btn-primary gap-2">
          <PlusIcon className="w-4 h-4" />
          Nuova Prenotazione
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <MiniCalendar selectedDate={selectedDate} onDateSelect={setSelectedDate} />
          <TableMap />
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
                  className="input pl-10"
                />
              </div>
              <select className="input w-40">
                <option value="all">Tutte</option>
                <option value="confirmed">Confermate</option>
                <option value="pending">In attesa</option>
              </select>
            </div>
          </div>

          {/* Reservation List */}
          <div className="space-y-3">
            {todayReservations.length === 0 ? (
              <div className="card p-12 text-center">
                <CalendarDaysIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nessuna prenotazione per questa data</p>
              </div>
            ) : (
              todayReservations.map((reservation) => (
                <ReservationCard key={reservation.id} reservation={reservation} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
