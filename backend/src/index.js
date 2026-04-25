const express = require('express')
const cors = require('cors')
require('dotenv').config()
const multer = require('multer')

const { uploadTestFileToShelby, uploadBufferToShelby, downloadBlobFromShelby } = require('./shelbyTestUpload')
const { putReceipt, getReceipt, listReceipts } = require('./receiptStore')
const { newReceiptId, sha256Hex, signReceiptPayload } = require('./receiptCrypto')

const app = express()
const upload = multer()

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'traceai-backend' })
})

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ ok: false, error: 'Missing file' })
    }

    const safeName = (req.file.originalname || 'upload.bin')
      .toString()
      .replace(/[^a-zA-Z0-9._-]+/g, '_')

    const blobName = `traceai/uploads/${Date.now()}-${safeName}`
    const { objectId, txHash } = await uploadBufferToShelby({
      blobData: req.file.buffer,
      blobName,
    })

    console.log('[TraceAI] Upload API success:', { objectId, txHash })
    return res.json({ ok: true, objectId, txHash })
  } catch (err) {
    console.error('[TraceAI] Upload API failed:', err)
    return res.status(500).json({ ok: false, error: 'Upload failed' })
  }
})

app.post('/ai-query', async (req, res) => {
  try {
    const { objectId, permissions } = req.body || {}
    if (!objectId) {
      return res.status(400).json({ ok: false, error: 'Missing objectId' })
    }

    const accessedAt = new Date().toISOString()
    const accessedFrom = {
      ip: req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    }
    const effectivePermissions = Array.isArray(permissions)
      ? permissions.map(String)
      : ['read:blob', 'simulate:ai-query']

    const blob = await downloadBlobFromShelby({ objectId })
    const dataSha256 = sha256Hex(blob.data)
    const datasetName = blob.blobName.split('/').pop() || blob.blobName

    console.log('[TraceAI] AI Query access log', {
      objectId,
      accessedAt,
      accessedFrom,
      permissions: effectivePermissions,
      bytes: blob.data.length,
      sha256: dataSha256,
    })

    const receiptId = newReceiptId()
    const receiptPayload = {
      receiptId,
      datasetName,
      objectId,
      accessedAt,
      accessedFrom,
      permissions: effectivePermissions,
      data: {
        bytes: blob.data.length,
        sha256: dataSha256,
      },
      shelby: {
        account: blob.account,
        blobName: blob.blobName,
        rpcBaseUrl: process.env.SHELBY_RPC_BASE_URL,
        network: process.env.SHELBY_NETWORK,
      },
    }

    const sig = signReceiptPayload(receiptPayload)
    const receipt = {
      ...receiptPayload,
      receiptHash: sig.receiptHash,
      signature: sig.signature,
      signatureAlgorithm: sig.algorithm,
    }

    putReceipt(receipt)
    return res.json({ ok: true, receipt })
  } catch (err) {
    console.error('[TraceAI] AI Query failed:', err)
    return res.status(500).json({ ok: false, error: 'AI query failed' })
  }
})

app.get('/receipts', (_req, res) => {
  return res.json({ ok: true, receipts: listReceipts() })
})

app.get('/receipts/:receiptId', (req, res) => {
  const receipt = getReceipt(req.params.receiptId)
  if (!receipt) return res.status(404).json({ ok: false, error: 'Not found' })
  return res.json({ ok: true, receipt })
})

const port = Number(process.env.PORT) || 3001
app.listen(port, () => {
  console.log(`TraceAI API listening on http://localhost:${port}`)
  uploadTestFileToShelby().catch((err) => {
    console.error('[TraceAI] Shelby upload failed:', err)
  })
})

