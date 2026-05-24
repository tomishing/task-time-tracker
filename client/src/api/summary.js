const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export async function getSummary(period, date) {
  const res = await fetch(`${API_URL}/api/summary?period=${period}&date=${date}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json.data
}
