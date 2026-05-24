import { useState, useEffect } from 'react'
import { format, subDays, subMonths } from 'date-fns'
import {
  BarChart,
  Bar,
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

  const categoryData = summary?.by_category || []
  const taskData = summary?.by_task || []

  return (
    <div className="py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-2">
          {['daily', 'weekly', 'monthly'].map(p => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-4 py-2 rounded font-medium transition ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
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
