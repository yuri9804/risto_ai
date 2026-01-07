import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  SparklesIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  StarIcon,
  BoltIcon,
  PuzzlePieceIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'

const categories = [
  { id: 'all', name: 'Tutti', count: 30 },
  { id: 'antipasti', name: 'Antipasti', count: 8 },
  { id: 'primi', name: 'Primi', count: 10 },
  { id: 'secondi', name: 'Secondi', count: 7 },
  { id: 'dolci', name: 'Dolci', count: 5 },
]

const menuItems = [
  {
    id: 1,
    name: 'Carbonara Tradizionale',
    category: 'Primi',
    price: 14.00,
    cost: 4.20,
    margin: 70,
    classification: 'star',
    popularity: 95,
    soldToday: 45,
    isActive: true,
  },
  {
    id: 2,
    name: 'Tagliata di Manzo',
    category: 'Secondi',
    price: 24.00,
    cost: 10.80,
    margin: 55,
    classification: 'star',
    popularity: 88,
    soldToday: 38,
    isActive: true,
  },
  {
    id: 3,
    name: 'Antipasto della Casa',
    category: 'Antipasti',
    price: 12.00,
    cost: 5.40,
    margin: 55,
    classification: 'plow_horse',
    popularity: 72,
    soldToday: 28,
    isActive: true,
  },
  {
    id: 4,
    name: 'Risotto ai Funghi Porcini',
    category: 'Primi',
    price: 16.00,
    cost: 4.80,
    margin: 70,
    classification: 'puzzle',
    popularity: 35,
    soldToday: 8,
    isActive: true,
  },
  {
    id: 5,
    name: 'Tiramisù',
    category: 'Dolci',
    price: 7.00,
    cost: 1.75,
    margin: 75,
    classification: 'star',
    popularity: 82,
    soldToday: 32,
    isActive: true,
  },
  {
    id: 6,
    name: 'Insalata di Mare',
    category: 'Antipasti',
    price: 18.00,
    cost: 9.90,
    margin: 45,
    classification: 'dog',
    popularity: 22,
    soldToday: 5,
    isActive: true,
  },
]

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
  const config = classificationConfig[classification]
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  )
}

function MenuItemCard({ item }) {
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
            {!item.isActive && (
              <span className="badge bg-gray-100 text-gray-600">Inattivo</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{item.category}</p>
        </div>
        <ClassificationBadge classification={item.classification} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500">Prezzo</p>
          <p className="text-sm font-semibold text-gray-900">€{item.price.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Margine</p>
          <p className="text-sm font-semibold text-gray-900">{item.margin}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Venduti oggi</p>
          <p className="text-sm font-semibold text-gray-900">{item.soldToday}</p>
        </div>
      </div>

      {/* Popularity bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">Popolarità</span>
          <span className="font-medium text-gray-700">{item.popularity}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-500"
            style={{ width: `${item.popularity}%` }}
          />
        </div>
      </div>

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

export default function MenuManagement() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category.toLowerCase() === activeCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-title">Gestione Menù</h1>
          <p className="section-subtitle">Analizza e ottimizza i piatti del tuo menù</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary gap-2">
            <ArrowPathIcon className="w-4 h-4" />
            Aggiorna Analisi
          </button>
          <button className="btn btn-primary gap-2">
            <PlusIcon className="w-4 h-4" />
            Nuovo Piatto
          </button>
        </div>
      </div>

      {/* AI Insights Banner */}
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
              L'analisi AI ha identificato 3 piatti "Puzzle" con alto potenziale. Considera di promuoverli nel menù
              per aumentare le vendite mantenendo alti margini.
            </p>
          </div>
          <button className="btn bg-white text-primary-600 hover:bg-white/90 text-sm">
            Vedi Raccomandazioni
          </button>
        </div>
      </motion.div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(classificationConfig).map(([key, config]) => {
          const count = menuItems.filter(i => i.classification === key).length
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <MenuItemCard key={item.id} item={item} />
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-gray-500">Nessun piatto trovato</p>
        </div>
      )}
    </div>
  )
}
