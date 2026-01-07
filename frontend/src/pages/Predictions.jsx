import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  SparklesIcon,
  CalendarDaysIcon,
  SunIcon,
  CloudIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserGroupIcon,
  CurrencyEuroIcon,
} from '@heroicons/react/24/outline'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { format, addDays, subDays } from 'date-fns'
import { it } from 'date-fns/locale'

const predictions = [
  { date: addDays(new Date(), 0), covers: 127, revenue: 4445, classification: 'high', confidence: 87, weather: 'sunny', temp: 18 },
  { date: addDays(new Date(), 1), covers: 85, revenue: 2975, classification: 'low', confidence: 82, weather: 'cloudy', temp: 14 },
  { date: addDays(new Date(), 2), covers: 92, revenue: 3220, classification: 'medium', confidence: 79, weather: 'sunny', temp: 16 },
  { date: addDays(new Date(), 3), covers: 145, revenue: 5075, classification: 'high', confidence: 85, weather: 'sunny', temp: 19 },
  { date: addDays(new Date(), 4), covers: 168, revenue: 5880, classification: 'very_high', confidence: 88, weather: 'sunny', temp: 20 },
  { date: addDays(new Date(), 5), covers: 155, revenue: 5425, classification: 'high', confidence: 84, weather: 'cloudy', temp: 17 },
  { date: addDays(new Date(), 6), covers: 110, revenue: 3850, classification: 'medium', confidence: 81, weather: 'rainy', temp: 13 },
]

const hourlyData = [
  { hour: '12:00', covers: 15 },
  { hour: '12:30', covers: 22 },
  { hour: '13:00', covers: 28 },
  { hour: '13:30', covers: 18 },
  { hour: '14:00', covers: 12 },
  { hour: '19:00', covers: 8 },
  { hour: '19:30', covers: 18 },
  { hour: '20:00', covers: 32 },
  { hour: '20:30', covers: 35 },
  { hour: '21:00', covers: 28 },
  { hour: '21:30', covers: 15 },
]

