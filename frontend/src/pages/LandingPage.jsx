import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  SparklesIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon,
  CheckIcon,
  ArrowRightIcon,
  StarIcon,
} from '@heroicons/react/24/outline'

const features = [
  {
    icon: SparklesIcon,
    title: 'Previsioni AI',
    description: 'Anticipa i flussi di clienti con previsioni basate su machine learning, meteo e eventi locali.',
  },
  {
    icon: ChartBarIcon,
    title: 'Menu Engineering',
    description: 'Ottimizza il tuo menu con analisi di popolarità e margini. Identifica Star, Puzzle, Plow Horse e Dog.',
  },
  {
    icon: CalendarDaysIcon,
    title: 'Prenotazioni Smart',
    description: 'Gestisci prenotazioni da web, WhatsApp e telefono in un unico posto con conferme automatiche.',
  },
  {
    icon: UserGroupIcon,
    title: 'CRM Clienti',
    description: 'Segmenta automaticamente i clienti (VIP, Fedeli, A Rischio) e personalizza la comunicazione.',
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'WhatsApp Business',
    description: 'Chatbot integrato per prenotazioni, conferme automatiche e campagne marketing.',
  },
  {
    icon: BoltIcon,
    title: 'Marketing Automatico',
    description: 'Campagne intelligenti che si attivano automaticamente nei giorni di bassa affluenza.',
  },
]

const testimonials = [
  {
    quote: "Da quando usiamo Risto AI, abbiamo aumentato i coperti del 25% nei giorni infrasettimanali.",
    author: "Marco Bianchi",
    role: "Proprietario, Trattoria Romana",
    avatar: "MB",
  },
  {
    quote: "Le previsioni sono incredibilmente accurate. Finalmente riesco a pianificare lo staff in modo efficiente.",
    author: "Anna Verdi",
    role: "Manager, Ristorante Il Giardino",
    avatar: "AV",
  },
  {
    quote: "Il menu engineering ci ha permesso di aumentare il margine medio del 15% senza cambiare i prezzi.",
    author: "Giuseppe Neri",
    role: "Chef, Osteria del Porto",
    avatar: "GN",
  },
]

const pricingPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Per iniziare gratis',
    features: [
      '1 ristorante',
      'Previsioni AI base',
      'Gestione prenotazioni',
      'Report settimanali',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    description: 'Per ristoranti in crescita',
    features: [
      'Fino a 3 ristoranti',
      'AI avanzato con meteo',
      'WhatsApp Business',
      'CRM clienti completo',
      'Menu Engineering',
      'Marketing automatico',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    description: 'Per catene e gruppi',
    features: [
      'Ristoranti illimitati',
      'API access completo',
      'Integrazioni custom',
      'Dedicated manager',
      'Training on-site',
      'SLA garantito',
    ],
  },
]

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              Risto AI
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Funzionalità</a>
            <a href="#testimonials" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Testimonianze</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Prezzi</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              Accedi
            </Link>
            <Link to="/register" className="btn btn-primary text-sm">
              Prova Gratuita
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-6">
              <SparklesIcon className="w-4 h-4" />
              Potenziato dall'Intelligenza Artificiale
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight"
          >
            Il tuo ristorante,
            <br />
            <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              ottimizzato dall'AI
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto"
          >
            Prevedi i flussi di clienti, ottimizza il menu, automatizza il marketing
            e gestisci le prenotazioni. Tutto in un'unica piattaforma intelligente.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/register?piano=free" className="btn btn-primary px-8 py-3 text-base gap-2">
              Inizia Gratis
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <a href="#features" className="btn btn-secondary px-8 py-3 text-base">
              Scopri di più
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 text-sm text-gray-500"
          >
            14 giorni di prova gratuita • Nessuna carta di credito richiesta
          </motion.p>
        </div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 pointer-events-none" />
          <div className="rounded-2xl border border-gray-200 shadow-2xl overflow-hidden bg-gray-50">
            <div className="p-4 bg-white border-b border-gray-100 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-gray-100 text-xs text-gray-500">
                  app.ristoai.it/dashboard
                </div>
              </div>
            </div>
            <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Coperti Oggi', value: '127', change: '+12%' },
                  { label: 'Ricavi', value: '€4.450', change: '+8%' },
                  { label: 'Prenotazioni', value: '24', change: '+5' },
                  { label: 'Occupazione', value: '78%', change: '-3%' },
                ].map((stat, i) => (
                  <div key={i} className="p-4 bg-white rounded-xl shadow-sm">
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <p className={`text-sm ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 h-48 bg-white rounded-xl shadow-sm p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Andamento Settimanale</p>
                  <div className="h-32 flex items-end gap-2">
                    {[40, 35, 50, 55, 75, 85, 65].map((h, i) => (
                      <div key={i} className="flex-1 bg-primary-200 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="h-48 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl shadow-sm p-4 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <SparklesIcon className="w-5 h-5" />
                    <p className="font-medium">Previsione AI</p>
                  </div>
                  <p className="text-4xl font-bold">142</p>
                  <p className="text-white/80 text-sm">coperti previsti oggi</p>
                  <div className="mt-4 px-3 py-1 bg-white/20 rounded-lg inline-block text-sm">
                    87% confidenza
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Tutto ciò di cui hai bisogno
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Una suite completa di strumenti AI per gestire e far crescere il tuo ristorante
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Testimonials() {
  return (
    <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Amato dai ristoratori
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Scopri cosa dicono i nostri clienti
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="w-5 h-5 text-amber-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-700 mb-6">"{testimonial.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-medium text-sm">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Piani semplici e trasparenti
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Scegli il piano più adatto alle tue esigenze
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`bg-white rounded-2xl p-8 shadow-sm border-2 ${
                plan.popular ? 'border-primary-500 ring-4 ring-primary-100' : 'border-gray-100'
              }`}
            >
              {plan.popular && (
                <span className="inline-block px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-medium mb-4">
                  Più popolare
                </span>
              )}
              <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
              <p className="text-gray-500 mt-1">{plan.description}</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-gray-900">€{plan.price}</span>
                <span className="text-gray-500">/mese</span>
              </div>
              <ul className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={`/register?piano=${plan.id}`}
                className={`mt-8 w-full btn ${plan.popular ? 'btn-primary' : 'btn-secondary'} justify-center`}
              >
                {plan.price === 0 ? 'Inizia Gratis' : 'Inizia Ora'}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-primary-600 to-accent-600 rounded-3xl p-8 sm:p-12 text-center text-white"
        >
          <h2 className="text-3xl sm:text-4xl font-bold">
            Pronto a rivoluzionare il tuo ristorante?
          </h2>
          <p className="mt-4 text-lg text-white/90 max-w-2xl mx-auto">
            Inizia oggi la tua prova gratuita di 14 giorni. Nessuna carta di credito richiesta.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register?piano=free" className="btn bg-white text-primary-600 hover:bg-white/90 px-8 py-3 text-base gap-2">
              Inizia la Prova Gratuita
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <a href="#" className="text-white/90 hover:text-white font-medium">
              Parla con un esperto
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="text-white font-semibold mb-4">Prodotto</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Funzionalità</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Prezzi</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Integrazioni</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Risorse</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Guide</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Webinar</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Azienda</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Chi Siamo</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Lavora con noi</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contatti</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Partner</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Legale</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Termini di Servizio</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">GDPR</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold">Risto AI</span>
          </div>
          <p className="text-sm">© 2024 Risto AI. Tutti i diritti riservati.</p>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Features />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  )
}
