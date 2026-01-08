import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  SparklesIcon,
  SunIcon,
  CloudIcon,
  UserGroupIcon,
  CurrencyEuroIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { format, addDays } from 'date-fns'
import { it } from 'date-fns/locale'
import { predictionsApi } from '../services/api'

const classificationConfig = {
  low: { label: 'Bassa', color: '#ef4444', bgColor: 'bg-red-50', textColor: 'text-red-700' },
  medium: { label: 'Media', color: '#f59e0b', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  high: { label: 'Alta', color: '#10b981', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  very_high: { label: 'Molto Alta', color: '#8b5cf6', bgColor: 'bg-primary-50', textColor: 'text-primary-700' },
}

function WeatherIcon({ condition, className }) {
  if (condition === 'sunny' || condition === 'clear') return <SunIcon className={`${className} text-amber-500`} />
  if (condition === 'cloudy' || condition === 'overcast') return <CloudIcon className={`${className} text-gray-400`} />
  return <CloudIcon className={`${className} text-blue-400`} />
}

function PredictionCard({ prediction, isSelected, onClick }) {
  const config = classificationConfig[prediction.day_classification] || classificationConfig.medium
  const dayName = format(new Date(prediction.date), 'EEE', { locale: it })
  const dayNum = format(new Date(prediction.date), 'd')

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
        {prediction.weather_condition && (
          <WeatherIcon condition={prediction.weather_condition} className="w-6 h-6" />
        )}
      </div>
      <div className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${config.bgColor} ${config.textColor}`}>
        {config.label}
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Coperti</span>
          <span className="font-semibold text-gray-900">{prediction.predicted_covers}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Ricavi</span>
          <span className="font-semibold text-gray-900">€{Math.round(prediction.predicted_revenue)}</span>
        </div>
      </div>
    </motion.button>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="grid grid-cols-7 gap-3">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border-2 border-gray-200 animate-pulse">
              <div className="h-4 w-8 bg-gray-200 rounded mb-2" />
              <div className="h-6 w-6 bg-gray-200 rounded mb-3" />
              <div className="h-5 w-16 bg-gray-200 rounded mb-3" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded" />
                <div className="h-4 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Predictions() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [predictions, setPredictions] = useState([])
  const [accuracy, setAccuracy] = useState(null)
  const [selectedDay, setSelectedDay] = useState(0)

  const today = new Date().toISOString().split('T')[0]

  const fetchPredictions = async () => {
    setLoading(true)
    setError(null)
    try {
      const [predictionsRes, accuracyRes] = await Promise.allSettled([
        predictionsApi.generate(today, 7, true),
        predictionsApi.getAccuracy(30),
      ])

      setPredictions(predictionsRes.status === 'fulfilled' ? predictionsRes.value : [])
      setAccuracy(accuracyRes.status === 'fulfilled' ? accuracyRes.value : null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPredictions()
  }, [])

  const selectedPrediction = predictions[selectedDay] || null
  const config = selectedPrediction ? (classificationConfig[selectedPrediction.day_classification] || classificationConfig.medium) : null

  // Prepare hourly data if available
  const hourlyData = selectedPrediction?.hourly_breakdown?.map(h => ({
    hour: h.hour,
    covers: h.predicted_covers,
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-title">Previsioni AI</h1>
          <p className="section-subtitle">Previsioni flussi clienti basate su intelligenza artificiale</p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn btn-secondary gap-2"
            onClick={fetchPredictions}
            disabled={loading}
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-50 text-primary-700">
            <SparklesIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Modello AI attivo</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchPredictions} className="btn btn-secondary text-xs">Riprova</button>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : predictions.length > 0 ? (
        <>
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
              {predictions.slice(0, 7).map((pred, index) => (
                <PredictionCard
                  key={pred.date}
                  prediction={pred}
                  isSelected={selectedDay === index}
                  onClick={() => setSelectedDay(index)}
                />
              ))}
            </div>
          </div>

          {/* Selected Day Details */}
          {selectedPrediction && (
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
                        {format(new Date(selectedPrediction.date), "EEEE d MMMM", { locale: it })}
                      </h3>
                      <p className="text-gray-500 mt-1">
                        Confidenza previsione: {Math.round(selectedPrediction.confidence_score * 100)}%
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
                      <p className="text-2xl font-bold text-gray-900">{selectedPrediction.predicted_covers}</p>
                      {selectedPrediction.covers_range && (
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedPrediction.covers_range.lower} - {selectedPrediction.covers_range.upper}
                        </p>
                      )}
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <CurrencyEuroIcon className="w-4 h-4" />
                        <span className="text-xs">Ricavi Previsti</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">€{Math.round(selectedPrediction.predicted_revenue)}</p>
                      {selectedPrediction.revenue_range && (
                        <p className="text-xs text-gray-500 mt-1">
                          €{Math.round(selectedPrediction.revenue_range.lower)} - €{Math.round(selectedPrediction.revenue_range.upper)}
                        </p>
                      )}
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        {selectedPrediction.weather_condition && (
                          <WeatherIcon condition={selectedPrediction.weather_condition} className="w-4 h-4" />
                        )}
                        <span className="text-xs">Meteo</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {selectedPrediction.temperature ? `${selectedPrediction.temperature}°C` : '-'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 capitalize">
                        {selectedPrediction.weather_condition || 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <SparklesIcon className="w-4 h-4" />
                        <span className="text-xs">Confidenza</span>
                      </div>
                      <p className="text-2xl font-bold text-primary-600">
                        {Math.round(selectedPrediction.confidence_score * 100)}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedPrediction.confidence_score >= 0.8 ? 'Alta precisione' : 'Precisione media'}
                      </p>
                    </div>
                  </div>

                  {selectedPrediction.weather_impact && (
                    <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Impatto meteo:</strong>{' '}
                        {selectedPrediction.weather_impact > 0 ? '+' : ''}
                        {Math.round(selectedPrediction.weather_impact * 100)}% sui coperti previsti
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* Hourly Breakdown */}
                {hourlyData.length > 0 && (
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
                )}
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
                    {selectedPrediction.day_classification === 'low' && (
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

                    {(selectedPrediction.day_classification === 'high' || selectedPrediction.day_classification === 'very_high') && (
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
                          <p className="text-xs text-gray-600 mt-1">
                            Aumentare personale del {selectedPrediction.day_classification === 'very_high' ? '30' : '25'}% rispetto alla norma
                          </p>
                        </div>
                      </>
                    )}

                    {selectedPrediction.day_classification === 'medium' && (
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
                    {accuracy ? (
                      <>
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-500">MAPE (Errore Medio)</span>
                            <span className="font-medium text-gray-900">{accuracy.mape?.toFixed(1) || '-'}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${Math.max(0, 100 - (accuracy.mape || 0))}%` }}
                            />
                          </div>
                        </div>
                        <div className="pt-4 border-t border-gray-100">
                          <p className="text-xs text-gray-500">Basato sugli ultimi {accuracy.days_analyzed || 30} giorni</p>
                          {accuracy.classification_accuracy && (
                            <p className="text-sm text-gray-700 mt-1">
                              Classificazione corretta nel {(accuracy.classification_accuracy * 100).toFixed(0)}% dei casi.
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Dati di accuratezza non disponibili</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card p-12 text-center">
          <SparklesIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            Nessuna previsione disponibile. Il sistema genererà le previsioni quando saranno disponibili dati storici sufficienti.
          </p>
        </div>
      )}
    </div>
  )
}
