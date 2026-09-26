// src/workers/compute.worker.ts
// Runs the cut optimization off the main thread so the UI stays responsive
import { runCompute, type ComputeRequest, type ComputeResult } from '../algorithm/computeRequest'

export interface ComputeMessage {
  id: number
  request: ComputeRequest
}

export type ComputeResponse =
  | { id: number; result: ComputeResult }
  | { id: number; error: string }

self.onmessage = (e: MessageEvent<ComputeMessage>) => {
  const { id, request } = e.data
  let response: ComputeResponse
  try {
    response = { id, result: runCompute(request) }
  } catch (err) {
    response = { id, error: err instanceof Error ? err.message : String(err) }
  }
  self.postMessage(response)
}
