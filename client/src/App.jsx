import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Calendar from './pages/Calendar'
import Dashboard from './pages/Dashboard'
import WeeklyPlan from './pages/WeeklyPlan'
import Tasks from './pages/Tasks'

const NAV_LINKS = [
  { to: '/', label: 'Calendar', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/plan', label: 'Weekly Plan' },
  { to: '/tasks', label: 'Tasks' },
]

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex gap-1">
            {NAV_LINKS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-md text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
        <main className="max-w-7xl mx-auto p-4">
          <Routes>
            <Route path="/" element={<Calendar />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/plan" element={<WeeklyPlan />} />
            <Route path="/tasks" element={<Tasks />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
