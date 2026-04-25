const receipts = new Map()

function putReceipt(receipt) {
  receipts.set(receipt.receiptId, receipt)
  return receipt
}

function getReceipt(receiptId) {
  return receipts.get(receiptId)
}

function listReceipts() {
  return Array.from(receipts.values()).sort((a, b) => {
    const at = Date.parse(a.accessedAt || '') || 0
    const bt = Date.parse(b.accessedAt || '') || 0
    return bt - at
  })
}

module.exports = { putReceipt, getReceipt, listReceipts }

