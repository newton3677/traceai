import { useState, useEffect, useRef, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// ─── Helper Functions ───────────────────────────────────────────────────────
function formatTimestamp(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

function shortHash(str, length = 12) {
  if (!str) return '—'
  return str.length > length * 2 + 3 ? str.slice(0, length) + '…' + str.slice(-length) : str
}

// ─── Upload Page ─────────────────────────────────────────────────────────────
function UploadPage() {
  const navigate = useNavigate()
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [querying, setQuerying] = useState(false)
  const [queryResult, setQueryResult] = useState(null)
  const [queryError, setQueryError] = useState(null)
  const fileInputRef = useRef(null)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragActive(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }, [])

  const handleFileChange = useCallback((e) => {
    const selected = e.target.files[0]
    if (selected) setFile(selected)
  }, [])

  const handleUpload = useCallback(async () => {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    setUploadResult(null)
    setQueryResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Upload failed')
      }
      setUploadResult({
        objectId: data.objectId,
        txHash: data.txHash
      })
    } catch (error) {
      setUploadError(error.message)
    } finally {
      setUploading(false)
    }
  }, [file])

  const handleQuery = useCallback(async () => {
    if (!uploadResult?.objectId) return
    setQuerying(true)
    setQueryError(null)
    setQueryResult(null)

    try {
      const response = await fetch(`${API_BASE_URL}/ai-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectId: uploadResult.objectId,
          permissions: ['read:blob', 'simulate:ai-query']
        })
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'AI query failed')
      }
      setQueryResult(data.receipt)
    } catch (error) {
      setQueryError(error.message)
    } finally {
      setQuerying(false)
    }
  }, [uploadResult])

  const hint = file ? `${file.name} • ${(file.size / 1024).toFixed(1)} KB` : 'Drag and drop a file here, or click to browse.'

  return (
    <>
      <Navbar />
      <div className="page">
        <h1 className="page-title">Upload Dataset</h1>
        <p className="page-sub">Every upload is anchored on Aptos via Shelby — tamper-proof from day one.</p>

        {/* Upload Zone */}
        <div
          className={`upload-zone${dragActive ? ' drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div className="upload-icon">🗂️</div>
          {file ? (
            <>
              <h3>{file.name}</h3>
              <p>{(file.size / 1024).toFixed(1)} KB</p>
            </>
          ) : (
            <>
              <h3>Drop your dataset here</h3>
              <p>CSV, JSON, TXT, PDF — or click to browse</p>
            </>
          )}
        </div>

        {file && !uploadResult && (
          <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
              {uploading ? <><div className="spinner" /> Uploading to Shelby…</> : '⬆️ Upload to Shelby'}
            </button>
          </div>
        )}

        {uploadError && <div className="alert alert-error" style={{ marginTop: '1rem' }}>⚠️ {uploadError}</div>}

        {/* Upload Result */}
        {uploadResult && (
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="section-header">
              <div className="section-title">✅ Upload Confirmed</div>
              <span className="badge badge-verified">● VERIFIED</span>
            </div>
            <div className="field-row">
              <div className="field-label">Object ID (Shelby)</div>
              <div className="mono-field">{uploadResult.objectId}</div>
            </div>
            {uploadResult.txHash && (
              <div className="field-row">
                <div className="field-label">Aptos Tx Hash</div>
                <div className="mono-field">
                  <a
                    href={`https://explorer.aptoslabs.com/txn/${uploadResult.txHash}?network=shelbynet`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--accent2)' }}
                  >
                    {uploadResult.txHash}
                  </a>
                </div>
              </div>
            )}
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleQuery} disabled={querying}>
                {querying ? <><div className="spinner" /> Running…</> : '🤖 Run AI Query'}
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                View Dashboard →
              </button>
            </div>
          </div>
        )}

        {/* Query Result */}
        {queryResult && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="section-header">
              <div className="section-title">🧾 Cryptographic Receipt Generated</div>
              <span className="badge badge-verified">● VERIFIED</span>
            </div>
            <div className="field-row">
              <div className="field-label">Receipt ID</div>
              <div className="mono-field">{queryResult.receiptId}</div>
            </div>
            <div className="field-row">
              <div className="field-label">SHA-256 Hash</div>
              <div className="mono-field">{queryResult.data?.sha256}</div>
            </div>
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/receipt/${queryResult.receiptId}`)}
              >
                View Receipt →
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Dashboard Page ─────────────────────────────────────────────────────────
function DashboardPage() {
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    async function loadReceipts() {
      try {
        const response = await fetch(`${API_BASE_URL}/receipts`)
        const data = await response.json()
        setReceipts(Array.isArray(data.receipts) ? data.receipts : [])
      } catch (err) {
        setError('Could not load receipts from backend.')
      } finally {
        setLoading(false)
      }
    }
    loadReceipts()
  }, [])

  const verified = receipts.filter(r => !r.tampered).length
  const tampered = receipts.filter(r => r.tampered).length

  return (
    <>
      <Navbar />
      <div className="page">
        <h1 className="page-title">Audit Dashboard</h1>
        <p className="page-sub">Every AI data access — tracked, verified, regulator-ready.</p>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total Receipts', value: receipts.length, color: 'var(--accent)' },
            { label: 'Verified', value: verified, color: 'var(--success)' },
            { label: 'Tampered', value: tampered, color: 'var(--danger)' },
          ].map((stat) => (
            <div key={stat.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Receipt List */}
        <div className="section-header">
          <div className="section-title">Receipt Timeline</div>
          <Link to="/" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
            + New Upload
          </Link>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {!loading && receipts.length === 0 && (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>No receipts yet. Upload a dataset and run an AI query to get started.</p>
          </div>
        )}

        {receipts.map((receipt) => (
          <div
            key={receipt.receiptId}
            className={`receipt-item${receipt.tampered ? ' tampered' : ''}`}
            onClick={() => navigate(`/receipt/${receipt.receiptId}`)}
          >
            <div className={`receipt-dot${receipt.tampered ? ' tampered' : ''}`} />
            <div className="receipt-item-body">
              <div className="receipt-item-title">{receipt.datasetName || 'Unknown dataset'}</div>
              <div className="receipt-item-meta">
                {formatTimestamp(receipt.accessedAt)} • {shortHash(receipt.data?.sha256)}
              </div>
            </div>
            <span className={`badge ${receipt.tampered ? 'badge-tampered' : 'badge-verified'}`}>
              {receipt.tampered ? '● TAMPERED' : '● VERIFIED'}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── Receipt Detail Page ─────────────────────────────────────────────────────
function ReceiptPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tampering, setTampering] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function loadReceipt() {
      try {
        const response = await fetch(`${API_BASE_URL}/receipts/${id}`)
        const data = await response.json()
        if (!response.ok || !data.ok) throw new Error(data.error || 'Receipt not found')
        setReceipt(data.receipt)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadReceipt()
  }, [id])

  const handleTamper = async () => {
    setTampering(true)
    try {
      const response = await fetch(`${API_BASE_URL}/receipts/${id}/tamper-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulateTamper: true })
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'Tamper failed')
      setReceipt(prev => ({ ...prev, tampered: true, tamperResult: data }))
    } catch (err) {
      setError(err.message)
    } finally {
      setTampering(false)
    }
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/regulator/${id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return (
    <>
      <Navbar />
      <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: '5rem' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    </>
  )

  if (error) return (
    <>
      <Navbar />
      <div className="page">
        <div className="alert alert-error">{error}</div>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>← Back</button>
      </div>
    </>
  )

  const isTampered = receipt?.tampered

  return (
    <>
      <Navbar />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </button>
          <h1 className="page-title" style={{ margin: 0 }}>Receipt Detail</h1>
          <span className={`badge ${isTampered ? 'badge-tampered' : 'badge-verified'}`} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
            {isTampered ? '🔴 TAMPERED' : '🟢 VERIFIED'}
          </span>
        </div>

        {isTampered && (
          <div className="alert alert-error">
            ⚠️ Data integrity violation detected. The hash no longer matches the stored record on Shelby/Aptos.
          </div>
        )}

        {/* Main receipt card */}
        <div className="card">
          <div className="field-row">
            <div className="field-label">Receipt ID</div>
            <div className="mono-field">{receipt.receiptId}</div>
          </div>
          <div className="field-row">
            <div className="field-label">Object ID (Shelby)</div>
            <div className="mono-field">{receipt.objectId || '—'}</div>
          </div>
          <div className="field-row">
            <div className="field-label">SHA-256 Hash</div>
            <div className="mono-field">{receipt.data?.sha256 || '—'}</div>
          </div>
          {receipt.signature && (
            <div className="field-row">
              <div className="field-label">HMAC Signature</div>
              <div className="mono-field">{receipt.signature}</div>
            </div>
          )}
          {receipt.shelby?.txHash && (
            <div className="field-row">
              <div className="field-label">Aptos Tx Hash</div>
              <div className="mono-field">
                <a
                  href={`https://explorer.aptoslabs.com/txn/${receipt.shelby.txHash}?network=shelbynet`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--accent2)' }}
                >
                  {receipt.shelby.txHash}
                </a>
              </div>
            </div>
          )}
          <div className="field-row">
            <div className="field-label">Timestamp</div>
            <div className="mono-field">{formatTimestamp(receipt.accessedAt)}</div>
          </div>
          <div className="field-row">
            <div className="field-label">Accessed By</div>
            <div className="mono-field">ai-model-v1</div>
          </div>
          <div className="field-row">
            <div className="field-label">Permissions</div>
            <div className="mono-field">READ_ONLY</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleCopyLink}>
            {copied ? '✅ Link Copied!' : '🔗 Share with Regulator'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/regulator/${id}`)}
          >
            👁 Open Regulator View
          </button>
          {!isTampered && (
            <button className="btn btn-danger" onClick={handleTamper} disabled={tampering}>
              {tampering ? <><div className="spinner" /> Tampering…</> : '💀 Simulate Tamper'}
            </button>
          )}
        </div>

        {isTampered && receipt.tamperResult && (
          <div className="card" style={{ marginTop: '1.5rem', border: '1px solid rgba(255,76,106,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🔴</span>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--danger)' }}>Tamper Detected</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '2px' }}>
                  The hash has been altered. This receipt is no longer trustworthy.
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <div className="field-label">Original Hash:</div>
                  <div className="mono-field">{receipt.tamperResult.originalHash}</div>
                  <div className="field-label">Current Hash:</div>
                  <div className="mono-field">{receipt.tamperResult.currentHash}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Regulator View Page ─────────────────────────────────────────────────────
function RegulatorPage() {
  const { id } = useParams()
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadReceipt() {
      try {
        const response = await fetch(`${API_BASE_URL}/receipts/${id}`)
        const data = await response.json()
        if (!response.ok || !data.ok) throw new Error(data.error || 'Receipt not found')
        setReceipt(data.receipt)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadReceipt()
  }, [id])

  const isTampered = receipt?.tampered

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Minimal regulator header */}
      <div className="navbar">
        <div className="navbar-brand">
          <div className="logo-icon">T</div>
          Trace<span>AI</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginLeft: '8px', fontWeight: 400 }}>
            Regulator View
          </span>
        </div>
        <span className="badge badge-pending">READ-ONLY</span>
      </div>

      <div className="page">
        <div className="regulator-banner">
          <div className="shield">🛡️</div>
          <div>
            <h2>Official AI Data Provenance Receipt</h2>
            <p>This is a cryptographically verified, tamper-evident record generated by TraceAI and anchored on the Aptos blockchain via Shelby. It cannot be altered without detection.</p>
          </div>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {receipt && (
          <>
            {/* Status Banner */}
            <div className="card" style={{
              marginBottom: '1.5rem',
              border: `2px solid ${isTampered ? 'rgba(255,76,106,0.5)' : 'rgba(0,255,178,0.3)'}`,
              background: isTampered ? 'rgba(255,76,106,0.06)' : 'rgba(0,255,178,0.06)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2.5rem' }}>{isTampered ? '🔴' : '🟢'}</span>
                <div>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: isTampered ? 'var(--danger)' : 'var(--success)'
                  }}>
                    {isTampered ? 'DATA INTEGRITY VIOLATION' : 'DATA INTEGRITY VERIFIED'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '4px' }}>
                    {isTampered
                      ? 'This receipt has been tampered with. The hash no longer matches the blockchain record.'
                      : 'All cryptographic proofs match. This data has not been altered since it was uploaded.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Provenance Fields */}
            <div className="card">
              <div className="section-title" style={{ marginBottom: '1.25rem' }}>Provenance Record</div>

              <div className="field-row">
                <div className="field-label">Receipt ID</div>
                <div className="mono-field">{receipt.receiptId}</div>
              </div>
              <div className="field-row">
                <div className="field-label">Shelby Object ID</div>
                <div className="mono-field">{receipt.objectId || '—'}</div>
              </div>
              <div className="field-row">
                <div className="field-label">SHA-256 Content Hash</div>
                <div className="mono-field">{receipt.data?.sha256 || '—'}</div>
              </div>
              {receipt.signature && (
                <div className="field-row">
                  <div className="field-label">HMAC-SHA256 Signature</div>
                  <div className="mono-field">{receipt.signature}</div>
                </div>
              )}
              {receipt.shelby?.txHash && (
                <div className="field-row">
                  <div className="field-label">Aptos Blockchain Transaction</div>
                  <div className="mono-field">
                    <a
                      href={`https://explorer.aptoslabs.com/txn/${receipt.shelby.txHash}?network=shelbynet`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--accent2)' }}
                    >
                      {receipt.shelby.txHash} ↗
                    </a>
                  </div>
                </div>
              )}
              <div className="field-row">
                <div className="field-label">Generated At</div>
                <div className="mono-field">{formatTimestamp(receipt.accessedAt)}</div>
              </div>
              <div className="field-row">
                <div className="field-label">Accessed By</div>
                <div className="mono-field">ai-model-v1</div>
              </div>
              <div className="field-row">
                <div className="field-label">Permissions</div>
                <div className="mono-field">READ_ONLY</div>
              </div>

              <hr />
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                This receipt was generated by TraceAI. The SHA-256 hash and HMAC signature were computed at upload time and written to the Aptos blockchain via the Shelby network. Any modification to the underlying data will invalidate these proofs. This page is read-only and cannot be altered by the data provider.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Navbar Component ───────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <div className="logo-icon">T</div>
        Trace<span>AI</span>
      </Link>
      <div className="nav-links">
        <Link to="/" className="nav-link"><span>Upload</span> 📤</Link>
        <Link to="/dashboard" className="nav-link"><span>Dashboard</span> 📊</Link>
      </div>
    </nav>
  )
}