const classificationConfig = {
  low: { label: 'Bassa', color: '#ef4444', bgColor: 'bg-red-50', textColor: 'text-red-700' },
  medium: { label: 'Media', color: '#f59e0b', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  high: { label: 'Alta', color: '#10b981', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  very_high: { label: 'Molto Alta', color: '#8b5cf6', bgColor: 'bg-primary-50', textColor: 'text-primary-700' },
}

function WeatherIcon({ weather, className }) {
  if (weather === 'sunny') return <SunIcon className={`${className} text-amber-500`} />
  if (weather === 'cloudy') return <CloudIcon className={`${className} text-gray-400`} />
  return <CloudIcon className={`${className} text-blue-400`} />
}

function PredictionCard({ prediction, isSelected, onClick }) {
  const config = classificationConfig[prediction.classification]
  const dayName = format(prediction.date, 'EEE', { locale: it })
  const dayNum = format(prediction.date, 'd')

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        p-4 rounded-xl border-2 text-left transition-all w-full
        ${isSelected
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
        }
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-500 uppercase">{dayName}</p>
          <p className="text-xl font-bold text-gray-900">{dayNum}</p>
        </div>
        <WeatherIcon weather={prediction.weather} className="w-6 h-6" />
      </div>
      <div className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${config.bgColor} ${config.textColor}`}>
        {config.label}
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Coperti</span>
          <span className="font-semibold text-gray-900">{prediction.covers}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Ricavi</span>
          <span className="font-semibold text-gray-900">€{prediction.revenue}</span>
        </div>
      </div>
    </motion.button>
  )
}

export default function Predictions() {
  const [selectedDay, setSelectedDay] = useState(0)
  const selectedPrediction = predictions[selectedDay]
  const config = classificationConfig[selectedPrediction.classification]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-title">Previsioni AI</h1>
          <p className="section-subtitle">Previsioni flussi clienti basate su intelligenza artificiale</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 text-primary-700">
          <SparklesIcon className="w-5 h-5" />
          <span className="text-sm font-medium">Modello aggiornato oggi</span>
        </div>
      </div>

      {/* Week Overview */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Previsioni Prossimi 7 Giorni</h3>
          <div className="flex items-center gap-4 text-sm">
            {Object.entries(classificationConfig).map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
                {cfg.label}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-3">
          {predictions.map((pred, index) => (
            <PredictionCard
              key={index}
              prediction={pred}
              isSelected={selectedDay === index}
              onClick={() => setSelectedDay(index)}
            />
          ))}
        </div>
      </div>

      {/* Selected Day Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Day Summary */}
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {format(selectedPrediction.date, "EEEE d MMMM", { locale: it })}
                </h3>
                <p className="text-gray-500 mt-1">
                  Confidenza previsione: {selectedPrediction.confidence}%
                </p>
              </div>
              <div className={`px-4 py-2 rounded-xl ${config.bgColor} ${config.textColor} font-semibold`}>
                Affluenza {config.label}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <UserGroupIcon className="w-4 h-4" />
                  <span className="text-xs">Coperti Previsti</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{selectedPrediction.covers}</p>
                <p className="text-xs text-gray-500 mt-1">±15 coperti</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <CurrencyEuroIcon className="w-4 h-4" />
                  <span className="text-xs">Ricavi Previsti</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">€{selectedPrediction.revenue}</p>
                <p className="text-xs text-gray-500 mt-1">±€500</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <WeatherIcon weather={selectedPrediction.weather} className="w-4 h-4" />
                  <span className="text-xs">Meteo</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{selectedPrediction.temp}°C</p>
                <p className="text-xs text-gray-500 mt-1 capitalize">{selectedPrediction.weather}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <SparklesIcon className="w-4 h-4" />
                  <span className="text-xs">Confidenza</span>
                </div>
                <p className="text-2xl font-bold text-primary-600">{selectedPrediction.confidence}%</p>
                <p className="text-xs text-gray-500 mt-1">Alta precisione</p>
              </div>
            </div>
          </motion.div>

          {/* Hourly Breakdown */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Distribuzione Oraria Prevista</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="covers" radius={[4, 4, 0, 0]}>
                    {hourlyData.map((entry, index) => (
                      <Cell key={index} fill={entry.covers > 25 ? '#8b5cf6' : '#c4b5fd'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-6">
          {/* AI Recommendations */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <SparklesIcon className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-gray-900">Raccomandazioni AI</h3>
            </div>

            <div className="space-y-4">
              {selectedPrediction.classification === 'low' && (
                <>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Bassa Affluenza Prevista</p>
                        <p className="text-xs text-amber-700 mt-1">
                          Consigliamo di lanciare una campagna promozionale per aumentare le prenotazioni.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-sm font-medium text-gray-900">Staff Consigliato</p>
                    <p className="text-xs text-gray-600 mt-1">Ridurre personale del 20% rispetto alla norma</p>
                  </div>
                </>
              )}

              {(selectedPrediction.classification === 'high' || selectedPrediction.classification === 'very_high') && (
                <>
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Alta Affluenza Prevista</p>
                        <p className="text-xs text-green-700 mt-1">
                          Nessuna promozione necessaria. Assicurati di avere personale sufficiente.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-sm font-medium text-gray-900">Staff Consigliato</p>
                    <p className="text-xs text-gray-600 mt-1">Aumentare personale del 25% rispetto alla norma</p>
                  </div>
                </>
              )}

              {selectedPrediction.classification === 'medium' && (
                <>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Affluenza Normale</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Considera una campagna mirata a segmenti specifici per massimizzare.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-sm font-medium text-gray-900">Staff Consigliato</p>
                    <p className="text-xs text-gray-600 mt-1">Personale standard</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Accuracy */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Accuratezza Modello</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">MAPE (Errore Medio)</span>
                  <span className="font-medium text-gray-900">8.2%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '91.8%' }} />
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">Basato sugli ultimi 30 giorni</p>
                <p className="text-sm text-gray-700 mt-1">
                  Il modello ha previsto correttamente la classificazione del giorno nel 94% dei casi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
