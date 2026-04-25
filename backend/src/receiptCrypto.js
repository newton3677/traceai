const crypto = require('crypto')

function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj)
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function hmacSha256Hex(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

function signReceiptPayload(payloadObj) {
  const secret = process.env.RECEIPT_HMAC_SECRET
  if (!secret) {
    throw new Error('[TraceAI] Missing required env var: RECEIPT_HMAC_SECRET')
  }

  const payload = stableStringify(payloadObj)
  const receiptHash = sha256Hex(payload)
  const signature = hmacSha256Hex(secret, receiptHash)
  return { payload, receiptHash, signature, algorithm: 'HMAC-SHA256(sha256(payload))' }
}

function newReceiptId() {
  return `r_${crypto.randomBytes(16).toString('hex')}`
}

module.exports = { signReceiptPayload, newReceiptId, sha256Hex }

