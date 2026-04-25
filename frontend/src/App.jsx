import { useEffect, useMemo, useRef, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

function VerifiedBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-800 ring-1 ring-emerald-200">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
        ✓
      </span>
      <span className="text-sm font-medium">
        Stored on Shelby. Anchored on Aptos blockchain.
      </span>
    </div>
  )
}

function App() {
  const [view, setView] = useState('upload') // upload | audit
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle | uploading | success | error
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [queryStatus, setQueryStatus] = useState('idle') // idle | running | success | error
  const [receipt, setReceipt] = useState(null)
  const [queryError, setQueryError] = useState(null)
  const [auditStatus, setAuditStatus] = useState('idle') // idle | loading | error | ready
  const [auditError, setAuditError] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  useEffect(() => {
    if (view !== 'audit') return
    let cancelled = false
    async function load() {
      setAuditStatus('loading')
      setAuditError(null)
      try {
        const res = await fetch(`${API_BASE_URL}/receipts`)
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed to load receipts')
        if (cancelled) return
        setReceipts(Array.isArray(json.receipts) ? json.receipts : [])
        setSelectedReceipt(null)
        setAuditStatus('ready')
      } catch (e) {
        if (cancelled) return
        setAuditError(e?.message || 'Failed to load receipts')
        setAuditStatus('error')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [view])

  const hint = useMemo(() => {
    if (!file) return 'Drag and drop a file here, or click to browse.'
    return `${file.name} • ${(file.size / 1024).toFixed(1)} KB`
  }, [file])

  async function uploadSelectedFile(selectedFile) {
    setFile(selectedFile)
    setStatus('uploading')
    setResult(null)
    setError(null)
    setReceipt(null)
    setQueryStatus('idle')
    setQueryError(null)

    const form = new FormData()
    form.append('file', selectedFile)

    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: form,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Upload failed')
      }
      setResult({ objectId: json.objectId, txHash: json.txHash })
      setStatus('success')
    } catch (e) {
      setError(e?.message || 'Upload failed')
      setStatus('error')
    }
  }

  async function runAiQuery() {
    if (!result?.objectId) return
    setQueryStatus('running')
    setQueryError(null)
    setReceipt(null)

    try {
      const res = await fetch(`${API_BASE_URL}/ai-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectId: result.objectId,
          permissions: ['read:blob', 'simulate:ai-query'],
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'AI query failed')
      }
      setReceipt(json.receipt)
      setQueryStatus('success')
    } catch (e) {
      setQueryError(e?.message || 'AI query failed')
      setQueryStatus('error')
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f) uploadSelectedFile(f)
  }

  function onBrowsePick(e) {
    const f = e.target.files?.[0]
    if (f) uploadSelectedFile(f)
  }

  return (
    <main className="min-h-screen px-6 py-14">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            TraceAI
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Compliance receipts for AI data usage on Shelby + Aptos.
          </p>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setView('upload')}
              className={[
                'rounded-lg px-3 py-2 text-sm font-medium ring-1',
                view === 'upload'
                  ? 'bg-white text-slate-900 ring-white'
                  : 'bg-transparent text-white ring-white/40 hover:ring-white/70',
              ].join(' ')}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => setView('audit')}
              className={[
                'rounded-lg px-3 py-2 text-sm font-medium ring-1',
                view === 'audit'
                  ? 'bg-white text-slate-900 ring-white'
                  : 'bg-transparent text-white ring-white/40 hover:ring-white/70',
              ].join(' ')}
            >
              Audit Dashboard
            </button>
          </div>
        </header>

        {view === 'upload' ? (
          <section className="rounded-2xl bg-white p-6 shadow-lg">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              setDragActive(false)
            }}
            onDrop={onDrop}
            disabled={status === 'uploading'}
            className={[
              'w-full rounded-2xl border-2 border-dashed p-10 text-left transition',
              dragActive ? 'border-slate-900 bg-slate-50' : 'border-slate-200',
              status === 'uploading' ? 'opacity-60 cursor-not-allowed' : '',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-base font-semibold text-slate-900">
                  Drag & drop
                </div>
                <div className="mt-1 text-sm text-slate-600">{hint}</div>
                <div className="mt-4 text-xs text-slate-500">
                  Uploads go to Shelby on shelbynet.
                </div>
              </div>

              <div className="shrink-0">
                <span className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
                  {status === 'uploading' ? 'Uploading…' : 'Browse'}
                </span>
              </div>
            </div>
          </button>

          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={onBrowsePick}
            disabled={status === 'uploading'}
          />

          {status === 'error' ? (
            <div className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
              {error}
            </div>
          ) : null}

          {status === 'success' && result ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-5 ring-1 ring-slate-200">
              <VerifiedBadge />

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Shelby Object ID
                  </div>
                  <div className="mt-1 break-all rounded-lg bg-white p-3 font-mono text-xs text-slate-900 ring-1 ring-slate-200">
                    {result.objectId}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Aptos Transaction Hash
                  </div>
                  <div className="mt-1 break-all rounded-lg bg-white p-3 font-mono text-xs text-slate-900 ring-1 ring-slate-200">
                    {result.txHash}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={runAiQuery}
                  disabled={queryStatus === 'running'}
                  className={[
                    'inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white',
                    queryStatus === 'running' ? 'opacity-60 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  {queryStatus === 'running' ? 'Running AI Query…' : 'Run AI Query'}
                </button>

                {queryStatus === 'error' ? (
                  <span className="text-sm text-rose-700">{queryError}</span>
                ) : null}
              </div>

              {queryStatus === 'success' && receipt ? (
                <div className="mt-5 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                  <div className="text-sm font-semibold text-slate-900">
                    Cryptographic Receipt
                  </div>
                  <div className="mt-3 grid gap-3 text-xs">
                    <div>
                      <div className="font-semibold uppercase tracking-wide text-slate-500">
                        Receipt ID
                      </div>
                      <div className="mt-1 font-mono break-all text-slate-900">
                        {receipt.receiptId}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold uppercase tracking-wide text-slate-500">
                        Access
                      </div>
                      <div className="mt-1 text-slate-900">
                        <span className="font-mono">{receipt.accessedAt}</span>
                      </div>
                      <div className="mt-1 text-slate-700">
                        <span className="font-semibold">From:</span>{' '}
                        <span className="font-mono">
                          {receipt.accessedFrom?.ip || 'unknown'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold uppercase tracking-wide text-slate-500">
                        Permissions
                      </div>
                      <div className="mt-1 font-mono break-all text-slate-900">
                        {(receipt.permissions || []).join(', ')}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold uppercase tracking-wide text-slate-500">
                        Data digest (sha256)
                      </div>
                      <div className="mt-1 font-mono break-all text-slate-900">
                        {receipt.data?.sha256}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold uppercase tracking-wide text-slate-500">
                        Receipt hash
                      </div>
                      <div className="mt-1 font-mono break-all text-slate-900">
                        {receipt.receiptHash}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold uppercase tracking-wide text-slate-500">
                        Signature
                      </div>
                      <div className="mt-1 font-mono break-all text-slate-900">
                        {receipt.signature}
                      </div>
                      <div className="mt-1 text-slate-500">
                        {receipt.signatureAlgorithm}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          </section>
        ) : (
          <section className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-slate-900">
                  AI Query Receipt Timeline
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Click a row to view full receipt details.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setView('audit')}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
              >
                Refresh
              </button>
            </div>

            {auditStatus === 'loading' ? (
              <div className="mt-6 text-sm text-slate-600">Loading receipts…</div>
            ) : null}

            {auditStatus === 'error' ? (
              <div className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
                {auditError}
              </div>
            ) : null}

            {auditStatus === 'ready' ? (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  {receipts.length === 0 ? (
                    <div className="text-sm text-slate-600">
                      No receipts yet. Run an AI Query to generate one.
                    </div>
                  ) : null}

                  {receipts.map((r) => (
                    <button
                      key={r.receiptId}
                      type="button"
                      onClick={() => setSelectedReceipt(r)}
                      className={[
                        'w-full rounded-xl border p-4 text-left transition',
                        selectedReceipt?.receiptId === r.receiptId
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {r.datasetName || 'dataset'}
                          </div>
                          <div className="mt-1 truncate font-mono text-xs text-slate-600">
                            {r.receiptId}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {r.accessedAt}
                          </div>
                        </div>
                        <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                          VERIFIED
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  {selectedReceipt ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-900">
                          Receipt Details
                        </div>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                          VERIFIED
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 text-xs">
                        <div>
                          <div className="font-semibold uppercase tracking-wide text-slate-500">
                            Dataset
                          </div>
                          <div className="mt-1 text-slate-900">
                            {selectedReceipt.datasetName}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold uppercase tracking-wide text-slate-500">
                            Timestamp
                          </div>
                          <div className="mt-1 font-mono text-slate-900">
                            {selectedReceipt.accessedAt}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold uppercase tracking-wide text-slate-500">
                            Receipt ID
                          </div>
                          <div className="mt-1 font-mono break-all text-slate-900">
                            {selectedReceipt.receiptId}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold uppercase tracking-wide text-slate-500">
                            Object ID
                          </div>
                          <div className="mt-1 font-mono break-all text-slate-900">
                            {selectedReceipt.objectId}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold uppercase tracking-wide text-slate-500">
                            Data sha256
                          </div>
                          <div className="mt-1 font-mono break-all text-slate-900">
                            {selectedReceipt.data?.sha256}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold uppercase tracking-wide text-slate-500">
                            Receipt hash
                          </div>
                          <div className="mt-1 font-mono break-all text-slate-900">
                            {selectedReceipt.receiptHash}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold uppercase tracking-wide text-slate-500">
                            Signature
                          </div>
                          <div className="mt-1 font-mono break-all text-slate-900">
                            {selectedReceipt.signature}
                          </div>
                          <div className="mt-1 text-slate-500">
                            {selectedReceipt.signatureAlgorithm}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-slate-600">
                      Select a receipt to view details.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  )
}

export default App
