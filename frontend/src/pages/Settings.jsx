import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BuildingStorefrontIcon,
  ClockIcon,
  BellIcon,
  CreditCardIcon,
  UserGroupIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ChevronRightIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'

const settingsSections = [
  {
    id: 'restaurant',
    name: 'Ristorante',
    icon: BuildingStorefrontIcon,
    description: 'Informazioni generali del locale',
  },
  {
    id: 'hours',
    name: 'Orari',
    icon: ClockIcon,
    description: 'Orari di apertura e servizio',
  },
  {
    id: 'notifications',
    name: 'Notifiche',
    icon: BellIcon,
    description: 'Preferenze di notifica',
  },
  {
    id: 'integrations',
    name: 'Integrazioni',
    icon: GlobeAltIcon,
    description: 'WhatsApp, POS, e altri servizi',
  },
  {
    id: 'ai',
    name: 'AI Settings',
    icon: SparklesIcon,
    description: 'Configurazione modelli AI',
  },
  {
    id: 'billing',
    name: 'Fatturazione',
    icon: CreditCardIcon,
    description: 'Piano e pagamenti',
  },
  {
    id: 'team',
    name: 'Team',
    icon: UserGroupIcon,
    description: 'Gestione accessi',
  },
  {
    id: 'security',
    name: 'Sicurezza',
    icon: ShieldCheckIcon,
    description: 'Password e autenticazione',
  },
]

function RestaurantSettings() {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Nome Ristorante</label>
        <input type="text" className="input" defaultValue="Trattoria da Mario" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Indirizzo</label>
        <input type="text" className="input" defaultValue="Via Roma 123, Milano" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Telefono</label>
          <input type="tel" className="input" defaultValue="+39 02 12345678" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input type="email" className="input" defaultValue="info@trattoriamario.it" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Capacità Totale</label>
        <input type="number" className="input w-32" defaultValue="80" />
        <p className="text-sm text-gray-500 mt-1">Numero massimo di coperti</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Descrizione</label>
        <textarea className="input min-h-[100px]" defaultValue="Autentica cucina romana nel cuore di Milano. Pasta fresca fatta in casa ogni giorno." />
      </div>
    </div>
  )
}

