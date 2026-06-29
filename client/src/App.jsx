import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Calendar from './pages/Calendar'
import Dashboard from './pages/Dashboard'
import WeeklyPlan from './pages/WeeklyPlan'
import Tasks from './pages/Tasks'
import LogTime from './pages/LogTime'

const NAV_LINKS = [
  { to: '/', label: 'Calendar', end: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/plan', label: 'Weekly Plan' },
  { to: '/tasks', label: 'Tasks' },
]

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-stone-50">
        <nav className="bg-white border-b border-stone-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex gap-1">
            {NAV_LINKS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-md text-sm font-medium transition ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
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
            <Route path="/log/:date" element={<LogTime />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
