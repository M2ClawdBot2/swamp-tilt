/**
 * RunPod lifecycle: start, poll health, stop. Build-time only, never
 * bundled. Every call here costs real GPU-hour money — this script never
 * runs itself; it's invoked deliberately from gen-assets.ts or by hand,
 * and `stop` is called in a `finally` so a crash mid-batch doesn't leave
 * the meter running overnight.
 *
 * Requires RUNPOD_API_KEY (present in .env) and RUNPOD_POD_ID (the pod to
 * start — NOT set yet; provisioning a new pod/template is a cost decision
 * for Sam to make explicitly, this script only starts/stops a pod that
 * already exists).
 */
import 'dotenv/config'

const API = 'https://api.runpod.io/graphql'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} is not set in .env`)
  return v
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const apiKey = requireEnv('RUNPOD_API_KEY')
  const res = await fetch(`${API}?api_key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`RunPod API ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] }
  if (json.errors?.length) throw new Error(`RunPod GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`)
  return json.data as T
}

export async function startPod(): Promise<void> {
  const podId = requireEnv('RUNPOD_POD_ID')
  await gql(`mutation($input: PodResumeInput!) { podResume(input: $input) { id desiredStatus } }`, {
    input: { podId },
  })
  console.log(`[pod] resume requested for ${podId}`)
}

export async function stopPod(): Promise<void> {
  const podId = requireEnv('RUNPOD_POD_ID')
  await gql(`mutation($input: PodStopInput!) { podStop(input: $input) { id desiredStatus } }`, {
    input: { podId },
  })
  console.log(`[pod] stop requested for ${podId}`)
}

export interface PodStatus {
  id: string
  desiredStatus: string
  runtime: { uptimeInSeconds: number } | null
}

export async function podStatus(): Promise<PodStatus> {
  const podId = requireEnv('RUNPOD_POD_ID')
  const data = await gql<{ pod: PodStatus }>(
    `query($id: String!) { pod(input: { podId: $id }) { id desiredStatus runtime { uptimeInSeconds } } }`,
    { id: podId },
  )
  return data.pod
}

/** Poll a health endpoint on the pod (TRELLIS_ENDPOINT or FLUX_ENDPOINT's host) until it answers. */
export async function waitForHealth(url: string, timeoutMs = 180_000, intervalMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4_000) })
      if (res.ok) {
        console.log(`[pod] healthy: ${url}`)
        return
      }
    } catch {
      // not up yet, keep polling
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error(`[pod] health check timed out after ${timeoutMs}ms: ${url}`)
}

/** Run a batch function with the pod guaranteed to stop afterward, success or failure. */
export async function withPod<T>(fn: () => Promise<T>): Promise<T> {
  await startPod()
  try {
    const trellis = process.env.TRELLIS_ENDPOINT
    if (trellis) await waitForHealth(trellis.replace(/\/generate$/, '/health'))
    return await fn()
  } finally {
    await stopPod().catch((e) => console.error('[pod] stop FAILED — check the RunPod console manually:', e))
  }
}

// CLI: `tsx tools/pod.ts start|stop|status`
if (import.meta.url === `file://${process.argv[1]}`) {
  const cmd = process.argv[2]
  if (cmd === 'start') await startPod()
  else if (cmd === 'stop') await stopPod()
  else if (cmd === 'status') console.log(await podStatus())
  else {
    console.error('usage: tsx tools/pod.ts start|stop|status')
    process.exit(1)
  }
}
