import { useState, useEffect } from 'react'
import { format, startOfWeek, addDays, subWeeks, addWeeks, isSameDay } from 'date-fns'
import useTaskStore from '../store/useTaskStore'
import usePlanStore from '../store/usePlanStore'
import { getTasks } from '../api/tasks'
import { getPlans, createPlan, updatePlan, deletePlan } from '../api/plans'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

export default function WeeklyPlan() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()))
  const [isLoading, setIsLoading] = useState(false)
  const [tasksLoading, setTasksLoading] = useState(true)
  const [formData, setFormData] = useState({ task_id: '', planned_date: '', expected_mins: '' })
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [updateError, setUpdateError] = useState('')

  const tasks = useTaskStore(state => state.tasks)
  const setTasks = useTaskStore(state => state.setTasks)
  const plans = usePlanStore(state => state.plans)
  const setPlans = usePlanStore(state => state.setPlans)
  const addPlanToStore = usePlanStore(state => state.addPlan)
  const removePlanFromStore = usePlanStore(state => state.removePlan)
  const updatePlanInStore = usePlanStore(state => state.updatePlan)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  useEffect(() => {
    fetchTasks()
    fetchPlans()
  }, [weekStart])

  async function fetchTasks() {
    setTasksLoading(true)
    setError('')
    try {
      const data = await getTasks()
      setTasks(data)
    } catch (err) {
      setError(err.message || 'Failed to load tasks')
    } finally {
      setTasksLoading(false)
    }
  }

  async function fetchPlans() {
    setError('')
    try {
      const data = await getPlans(format(weekStart, 'yyyy-MM-dd'))
      setPlans(data)
    } catch (err) {
      setError(err.message || 'Failed to load plans')
    }
  }

  async function handleAddPlan(e) {
    e.preventDefault()
    if (!formData.task_id || !formData.planned_date || !formData.expected_mins) {
      setFormError('Please fill in all fields')
      return
    }

    setIsLoading(true)
    setFormError('')
    try {
      const taskData = tasks.find(t => t.id === parseInt(formData.task_id))
      const dates = formData.planned_date === 'whole_week'
        ? weekDays.map(d => format(d, 'yyyy-MM-dd'))
        : [formData.planned_date]

      const created = await Promise.all(
        dates.map(d => createPlan(parseInt(formData.task_id), d, parseInt(formData.expected_mins)))
      )
      created.forEach(newPlan => {
        addPlanToStore({ ...newPlan, name: taskData?.name, category: taskData?.category })
      })

      setFormData({ task_id: '', planned_date: '', expected_mins: '' })
      setFormError('')
    } catch (err) {
      setFormError(err.message || 'Failed to create plan')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUpdatePlan(id, expectedMins) {
    setUpdateError('')
    try {
      await updatePlan(id, expectedMins)
      updatePlanInStore(id, { expected_mins: expectedMins })
    } catch (err) {
      setUpdateError(err.message || 'Failed to update plan')
    }
  }

  async function handleDeletePlan(id) {
    if (!confirm('Delete this plan?')) return
    setUpdateError('')
    try {
      await deletePlan(id)
      removePlanFromStore(id)
    } catch (err) {
      setUpdateError(err.message || 'Failed to delete plan')
    }
  }

  const plansForDate = (date) => plans.filter(p => p.planned_date.slice(0, 10) === format(date, 'yyyy-MM-dd'))
  const totalMinutesForDay = (date) =>
    plansForDate(date).reduce((sum, p) => sum + p.expected_mins, 0)

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Week of {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </h1>
        <div className="flex gap-4">
          <button
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="px-4 py-2 bg-stone-200 rounded hover:bg-stone-300"
          >
            ← Prev Week
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="px-4 py-2 bg-stone-200 rounded hover:bg-stone-300"
          >
            This Week
          </button>
          <button
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="px-4 py-2 bg-stone-200 rounded hover:bg-stone-300"
          >
            Next Week →
          </button>
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={fetchPlans} />}

      {/* Add Plan Form */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Add Task to Week</h2>
        {formError && <ErrorState error={formError} />}
        {updateError && <ErrorState error={updateError} />}
        <form onSubmit={handleAddPlan} className="grid grid-cols-5 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task</label>
            <select
              value={formData.task_id}
              onChange={e => setFormData({ ...formData, task_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
              disabled={isLoading || tasksLoading}
            >
              <option value="">Select task</option>
              {tasks.map(task => (
                <option key={task.id} value={task.id}>
                  {task.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <select
              value={formData.planned_date}
              onChange={e => setFormData({ ...formData, planned_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
              disabled={isLoading}
            >
              <option value="">Select date</option>
              <option value="whole_week">📅 Whole Week</option>
              {weekDays.map(day => (
                <option key={format(day, 'yyyy-MM-dd')} value={format(day, 'yyyy-MM-dd')}>
                  {format(day, 'EEE, MMM d')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minutes</label>
            <input
              type="number"
              min="0"
              step="15"
              value={formData.expected_mins}
              onChange={e => setFormData({ ...formData, expected_mins: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
              placeholder="e.g., 120"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-emerald-700 text-white rounded-md hover:bg-emerald-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <LoadingSpinner size="sm" />}
              {isLoading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>

      {/* Weekly Grid */}
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map(day => (
          <div key={format(day, 'yyyy-MM-dd')} className="bg-white rounded-lg shadow p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900">{format(day, 'EEE')}</h3>
              <p className="text-sm text-gray-600">{format(day, 'MMM d')}</p>
              <p className="text-xs text-gray-500 mt-2">
                {totalMinutesForDay(day)} mins planned
              </p>
            </div>

            <div className="space-y-2">
              {plansForDate(day).length > 0 ? (
                plansForDate(day).map(plan => (
                  <div key={plan.id} className="p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {plan.name}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {plan.expected_mins} mins
                        </p>
                        <div className="text-xs text-gray-500 mt-1">
                          {plan.category}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="text-red-600 hover:text-red-700 font-bold"
                      >
                        ×
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="15"
                      value={plan.expected_mins}
                      onChange={e => handleUpdatePlan(plan.id, parseInt(e.target.value))}
                      className="w-full mt-2 px-2 py-1 text-xs border border-gray-300 rounded"
                      placeholder="Update mins"
                    />
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 italic py-4">
                  <p>No tasks</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Summary */}
      <div className="mt-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Week Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Planned Minutes</p>
            <p className="text-3xl font-bold text-emerald-700">
              {weekDays.reduce((sum, day) => sum + totalMinutesForDay(day), 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Average Per Day</p>
            <p className="text-3xl font-bold text-emerald-700">
              {Math.round(weekDays.reduce((sum, day) => sum + totalMinutesForDay(day), 0) / 7)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
