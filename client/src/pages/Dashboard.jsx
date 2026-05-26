import { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, subDays, addDays, subMonths, addMonths } from 'date-fns'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { getSummary } from '../api/summary'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'

const TASK_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
]

export default function Dashboard() {
  const [period, setPeriod] = useState('weekly')
  const [date, setDate] = useState(new Date())
  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSummary()
  }, [period, date])

  async function fetchSummary() {
    setIsLoading(true)
    setError('')
    try {
      const data = await getSummary(period, format(date, 'yyyy-MM-dd'))
      setSummary(data)
    } catch (err) {
      setError(err.message || 'Failed to fetch summary')
    } finally {
      setIsLoading(false)
    }
  }

  function handlePeriodChange(newPeriod) {
    setPeriod(newPeriod)
    if (newPeriod === 'daily') {
      setDate(new Date())
    } else if (newPeriod === 'weekly') {
      setDate(new Date())
    } else if (newPeriod === 'monthly') {
      setDate(new Date())
    }
  }

  function getRatioColor(ratio) {
    if (ratio === null) return 'text-gray-500'
    if (ratio > 1.5) return 'text-red-600 bg-red-50'
    if (ratio > 1) return 'text-amber-600 bg-amber-50'
    return 'text-green-600 bg-green-50'
  }

  function getRatioRing(ratio) {
    if (ratio === null) return 'border-gray-300'
    if (ratio > 1.5) return 'border-red-300'
    if (ratio > 1) return 'border-amber-300'
    return 'border-green-300'
  }

  function periodLabel() {
    if (period === 'daily') return format(date, 'EEEE, MMMM d, yyyy')
    if (period === 'weekly') {
      const start = startOfWeek(date)
      const end = endOfWeek(date)
      if (format(start, 'yyyy') !== format(end, 'yyyy'))
        return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`
      if (format(start, 'MMM') !== format(end, 'MMM'))
        return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
      return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`
    }
    return format(date, 'MMMM yyyy')
  }

  function getTaskNamesFromDayTask(byDayTask) {
    if (!byDayTask || byDayTask.length === 0) return []
    const names = new Set()
    byDayTask.forEach(day => {
      Object.keys(day).forEach(key => {
        if (key !== 'day' && key !== 'date') names.add(key)
      })
    })
    return Array.from(names).sort()
  }

  const categoryData = summary?.by_category || []
  const taskData = summary?.by_task || []
  const dayTaskData = summary?.by_day_task || []
  const taskNames = getTaskNamesFromDayTask(dayTaskData)
  const weekTaskData = summary?.by_week_task || []

  const WEEK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
  const WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Week 4']

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">{periodLabel()}</p>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row">
          {/* Period buttons */}
          <div className="flex gap-1">
            {['daily', 'weekly', 'monthly'].map(p => (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`px-3 py-2 rounded text-sm font-medium transition ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Date navigation */}
          <div className="flex gap-1">
            <button
              onClick={() => {
                if (period === 'daily') setDate(subDays(date, 1))
                else if (period === 'weekly') setDate(subDays(date, 7))
                else setDate(subMonths(date, 1))
              }}
              className="px-3 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 text-sm"
            >
              ← Prev
            </button>
            <button
              onClick={() => setDate(new Date())}
              className="px-3 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 text-sm"
            >
              Today
            </button>
            <button
              onClick={() => {
                if (period === 'daily') setDate(addDays(date, 1))
                else if (period === 'weekly') setDate(addDays(date, 7))
                else setDate(addMonths(date, 1))
              }}
              className="px-3 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 text-sm"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={fetchSummary} />}

      {isLoading ? (
        <LoadingState message="Loading dashboard..." />
      ) : summary ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Total Actual</p>
              <p className="text-4xl font-bold text-gray-900">
                {summary.total_actual_mins}
              </p>
              <p className="text-xs text-gray-500 mt-2">minutes</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600 mb-2">Total Expected</p>
              <p className="text-4xl font-bold text-gray-900">
                {summary.total_expected_mins}
              </p>
              <p className="text-xs text-gray-500 mt-2">minutes</p>
            </div>

            <div className={`bg-white rounded-lg shadow p-6 border-2 ${getRatioRing(summary.ratio)}`}>
              <p className="text-sm text-gray-600 mb-2">Ratio</p>
              {summary.ratio !== null ? (
                <>
                  <p className={`text-4xl font-bold ${getRatioColor(summary.ratio)}`}>
                    {(summary.ratio * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {summary.ratio > 1 ? 'Over target' : 'Under target'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-4xl font-bold text-gray-500">—</p>
                  <p className="text-xs text-gray-500 mt-2">No expected time</p>
                </>
              )}
            </div>
          </div>

          {/* Weekly Line Chart */}
          {period === 'weekly' && dayTaskData.length > 0 && taskNames.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Task Progress</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dayTaskData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {taskNames.map((name, idx) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={TASK_COLORS[idx % TASK_COLORS.length]}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly clustered bar chart */}
          {period === 'monthly' && weekTaskData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actual Time by Task and Week</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weekTaskData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" height={60} interval={0} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {WEEKS.map((week, idx) => (
                    <Bar key={week} dataKey={week} fill={WEEK_COLORS[idx]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Category Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">By Category</h2>
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="actual_mins" fill="#3b82f6" name="Actual" />
                    <Bar dataKey="expected_mins" fill="#9ca3af" name="Expected" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">No data</p>
              )}
            </div>

            {/* Task Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">By Task</h2>
              {taskData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={taskData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="actual_mins" fill="#3b82f6" name="Actual" />
                    <Bar dataKey="expected_mins" fill="#9ca3af" name="Expected" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">No data</p>
              )}
            </div>
          </div>

          {/* Task Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Task Breakdown</h2>
            </div>

            {taskData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Task
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actual (mins)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Expected (mins)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Ratio
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskData.map((task, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {task.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {task.actual_mins}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {task.expected_mins}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {task.ratio !== null ? (
                            <span
                              className={`px-3 py-1 rounded-full font-semibold ${getRatioColor(
                                task.ratio
                              )}`}
                            >
                              {(task.ratio * 100).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-gray-500">
                No task data for this period
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-8 p-4 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-3">Ratio Legend</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-gray-700">
                  <span className="font-medium">≤100%</span> — On target
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-amber-500"></div>
                <span className="text-gray-700">
                  <span className="font-medium">100-150%</span> — Over target
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span className="text-gray-700">
                  <span className="font-medium">&gt;150%</span> — Far over target
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
