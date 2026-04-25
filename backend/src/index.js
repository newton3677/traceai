const express = require('express')
const cors = require('cors')
require('dotenv').config()

const { uploadTestFileToShelby } = require('./shelbyTestUpload')

const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'traceai-backend' })
})

const port = Number(process.env.PORT) || 3001
app.listen(port, () => {
  console.log(`TraceAI API listening on http://localhost:${port}`)
  uploadTestFileToShelby().catch((err) => {
    console.error('[TraceAI] Shelby upload failed:', err)
  })
})

