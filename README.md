# TraceAI 🔍

> **Give every AI decision a tamper-proof receipt.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-traceai--sigma.vercel.app-blue?style=for-the-badge)](https://traceai-sigma.vercel.app)
[![Built on Shelby](https://img.shields.io/badge/Built%20on-Shelby%20by%20Aptos%20Labs-green?style=for-the-badge)](https://shelby.xyz)



## What is TraceAI?

When AI makes a decision that affects someone — a loan rejection, an insurance quote, a job application — nobody can prove what data was used or whether it was tampered with.

**TraceAI fixes that.**

Every time an AI touches data, TraceAI generates a cryptographic receipt and anchors it permanently on the Aptos blockchain. When a regulator asks what your AI did, you answer in 3 seconds.



## Live Demo

**[https://traceai-sigma.vercel.app](https://traceai-sigma.vercel.app)**

Try this flow:
1. Upload a dataset
2. Run AI Query → receipt generates instantly
3. View the cryptographic receipt
4. Share with Regulator → one-click read-only link
5. Simulate Tamper → watch the receipt turn RED 



##  Features

- **Dataset Upload** — stored on Shelby with blockchain anchoring
- **AI Query Logging** — every data access is recorded
- **Cryptographic Receipts** — SHA-256 hash + HMAC signature
- **Tamper Detection** — any data change breaks the receipt instantly
- **Regulator Share Link** — no login needed for the recipient
- **Audit Dashboard** — full timeline of all AI data events



##  Built With

- **Frontend** — React + TailwindCSS (Vercel)
- **Backend** — Node.js + Express (Render)
- **Storage** — Shelby Protocol by Aptos Labs
- **Blockchain** — Aptos (immutable on-chain proof)



##  Run Locally

```bash
# Clone
git clone https://github.com/newton3677/traceai.git
cd traceai

# Backend
cd backend
npm install
# Add your .env file (see below)
npm run dev

# Frontend
cd ../frontend
npm install
npm run dev
```

**.env (backend)**
```
APTOS_ED25519_PRIVATE_KEY=your_key
SHELBY_NETWORK=SHELBYNET
SHELBY_RPC_BASE_URL=https://api.shelbynet.shelby.xyz/shelby
RECEIPT_HMAC_SECRET=your_secret
```



##  Built for the Shelby Hackathon

TraceAI is the compliance layer built on top of Shelby — making AI trustworthy, auditable, and provable for any industry.



<p align="center">
  <strong>TraceAI — Making AI Trustworthy, One Receipt at a Time.</strong>
</p>
