const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export async function getPlans(week) {
  const res = await fetch(`${API_URL}/api/plans?week=${week}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.data
}

export async function getPlansForMonth(month) {
  const res = await fetch(`${API_URL}/api/plans?month=${month}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.data
}

export async function createPlan(taskId, plannedDate, expectedMins) {
  const res = await fetch(`${API_URL}/api/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId, planned_date: plannedDate, expected_mins: expectedMins })
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.data
}

export async function updatePlan(id, expectedMins) {
  const res = await fetch(`${API_URL}/api/plans/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expected_mins: expectedMins })
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.data
}

export async function deletePlan(id) {
  const res = await fetch(`${API_URL}/api/plans/${id}`, { method: 'DELETE' })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.data
}
