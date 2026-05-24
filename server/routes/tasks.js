import express from 'express'
import { body, validationResult } from 'express-validator'
import { query } from '../db/index.js'

const router = express.Router()

router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM tasks ORDER BY created_at DESC')
    res.json({ data: result.rows })
  } catch (err) {
    next(err)
  }
})

router.post('/',
  body('name').trim().notEmpty(),
  body('category').isIn(['work', 'personal', 'health', 'learning', 'other']),
  async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: 'Validation failed', details: errors.array() })
    }
    try {
      const { name, category } = req.body
      const result = await query(
        'INSERT INTO tasks (name, category) VALUES ($1, $2) RETURNING *',
        [name, category]
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
    const result = await query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' })
    }
    res.json({ data: result.rows[0] })
  } catch (err) {
    next(err)
  }
})

export default router
