import { useState, useEffect } from 'react'
import useTaskStore from '../store/useTaskStore'
import { getTasks, createTask, deleteTask } from '../api/tasks'
import LoadingState from '../components/LoadingState'
import ErrorState from '../components/ErrorState'
import EmptyState from '../components/EmptyState'
import LoadingSpinner from '../components/LoadingSpinner'

const CATEGORIES = ['work', 'personal', 'health', 'learning', 'other']

const CATEGORY_COLORS = {
  work: 'bg-emerald-100 text-emerald-800',
  personal: 'bg-purple-100 text-purple-800',
  health: 'bg-green-100 text-green-800',
  learning: 'bg-amber-100 text-amber-800',
  other: 'bg-gray-100 text-gray-800',
}

export default function Tasks() {
  const [form, setForm] = useState({ name: '', category: 'work' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')

  const tasks = useTaskStore(state => state.tasks)
  const setTasks = useTaskStore(state => state.setTasks)
  const addTask = useTaskStore(state => state.addTask)
  const removeTask = useTaskStore(state => state.removeTask)

  useEffect(() => {
    fetchTasks()
  }, [])

  async function fetchTasks() {
    setIsLoading(true)
    setPageError('')
    try {
      const data = await getTasks()
      setTasks(data)
    } catch (err) {
      setPageError(err.message || 'Failed to load tasks')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setFormError('Task name is required')
      return
    }

    setIsSubmitting(true)
    setFormError('')
    try {
      const task = await createTask(form.name.trim(), form.category)
      addTask(task)
      setForm({ name: '', category: 'work' })
    } catch (err) {
      setFormError(err.message || 'Failed to create task')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"?\n\nThis will also delete all associated plans and time logs.`)) return

    setDeletingId(id)
    setPageError('')
    try {
      await deleteTask(id)
      removeTask(id)
    } catch (err) {
      setPageError(err.message || 'Failed to delete task')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Tasks</h1>

      {/* Add Task Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Task</h2>

        {formError && <ErrorState error={formError} />}

        <form onSubmit={handleAdd} className="flex gap-3 mt-4">
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Task name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
            disabled={isSubmitting}
          />
          <select
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
            disabled={isSubmitting}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-emerald-700 text-white rounded-md hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {isSubmitting && <LoadingSpinner size="sm" />}
            {isSubmitting ? 'Adding...' : 'Add Task'}
          </button>
        </form>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            All Tasks
            {!isLoading && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({tasks.length})
              </span>
            )}
          </h2>
        </div>

        {pageError && (
          <div className="p-6">
            <ErrorState error={pageError} onRetry={fetchTasks} />
          </div>
        )}

        {isLoading ? (
          <LoadingState message="Loading tasks..." />
        ) : tasks.length === 0 ? (
          <EmptyState
            title="No tasks yet"
            description="Add your first task above to start planning and tracking time."
          />
        ) : (
          <ul className="divide-y divide-gray-200">
            {tasks.map(task => (
              <li key={task.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[task.category]}`}>
                    {task.category}
                  </span>
                  <span className="text-gray-900 font-medium">{task.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(task.id, task.name)}
                  disabled={deletingId === task.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 transition"
                >
                  {deletingId === task.id ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
