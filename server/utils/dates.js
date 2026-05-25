export function getWeekStart(date) {
  const d = new Date(date)
  const diff = d.getDate() - d.getDay()
  return new Date(d.setDate(diff))
}

export function getMonthStart(date) {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
