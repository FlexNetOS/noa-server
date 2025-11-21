import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Gateway from './pages/Gateway'
import Traces from './pages/Traces'
import Costs from './pages/Costs'
import Tenants from './pages/Tenants'
import Settings from './pages/Settings'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/gateway" element={<Gateway />} />
        <Route path="/traces" element={<Traces />} />
        <Route path="/costs" element={<Costs />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default App
