import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import MenuManagement from './pages/MenuManagement'
import Reservations from './pages/Reservations'
import Customers from './pages/Customers'
import Marketing from './pages/Marketing'
import Predictions from './pages/Predictions'
import Staff from './pages/Staff'
import Settings from './pages/Settings'

function App() {
  return (
    <Routes>
      {/* Public landing page */}
      <Route path="/" element={<LandingPage />} />

      {/* Dashboard routes */}
      <Route path="/app" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="menu" element={<MenuManagement />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="customers" element={<Customers />} />
        <Route path="marketing" element={<Marketing />} />
        <Route path="predictions" element={<Predictions />} />
        <Route path="staff" element={<Staff />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
