import express from 'express'
import { body, validationResult } from 'express-validator'
import { query } from '../db/index.js'

const router = express.Router()

router.post('/',
  body('task_id').isInt(),
  body('logged_date').isISO8601(),
  body('actual_mins').isInt({ min: 0 }),
  body('note').optional().trim(),
  async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: 'Validation failed', details: errors.array() })
    }
    try {
      const { task_id, logged_date, actual_mins, note } = req.body
      const result = await query(
        'INSERT INTO time_sessions (task_id, logged_date, actual_mins, note) VALUES ($1, $2, $3, $4) RETURNING *',
        [task_id, logged_date, actual_mins, note || null]
      )
      res.status(201).json({ data: result.rows[0] })
    } catch (err) {
      next(err)
    }
  }
)

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await query('DELETE FROM time_sessions WHERE id = $1 RETURNING *', [id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }
    res.json({ data: result.rows[0] })
  } catch (err) {
    next(err)
  }
})

export default router
