const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export async function getTasks() {
  const res = await fetch(`${API_URL}/api/tasks`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.data
}

export async function createTask(name, category) {
  const res = await fetch(`${API_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, category })
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.data
}

export async function deleteTask(id) {
  const res = await fetch(`${API_URL}/api/tasks/${id}`, { method: 'DELETE' })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.data
}
