import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  SparklesIcon,
  EnvelopeIcon,
  LockClosedIcon,
  BuildingStorefrontIcon,
  ExclamationCircleIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Per iniziare',
    features: ['1 ristorante', 'Previsioni base', 'Gestione prenotazioni'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    description: 'Per crescere',
    features: ['Fino a 3 ristoranti', 'AI avanzato', 'WhatsApp Business', 'CRM completo'],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    description: 'Per catene',
    features: ['Ristoranti illimitati', 'API access', 'Supporto dedicato'],
  },
]

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    conferma_password: '',
    nome_ristorante: '',
    piano: 'free',
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1) // 1 = plan selection, 2 = form

  const { register } = useAuth()
  const location = useLocation()

  // Check for preselected plan from landing page
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const selectedPlan = params.get('piano')
    if (selectedPlan && ['free', 'pro', 'enterprise'].includes(selectedPlan)) {
      setFormData(prev => ({ ...prev, piano: selectedPlan }))
      setStep(2)
    }
  }, [location])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const selectPlan = (planId) => {
    setFormData(prev => ({ ...prev, piano: planId }))
    setStep(2)
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email) {
      newErrors.email = 'Inserisci la tua email'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Inserisci un\'email valida'
    }

    if (!formData.password) {
      newErrors.password = 'Inserisci una password'
    } else if (formData.password.length < 8) {
      newErrors.password = 'La password deve avere almeno 8 caratteri'
    }

    if (!formData.conferma_password) {
      newErrors.conferma_password = 'Conferma la password'
    } else if (formData.password !== formData.conferma_password) {
      newErrors.conferma_password = 'Le password non corrispondono'
    }

    if (!formData.nome_ristorante) {
      newErrors.nome_ristorante = 'Inserisci il nome del tuo ristorante'
    } else if (formData.nome_ristorante.length < 2) {
      newErrors.nome_ristorante = 'Il nome deve avere almeno 2 caratteri'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    try {
      await register(formData)
    } catch (err) {
      setErrors({ submit: err.message || 'Errore durante la registrazione' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl w-full"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <SparklesIcon className="w-7 h-7 text-white" />
            </div>
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {step === 1 ? 'Scegli il tuo piano' : 'Crea il tuo account'}
          </h2>
          <p className="mt-2 text-gray-600">
            {step === 1
              ? 'Inizia gratis, passa al Pro quando vuoi'
              : `Piano ${plans.find(p => p.id === formData.piano)?.name} - €${plans.find(p => p.id === formData.piano)?.price}/mese`
            }
          </p>
        </div>

        {/* Step 1: Plan Selection */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl p-6 shadow-lg border-2 cursor-pointer transition-all hover:shadow-xl ${
                  plan.popular ? 'border-primary-500 ring-4 ring-primary-100' : 'border-gray-100 hover:border-primary-200'
                }`}
                onClick={() => selectPlan(plan.id)}
              >
                {plan.popular && (
                  <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-medium mb-4">
                    Consigliato
                  </span>
                )}
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-gray-500 text-sm">{plan.description}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">€{plan.price}</span>
                  <span className="text-gray-500">/mese</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={`mt-6 w-full py-3 px-4 rounded-xl font-medium transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white hover:from-primary-700 hover:to-accent-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {plan.price === 0 ? 'Inizia Gratis' : 'Seleziona'}
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Step 2: Registration Form */}
        {step === 2 && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error message */}
                {errors.submit && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
                  >
                    <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{errors.submit}</p>
                  </motion.div>
                )}

                {/* Nome Ristorante */}
                <div>
                  <label htmlFor="nome_ristorante" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome del Ristorante
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <BuildingStorefrontIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="nome_ristorante"
                      name="nome_ristorante"
                      type="text"
                      value={formData.nome_ristorante}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                        errors.nome_ristorante ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Trattoria da Mario"
                    />
                  </div>
                  {errors.nome_ristorante && (
                    <p className="mt-1 text-sm text-red-600">{errors.nome_ristorante}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                        errors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="mario@ristorante.it"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                        errors.password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Minimo 8 caratteri"
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                  )}
                </div>

                {/* Conferma Password */}
                <div>
                  <label htmlFor="conferma_password" className="block text-sm font-medium text-gray-700 mb-2">
                    Conferma Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="conferma_password"
                      name="conferma_password"
                      type="password"
                      autoComplete="new-password"
                      value={formData.conferma_password}
                      onChange={handleChange}
                      className={`block w-full pl-10 pr-3 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                        errors.conferma_password ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Ripeti la password"
                    />
                  </div>
                  {errors.conferma_password && (
                    <p className="mt-1 text-sm text-red-600">{errors.conferma_password}</p>
                  )}
                </div>

                {/* Selected Plan Display */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Piano selezionato</p>
                      <p className="font-medium text-gray-900">
                        {plans.find(p => p.id === formData.piano)?.name} - €{plans.find(p => p.id === formData.piano)?.price}/mese
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Cambia
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creazione account...
                    </>
                  ) : (
                    'Crea Account'
                  )}
                </button>

                {/* Terms */}
                <p className="text-xs text-gray-500 text-center">
                  Registrandoti accetti i nostri{' '}
                  <a href="#" className="text-primary-600 hover:underline">Termini di Servizio</a>
                  {' '}e la{' '}
                  <a href="#" className="text-primary-600 hover:underline">Privacy Policy</a>
                </p>
              </form>

              {/* Login link */}
              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Hai già un account?{' '}
                  <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
                    Accedi
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Back to landing */}
        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Torna alla home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
