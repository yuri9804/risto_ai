import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ArrowPathIcon,
  StarIcon,
  BoltIcon,
  PuzzlePieceIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { menuApi } from '../services/api'

const classificationConfig = {
  star: {
    label: 'Star',
    icon: StarIcon,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    description: 'Alta popolarità, alto margine',
  },
  plow_horse: {
    label: 'Plow Horse',
    icon: BoltIcon,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    description: 'Alta popolarità, basso margine',
  },
  puzzle: {
    label: 'Puzzle',
    icon: PuzzlePieceIcon,
    bgColor: 'bg-primary-50',
    textColor: 'text-primary-700',
    borderColor: 'border-primary-200',
    description: 'Bassa popolarità, alto margine',
  },
  dog: {
    label: 'Dog',
    icon: ExclamationTriangleIcon,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    description: 'Bassa popolarità, basso margine',
  },
}

function ClassificationBadge({ classification }) {
  const config = classificationConfig[classification?.toLowerCase()] || classificationConfig.dog
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  )
}

function MenuItemCard({ item }) {
  const margin = item.margin_percentage || 0
  const popularity = Math.round((item.popularity_index || 0) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-hover p-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{item.category}</p>
        </div>
        <ClassificationBadge classification={item.classification} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500">Ricavo Totale</p>
          <p className="text-sm font-semibold text-gray-900">€{item.total_revenue?.toFixed(2) || '0.00'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Margine</p>
          <p className="text-sm font-semibold text-gray-900">{margin.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Venduti</p>
          <p className="text-sm font-semibold text-gray-900">{item.quantity_sold || 0}</p>
        </div>
      </div>

      {/* Popularity bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">Indice Popolarità</span>
          <span className="font-medium text-gray-700">{popularity}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(popularity, 100)}%` }}
          />
        </div>
      </div>

      {/* Additional stats */}
      {(item.avg_rating || item.reorder_rate) && (
        <div className="mt-3 flex gap-4 text-xs text-gray-500">
          {item.avg_rating && (
            <span>Rating: <strong className="text-gray-700">{item.avg_rating.toFixed(1)}/5</strong></span>
          )}
          {item.reorder_rate && (
            <span>Reorder: <strong className="text-gray-700">{(item.reorder_rate * 100).toFixed(0)}%</strong></span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <EyeIcon className="w-4 h-4" />
        </button>
        <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
          <PencilSquareIcon className="w-4 h-4" />
        </button>
        <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="card p-4 animate-pulse">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-gray-200 rounded-lg" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, j) => (
              <div key={j}>
                <div className="h-3 w-12 bg-gray-100 rounded mb-1" />
                <div className="h-5 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="h-1.5 bg-gray-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MenuManagement() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [analysisData, setAnalysisData] = useState(null)

  const fetchAnalysis = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await menuApi.analyze(null, null)
      setAnalysisData(data)
    } catch (err) {
      setError(err.message || 'Errore nel caricamento dell\'analisi')
    } finally {
      setLoading(false)
    }
  }

  const runNewAnalysis = async () => {
    setAnalyzing(true)
    try {
      const data = await menuApi.analyze(null, null)
      setAnalysisData(data)
    } catch (err) {
      setError(err.message || 'Errore nell\'analisi')
    } finally {
      setAnalyzing(false)
    }
  }

  useEffect(() => {
    fetchAnalysis()
  }, [])

  // Get menu items from analysis
  const menuItems = analysisData?.engineering_results || []
  const recommendations = analysisData?.recommendations || []
  const summary = analysisData?.summary || {}

  // Build categories from data
  const categoryCounts = menuItems.reduce((acc, item) => {
    const cat = item.category?.toLowerCase() || 'altro'
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {})

  const categories = [
    { id: 'all', name: 'Tutti', count: menuItems.length },
    ...Object.entries(categoryCounts).map(([id, count]) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      count,
    })),
  ]

  // Classification counts
  const classificationCounts = menuItems.reduce((acc, item) => {
    const cls = item.classification?.toLowerCase() || 'dog'
    acc[cls] = (acc[cls] || 0) + 1
    return acc
  }, { star: 0, plow_horse: 0, puzzle: 0, dog: 0 })

  // Filter items
  const filteredItems = menuItems.filter(item => {
    const itemCategory = item.category?.toLowerCase() || ''
    const matchesCategory = activeCategory === 'all' || itemCategory === activeCategory
    const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Get high priority recommendations
  const priorityRecommendations = recommendations
    .filter(r => r.priority === 'high')
    .slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-title">Gestione Menù</h1>
          <p className="section-subtitle">Analizza e ottimizza i piatti del tuo menù</p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn btn-secondary gap-2"
            onClick={runNewAnalysis}
            disabled={analyzing}
          >
            <ArrowPathIcon className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analisi in corso...' : 'Aggiorna Analisi'}
          </button>
          <button className="btn btn-primary gap-2">
            <PlusIcon className="w-4 h-4" />
            Nuovo Piatto
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAnalysis} className="btn btn-secondary text-xs">Riprova</button>
        </div>
      )}

      {/* AI Insights Banner */}
      {priorityRecommendations.length > 0 && (
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
              <h3 className="font-semibold">Suggerimenti AI</h3>
              <p className="text-sm text-white/90 mt-1">
                {priorityRecommendations.length} raccomandazioni ad alta priorità:
                {' '}{priorityRecommendations.map(r => r.name).join(', ')}
              </p>
            </div>
            <button className="btn bg-white text-primary-600 hover:bg-white/90 text-sm">
              Vedi Raccomandazioni
            </button>
          </div>
        </motion.div>
      )}

      {/* Analysis Period */}
      {analysisData?.period && (
        <div className="text-sm text-gray-500">
          Periodo analisi: {analysisData.period.start_date || 'N/A'} - {analysisData.period.end_date || 'N/A'}
          {' '}({analysisData.period.total_orders || 0} ordini, €{analysisData.period.total_revenue?.toFixed(2) || '0.00'} ricavi)
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(classificationConfig).map(([key, config]) => {
          const count = classificationCounts[key] || 0
          const Icon = config.icon
          return (
            <div key={key} className={`card p-4 ${config.bgColor} border ${config.borderColor}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-white/60`}>
                  <Icon className={`w-5 h-5 ${config.textColor}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${config.textColor}`}>{count}</p>
                  <p className="text-sm text-gray-600">{config.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca piatti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                  ${activeCategory === cat.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {cat.name}
                <span className={`
                  px-1.5 py-0.5 rounded-md text-xs
                  ${activeCategory === cat.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                  }
                `}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items Grid */}
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <MenuItemCard key={item.menu_item_id} item={item} />
          ))}
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-gray-500">
            {menuItems.length === 0
              ? 'Nessun dato disponibile. Esegui un\'analisi del menù per visualizzare i risultati.'
              : 'Nessun piatto trovato con i filtri selezionati'}
          </p>
        </div>
      )}

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Raccomandazioni AI</h3>
          <div className="space-y-3">
            {recommendations.slice(0, 5).map((rec, i) => (
              <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{rec.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  </div>
                  <span className={`badge ${
                    rec.priority === 'high' ? 'badge-error' :
                    rec.priority === 'medium' ? 'badge-warning' : 'badge-secondary'
                  }`}>
                    {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Media' : 'Bassa'}
                  </span>
                </div>
                {rec.actions && rec.actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rec.actions.map((action, j) => (
                      <span key={j} className="text-xs px-2 py-1 bg-white rounded border border-gray-200 text-gray-600">
                        {action}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
