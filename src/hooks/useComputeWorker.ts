// src/hooks/useComputeWorker.ts
import { useEffect, useRef, useState } from 'react'
import type { ComputeRequest, ComputeResult } from '../algorithm/computeRequest'
import type { ComputeMessage, ComputeResponse } from '../workers/compute.worker'

interface Pending {
  id: number
  resolve: (result: ComputeResult | null) => void
  reject: (err: Error) => void
}

let nextId = 0

/**
 * Runs computations in a Web Worker, one at a time.
 * `compute` resolves with the result, or with null if it was cancelled
 * (by `cancel` or by starting another computation).
 */
export function useComputeWorker() {
  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<Pending | null>(null)
  const [computing, setComputing] = useState(false)

  useEffect(() => () => workerRef.current?.terminate(), [])

  function finish(): Pending | null {
    const pending = pendingRef.current
    pendingRef.current = null
    setComputing(false)
    return pending
  }

  function stopWorker() {
    workerRef.current?.terminate()
    workerRef.current = null
  }

  // Terminating is the only way to interrupt a running computation
  function cancel() {
    stopWorker()
    finish()?.resolve(null)
  }

  function getWorker(): Worker {
    if (workerRef.current) return workerRef.current
    const worker = new Worker(new URL('../workers/compute.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<ComputeResponse>) => {
      if (pendingRef.current?.id !== e.data.id) return
      const pending = finish()
      if ('error' in e.data) pending?.reject(new Error(e.data.error))
      else pending?.resolve(e.data.result)
    }
    worker.onerror = (e: ErrorEvent) => {
      stopWorker()
      finish()?.reject(new Error(e.message || 'Fehler im Rechen-Worker'))
    }
    workerRef.current = worker
    return worker
  }

  function compute(request: ComputeRequest): Promise<ComputeResult | null> {
    if (pendingRef.current) cancel()
    const worker = getWorker()
    const id = ++nextId
    setComputing(true)
    return new Promise((resolve, reject) => {
      pendingRef.current = { id, resolve, reject }
      const message: ComputeMessage = { id, request }
      worker.postMessage(message)
    })
  }

  return { compute, cancel, computing }
}
