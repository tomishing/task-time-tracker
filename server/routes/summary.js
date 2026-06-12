import express from 'express'
import { query as queryValidator, validationResult } from 'express-validator'
import { query } from '../db/index.js'
import { getWeekStart, getMonthStart } from '../utils/dates.js'

const router = express.Router()

router.get('/',
  queryValidator('period').isIn(['daily', 'weekly', 'monthly']),
  queryValidator('date').isISO8601().toDate(),
  async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: 'Validation failed', details: errors.array() })
    }
    try {
      const { period, date } = req.query
      const dateObj = new Date(date)
      let startDate, endDate

      if (period === 'daily') {
        startDate = dateObj.toISOString().split('T')[0]
        endDate = startDate
      } else if (period === 'weekly') {
        const weekStart = getWeekStart(dateObj)
        startDate = weekStart.toISOString().split('T')[0]
        endDate = new Date(weekStart)
        endDate.setDate(endDate.getDate() + 6)
        endDate = endDate.toISOString().split('T')[0]
      } else if (period === 'monthly') {
        const monthStart = getMonthStart(dateObj)
        startDate = monthStart.toISOString().split('T')[0]
        endDate = new Date(monthStart)
        endDate.setMonth(endDate.getMonth() + 1)
        endDate.setDate(0)
        endDate = endDate.toISOString().split('T')[0]
      }

      // Totals — aggregate each table independently to avoid cross-join inflation
      const totalResult = await query(
        `SELECT
           (SELECT COALESCE(SUM(actual_mins), 0)::int FROM time_sessions WHERE logged_date >= $1 AND logged_date <= $2) as total_actual_mins,
           (SELECT COALESCE(SUM(expected_mins), 0)::int FROM weekly_plans WHERE planned_date >= $1 AND planned_date <= $2) as total_expected_mins`,
        [startDate, endDate]
      )

      const { total_actual_mins: totalActual, total_expected_mins: totalExpected } = totalResult.rows[0]
      const ratio = totalExpected > 0 ? totalActual / totalExpected : null

      // By category — pre-aggregate each table before joining to avoid row multiplication
      const categoryResult = await query(
        `SELECT t.category,
                COALESCE(sess.actual_mins, 0)::int as actual_mins,
                COALESCE(plan.expected_mins, 0)::int as expected_mins,
                CASE
                  WHEN COALESCE(plan.expected_mins, 0) > 0
                  THEN COALESCE(sess.actual_mins, 0)::float / COALESCE(plan.expected_mins, 0)
                  ELSE NULL
                END as ratio
         FROM (SELECT DISTINCT category FROM tasks) t
         LEFT JOIN (
           SELECT tk.category, SUM(ts.actual_mins) as actual_mins
           FROM time_sessions ts JOIN tasks tk ON ts.task_id = tk.id
           WHERE ts.logged_date >= $1 AND ts.logged_date <= $2
           GROUP BY tk.category
         ) sess ON t.category = sess.category
         LEFT JOIN (
           SELECT tk.category, SUM(wp.expected_mins) as expected_mins
           FROM weekly_plans wp JOIN tasks tk ON wp.task_id = tk.id
           WHERE wp.planned_date >= $1 AND wp.planned_date <= $2
           GROUP BY tk.category
         ) plan ON t.category = plan.category`,
        [startDate, endDate]
      )

      // By task — pre-aggregate each table before joining to avoid row multiplication
      const taskResult = await query(
        `SELECT t.id as task_id, t.name,
                COALESCE(sess.actual_mins, 0)::int as actual_mins,
                COALESCE(plan.expected_mins, 0)::int as expected_mins,
                CASE
                  WHEN COALESCE(plan.expected_mins, 0) > 0
                  THEN COALESCE(sess.actual_mins, 0)::float / COALESCE(plan.expected_mins, 0)
                  ELSE NULL
                END as ratio
         FROM tasks t
         LEFT JOIN (
           SELECT task_id, SUM(actual_mins) as actual_mins
           FROM time_sessions
           WHERE logged_date >= $1 AND logged_date <= $2
           GROUP BY task_id
         ) sess ON t.id = sess.task_id
         LEFT JOIN (
           SELECT task_id, SUM(expected_mins) as expected_mins
           FROM weekly_plans
           WHERE planned_date >= $1 AND planned_date <= $2
           GROUP BY task_id
         ) plan ON t.id = plan.task_id
         WHERE COALESCE(sess.actual_mins, 0) > 0 OR COALESCE(plan.expected_mins, 0) > 0
         ORDER BY t.name`,
        [startDate, endDate]
      )

      const byCategory = categoryResult.rows.map(row => ({
        category: row.category,
        actual_mins: row.actual_mins,
        expected_mins: row.expected_mins,
        ratio: row.ratio
      }))

      const byTask = taskResult.rows.map(row => ({
        task_id: row.task_id,
        name: row.name,
        actual_mins: row.actual_mins,
        expected_mins: row.expected_mins,
        ratio: row.ratio
      }))

      // By day and task (for line chart in weekly view)
      let byDayTask = null
      if (period === 'weekly') {
        const dayTaskResult = await query(
          `SELECT ts.logged_date::text as logged_date, t.name,
                  COALESCE(SUM(ts.actual_mins), 0)::int as actual_mins
           FROM time_sessions ts
           JOIN tasks t ON ts.task_id = t.id
           WHERE ts.logged_date >= $1 AND ts.logged_date <= $2
           GROUP BY ts.logged_date::text, t.name, t.id
           ORDER BY ts.logged_date::text, t.name`,
          [startDate, endDate]
        )

        // Build data structure for line chart: one object per day
        const dayMap = new Map()
        const allDates = []
        for (let i = 0; i < 7; i++) {
          const d = new Date(startDate)
          d.setDate(d.getDate() + i)
          const dateStr = d.toISOString().split('T')[0]
          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
          dayMap.set(dateStr, { day: dayName, date: dateStr })
          allDates.push(dateStr)
        }

        dayTaskResult.rows.forEach(row => {
          if (dayMap.has(row.logged_date)) {
            dayMap.get(row.logged_date)[row.name] = row.actual_mins
          }
        })

        byDayTask = allDates.map(date => dayMap.get(date))
      }

      // By task and week (for clustered bar chart in monthly view)
      let byWeekTask = null
      if (period === 'monthly') {
        const weekTaskResult = await query(
          `SELECT t.name,
                  CASE
                    WHEN EXTRACT(DAY FROM ts.logged_date) <= 7  THEN 'Week 1'
                    WHEN EXTRACT(DAY FROM ts.logged_date) <= 14 THEN 'Week 2'
                    WHEN EXTRACT(DAY FROM ts.logged_date) <= 21 THEN 'Week 3'
                    ELSE 'Week 4'
                  END as week,
                  SUM(ts.actual_mins)::int as actual_mins
           FROM time_sessions ts
           JOIN tasks t ON ts.task_id = t.id
           WHERE ts.logged_date >= $1 AND ts.logged_date <= $2
           GROUP BY t.name, t.id, week
           ORDER BY t.name, week`,
          [startDate, endDate]
        )

        // Pivot into { name, 'Week 1': N, 'Week 2': N, ... } per task
        const taskMap = new Map()
        weekTaskResult.rows.forEach(row => {
          if (!taskMap.has(row.name)) {
            taskMap.set(row.name, { name: row.name })
          }
          taskMap.get(row.name)[row.week] = row.actual_mins
        })
        byWeekTask = Array.from(taskMap.values())
      }

      const response = {
        period,
        total_actual_mins: parseInt(totalActual),
        total_expected_mins: parseInt(totalExpected),
        ratio,
        by_category: byCategory,
        by_task: byTask
      }

      if (byDayTask !== null) response.by_day_task = byDayTask
      if (byWeekTask !== null) response.by_week_task = byWeekTask

      res.json({ data: response })
    } catch (err) {
      next(err)
    }
  }
)

export default router
