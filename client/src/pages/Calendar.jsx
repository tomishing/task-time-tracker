import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns'
import useSessionStore from '../store/useSessionStore'
import usePlanStore from '../store/usePlanStore'
import useTaskStore from '../store/useTaskStore'
import { getPlans } from '../api/plans'
import { logSession } from '../api/sessions'
import { getTasks } from '../api/tasks'

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ task_id: '', actual_mins: '', note: '' })
  const [error, setError] = useState('')

  const tasks = useTaskStore(state => state.tasks)
  const setTasks = useTaskStore(state => state.setTasks)
  const plans = usePlanStore(state => state.plans)
  const setPlans = usePlanStore(state => state.setPlans)

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    try {
      const data = await getTasks()
      setTasks(data)
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
    }
  }

  async function fetchPlansForDate(date) {
    try {
      const data = await getPlans(format(date, 'yyyy-MM-dd'))
      setPlans(data)
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    }
  }

  function handleDateClick(date) {
    setSelectedDate(date)
    fetchPlansForDate(date)
    setPanelOpen(true)
    setFormData({ task_id: '', actual_mins: '', note: '' })
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.task_id || !formData.actual_mins) {
      setError('Please select a task and enter minutes')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      await logSession(
        parseInt(formData.task_id),
        format(selectedDate, 'yyyy-MM-dd'),
        parseInt(formData.actual_mins),
        formData.note
      )
      setFormData({ task_id: '', actual_mins: '', note: '' })
      setError('')
      alert('Time logged successfully!')
      fetchPlansForDate(selectedDate)
    } catch (err) {
      setError(err.message || 'Failed to log time')
    } finally {
      setIsLoading(false)
    }
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const firstDayOfWeek = getDay(monthStart)
  const paddingDays = Array(firstDayOfWeek).fill(null)
  const calendarDays = [...paddingDays, ...daysInMonth]

  const plannedTasks = selectedDate ? plans.filter(p => p.planned_date === format(selectedDate, 'yyyy-MM-dd')) : []

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{format(currentDate, 'MMMM yyyy')}</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            ← Prev
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-4 text-center font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => (
            <div
              key={idx}
              onClick={() => day && handleDateClick(day)}
              className={`min-h-24 p-3 border border-gray-200 ${
                !day ? 'bg-gray-50' : 'cursor-pointer hover:bg-blue-50'
              } ${day && isSameDay(day, new Date()) ? 'bg-blue-100' : ''}`}
            >
              {day && (
                <>
                  <div className="font-semibold text-gray-900">{format(day, 'd')}</div>
                  {plans.filter(p => p.planned_date === format(day, 'yyyy-MM-dd')).length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {plans.filter(p => p.planned_date === format(day, 'yyyy-MM-dd')).length} planned
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Side Panel */}
      {panelOpen && (
        <div className="fixed inset-0 overflow-hidden z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPanelOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-white shadow-lg flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select Date'}
              </h2>
              <button
                onClick={() => setPanelOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Planned Tasks */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Planned Tasks</h3>
                {plannedTasks.length > 0 ? (
                  <div className="space-y-2">
                    {plannedTasks.map(plan => (
                      <div key={plan.id} className="p-3 bg-gray-50 rounded">
                        <div className="font-medium text-gray-900">{plan.name}</div>
                        <div className="text-sm text-gray-600">
                          {plan.expected_mins} mins expected
                        </div>
                        <div className="text-xs text-gray-500">
                          Category: {plan.category}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No tasks planned for this date</p>
                )}
              </div>

              {/* Log Time Form */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Log Time</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task
                    </label>
                    <select
                      value={formData.task_id}
                      onChange={e => setFormData({ ...formData, task_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isLoading}
                    >
                      <option value="">Select a task</option>
                      {tasks.map(task => (
                        <option key={task.id} value={task.id}>
                          {task.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="15"
                      value={formData.actual_mins}
                      onChange={e => setFormData({ ...formData, actual_mins: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 60"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note (optional)
                    </label>
                    <textarea
                      value={formData.note}
                      onChange={e => setFormData({ ...formData, note: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What did you work on?"
                      rows="3"
                      disabled={isLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Logging...' : 'Log Time'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
