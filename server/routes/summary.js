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

      // Totals with ratio computed in SQL
      const totalResult = await query(
        `SELECT COALESCE(SUM(ts.actual_mins), 0)::int as total_actual_mins,
                COALESCE(SUM(wp.expected_mins), 0)::int as total_expected_mins,
                CASE
                  WHEN COALESCE(SUM(wp.expected_mins), 0) > 0
                  THEN COALESCE(SUM(ts.actual_mins), 0)::float / COALESCE(SUM(wp.expected_mins), 0)
                  ELSE NULL
                END as ratio
         FROM (SELECT actual_mins FROM time_sessions WHERE logged_date >= $1 AND logged_date <= $2) ts,
              (SELECT expected_mins FROM weekly_plans WHERE planned_date >= $1 AND planned_date <= $2) wp`,
        [startDate, endDate]
      )

      const { total_actual_mins: totalActual, total_expected_mins: totalExpected, ratio } = totalResult.rows[0]

      // By category with ratio computed in SQL
      const categoryResult = await query(
        `SELECT t.category,
                COALESCE(SUM(ts.actual_mins), 0)::int as actual_mins,
                COALESCE(SUM(wp.expected_mins), 0)::int as expected_mins,
                CASE
                  WHEN COALESCE(SUM(wp.expected_mins), 0) > 0
                  THEN COALESCE(SUM(ts.actual_mins), 0)::float / COALESCE(SUM(wp.expected_mins), 0)
                  ELSE NULL
                END as ratio
         FROM tasks t
         LEFT JOIN time_sessions ts ON t.id = ts.task_id AND ts.logged_date >= $1 AND ts.logged_date <= $2
         LEFT JOIN weekly_plans wp ON t.id = wp.task_id AND wp.planned_date >= $1 AND wp.planned_date <= $2
         GROUP BY t.category`,
        [startDate, endDate]
      )

      // By task with ratio computed in SQL
      const taskResult = await query(
        `SELECT t.id as task_id, t.name,
                COALESCE(SUM(ts.actual_mins), 0)::int as actual_mins,
                COALESCE(SUM(wp.expected_mins), 0)::int as expected_mins,
                CASE
                  WHEN COALESCE(SUM(wp.expected_mins), 0) > 0
                  THEN COALESCE(SUM(ts.actual_mins), 0)::float / COALESCE(SUM(wp.expected_mins), 0)
                  ELSE NULL
                END as ratio
         FROM tasks t
         LEFT JOIN time_sessions ts ON t.id = ts.task_id AND ts.logged_date >= $1 AND ts.logged_date <= $2
         LEFT JOIN weekly_plans wp ON t.id = wp.task_id AND wp.planned_date >= $1 AND wp.planned_date <= $2
         GROUP BY t.id, t.name
         HAVING COALESCE(SUM(ts.actual_mins), 0) > 0 OR COALESCE(SUM(wp.expected_mins), 0) > 0
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

      res.json({
        data: {
          period,
          total_actual_mins: parseInt(totalActual),
          total_expected_mins: parseInt(totalExpected),
          ratio,
          by_category: byCategory,
          by_task: byTask
        }
      })
    } catch (err) {
      next(err)
    }
  }
)

export default router
