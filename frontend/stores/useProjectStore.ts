/**
 * Project 管理 Store — localStorage 持久化
 */
import { create } from 'zustand'
import { useMatrixStore } from './useMatrixStore'
import type { Project, ProjectSummary } from '@/types'

const LIST_KEY = 'project:list'
const projectKey = (id: string) => `project:${id}`

interface ProjectStore {
  projects: ProjectSummary[]
  activeProjectId: string | null

  loadProjectList: () => void
  saveCurrentAsProject: (name?: string) => string | null
  autoSave: () => void
  deleteProject: (id: string) => void
  setActiveProjectId: (id: string | null) => void
  getFullProject: (id: string) => Project | null
}

function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function readList(): ProjectSummary[] {
  try {
    const raw = localStorage.getItem(LIST_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeList(list: ProjectSummary[]): void {
  localStorage.setItem(LIST_KEY, JSON.stringify(list))
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,

  loadProjectList: () => {
    set({ projects: readList() })
  },

  saveCurrentAsProject: (name?: string) => {
    const matrix = useMatrixStore.getState()
    if (matrix.papers.length === 0) return null

    const { activeProjectId } = get()
    const now = Date.now()
    const id = activeProjectId || generateId()

    const project: Project = {
      id,
      name: name || matrix.query || 'Untitled',
      query: matrix.query,
      sessionId: matrix.sessionId,
      papers: matrix.papers,
      columns: matrix.columns,
      cells: Array.from(matrix.cells.entries()),
      totalSearched: matrix.totalSearched,
      createdAt: activeProjectId
        ? (get().projects.find((p) => p.id === id)?.updatedAt || now)
        : now,
      updatedAt: now,
    }

    localStorage.setItem(projectKey(id), JSON.stringify(project))

    const summary: ProjectSummary = {
      id,
      name: project.name,
      query: project.query,
      paperCount: project.papers.length,
      columnCount: project.columns.length,
      updatedAt: now,
    }

    const list = readList().filter((p) => p.id !== id)
    list.unshift(summary)
    writeList(list)

    set({ projects: list, activeProjectId: id })
    return id
  },

  autoSave: () => {
    const { activeProjectId } = get()
    const matrix = useMatrixStore.getState()
    if (!activeProjectId || matrix.papers.length === 0) return
    get().saveCurrentAsProject()
  },

  deleteProject: (id: string) => {
    localStorage.removeItem(projectKey(id))
    const list = readList().filter((p) => p.id !== id)
    writeList(list)
    const { activeProjectId } = get()
    set({
      projects: list,
      activeProjectId: activeProjectId === id ? null : activeProjectId,
    })
  },

  setActiveProjectId: (id) => set({ activeProjectId: id }),

  getFullProject: (id: string) => {
    try {
      const raw = localStorage.getItem(projectKey(id))
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
}))
