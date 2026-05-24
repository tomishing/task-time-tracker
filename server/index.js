import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { pool } from './db/index.js'
import tasksRouter from './routes/tasks.js'
import plansRouter from './routes/plans.js'
import sessionsRouter from './routes/sessions.js'
import summaryRouter from './routes/summary.js'

config()

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Routes
app.use('/api/tasks', tasksRouter)
app.use('/api/plans', plansRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/summary', summaryRouter)

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
