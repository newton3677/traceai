const receipts = new Map()

function putReceipt(receipt) {
  receipts.set(receipt.receiptId, receipt)
  return receipt
}

function getReceipt(receiptId) {
  return receipts.get(receiptId)
}

module.exports = { putReceipt, getReceipt }

