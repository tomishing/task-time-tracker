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
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [savingTaskId, setSavingTaskId] = useState(null)
  const [timers, setTimers] = useState({})
  const [runningTimers, setRunningTimers] = useState(new Set())

  useEffect(() => { fetchAll() }, [date])

  useEffect(() => {
    if (editingTaskId !== null) inputRef.current?.focus()
  }, [editingTaskId])

  useEffect(() => {
    if (runningTimers.size === 0) return
    const interval = setInterval(() => {
      setTimers(prev => {
        const updated = { ...prev }
        runningTimers.forEach(taskId => {
          updated[taskId] = (updated[taskId] || 0) + 1
        })
        return updated
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [runningTimers])

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

  async function saveEdit(row, value = null) {
    const mins = value !== null ? parseInt(value) : parseInt(editValue) || 0
    setSavingTaskId(row.taskId)
    setEditingTaskId(null)
    try {
      await Promise.all(row.sessions.map(s => deleteSession(s.id)))
      let newSessions = sessions.filter(s => s.task_id !== row.taskId)
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

  function startTimer(taskId) {
    setRunningTimers(prev => new Set([...prev, taskId]))
  }

  function pauseTimer(taskId) {
    setRunningTimers(prev => {
      const next = new Set(prev)
      next.delete(taskId)
      return next
    })
  }

  function stopTimer(taskId, row) {
    pauseTimer(taskId)
    const timerValue = timers[taskId] || 0
    if (timerValue > 0) {
      setTimers(prev => ({ ...prev, [taskId]: 0 }))
      saveEdit(row, timerValue)
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
    <div className="py-8 max-w-5xl mx-auto">
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Planned Task</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Planned</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Timer</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(row => (
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

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-sm font-medium text-gray-700 min-w-12">
                            {timers[row.taskId] || 0}m
                          </span>
                          {runningTimers.has(row.taskId) ? (
                            <>
                              <button
                                onClick={() => pauseTimer(row.taskId)}
                                className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition"
                              >
                                Pause
                              </button>
                              <button
                                onClick={() => stopTimer(row.taskId, row)}
                                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition"
                              >
                                Stop
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startTimer(row.taskId)}
                              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition"
                            >
                              Start
                            </button>
                          )}
                        </div>
                      </td>

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
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-700">Total</td>
                    <td className="px-6 py-3 text-right text-sm font-semibold text-gray-700">{totalPlanned}</td>
                    <td />
                    <td className="px-6 py-3 text-right text-sm font-semibold text-gray-700">{totalLogged}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p className="px-6 py-3 text-xs text-gray-400">Click any value in the Actual column to edit • Use Timer to count elapsed time</p>
        </div>
      )}
    </div>
  )
}