function HoursSettings() {
  const days = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']
  const [hours, setHours] = useState({
    0: { lunch: { open: '12:00', close: '14:30' }, dinner: { open: '19:00', close: '23:00' }, closed: false },
    1: { lunch: { open: '12:00', close: '14:30' }, dinner: { open: '19:00', close: '23:00' }, closed: false },
    2: { lunch: { open: '12:00', close: '14:30' }, dinner: { open: '19:00', close: '23:00' }, closed: true },
    3: { lunch: { open: '12:00', close: '14:30' }, dinner: { open: '19:00', close: '23:00' }, closed: false },
    4: { lunch: { open: '12:00', close: '14:30' }, dinner: { open: '19:00', close: '23:30' }, closed: false },
    5: { lunch: { open: '12:00', close: '15:00' }, dinner: { open: '19:00', close: '24:00' }, closed: false },
    6: { lunch: { open: '12:00', close: '15:00' }, dinner: { open: '19:00', close: '23:00' }, closed: false },
  })

  return (
    <div className="space-y-4">
      {days.map((day, index) => (
        <div key={day} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
          <div className="w-24">
            <span className="font-medium text-gray-900">{day}</span>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hours[index]?.closed}
              onChange={() => {}}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600">Chiuso</span>
          </label>
          {!hours[index]?.closed && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Pranzo:</span>
                <input type="time" className="input py-1.5 text-sm" defaultValue={hours[index]?.lunch.open} />
                <span className="text-gray-400">-</span>
                <input type="time" className="input py-1.5 text-sm" defaultValue={hours[index]?.lunch.close} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Cena:</span>
                <input type="time" className="input py-1.5 text-sm" defaultValue={hours[index]?.dinner.open} />
                <span className="text-gray-400">-</span>
                <input type="time" className="input py-1.5 text-sm" defaultValue={hours[index]?.dinner.close} />
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function NotificationsSettings() {
  const [settings, setSettings] = useState({
    newReservations: true,
    reservationReminders: true,
    lowStockAlerts: true,
    aiInsights: true,
    dailyReport: true,
    weeklyReport: true,
    marketingUpdates: false,
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: true,
  })

  const Toggle = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-primary-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-gray-900 mb-4">Notifiche Operative</h4>
        <div className="space-y-4">
          {[
            { key: 'newReservations', label: 'Nuove prenotazioni', desc: 'Ricevi notifica per ogni nuova prenotazione' },
            { key: 'reservationReminders', label: 'Promemoria prenotazioni', desc: 'Reminder 1 ora prima dell\'arrivo' },
            { key: 'lowStockAlerts', label: 'Avvisi scorte basse', desc: 'Quando un ingrediente sta per esaurirsi' },
            { key: 'aiInsights', label: 'Insights AI', desc: 'Suggerimenti e previsioni dal sistema AI' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
              <Toggle
                checked={settings[item.key]}
                onChange={(val) => setSettings({ ...settings, [item.key]: val })}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-4">Report</h4>
        <div className="space-y-4">
          {[
            { key: 'dailyReport', label: 'Report giornaliero', desc: 'Riepilogo delle performance ogni sera' },
            { key: 'weeklyReport', label: 'Report settimanale', desc: 'Analisi dettagliata ogni lunedì' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
              <div>
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
              <Toggle
                checked={settings[item.key]}
                onChange={(val) => setSettings({ ...settings, [item.key]: val })}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-4">Canali di Notifica</h4>
        <div className="space-y-4">
          {[
            { key: 'emailNotifications', label: 'Email' },
            { key: 'smsNotifications', label: 'SMS' },
            { key: 'whatsappNotifications', label: 'WhatsApp' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
              <p className="font-medium text-gray-900">{item.label}</p>
              <Toggle
                checked={settings[item.key]}
                onChange={(val) => setSettings({ ...settings, [item.key]: val })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function IntegrationsSettings() {
  const integrations = [
    { name: 'WhatsApp Business', status: 'connected', icon: '💬' },
    { name: 'Google Calendar', status: 'connected', icon: '📅' },
    { name: 'Stripe', status: 'connected', icon: '💳' },
    { name: 'Mailchimp', status: 'disconnected', icon: '📧' },
    { name: 'OpenWeather API', status: 'connected', icon: '🌤️' },
    { name: 'TripAdvisor', status: 'disconnected', icon: '🦉' },
  ]

  return (
    <div className="space-y-4">
      {integrations.map((integration) => (
        <div key={integration.name} className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <span className="text-2xl">{integration.icon}</span>
            <div>
              <p className="font-medium text-gray-900">{integration.name}</p>
              <p className={`text-sm ${integration.status === 'connected' ? 'text-green-600' : 'text-gray-500'}`}>
                {integration.status === 'connected' ? 'Connesso' : 'Non connesso'}
              </p>
            </div>
          </div>
          <button className={`btn ${integration.status === 'connected' ? 'btn-secondary' : 'btn-primary'} text-sm`}>
            {integration.status === 'connected' ? 'Gestisci' : 'Connetti'}
          </button>
        </div>
      ))}
    </div>
  )
}

function AISettings() {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-primary-50 border border-primary-200">
        <div className="flex items-center gap-3 mb-2">
          <SparklesIcon className="w-5 h-5 text-primary-600" />
          <h4 className="font-medium text-primary-900">Modello AI Attivo</h4>
        </div>
        <p className="text-sm text-primary-700">
          Il sistema utilizza modelli di machine learning per previsioni e ottimizzazioni.
          Ultimo aggiornamento modello: oggi alle 06:00
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Soglia Confidenza Minima</label>
        <select className="input">
          <option value="70">70% - Mostra più suggerimenti</option>
          <option value="80" selected>80% - Bilanciato</option>
          <option value="90">90% - Solo alta confidenza</option>
        </select>
        <p className="text-sm text-gray-500 mt-1">
          Mostra solo previsioni con confidenza superiore alla soglia
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Frequenza Aggiornamento Modello</label>
        <select className="input">
          <option value="daily" selected>Giornaliero</option>
          <option value="weekly">Settimanale</option>
          <option value="manual">Manuale</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Dati per Training</label>
        <div className="space-y-2">
          {['Storico vendite', 'Dati meteo', 'Eventi locali', 'Festività'].map((item) => (
            <label key={item} className="flex items-center gap-2">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{item}</span>
            </label>
          ))}
        </div>
      </div>

      <button className="btn btn-secondary gap-2">
        <SparklesIcon className="w-4 h-4" />
        Ricalcola Modello Ora
      </button>
    </div>
  )
}

function BillingSettings() {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">Piano attuale</p>
            <h3 className="text-2xl font-bold mt-1">Professional</h3>
            <p className="text-white/90 mt-2">€99/mese • Rinnovo il 15 Febbraio 2024</p>
          </div>
          <button className="btn bg-white text-primary-600 hover:bg-white/90">
            Upgrade
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { name: 'Starter', price: 49, features: ['1 ristorante', 'Previsioni base', 'Email support'] },
          { name: 'Professional', price: 99, features: ['3 ristoranti', 'AI avanzato', 'WhatsApp', 'Priority support'], current: true },
          { name: 'Enterprise', price: 199, features: ['Ristoranti illimitati', 'API access', 'Dedicated manager', 'Custom integrations'] },
        ].map((plan) => (
          <div
            key={plan.name}
            className={`card p-5 ${plan.current ? 'ring-2 ring-primary-500' : ''}`}
          >
            {plan.current && (
              <span className="badge badge-primary mb-2">Piano Attuale</span>
            )}
            <h4 className="font-semibold text-gray-900">{plan.name}</h4>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              €{plan.price}<span className="text-sm font-normal text-gray-500">/mese</span>
            </p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckIcon className="w-4 h-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div>
        <h4 className="font-medium text-gray-900 mb-4">Metodo di Pagamento</h4>
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center text-xs font-bold">
              VISA
            </div>
            <div>
              <p className="font-medium text-gray-900">•••• •••• •••• 4242</p>
              <p className="text-sm text-gray-500">Scade 12/25</p>
            </div>
          </div>
          <button className="btn btn-secondary text-sm">Modifica</button>
        </div>
      </div>
    </div>
  )
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState('restaurant')

  const renderContent = () => {
    switch (activeSection) {
      case 'restaurant':
        return <RestaurantSettings />
      case 'hours':
        return <HoursSettings />
      case 'notifications':
        return <NotificationsSettings />
      case 'integrations':
        return <IntegrationsSettings />
      case 'ai':
        return <AISettings />
      case 'billing':
        return <BillingSettings />
      default:
        return (
          <div className="text-center py-12 text-gray-500">
            <p>Sezione in costruzione</p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="section-title">Impostazioni</h1>
        <p className="section-subtitle">Gestisci le preferenze del tuo account e ristorante</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="card p-4 h-fit">
          <nav className="space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isActive ? 'text-primary-700' : 'text-gray-900'}`}>
                      {section.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{section.description}</p>
                  </div>
                  {isActive && <ChevronRightIcon className="w-4 h-4 text-primary-400" />}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              {settingsSections.find(s => s.id === activeSection)?.name}
            </h2>
            {renderContent()}

            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-3">
              <button className="btn btn-secondary">Annulla</button>
              <button className="btn btn-primary">Salva Modifiche</button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
