import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns'
import usePlanStore from '../store/usePlanStore'
import { getPlans } from '../api/plans'
import ErrorState from '../components/ErrorState'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Calendar() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelLoading, setPanelLoading] = useState(false)
  const [panelError, setPanelError] = useState('')

  const plans = usePlanStore(state => state.plans)
  const setPlans = usePlanStore(state => state.setPlans)

  async function handleDateClick(date) {
    setSelectedDate(date)
    setPanelOpen(true)
    setPanelLoading(true)
    setPanelError('')
    try {
      const data = await getPlans(format(date, 'yyyy-MM-dd'))
      const dateStr = format(date, 'yyyy-MM-dd')
      const dayPlans = data.filter(p => p.planned_date.slice(0, 10) === dateStr)
      if (dayPlans.length === 0) {
        setPanelOpen(false)
        navigate('/plan')
        return
      }
      setPlans(data)
    } catch (err) {
      setPanelError(err.message || 'Failed to load planned tasks')
    } finally {
      setPanelLoading(false)
    }
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const paddingDays = Array(getDay(monthStart)).fill(null)
  const calendarDays = [...paddingDays, ...daysInMonth]

  const plannedForDate = (date) =>
    plans.filter(p => p.planned_date.slice(0, 10) === format(date, 'yyyy-MM-dd'))

  const selectedDatePlans = selectedDate ? plannedForDate(selectedDate) : []

  return (
    <div className="py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{format(currentDate, 'MMMM yyyy')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="px-4 py-2 bg-stone-200 rounded hover:bg-stone-300"
          >
            ← Prev
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-stone-200 rounded hover:bg-stone-300"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="px-4 py-2 bg-stone-200 rounded hover:bg-stone-300"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayPlans = day ? plannedForDate(day) : []
            const isToday = day && isSameDay(day, new Date())
            const isSelected = day && selectedDate && isSameDay(day, selectedDate)
            return (
              <div
                key={idx}
                onClick={() => day && handleDateClick(day)}
                className={`min-h-24 p-3 border border-gray-100 transition
                  ${!day ? 'bg-stone-50' : 'cursor-pointer hover:bg-emerald-50'}
                  ${isToday ? 'bg-emerald-50' : ''}
                  ${isSelected ? 'ring-2 ring-inset ring-emerald-500' : ''}
                `}
              >
                {day && (
                  <>
                    <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-emerald-700' : 'text-gray-900'}`}>
                      {format(day, 'd')}
                    </div>
                    {dayPlans.length > 0 && (
                      <div className="space-y-1">
                        {dayPlans.slice(0, 3).map(p => (
                          <div key={p.id} className="text-xs bg-emerald-100 text-emerald-800 rounded px-1.5 py-0.5 truncate">
                            {p.name}
                          </div>
                        ))}
                        {dayPlans.length > 3 && (
                          <div className="text-xs text-gray-500">+{dayPlans.length - 3} more</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Side Panel */}
      {panelOpen && (
        <div className="fixed inset-0 overflow-hidden z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPanelOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-xl flex flex-col">

            {/* Panel Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Selected date</p>
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedDate && format(selectedDate, 'EEE, MMM d, yyyy')}
                </h2>
              </div>
              <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {panelError && <ErrorState error={panelError} onRetry={() => handleDateClick(selectedDate)} />}

              {panelLoading ? (
                <div className="py-8 flex justify-center"><LoadingSpinner /></div>
              ) : (
                <ul className="space-y-2">
                  {selectedDatePlans.map(plan => (
                    <li key={plan.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="font-medium text-gray-900 text-sm">{plan.name}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">{plan.expected_mins} mins planned</span>
                        <span className="text-xs text-gray-400 capitalize">{plan.category}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Panel Footer */}
            {!panelLoading && (
              <div className="px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setPanelOpen(false)
                    navigate(`/log/${format(selectedDate, 'yyyy-MM-dd')}`)
                  }}
                  className="w-full px-4 py-2 bg-emerald-700 text-white rounded-md hover:bg-emerald-800 font-medium text-sm"
                >
                  Log Time for This Day →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
