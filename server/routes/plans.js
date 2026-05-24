import express from 'express'
import { body, query as queryValidator, validationResult } from 'express-validator'
import { query } from '../db/index.js'
import { getWeekStart } from '../utils/dates.js'

const router = express.Router()

router.get('/',
  queryValidator('week').isISO8601().toDate(),
  async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: 'Validation failed', details: errors.array() })
    }
    try {
      const weekDate = new Date(req.query.week)
      const weekStart = getWeekStart(weekDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const result = await query(
        `SELECT p.*, t.name, t.category FROM weekly_plans p
         JOIN tasks t ON p.task_id = t.id
         WHERE p.planned_date >= $1 AND p.planned_date <= $2
         ORDER BY p.planned_date`,
        [weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]]
      )
      res.json({ data: result.rows })
    } catch (err) {
      next(err)
    }
  }
)

router.post('/',
  body('task_id').isInt(),
  body('planned_date').isISO8601(),
  body('expected_mins').isInt({ min: 0 }),
  async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: 'Validation failed', details: errors.array() })
    }
    try {
      const { task_id, planned_date, expected_mins } = req.body
      const result = await query(
        'INSERT INTO weekly_plans (task_id, planned_date, expected_mins) VALUES ($1, $2, $3) RETURNING *',
        [task_id, planned_date, expected_mins]
      )
      res.status(201).json({ data: result.rows[0] })
    } catch (err) {
      next(err)
    }
  }
)

router.put('/:id',
  body('expected_mins').isInt({ min: 0 }),
  async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: 'Validation failed', details: errors.array() })
    }
    try {
      const { id } = req.params
      const { expected_mins } = req.body
      const result = await query(
        'UPDATE weekly_plans SET expected_mins = $1 WHERE id = $2 RETURNING *',
        [expected_mins, id]
      )
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Plan not found' })
      }
      res.json({ data: result.rows[0] })
    } catch (err) {
      next(err)
    }
  }
)

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await query('DELETE FROM weekly_plans WHERE id = $1 RETURNING *', [id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Plan not found' })
    }
    res.json({ data: result.rows[0] })
  } catch (err) {
    next(err)
  }
})

export default router
