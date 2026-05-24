const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export async function logSession(taskId, loggedDate, actualMins, note = '') {
  const res = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task_id: taskId,
      logged_date: loggedDate,
      actual_mins: actualMins,
      note
    })
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.data
}

export async function deleteSession(id) {
  const res = await fetch(`${API_URL}/api/sessions/${id}`, { method: 'DELETE' })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.data
}
