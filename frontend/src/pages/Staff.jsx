import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserGroupIcon,
  ClockIcon,
  CalendarDaysIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { it } from 'date-fns/locale'

const staff = [
  { id: 1, name: 'Marco Rossi', role: 'Chef', phone: '+39 333 1111111', email: 'marco@email.com', hourlyRate: 18, color: '#8b5cf6' },
  { id: 2, name: 'Laura Bianchi', role: 'Sous Chef', phone: '+39 333 2222222', email: 'laura@email.com', hourlyRate: 15, color: '#10b981' },
  { id: 3, name: 'Giuseppe Verdi', role: 'Cameriere', phone: '+39 333 3333333', email: 'giuseppe@email.com', hourlyRate: 12, color: '#f59e0b' },
  { id: 4, name: 'Anna Neri', role: 'Cameriera', phone: '+39 333 4444444', email: 'anna@email.com', hourlyRate: 12, color: '#ef4444' },
  { id: 5, name: 'Paolo Gialli', role: 'Barista', phone: '+39 333 5555555', email: 'paolo@email.com', hourlyRate: 11, color: '#06b6d4' },
  { id: 6, name: 'Sofia Blu', role: 'Cameriera', phone: '+39 333 6666666', email: 'sofia@email.com', hourlyRate: 12, color: '#ec4899' },
]

const shifts = [
  { staffId: 1, day: 0, start: '10:00', end: '15:00', type: 'pranzo' },
  { staffId: 1, day: 0, start: '18:00', end: '23:00', type: 'cena' },
  { staffId: 2, day: 0, start: '10:00', end: '15:00', type: 'pranzo' },
  { staffId: 3, day: 0, start: '11:30', end: '15:30', type: 'pranzo' },
  { staffId: 3, day: 0, start: '18:30', end: '23:30', type: 'cena' },
  { staffId: 4, day: 0, start: '18:30', end: '23:30', type: 'cena' },
  { staffId: 5, day: 0, start: '11:00', end: '15:00', type: 'pranzo' },
  { staffId: 5, day: 0, start: '18:00', end: '23:00', type: 'cena' },
  // More shifts for other days
  { staffId: 1, day: 1, start: '10:00', end: '15:00', type: 'pranzo' },
  { staffId: 2, day: 1, start: '18:00', end: '23:00', type: 'cena' },
  { staffId: 3, day: 1, start: '11:30', end: '15:30', type: 'pranzo' },
  { staffId: 4, day: 1, start: '18:30', end: '23:30', type: 'cena' },
  { staffId: 6, day: 1, start: '18:30', end: '23:30', type: 'cena' },
  // Day 2
  { staffId: 1, day: 2, start: '10:00', end: '23:00', type: 'full' },
  { staffId: 3, day: 2, start: '11:30', end: '23:30', type: 'full' },
  { staffId: 5, day: 2, start: '11:00', end: '23:00', type: 'full' },
  // Day 3 - busy day
  { staffId: 1, day: 3, start: '10:00', end: '23:00', type: 'full' },
  { staffId: 2, day: 3, start: '10:00', end: '23:00', type: 'full' },
  { staffId: 3, day: 3, start: '11:30', end: '23:30', type: 'full' },
  { staffId: 4, day: 3, start: '11:30', end: '23:30', type: 'full' },
  { staffId: 5, day: 3, start: '11:00', end: '23:00', type: 'full' },
  { staffId: 6, day: 3, start: '18:30', end: '23:30', type: 'cena' },
]

const dayPredictions = [
  { day: 0, classification: 'medium', expectedCovers: 95 },
  { day: 1, classification: 'low', expectedCovers: 72 },
  { day: 2, classification: 'medium', expectedCovers: 88 },
  { day: 3, classification: 'high', expectedCovers: 135 },
  { day: 4, classification: 'very_high', expectedCovers: 168 },
  { day: 5, classification: 'high', expectedCovers: 155 },
  { day: 6, classification: 'medium', expectedCovers: 110 },
]

const classificationColors = {
  low: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-green-100 text-green-700 border-green-200',
  very_high: 'bg-primary-100 text-primary-700 border-primary-200',
}

function StaffCard({ member }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-hover p-4"
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
          style={{ backgroundColor: member.color }}
        >
          {member.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{member.name}</h3>
          <p className="text-sm text-gray-500">{member.role}</p>
        </div>
        <span className="text-sm font-medium text-gray-700">€{member.hourlyRate}/h</span>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <PhoneIcon className="w-4 h-4" />
          {member.phone}
        </span>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
        <button className="btn btn-secondary text-xs py-1.5 px-3">
          Modifica Turni
        </button>
      </div>
    </motion.div>
  )
}

