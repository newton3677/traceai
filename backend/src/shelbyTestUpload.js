const fs = require('fs/promises')
const path = require('path')

function requireEnv(name) {
  const v = process.env[name]
  return v && String(v).trim().length > 0 ? String(v).trim() : undefined
}

function requireEnvStrict(name) {
  const v = requireEnv(name)
  if (!v) {
    throw new Error(`[TraceAI] Missing required env var: ${name}`)
  }
  return v
}

function resolveShelbyNetwork(Network, raw) {
  const v = (raw ?? '').toString().trim().toUpperCase()
  if (!v) return Network.TESTNET
  if (v === 'TESTNET') return Network.TESTNET
  if (v === 'SHELBYNET' || v === 'DEVNET') return Network.SHELBYNET
  if (v === 'LOCAL') return Network.LOCAL
  return Network.TESTNET
}

async function uploadTestFileToShelby() {
  const aptosPrivateKey = requireEnvStrict('APTOS_ED25519_PRIVATE_KEY')
  const shelbyApiKey = requireEnv('SHELBY_API_KEY') // optional: higher rate limits
  const shelbyNetworkRaw = requireEnvStrict('SHELBY_NETWORK') // TESTNET | SHELBYNET | LOCAL
  const shelbyRpcBaseUrl = requireEnvStrict('SHELBY_RPC_BASE_URL')

  const [{ Network, Ed25519Account, Ed25519PrivateKey }, shelby] =
    await Promise.all([
      import('@aptos-labs/ts-sdk'),
      import('@shelby/client-sdk/node'),
    ])

  const {
    ShelbyNodeClient,
    createBlobKey,
    createDefaultErasureCodingProvider,
    generateCommitments,
  } = shelby

  const signer = new Ed25519Account({
    privateKey: new Ed25519PrivateKey(aptosPrivateKey),
  })

  const network = resolveShelbyNetwork(Network, shelbyNetworkRaw)
  const shelbyClient = new ShelbyNodeClient({
    network,
    ...(shelbyApiKey ? { apiKey: shelbyApiKey } : {}),
    rpc: {
      baseUrl: shelbyRpcBaseUrl,
      ...(shelbyApiKey ? { apiKey: shelbyApiKey } : {}),
    },
    ...(shelbyApiKey ? { aptos: { clientConfig: { API_KEY: shelbyApiKey } } } : {}),
  })

  const blobName = `traceai/test-${Date.now()}.txt`
  const testFilePath = path.join(__dirname, 'test-data', 'traceai-test.txt')
  const blobData = await fs.readFile(testFilePath)
  const expirationMicros = (Date.now() + 1000 * 60 * 60 * 24 * 30) * 1000 // 30 days

  // We explicitly orchestrate the flow so we can reliably log the Aptos tx hash.
  const provider = await createDefaultErasureCodingProvider()
  const commitments = await generateCommitments(provider, blobData)

  const { transaction } = await shelbyClient.coordination.registerBlob({
    account: signer,
    blobName,
    blobMerkleRoot: commitments.blob_merkle_root,
    size: blobData.length,
    expirationMicros,
  })

  const txHash = transaction?.hash
  if (txHash && typeof shelbyClient.aptos?.waitForTransaction === 'function') {
    await shelbyClient.aptos.waitForTransaction({ transactionHash: txHash })
  }

  await shelbyClient.rpc.putBlob({
    account: signer.accountAddress,
    blobName,
    blobData,
  })

  const objectId = createBlobKey({ account: signer.accountAddress, blobName })
  console.log('[TraceAI] Shelby upload complete')
  console.log('[TraceAI] Object ID:', objectId)
  console.log('[TraceAI] Aptos tx hash:', txHash ?? '(unknown)')
}

