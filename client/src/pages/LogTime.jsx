import { useState, useEffect, useRef } from 'react'
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
  const inputRef = useRef(null)

  const [plans, setPlans] = useState([])
  const [sessions, setSessions] = useState([])
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  // Inline edit state
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [savingTaskId, setSavingTaskId] = useState(null)

  useEffect(() => { fetchAll() }, [date])

  // Auto-focus input when edit starts
  useEffect(() => {
    if (editingTaskId !== null) inputRef.current?.focus()
  }, [editingTaskId])

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

  function startEdit(row) {
    setEditingTaskId(row.taskId)
    setEditValue(String(row.actual))
  }

  function cancelEdit() {
    setEditingTaskId(null)
    setEditValue('')
  }

  async function saveEdit(row) {
    const mins = parseInt(editValue) || 0
    setSavingTaskId(row.taskId)
    setEditingTaskId(null)
    try {
      // Delete all existing sessions for this task on this date
      await Promise.all(row.sessions.map(s => deleteSession(s.id)))

      let newSessions = sessions.filter(s => s.task_id !== row.taskId)

      // Create one new session if value > 0
      if (mins > 0) {
        const task = tasks.find(t => t.id === row.taskId)
        const created = await logSession(row.taskId, date, mins, '')
        newSessions = [{ ...created, name: task?.name, category: task?.category }, ...newSessions]
      }

      setSessions(newSessions)
    } catch (err) {
      setPageError(err.message || 'Failed to save')
      await fetchAll()
    } finally {
      setSavingTaskId(null)
      setEditValue('')
    }
  }

  function handleKeyDown(e, row) {
    if (e.key === 'Enter') saveEdit(row)
    if (e.key === 'Escape') cancelEdit()
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
      sessions: taskSessions,
      actual: taskSessions.reduce((sum, s) => sum + s.actual_mins, 0),
    }
  })

  function ratioColor(actual, planned) {
    if (planned === null || planned === 0) return 'text-gray-900'
    if (actual > planned * 1.5) return 'text-red-600 font-semibold'
    if (actual > planned) return 'text-amber-600 font-semibold'
    return 'text-green-600 font-semibold'
  }

  return (
    <div className="py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600">
          ← Back
        </button>
        <div>
          <p className="text-sm text-gray-500">Logging time for</p>
          <h1 className="text-2xl font-bold text-gray-900">{displayDate}</h1>
        </div>
      </div>

      {pageError && <div className="mb-6"><ErrorState error={pageError} onRetry={fetchAll} /></div>}

      {isLoading ? (
        <LoadingState message="Loading..." />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Tasks</h2>
            <span className="text-sm text-gray-500">{totalLogged} / {totalPlanned} mins logged</span>
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
                    <tr key={row.taskId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[row.category]}`}>
                            {row.category}
                          </span>
                          <span className="font-medium text-gray-900">{row.name}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right text-gray-600">
                        {row.planned !== null ? row.planned : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Inline-editable Actual cell */}
                      <td className="px-6 py-4 text-right">
                        {savingTaskId === row.taskId ? (
                          <span className="flex items-center justify-end gap-1 text-gray-400">
                            <LoadingSpinner size="sm" /> Saving...
                          </span>
                        ) : editingTaskId === row.taskId ? (
                          <input
                            ref={inputRef}
                            type="number"
                            min="0"
                            step="15"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={() => saveEdit(row)}
                            onKeyDown={e => handleKeyDown(e, row)}
                            className="w-20 px-2 py-1 text-right border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        ) : (
                          <span
                            onClick={() => startEdit(row)}
                            className={`cursor-pointer px-2 py-1 rounded hover:bg-blue-50 hover:ring-1 hover:ring-blue-300 transition ${ratioColor(row.actual, row.planned)}`}
                            title="Click to edit"
                          >
                            {row.actual}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right text-gray-500">
                        {row.sessions.length > 0 ? row.sessions.length : '—'}
                      </td>
                    </tr>

                    {/* Session sub-rows */}
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
          <p className="px-6 py-3 text-xs text-gray-400">Click any value in the Actual column to edit</p>
        </div>
      )}
    </div>
  )
}
