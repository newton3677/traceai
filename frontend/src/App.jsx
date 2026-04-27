import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'

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

function ReceiptDetailPage() {
  const { receiptId } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle') // idle | loading | error | ready
  const [error, setError] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [shareStatus, setShareStatus] = useState('idle') // idle | copied | error
  const [tamperStatus, setTamperStatus] = useState('idle') // idle | checking | verified | tampered | error
  const [tamperResult, setTamperResult] = useState(null)

  useEffect(() => {
    if (!receiptId) return
    let cancelled = false
    async function loadReceipt() {
      setStatus('loading')
      setError(null)
      try {
        const res = await fetch(`${API_BASE_URL}/receipts/${receiptId}`)
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.ok) throw new Error(json?.error || 'Receipt not found')
        if (cancelled) return
        setReceipt(json.receipt)
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setError(e?.message || 'Failed to load receipt')
        setStatus('error')
      }
    }
    loadReceipt()
    return () => {
      cancelled = true
    }
  }, [receiptId])

  async function shareWithRegulator() {
    if (!receipt) return
    setShareStatus('idle')
    try {
      const shareUrl = `${window.location.origin}/regulator/${receipt.receiptId}`
      await navigator.clipboard.writeText(shareUrl)
      setShareStatus('copied')
      setTimeout(() => setShareStatus('idle'), 3000)
    } catch (e) {
      setShareStatus('error')
      setTimeout(() => setShareStatus('idle'), 3000)
    }
  }

  async function checkTamper(simulateTamper = false) {
    if (!receipt) return
    setTamperStatus('checking')
    setTamperResult(null)
    try {
      const res = await fetch(`${API_BASE_URL}/receipts/${receipt.receiptId}/tamper-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulateTamper }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Tamper check failed')
      setTamperResult(json)
      setTamperStatus(json.isTampered ? 'tampered' : 'verified')
    } catch (e) {
      setTamperStatus('error')
      setTimeout(() => setTamperStatus('idle'), 3000)
    }
  }

  // Auto-check tamper status when receipt loads
  useEffect(() => {
    if (status === 'ready' && receipt && tamperStatus === 'idle') {
      checkTamper(false)
    }
  }, [status, receipt, tamperStatus])

  if (status === 'loading') {
    return (
      <main className="min-h-screen px-6 py-14 bg-slate-900">
        <div className="mx-auto w-full max-w-4xl">
          <div className="text-center text-white">Loading receipt...</div>
        </div>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="min-h-screen px-6 py-14 bg-slate-900">
        <div className="mx-auto w-full max-w-4xl">
          <div className="rounded-xl bg-rose-50 p-6 text-sm text-rose-800 ring-1 ring-rose-200">
            {error}
          </div>
          <button
            onClick={() => navigate('/audit')}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900"
          >
            Back to Audit Dashboard
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-6 py-14 bg-slate-900">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8">
          <button
            onClick={() => navigate('/audit')}
            className="text-white/80 hover:text-white text-sm"
          >
            ← Back to Audit Dashboard
          </button>
        </div>

        <div className="rounded-2xl bg-white shadow-2xl border border-slate-200">
          {/* Header */}
          <div className="border-b border-slate-200 px-8 py-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Data Usage Compliance Receipt
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Official cryptographic record of AI data access
                </p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className={[
                  'inline-flex items-center gap-3 rounded-full px-6 py-3 ring-2',
                  tamperStatus === 'tampered' 
                    ? 'bg-rose-50 text-rose-800 ring-rose-200'
                    : tamperStatus === 'checking'
                    ? 'bg-amber-50 text-amber-800 ring-amber-200'
                    : tamperStatus === 'verified'
                    ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                    : 'bg-slate-100 text-slate-600 ring-slate-300'
                ].join(' ')}>
                  <span className={[
                    'inline-flex h-8 w-8 items-center justify-center rounded-full text-white text-lg font-bold',
                    tamperStatus === 'tampered' 
                      ? 'bg-rose-600'
                      : tamperStatus === 'checking'
                      ? 'bg-amber-600'
                      : tamperStatus === 'verified'
                      ? 'bg-emerald-600'
                      : 'bg-slate-400'
                  ].join(' ')}>
                    {tamperStatus === 'tampered' ? '✗' : 
                     tamperStatus === 'checking' ? '⟳' : 
                     tamperStatus === 'verified' ? '✓' : '?'}
                  </span>
                  <span className="text-lg font-bold">
                    {tamperStatus === 'tampered' ? 'TAMPERED - Invalid' : 
                     tamperStatus === 'checking' ? 'Checking...' : 
                     tamperStatus === 'verified' ? 'VERIFIED' : 
                     'Unknown'}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => checkTamper(true)}
                    disabled={tamperStatus === 'checking'}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {tamperStatus === 'checking' ? 'Checking...' : 'Simulate Tamper'}
                  </button>
                  <button
                    onClick={shareWithRegulator}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
                  >
                    {shareStatus === 'copied' ? '✓ Link Copied!' : 
                     shareStatus === 'error' ? '✗ Copy Failed' : 
                     'Share with Regulator'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Receipt Content */}
          <div className="px-8 py-8">
            <div className="grid gap-8">
              {/* Dataset Information */}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Dataset Information</h2>
                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <div className="grid gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Dataset Name
                      </div>
                      <div className="text-base font-mono text-slate-900">
                        {receipt?.datasetName || 'Unknown Dataset'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Data Hash (SHA-256)
                      </div>
                      <div className="text-base font-mono text-slate-900 break-all">
                        {receipt?.data?.sha256 || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Access Information */}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Access Information</h2>
                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <div className="grid gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Accessed By
                      </div>
                      <div className="text-base font-mono text-slate-900">
                        ai-model-v1
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Timestamp
                      </div>
                      <div className="text-base font-mono text-slate-900">
                        {receipt?.accessedAt || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Access Source
                      </div>
                      <div className="text-base font-mono text-slate-900">
                        {receipt?.accessedFrom?.ip || 'Unknown IP'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissions & Consent */}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Permissions & Consent</h2>
                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <div className="grid gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Permissions
                      </div>
                      <div className="text-base font-mono text-slate-900">
                        READ_ONLY
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Consent Status
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-800 ring-1 ring-emerald-200">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white text-xs">
                          ✓
                        </span>
                        <span className="text-sm font-medium">
                          VERIFIED
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Blockchain Verification */}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Blockchain Verification</h2>
                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <div className="grid gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Aptos Transaction Hash
                      </div>
                      <a
                        href={`https://explorer.aptoslabs.com/txn/${receipt?.shelby?.txHash || receipt?.txHash}?network=shelbynet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-mono text-blue-600 hover:text-blue-800 break-all underline"
                      >
                        {receipt?.shelby?.txHash || receipt?.txHash || 'N/A'}
                      </a>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Shelby Object ID
                      </div>
                      <div className="text-base font-mono text-slate-900 break-all">
                        {receipt?.objectId || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Receipt Hash
                      </div>
                      <div className="text-base font-mono text-slate-900 break-all">
                        {receipt?.receiptHash || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        Signature Algorithm
                      </div>
                      <div className="text-base font-mono text-slate-900">
                        {receipt?.signatureAlgorithm || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tamper Detection */}
              {tamperResult && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Tamper Detection Status</h2>
                  <div className={[
                    'rounded-lg p-6 border-2',
                    tamperStatus === 'tampered' 
                      ? 'bg-rose-50 border-rose-200'
                      : tamperStatus === 'verified'
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-slate-50 border-slate-200'
                  ]}>
                    <div className="grid gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                          Verification Status
                        </div>
                        <div className={[
                          'text-base font-bold',
                          tamperStatus === 'tampered' ? 'text-rose-800' :
                          tamperStatus === 'verified' ? 'text-emerald-800' : 'text-slate-800'
                        ]}>
                          {tamperStatus === 'tampered' ? '⚠️ DATA TAMPERED - HASH MISMATCH' : 
                           tamperStatus === 'verified' ? '✅ DATA INTEGRITY VERIFIED' : 
                           'Checking...'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                          Original Hash (from receipt)
                        </div>
                        <div className="text-base font-mono text-slate-900 break-all">
                          {tamperResult.originalHash}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                          Current Hash (live from Shelby)
                        </div>
                        <div className="text-base font-mono text-slate-900 break-all">
                          {tamperResult.currentHash}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                          Hash Match
                        </div>
                        <div className={[
                          'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium',
                          tamperStatus === 'tampered' 
                            ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-200'
                            : tamperStatus === 'verified'
                            ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
                            : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                        ]}>
                          <span className={[
                            'inline-flex h-4 w-4 items-center justify-center rounded-full text-white text-xs',
                            tamperStatus === 'tampered' ? 'bg-rose-600' :
                            tamperStatus === 'verified' ? 'bg-emerald-600' : 'bg-slate-400'
                          ]}>
                            {tamperStatus === 'tampered' ? '✗' : 
                             tamperStatus === 'verified' ? '✓' : '?'}
                          </span>
                          {tamperStatus === 'tampered' ? 'MISMATCH' : 
                           tamperStatus === 'verified' ? 'MATCH' : 'CHECKING'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <div>
                    Receipt ID: <span className="font-mono">{receipt?.receiptId}</span>
                  </div>
                  <div>
                    Generated by TraceAI on Shelby + Aptos
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function AppContent() {
  const navigate = useNavigate()
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
                      onClick={() => navigate(`/receipt/${r.receiptId}`)}
                      className="w-full rounded-xl border border-slate-200 p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
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
        ) : null}
      </div>
    </main>
  )
}

function RegulatorView() {
  const { receiptId } = useParams()
  const [status, setStatus] = useState('idle') // idle | loading | error | ready
  const [error, setError] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [tamperStatus, setTamperStatus] = useState('idle') // idle | checking | verified | tampered | error
  const [tamperResult, setTamperResult] = useState(null)

  useEffect(() => {
    if (!receiptId) return
    let cancelled = false
    async function loadReceipt() {
      setStatus('loading')
      setError(null)
      try {
        const res = await fetch(`${API_BASE_URL}/receipts/${receiptId}`)
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.ok) throw new Error(json?.error || 'Receipt not found')
        if (cancelled) return
        setReceipt(json.receipt)
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setError(e?.message || 'Failed to load receipt')
        setStatus('error')
      }
    }
    loadReceipt()
    return () => {
      cancelled = true
    }
  }, [receiptId])

  async function checkTamper() {
    if (!receipt) return
    setTamperStatus('checking')
    setTamperResult(null)
    try {
      const res = await fetch(`${API_BASE_URL}/receipts/${receipt.receiptId}/tamper-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulateTamper: false }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Tamper check failed')
      setTamperResult(json)
      setTamperStatus(json.isTampered ? 'tampered' : 'verified')
    } catch (e) {
      setTamperStatus('error')
    }
  }

  // Auto-check tamper status when receipt loads
  useEffect(() => {
    if (status === 'ready' && receipt && tamperStatus === 'idle') {
      checkTamper()
    }
  }, [status, receipt, tamperStatus])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-slate-600">Loading compliance receipt...</div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-6">
          <div className="rounded-xl bg-rose-50 p-6 text-sm text-rose-800 ring-1 ring-rose-200">
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-light text-slate-900 mb-2">
              AI Data Usage Compliance Receipt
            </h1>
            <p className="text-sm text-slate-600">
              Official cryptographic record for regulatory verification
            </p>
          </div>
        </div>
      </div>

      {/* Verification Status */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <div className={[
            'inline-flex items-center gap-4 rounded-full px-8 py-4 text-lg font-bold ring-2',
            tamperStatus === 'tampered' 
              ? 'bg-rose-50 text-rose-800 ring-rose-200'
              : tamperStatus === 'checking'
              ? 'bg-amber-50 text-amber-800 ring-amber-200'
              : tamperStatus === 'verified'
              ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
              : 'bg-slate-100 text-slate-600 ring-slate-300'
          ]}>
            <span className={[
              'inline-flex h-10 w-10 items-center justify-center rounded-full text-white text-xl font-bold',
              tamperStatus === 'tampered' 
                ? 'bg-rose-600'
                : tamperStatus === 'checking'
                ? 'bg-amber-600'
                : tamperStatus === 'verified'
                ? 'bg-emerald-600'
                : 'bg-slate-400'
            ]}>
              {tamperStatus === 'tampered' ? '✗' : 
               tamperStatus === 'checking' ? '⟳' : 
               tamperStatus === 'verified' ? '✓' : '?'}
            </span>
            {tamperStatus === 'tampered' ? 'TAMPERED - Invalid' : 
             tamperStatus === 'checking' ? 'Verifying...' : 
             tamperStatus === 'verified' ? 'VERIFIED' : 
             'Unknown'}
          </div>
        </div>

        {/* Receipt Details */}
        <div className="grid gap-8">
          {/* Basic Information */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h2 className="text-lg font-medium text-slate-900 mb-4">Receipt Information</h2>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Receipt ID:</span>
                <span className="font-mono text-slate-900">{receipt?.receiptId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Timestamp:</span>
                <span className="font-mono text-slate-900">{receipt?.accessedAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Dataset Name:</span>
                <span className="font-mono text-slate-900">{receipt?.datasetName}</span>
              </div>
            </div>
          </div>

          {/* Access Details */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h2 className="text-lg font-medium text-slate-900 mb-4">Access Details</h2>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Accessed By:</span>
                <span className="font-mono text-slate-900">ai-model-v1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Access Source:</span>
                <span className="font-mono text-slate-900">{receipt?.accessedFrom?.ip || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Permissions:</span>
                <span className="font-mono text-slate-900">READ_ONLY</span>
              </div>
            </div>
          </div>

          {/* Cryptographic Verification */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h2 className="text-lg font-medium text-slate-900 mb-4">Cryptographic Verification</h2>
            <div className="grid gap-3 text-sm">
              <div>
                <span className="text-slate-600 block mb-1">Data Hash (SHA-256):</span>
                <span className="font-mono text-slate-900 break-all text-xs">{receipt?.data?.sha256}</span>
              </div>
              <div>
                <span className="text-slate-600 block mb-1">Receipt Hash:</span>
                <span className="font-mono text-slate-900 break-all text-xs">{receipt?.receiptHash}</span>
              </div>
              <div>
                <span className="text-slate-600 block mb-1">Signature Algorithm:</span>
                <span className="font-mono text-slate-900">{receipt?.signatureAlgorithm}</span>
              </div>
            </div>
          </div>

          {/* Blockchain Verification */}
          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h2 className="text-lg font-medium text-slate-900 mb-4">Blockchain Verification</h2>
            <div className="grid gap-3 text-sm">
              <div>
                <span className="text-slate-600 block mb-1">Shelby Object ID:</span>
                <span className="font-mono text-slate-900 break-all text-xs">{receipt?.objectId}</span>
              </div>
              <div>
                <span className="text-slate-600 block mb-1">Aptos Transaction:</span>
                <a
                  href={`https://explorer.aptoslabs.com/txn/${receipt?.shelby?.txHash || receipt?.txHash}?network=shelbynet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors mt-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Verify on Aptos Explorer
                </a>
              </div>
            </div>
          </div>

          {/* Tamper Detection */}
          {tamperResult && (
            <div className={[
              'rounded-lg p-6 border-2',
              tamperStatus === 'tampered' 
                ? 'bg-rose-50 border-rose-200'
                : tamperStatus === 'verified'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-slate-50 border-slate-200'
            ]}>
              <h2 className="text-lg font-medium text-slate-900 mb-4">Integrity Verification</h2>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Verification Status:</span>
                  <span className={[
                    'font-bold',
                    tamperStatus === 'tampered' ? 'text-rose-800' :
                    tamperStatus === 'verified' ? 'text-emerald-800' : 'text-slate-800'
                  ]}>
                    {tamperStatus === 'tampered' ? '⚠️ HASH MISMATCH' : 
                     tamperStatus === 'verified' ? '✅ HASH VERIFIED' : 
                     'Checking...'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 block mb-1">Original Hash:</span>
                  <span className="font-mono text-slate-900 break-all text-xs">{tamperResult.originalHash}</span>
                </div>
                <div>
                  <span className="text-slate-600 block mb-1">Current Hash:</span>
                  <span className="font-mono text-slate-900 break-all text-xs">{tamperResult.currentHash}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center text-sm text-slate-600">
            <div className="font-medium text-slate-900 mb-2">TraceAI</div>
            <div>Cryptographic compliance receipts for AI data usage</div>
            <div className="mt-2 text-xs text-slate-500">
              Powered by Shelby storage on Aptos blockchain
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/receipt/:receiptId" element={<ReceiptDetailPage />} />
        <Route path="/regulator/:receiptId" element={<RegulatorView />} />
      </Routes>
    </Router>
  )
}

export default App
