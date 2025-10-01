import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import 'dotenv/config'
import { pool } from './lib/db.js'
import { router as apiRouter } from './routes/api.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok:true }) }
  catch (e) { res.status(500).json({ ok:false, error:e.message }) }
})

app.use('/api', apiRouter)

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`Backend v5 running http://localhost:${port}`))