function ScheduleGrid({ weekStart }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-8 border-b border-gray-200">
        <div className="p-4 bg-gray-50 border-r border-gray-200">
          <span className="text-sm font-medium text-gray-700">Staff</span>
        </div>
        {days.map((day, i) => {
          const prediction = dayPredictions[i]
          return (
            <div key={i} className="p-3 bg-gray-50 border-r border-gray-200 last:border-r-0 text-center">
              <p className="text-xs text-gray-500 uppercase">
                {format(day, 'EEE', { locale: it })}
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {format(day, 'd')}
              </p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${classificationColors[prediction.classification]}`}>
                {prediction.expectedCovers}
              </span>
            </div>
          )
        })}
      </div>

      {/* Staff Rows */}
      {staff.map((member) => (
        <div key={member.id} className="grid grid-cols-8 border-b border-gray-100 last:border-b-0">
          <div className="p-3 border-r border-gray-100 flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: member.color }}
            >
              {member.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{member.name.split(' ')[0]}</p>
              <p className="text-xs text-gray-500">{member.role}</p>
            </div>
          </div>
          {days.map((day, dayIndex) => {
            const dayShifts = shifts.filter(s => s.staffId === member.id && s.day === dayIndex)
            return (
              <div key={dayIndex} className="p-2 border-r border-gray-100 last:border-r-0 min-h-[80px]">
                {dayShifts.map((shift, i) => (
                  <div
                    key={i}
                    className="mb-1 px-2 py-1 rounded text-xs font-medium text-white"
                    style={{ backgroundColor: member.color }}
                  >
                    {shift.start}-{shift.end}
                  </div>
                ))}
                {dayShifts.length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-xs text-gray-300">—</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default function Staff() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [view, setView] = useState('schedule') // 'schedule' or 'list'

  const totalHoursThisWeek = shifts.reduce((sum, shift) => {
    const [startH] = shift.start.split(':').map(Number)
    const [endH] = shift.end.split(':').map(Number)
    return sum + (endH - startH)
  }, 0)

  const estimatedCost = staff.reduce((sum, member) => {
    const memberShifts = shifts.filter(s => s.staffId === member.id)
    const hours = memberShifts.reduce((h, shift) => {
      const [startH] = shift.start.split(':').map(Number)
      const [endH] = shift.end.split(':').map(Number)
      return h + (endH - startH)
    }, 0)
    return sum + (hours * member.hourlyRate)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-title">Gestione Staff</h1>
          <p className="section-subtitle">Pianifica i turni in base alle previsioni AI</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary gap-2">
            <SparklesIcon className="w-4 h-4" />
            Ottimizza con AI
          </button>
          <button className="btn btn-primary gap-2">
            <PlusIcon className="w-4 h-4" />
            Nuovo Dipendente
          </button>
        </div>
      </div>

      {/* AI Suggestion Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white"
      >
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white/20 rounded-xl">
            <SparklesIcon className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Suggerimento AI - Ottimizzazione Turni</h3>
            <p className="text-sm text-white/90 mt-1">
              Giovedì e Venerdì previsioni di alta affluenza. Consigliamo di aggiungere 1 cameriere extra per il servizio serale.
              Risparmio stimato con ottimizzazione: €180/settimana.
            </p>
          </div>
          <button className="btn bg-white text-primary-600 hover:bg-white/90 text-sm">
            Applica Suggerimenti
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600">
              <UserGroupIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{staff.length}</p>
              <p className="text-sm text-gray-500">Dipendenti</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-50 text-green-600">
              <ClockIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalHoursThisWeek}h</p>
              <p className="text-sm text-gray-500">Ore Settimana</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <CalendarDaysIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{shifts.length}</p>
              <p className="text-sm text-gray-500">Turni Pianificati</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <CheckCircleIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">€{estimatedCost.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Costo Stimato</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle & Week Navigation */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView('schedule')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === 'schedule'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Calendario
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Lista Staff
            </button>
          </div>

          {view === 'schedule' && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setWeekStart(subWeeks(weekStart, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-sm font-medium text-gray-900">
                {format(weekStart, 'd MMM', { locale: it })} - {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: it })}
              </span>
              <button
                onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {view === 'schedule' ? (
        <ScheduleGrid weekStart={weekStart} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {staff.map((member) => (
            <StaffCard key={member.id} member={member} />
          ))}
        </div>
      )}

      {/* Legend */}
      {view === 'schedule' && (
        <div className="card p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Legenda Previsioni</p>
          <div className="flex flex-wrap gap-4">
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              Bassa Affluenza
            </span>
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              Media Affluenza
            </span>
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-green-400" />
              Alta Affluenza
            </span>
            <span className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-primary-400" />
              Molto Alta Affluenza
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