async function uploadBufferToShelby({ blobData, blobName }) {
  const aptosPrivateKey = requireEnvStrict('APTOS_ED25519_PRIVATE_KEY')
  const shelbyApiKey = requireEnv('SHELBY_API_KEY') // optional: higher rate limits
  const shelbyNetworkRaw = requireEnvStrict('SHELBY_NETWORK') // TESTNET | SHELBYNET | LOCAL
  const shelbyRpcBaseUrl = requireEnvStrict('SHELBY_RPC_BASE_URL')

  const [{ Network, Ed25519Account, Ed25519PrivateKey }, shelby] =
    await Promise.all([
      import('@aptos-labs/ts-sdk'),
      import('@shelby/client-sdk/node'),
    ])

  const {
    ShelbyNodeClient,
    createBlobKey,
    createDefaultErasureCodingProvider,
    generateCommitments,
  } = shelby

  const signer = new Ed25519Account({
    privateKey: new Ed25519PrivateKey(aptosPrivateKey),
  })

  const network = resolveShelbyNetwork(Network, shelbyNetworkRaw)
  const shelbyClient = new ShelbyNodeClient({
    network,
    ...(shelbyApiKey ? { apiKey: shelbyApiKey } : {}),
    rpc: {
      baseUrl: shelbyRpcBaseUrl,
      ...(shelbyApiKey ? { apiKey: shelbyApiKey } : {}),
    },
    ...(shelbyApiKey ? { aptos: { clientConfig: { API_KEY: shelbyApiKey } } } : {}),
  })

  const expirationMicros = (Date.now() + 1000 * 60 * 60 * 24 * 30) * 1000 // 30 days

  const provider = await createDefaultErasureCodingProvider()
  const commitments = await generateCommitments(provider, blobData)

  const { transaction } = await shelbyClient.coordination.registerBlob({
    account: signer,
    blobName,
    blobMerkleRoot: commitments.blob_merkle_root,
    size: blobData.length,
    expirationMicros,
  })

  const txHash = transaction?.hash
  if (txHash && typeof shelbyClient.aptos?.waitForTransaction === 'function') {
    await shelbyClient.aptos.waitForTransaction({ transactionHash: txHash })
  }

  await shelbyClient.rpc.putBlob({
    account: signer.accountAddress,
    blobName,
    blobData,
  })

  const objectId = createBlobKey({ account: signer.accountAddress, blobName })
  return { objectId, txHash }
}

function parseShelbyObjectId(objectId) {
  const raw = (objectId || '').toString().trim()
  if (!raw.startsWith('@')) {
    throw new Error('[TraceAI] Invalid objectId format')
  }
  const slashIdx = raw.indexOf('/')
  if (slashIdx <= 1) {
    throw new Error('[TraceAI] Invalid objectId format')
  }
  const account = `0x${raw.slice(1, slashIdx)}`
  const blobName = raw.slice(slashIdx + 1)
  if (!blobName) throw new Error('[TraceAI] Invalid objectId format')
  return { account, blobName }
}

async function downloadBlobFromShelby({ objectId }) {
  const aptosPrivateKey = requireEnvStrict('APTOS_ED25519_PRIVATE_KEY')
  const shelbyApiKey = requireEnv('SHELBY_API_KEY') // optional: higher rate limits
  const shelbyNetworkRaw = requireEnvStrict('SHELBY_NETWORK')
  const shelbyRpcBaseUrl = requireEnvStrict('SHELBY_RPC_BASE_URL')

  const [{ Network, Ed25519Account, Ed25519PrivateKey }, shelby] =
    await Promise.all([
      import('@aptos-labs/ts-sdk'),
      import('@shelby/client-sdk/node'),
    ])

  const { ShelbyNodeClient } = shelby

  const signer = new Ed25519Account({
    privateKey: new Ed25519PrivateKey(aptosPrivateKey),
  })

  const network = resolveShelbyNetwork(Network, shelbyNetworkRaw)
  const shelbyClient = new ShelbyNodeClient({
    network,
    ...(shelbyApiKey ? { apiKey: shelbyApiKey } : {}),
    rpc: {
      baseUrl: shelbyRpcBaseUrl,
      ...(shelbyApiKey ? { apiKey: shelbyApiKey } : {}),
    },
    ...(shelbyApiKey ? { aptos: { clientConfig: { API_KEY: shelbyApiKey } } } : {}),
  })

  const { account, blobName } = parseShelbyObjectId(objectId)

  const blob = await shelbyClient.download({
    account,
    blobName,
  })

  // Read ReadableStream into a Buffer (MVP; fine for hackathon-sized files)
  const reader = blob.readable.getReader()
  const chunks = []
  let total = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const buf = Buffer.from(value)
    chunks.push(buf)
    total += buf.length
  }

  return {
    signerAddress: signer.accountAddress.toString(),
    account: blob.account.toString(),
    blobName: blob.name,
    contentLength: blob.contentLength,
    data: Buffer.concat(chunks, total),
  }
}

module.exports = {
  uploadTestFileToShelby,
  uploadBufferToShelby,
  downloadBlobFromShelby,
  parseShelbyObjectId,
}

