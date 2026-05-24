import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Calendar from './pages/Calendar'
import Dashboard from './pages/Dashboard'
import WeeklyPlan from './pages/WeeklyPlan'

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex gap-6">
            <a href="/" className="font-semibold text-gray-900">Calendar</a>
            <a href="/dashboard" className="font-semibold text-gray-900">Dashboard</a>
            <a href="/plan" className="font-semibold text-gray-900">Weekly Plan</a>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto p-4">
          <Routes>
            <Route path="/" element={<Calendar />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/plan" element={<WeeklyPlan />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
