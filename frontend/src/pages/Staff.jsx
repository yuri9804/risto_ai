import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserGroupIcon,
  ClockIcon,
  CalendarDaysIcon,
  SparklesIcon,
  CheckCircleIcon,
  PhoneIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import { it } from 'date-fns/locale'
import { staffApi, predictionsApi } from '../services/api'

const classificationColors = {
  low: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-green-100 text-green-700 border-green-200',
  very_high: 'bg-primary-100 text-primary-700 border-primary-200',
}

const roleColors = {
  chef: '#8b5cf6',
  sous_chef: '#10b981',
  waiter: '#f59e0b',
  waitress: '#ef4444',
  barista: '#06b6d4',
  host: '#ec4899',
  dishwasher: '#6b7280',
  manager: '#3b82f6',
}

function StaffCard({ member }) {
  const color = roleColors[member.role?.toLowerCase()] || '#6b7280'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-hover p-4"
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
          style={{ backgroundColor: color }}
        >
          {member.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{member.name}</h3>
          <p className="text-sm text-gray-500 capitalize">{member.role}</p>
        </div>
        <span className="text-sm font-medium text-gray-700">€{member.hourly_rate}/h</span>
      </div>

      {member.phone && (
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <PhoneIcon className="w-4 h-4" />
            {member.phone}
          </span>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
        <span className={`text-xs px-2 py-1 rounded ${member.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {member.is_active ? 'Attivo' : 'Inattivo'}
        </span>
        <button className="btn btn-secondary text-xs py-1.5 px-3">
          Modifica Turni
        </button>
      </div>
    </motion.div>
  )
}

function ScheduleGrid({ weekStart, staff, roster, predictions }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="card overflow-hidden overflow-x-auto">
      {/* Header */}
      <div className="grid grid-cols-8 border-b border-gray-200 min-w-[800px]">
        <div className="p-4 bg-gray-50 border-r border-gray-200">
          <span className="text-sm font-medium text-gray-700">Staff</span>
        </div>
        {days.map((day, i) => {
          const dayStr = format(day, 'yyyy-MM-dd')
          const pred = predictions.find(p => p.date === dayStr)
          return (
            <div key={i} className="p-3 bg-gray-50 border-r border-gray-200 last:border-r-0 text-center">
              <p className="text-xs text-gray-500 uppercase">
                {format(day, 'EEE', { locale: it })}
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {format(day, 'd')}
              </p>
              {pred && (
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${classificationColors[pred.day_classification] || classificationColors.medium}`}>
                  {pred.predicted_covers}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Staff Rows */}
      {staff.map((member) => {
        const color = roleColors[member.role?.toLowerCase()] || '#6b7280'
        return (
          <div key={member.id} className="grid grid-cols-8 border-b border-gray-100 last:border-b-0 min-w-[800px]">
            <div className="p-3 border-r border-gray-100 flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: color }}
              >
                {member.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{member.name?.split(' ')[0]}</p>
                <p className="text-xs text-gray-500 capitalize">{member.role}</p>
              </div>
            </div>
            {days.map((day, dayIndex) => {
              const dayStr = format(day, 'yyyy-MM-dd')
              const dayRoster = roster[dayStr] || []
              const assignments = dayRoster.filter(a => a.staff_id === member.id)
              return (
                <div key={dayIndex} className="p-2 border-r border-gray-100 last:border-r-0 min-h-[80px]">
                  {assignments.map((assignment, i) => (
                    <div
                      key={i}
                      className="mb-1 px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: color }}
                    >
                      {assignment.shift?.start_time?.slice(0, 5)}-{assignment.shift?.end_time?.slice(0, 5)}
                    </div>
                  ))}
                  {assignments.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-xs text-gray-300">—</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {staff.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          Nessun dipendente trovato
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-200" />
              <div className="space-y-2">
                <div className="h-6 w-12 bg-gray-200 rounded" />
                <div className="h-4 w-20 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card p-4 animate-pulse">
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    </div>
  )
}

export default function Staff() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [view, setView] = useState('schedule')
  const [loading, setLoading] = useState(true)
  const [autoScheduling, setAutoScheduling] = useState(false)
  const [error, setError] = useState(null)
  const [staff, setStaff] = useState([])
  const [roster, setRoster] = useState({})
  const [predictions, setPredictions] = useState([])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    const startDate = format(weekStart, 'yyyy-MM-dd')
    const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd')

    try {
      const [staffRes, predictionsRes] = await Promise.allSettled([
        staffApi.list(true),
        predictionsApi.generate(startDate, 7, false),
      ])

      setStaff(staffRes.status === 'fulfilled' ? staffRes.value : [])
      setPredictions(predictionsRes.status === 'fulfilled' ? predictionsRes.value : [])

      // Fetch roster for each day
      const rosterData = {}
      const days = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), 'yyyy-MM-dd'))

      const rosterResults = await Promise.allSettled(
        days.map(day => staffApi.getDailyRoster(day))
      )

      days.forEach((day, i) => {
        if (rosterResults[i].status === 'fulfilled') {
          rosterData[day] = rosterResults[i].value
        }
      })

      setRoster(rosterData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAutoSchedule = async () => {
    setAutoScheduling(true)
    try {
      const startDate = format(weekStart, 'yyyy-MM-dd')
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd')
      await staffApi.autoSchedule(startDate, endDate)
      fetchData()
    } catch (err) {
      setError(err.message)
    } finally {
      setAutoScheduling(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [weekStart])

  // Calculate stats
  const totalHours = Object.values(roster).flat().reduce((sum, assignment) => {
    if (assignment.shift) {
      const start = parseInt(assignment.shift.start_time?.split(':')[0] || 0)
      const end = parseInt(assignment.shift.end_time?.split(':')[0] || 0)
      return sum + (end - start)
    }
    return sum
  }, 0)

  const totalAssignments = Object.values(roster).flat().length

  const estimatedCost = Object.values(roster).flat().reduce((sum, assignment) => {
    const member = staff.find(s => s.id === assignment.staff_id)
    if (member && assignment.shift) {
      const start = parseInt(assignment.shift.start_time?.split(':')[0] || 0)
      const end = parseInt(assignment.shift.end_time?.split(':')[0] || 0)
      return sum + ((end - start) * (member.hourly_rate || 0))
    }
    return sum
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
          <button
            className="btn btn-secondary gap-2"
            onClick={handleAutoSchedule}
            disabled={autoScheduling}
          >
            <SparklesIcon className={`w-4 h-4 ${autoScheduling ? 'animate-spin' : ''}`} />
            {autoScheduling ? 'Ottimizzazione...' : 'Ottimizza con AI'}
          </button>
          <button className="btn btn-primary gap-2">
            <PlusIcon className="w-4 h-4" />
            Nuovo Dipendente
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="btn btn-secondary text-xs">Riprova</button>
        </div>
      )}

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
              L'AI può analizzare le previsioni di affluenza e suggerire la copertura ottimale del personale per massimizzare l'efficienza.
            </p>
          </div>
          <button
            className="btn bg-white text-primary-600 hover:bg-white/90 text-sm"
            onClick={handleAutoSchedule}
            disabled={autoScheduling}
          >
            Applica Suggerimenti
          </button>
        </div>
      </motion.div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
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
                  <p className="text-2xl font-bold text-gray-900">{totalHours}h</p>
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
                  <p className="text-2xl font-bold text-gray-900">{totalAssignments}</p>
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
                  <button
                    onClick={fetchData}
                    disabled={loading}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ArrowPathIcon className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          {view === 'schedule' ? (
            <ScheduleGrid
              weekStart={weekStart}
              staff={staff}
              roster={roster}
              predictions={predictions}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {staff.map((member) => (
                <StaffCard key={member.id} member={member} />
              ))}
              {staff.length === 0 && (
                <div className="col-span-full card p-12 text-center">
                  <UserGroupIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nessun dipendente trovato. Aggiungi il tuo primo dipendente!</p>
                </div>
              )}
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
        </>
      )}
    </div>
  )
}
