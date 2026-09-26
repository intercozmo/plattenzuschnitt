// src/projects.ts
// Named projects saved locally, plus JSON file export/import
import { parsePersistedState, type PersistedState } from './persistence'

const PROJECTS_KEY = 'plattenzuschnitt_projects_v1'
const FILE_APP_ID = 'plattenzuschnitt'

export interface Project {
  name: string        // unique key
  updatedAt: string   // ISO date
  data: PersistedState
}

export function parseProjects(raw: string | null): Project[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const projects: Project[] = []
    for (const p of parsed) {
      const data = parsePersistedState(p?.data)
      if (typeof p?.name === 'string' && typeof p?.updatedAt === 'string' && data) {
        projects.push({ name: p.name, updatedAt: p.updatedAt, data })
      }
    }
    return projects
  } catch {
    return []
  }
}

export function listProjects(): Project[] {
  try {
    return parseProjects(localStorage.getItem(PROJECTS_KEY))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch {
    return []
  }
}

function writeProjects(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
}

// Saves under `name`, overwriting a project with the same name
export function saveProject(name: string, data: PersistedState): void {
  const others = listProjects().filter(p => p.name !== name)
  writeProjects([{ name, updatedAt: new Date().toISOString(), data }, ...others])
}

export function deleteProject(name: string): void {
  writeProjects(listProjects().filter(p => p.name !== name))
}

export function serializeProjectFile(name: string, data: PersistedState): string {
  return JSON.stringify({ app: FILE_APP_ID, version: 1, name, data }, null, 2)
}

export function parseProjectFile(text: string): { name: string; data: PersistedState } | null {
  try {
    const parsed = JSON.parse(text)
    if (parsed?.app !== FILE_APP_ID) return null
    const data = parsePersistedState(parsed.data)
    if (!data) return null
    return { name: typeof parsed.name === 'string' ? parsed.name : '', data }
  } catch {
    return null
  }
}
