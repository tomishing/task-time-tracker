import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { getPlans } from '../api/plans'
import { getSessions, logSession, deleteSession } from '../api/sessions'
import { getTasks } from '../api/tasks'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'

const CATEGORY_COLORS = {
  work: 'bg-blue-100 text-blue-800',
  personal: 'bg-purple-100 text-purple-800',
  health: 'bg-green-100 text-green-800',
  learning: 'bg-amber-100 text-amber-800',
  other: 'bg-gray-100 text-gray-800',
}

export default function LogTime() {
  const { date } = useParams()
  const navigate = useNavigate()

  const [plans, setPlans] = useState([])
  const [sessions, setSessions] = useState([])
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [pageError, setPageError] = useState('')
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ task_id: '', actual_mins: '', note: '' })

  useEffect(() => {
    fetchAll()
  }, [date])

  async function fetchAll() {
    setIsLoading(true)
    setPageError('')
    try {
      const [plansData, sessionsData, tasksData] = await Promise.all([
        getPlans(date),
        getSessions(date),
        getTasks(),
      ])
      setPlans(plansData.filter(p => p.planned_date.slice(0, 10) === date))
      setSessions(sessionsData)
      setTasks(tasksData)
    } catch (err) {
      setPageError(err.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  function prefillFromPlan(plan) {
    setForm(f => ({ ...f, task_id: String(plan.task_id), actual_mins: String(plan.expected_mins) }))
    setFormError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.task_id || !form.actual_mins) {
      setFormError('Please select a task and enter minutes')
      return
    }
    setIsSubmitting(true)
    setFormError('')
    try {
      const session = await logSession(
        parseInt(form.task_id),
        date,
        parseInt(form.actual_mins),
        form.note
      )
      // Attach task name/category for display
      const task = tasks.find(t => t.id === session.task_id)
      setSessions(prev => [{ ...session, name: task?.name, category: task?.category }, ...prev])
      setForm({ task_id: '', actual_mins: '', note: '' })
    } catch (err) {
      setFormError(err.message || 'Failed to log time')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this time log?')) return
    setDeletingId(id)
    try {
      await deleteSession(id)
      setSessions(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      setPageError(err.message || 'Failed to delete session')
    } finally {
      setDeletingId(null)
    }
  }

  const displayDate = (() => {
    try { return format(parseISO(date), 'EEEE, MMMM d, yyyy') }
    catch { return date }
  })()

  const totalLogged = sessions.reduce((sum, s) => sum + s.actual_mins, 0)
  const totalPlanned = plans.reduce((sum, p) => sum + p.expected_mins, 0)

  return (
    <div className="py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-gray-400 hover:text-gray-600"
        >
          ← Back
        </button>
        <div>
          <p className="text-sm text-gray-500">Logging time for</p>
          <h1 className="text-2xl font-bold text-gray-900">{displayDate}</h1>
        </div>
      </div>

      {pageError && <ErrorState error={pageError} onRetry={fetchAll} />}

      {isLoading ? (
        <LoadingState message="Loading..." />
      ) : (
        <div className="space-y-6">

          {/* Planned Tasks */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Planned Tasks</h2>
              <span className="text-sm text-gray-500">{totalPlanned} mins planned</span>
            </div>
            {plans.length === 0 ? (
              <EmptyState
                title="No tasks planned"
                description="Add tasks for this day in Weekly Plan."
                action={() => navigate('/plan')}
                actionText="Go to Weekly Plan"
              />
            ) : (
              <ul className="divide-y divide-gray-100">
                {plans.map(plan => (
                  <li
                    key={plan.id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => prefillFromPlan(plan)}
                    title="Click to pre-fill form"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[plan.category]}`}>
                        {plan.category}
                      </span>
                      <span className="text-gray-900 font-medium text-sm">{plan.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{plan.expected_mins} mins</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Log Time Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Log Actual Time</h2>
            <p className="text-xs text-gray-500 mb-4">Click a planned task above to pre-fill the form.</p>

            {formError && <ErrorState error={formError} />}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task</label>
                <select
                  value={form.task_id}
                  onChange={e => setForm(f => ({ ...f, task_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  disabled={isSubmitting}
                >
                  <option value="">Select a task</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actual Minutes</label>
                <input
                  type="number"
                  min="1"
                  step="15"
                  value={form.actual_mins}
                  onChange={e => setForm(f => ({ ...f, actual_mins: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="e.g. 90"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <textarea
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="What did you work on?"
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
              >
                {isSubmitting && <LoadingSpinner size="sm" />}
                {isSubmitting ? 'Saving...' : 'Log Time'}
              </button>
            </form>
          </div>

          {/* Logged Sessions */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Logged Today</h2>
              <span className="text-sm text-gray-500">{totalLogged} mins total</span>
            </div>
            {sessions.length === 0 ? (
              <EmptyState title="Nothing logged yet" description="Use the form above to log your first entry." />
            ) : (
              <ul className="divide-y divide-gray-100">
                {sessions.map(session => (
                  <li key={session.id} className="flex items-start justify-between px-6 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[session.category] || CATEGORY_COLORS.other}`}>
                          {session.category}
                        </span>
                        <span className="font-medium text-gray-900 text-sm">{session.name}</span>
                        <span className="text-sm text-gray-600">{session.actual_mins} mins</span>
                      </div>
                      {session.note && (
                        <p className="text-xs text-gray-500 mt-1 ml-0">{session.note}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(session.id)}
                      disabled={deletingId === session.id}
                      className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 disabled:opacity-50 ml-4"
                    >
                      {deletingId === session.id ? <LoadingSpinner size="sm" /> : 'Delete'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