// ─── Global Styles ─────────────────────────────────────────────────────────
function GlobalStyles() {
  return (
    <style dangerouslySetInnerHTML={{
      __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --navy:       #1E3A5F;
          --navy-dark:  #122440;
          --navy-light: #2A4F80;
          --accent:     #00C2FF;
          --accent2:    #00FFB2;
          --white:      #F0F6FF;
          --muted:      #7B9DC4;
          --card:       rgba(30, 58, 95, 0.6);
          --border:     rgba(0, 194, 255, 0.2);
          --danger:     #FF4C6A;
          --success:    #00FFB2;
          --warn:       #FFB800;
          --font-main:  'Space Grotesk', sans-serif;
          --font-mono:  'JetBrains Mono', monospace;
        }

        body {
          background: var(--navy-dark);
          color: var(--white);
          font-family: var(--font-main);
          min-height: 100vh;
          background-image:
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(0,194,255,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 110%, rgba(0,255,178,0.05) 0%, transparent 60%);
        }

        a { color: inherit; text-decoration: none; }

        /* Navbar */
        .navbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 2rem;
          height: 64px;
          background: rgba(18, 36, 64, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .navbar-brand .logo-icon {
          width: 32px; height: 32px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.9rem;
          color: var(--navy-dark);
          font-weight: 800;
        }
        .navbar-brand span { color: var(--accent); }
        .nav-links { display: flex; gap: 0.5rem; }
        .nav-link {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 0.875rem;
          color: var(--muted);
          transition: all 0.2s;
          cursor: pointer;
        }
        .nav-link:hover, .nav-link.active { color: var(--white); background: rgba(0,194,255,0.1); }

        /* Page Layout */
        .page { max-width: 960px; margin: 0 auto; padding: 2.5rem 1.5rem; }
        .page-title { font-size: 2rem; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 0.5rem; }
        .page-sub { color: var(--muted); font-size: 0.95rem; margin-bottom: 2rem; }

        /* Cards */
        .card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          backdrop-filter: blur(8px);
        }
        .card + .card { margin-top: 1rem; }

        /* Buttons */
        .btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          font-family: var(--font-main);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-primary {
          background: linear-gradient(135deg, var(--accent), #0080cc);
          color: var(--navy-dark);
        }
        .btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .btn-secondary {
          background: rgba(0,194,255,0.1);
          color: var(--accent);
          border: 1px solid var(--border);
        }
        .btn-secondary:hover { background: rgba(0,194,255,0.2); }
        .btn-danger {
          background: rgba(255,76,106,0.15);
          color: var(--danger);
          border: 1px solid rgba(255,76,106,0.3);
        }
        .btn-danger:hover { background: rgba(255,76,106,0.25); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Upload Zone */
        .upload-zone {
          border: 2px dashed var(--border);
          border-radius: 12px;
          padding: 3rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.25s;
          background: rgba(0,194,255,0.03);
        }
        .upload-zone:hover, .upload-zone.drag-over {
          border-color: var(--accent);
          background: rgba(0,194,255,0.07);
        }
        .upload-zone .upload-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.6; }
        .upload-zone h3 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.4rem; }
        .upload-zone p { color: var(--muted); font-size: 0.875rem; }

        /* Badges */
        .badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }
        .badge-verified {
          background: rgba(0,255,178,0.12);
          color: var(--success);
          border: 1px solid rgba(0,255,178,0.3);
        }
        .badge-tampered {
          background: rgba(255,76,106,0.12);
          color: var(--danger);
          border: 1px solid rgba(255,76,106,0.3);
          animation: pulse-red 1.5s infinite;
        }
        .badge-pending {
          background: rgba(255,184,0,0.12);
          color: var(--warn);
          border: 1px solid rgba(255,184,0,0.3);
        }
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,76,106,0); }
          50%       { box-shadow: 0 0 0 6px rgba(255,76,106,0.15); }
        }

        /* Receipt Timeline Item */
        .receipt-item {
          display: flex; align-items: flex-start; gap: 1rem;
          padding: 1.25rem;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: rgba(30,58,95,0.4);
          transition: all 0.2s;
          cursor: pointer;
          margin-bottom: 0.75rem;
        }
        .receipt-item:hover { border-color: var(--accent); background: rgba(0,194,255,0.06); }
        .receipt-item.tampered { border-color: rgba(255,76,106,0.4); }
        .receipt-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: var(--accent);
          margin-top: 5px;
          flex-shrink: 0;
        }
        .receipt-dot.tampered { background: var(--danger); }
        .receipt-item-body { flex: 1; min-width: 0; }
        .receipt-item-title {
          font-weight: 600; font-size: 0.9rem;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .receipt-item-meta { color: var(--muted); font-size: 0.8rem; margin-top: 3px; }

        /* Mono Field */
        .mono-field {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 10px 12px;
          word-break: break-all;
          color: var(--accent2);
          margin-top: 4px;
        }

        /* Field Row */
        .field-row { margin-bottom: 1rem; }
        .field-label { font-size: 0.75rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }

        /* Section Header */
        .section-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1.25rem;
        }
        .section-title { font-size: 1.1rem; font-weight: 700; }

        /* Spinner */
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(0,194,255,0.2);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Alert */
        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }
        .alert-success { background: rgba(0,255,178,0.1); border: 1px solid rgba(0,255,178,0.3); color: var(--success); }
        .alert-error   { background: rgba(255,76,106,0.1); border: 1px solid rgba(255,76,106,0.3); color: var(--danger); }
        .alert-info    { background: rgba(0,194,255,0.1);  border: 1px solid rgba(0,194,255,0.3);  color: var(--accent); }

        /* Regulator Banner */
        .regulator-banner {
          background: linear-gradient(135deg, rgba(0,194,255,0.12), rgba(0,255,178,0.06));
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.25rem 1.5rem;
          display: flex; align-items: center; gap: 1rem;
          margin-bottom: 2rem;
        }
        .regulator-banner .shield { font-size: 2rem; }
        .regulator-banner h2 { font-size: 1rem; font-weight: 700; margin-bottom: 2px; }
        .regulator-banner p  { font-size: 0.8rem; color: var(--muted); }

        /* Empty State */
        .empty-state { text-align: center; padding: 4rem 2rem; color: var(--muted); }
        .empty-state .icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.4; }
        .empty-state p { font-size: 0.9rem; }

        /* Divider */
        hr { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }

        /* Responsive */
        @media (max-width: 640px) {
          .page { padding: 1.5rem 1rem; }
          .page-title { font-size: 1.5rem; }
          .navbar { padding: 0 1rem; }
          .nav-links .nav-link span { display: none; }
        }
      `
    }} />
  )
}

// ─── Root App Component ─────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <GlobalStyles />
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/receipt/:id" element={<ReceiptPage />} />
        <Route path="/regulator/:id" element={<RegulatorPage />} />
      </Routes>
    </Router>
  )
}
