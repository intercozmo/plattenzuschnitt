// src/components/ProjectMenu.tsx
import { useEffect, useId, useRef, useState } from 'react'
import { useStore, selectPersisted } from '../store'
import {
  listProjects,
  saveProject,
  deleteProject,
  serializeProjectFile,
  parseProjectFile,
  type Project,
} from '../projects'

interface Props {
  onProjectChange: () => void  // inputs were replaced → current plan is stale
}

const itemClass = 'w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100'

export default function ProjectMenu({ onProjectChange }: Props) {
  const projectName = useStore(s => s.projectName)
  const loadProjectData = useStore(s => s.loadProjectData)
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputId = useId()

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function toggle() {
    if (!open) setProjects(listProjects())
    setOpen(o => !o)
  }

  function load(name: string, data: Project['data']) {
    loadProjectData(name, data)
    onProjectChange()
    setOpen(false)
  }

  function save(name: string) {
    const state = useStore.getState()
    try {
      saveProject(name, { ...selectPersisted(state), projectName: name })
      state.setProjectName(name)
      setOpen(false)
    } catch {
      alert('Projekt konnte nicht gespeichert werden (Speicher voll?).')
    }
  }

  function handleNew() {
    if (!confirm('Neues Projekt anlegen? Nicht gespeicherte Eingaben gehen verloren.')) return
    load('', { stockPlates: [], cutPieces: [] })
  }

  function handleSave() {
    if (projectName) save(projectName)
    else handleSaveAs()
  }

  function handleSaveAs() {
    const name = prompt('Projektname:', projectName)?.trim()
    if (!name) return
    if (name !== projectName && projects.some(p => p.name === name) &&
        !confirm(`Projekt „${name}“ existiert bereits. Überschreiben?`)) return
    save(name)
  }

  function handleOpen(project: Project) {
    if (!confirm(`Projekt „${project.name}“ öffnen? Nicht gespeicherte Eingaben gehen verloren.`)) return
    load(project.name, project.data)
  }

  function handleDelete(project: Project) {
    if (!confirm(`Projekt „${project.name}“ löschen?`)) return
    deleteProject(project.name)
    setProjects(listProjects())
  }

  function handleExport() {
    const json = serializeProjectFile(projectName, selectPersisted(useStore.getState()))
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName || 'projekt'}.plattenzuschnitt.json`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    file.text().then(text => {
      const result = parseProjectFile(text)
      if (!result) {
        alert('Die Datei ist keine gültige Plattenzuschnitt-Projektdatei.')
        return
      }
      load(result.name, result.data)
    })
  }

  return (
    <div className="relative min-w-0" ref={menuRef}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="text-sm text-slate-200 hover:text-white px-2 py-1 rounded hover:bg-slate-700 max-w-full lg:max-w-64 truncate"
      >
        {projectName || 'Unbenannt'} ▾
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1 text-slate-700">
          <button type="button" className={itemClass} onClick={handleNew}>Neues Projekt</button>
          <button type="button" className={itemClass} onClick={handleSave}>Speichern</button>
          <button type="button" className={itemClass} onClick={handleSaveAs}>Speichern unter…</button>
          <button type="button" className={itemClass} onClick={handleExport}>Als Datei exportieren</button>
          <label htmlFor={fileInputId} className={`${itemClass} block cursor-pointer`}>Datei importieren…</label>
          <input id={fileInputId} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />

          <div className="border-t border-slate-200 mt-1 pt-1">
            <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Gespeicherte Projekte
            </div>
            {projects.length === 0 && (
              <div className="px-3 py-1.5 text-sm text-slate-400">Noch keine Projekte gespeichert.</div>
            )}
            <div className="max-h-64 overflow-y-auto">
              {projects.map(project => (
                <div key={project.name} className="flex items-center hover:bg-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpen(project)}
                    className="flex-1 min-w-0 text-left px-3 py-1.5"
                  >
                    <div className={`text-sm truncate ${project.name === projectName ? 'font-semibold' : ''}`}>
                      {project.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(project.updatedAt).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(project)}
                    className="px-3 py-1.5 text-slate-400 hover:text-red-500 text-xs"
                    title="Löschen"
                    aria-label={`Projekt ${project.name} löschen`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
