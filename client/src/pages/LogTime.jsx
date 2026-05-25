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

  // Merge plans and sessions into unified rows keyed by task_id
  const allTaskIds = [...new Set([
    ...plans.map(p => p.task_id),
    ...sessions.map(s => s.task_id),
  ])]

  const tableRows = allTaskIds.map(taskId => {
    const plan = plans.find(p => p.task_id === taskId)
    const taskSessions = sessions.filter(s => s.task_id === taskId)
    const task = tasks.find(t => t.id === taskId)
    return {
      taskId,
      name: plan?.name ?? task?.name ?? '—',
      category: plan?.category ?? task?.category ?? 'other',
      planned: plan?.expected_mins ?? null,
      planId: plan?.id ?? null,
      sessions: taskSessions,
      actual: taskSessions.reduce((sum, s) => sum + s.actual_mins, 0),
    }
  })

  return (
    <div className="py-8 max-w-3xl mx-auto">
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

          {/* Log Time Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-1">Log Actual Time</h2>
            <p className="text-xs text-gray-500 mb-4">Click a row in the table below to pre-fill.</p>

            {formError && <ErrorState error={formError} />}

            <form onSubmit={handleSubmit} className="grid grid-cols-5 gap-3 mt-4 items-end">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Task</label>
                <select
                  value={form.task_id}
                  onChange={e => setForm(f => ({ ...f, task_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-sm"
                  disabled={isSubmitting}
                >
                  <option value="">Select a task</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minutes</label>
                <input
                  type="number"
                  min="1"
                  step="15"
                  value={form.actual_mins}
                  onChange={e => setForm(f => ({ ...f, actual_mins: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-sm"
                  placeholder="e.g. 90"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-sm"
                  placeholder="Optional"
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-sm"
              >
                {isSubmitting && <LoadingSpinner size="sm" />}
                {isSubmitting ? 'Saving...' : 'Log'}
              </button>
            </form>
          </div>

          {/* Unified Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Tasks</h2>
              <span className="text-sm text-gray-500">
                {totalLogged} / {totalPlanned} mins logged
              </span>
            </div>

            {tableRows.length === 0 ? (
              <EmptyState
                title="No tasks planned"
                description="Add tasks for this day in Weekly Plan."
                action={() => navigate('/plan')}
                actionText="Go to Weekly Plan"
              />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Planned Task</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Planned</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(row => (
                    <>
                      <tr
                        key={row.taskId}
                        onClick={() => row.planned !== null && prefillFromPlan({ task_id: row.taskId, expected_mins: row.planned })}
                        className={`border-b border-gray-100 ${row.planned !== null ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[row.category]}`}>
                              {row.category}
                            </span>
                            <span className="font-medium text-gray-900">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">
                          {row.planned !== null ? `${row.planned}` : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold">
                          {row.actual > 0 ? (
                            <span className={
                              row.planned !== null && row.actual > row.planned * 1.5
                                ? 'text-red-600'
                                : row.planned !== null && row.actual > row.planned
                                ? 'text-amber-600'
                                : 'text-green-600'
                            }>
                              {row.actual}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-500">
                          {row.sessions.length > 0 ? row.sessions.length : '—'}
                        </td>
                      </tr>
                      {row.sessions.map(session => (
                        <tr key={session.id} className="bg-gray-50 border-b border-gray-100">
                          <td className="pl-14 pr-6 py-2 text-xs text-gray-500 italic">
                            {session.note || 'No note'}
                          </td>
                          <td />
                          <td className="px-6 py-2 text-right text-xs text-gray-600">{session.actual_mins}</td>
                          <td className="px-6 py-2 text-right">
                            <button
                              onClick={() => handleDelete(session.id)}
                              disabled={deletingId === session.id}
                              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                            >
                              {deletingId === session.id ? <LoadingSpinner size="sm" /> : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-700">Total</td>
                    <td className="px-6 py-3 text-right text-sm font-semibold text-gray-700">{totalPlanned}</td>
                    <td className="px-6 py-3 text-right text-sm font-semibold text-gray-700">{totalLogged}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
