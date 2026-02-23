'use client'

import { useEffect, useCallback, useState } from 'react'
import { useProjectStore } from '@/stores/useProjectStore'
import { useMatrixStore } from '@/stores/useMatrixStore'
import { useSearch } from '@/hooks/useSearch'
import type { ProjectSummary } from '@/types'

export default function ProjectPanel() {
  const projects = useProjectStore((s) => s.projects)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const loadProjectList = useProjectStore((s) => s.loadProjectList)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const getFullProject = useProjectStore((s) => s.getFullProject)
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId)
  const hydrateFromProject = useMatrixStore((s) => s.hydrateFromProject)
  const setSessionId = useMatrixStore((s) => s.setSessionId)
  const { restoreSession } = useSearch()

  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    loadProjectList()
  }, [loadProjectList])

  const handleLoad = useCallback(
    async (id: string) => {
      const project = getFullProject(id)
      if (!project) return

      setLoading(id)
      hydrateFromProject({
        sessionId: null,
        query: project.query,
        papers: project.papers,
        columns: project.columns,
        cells: project.cells,
        totalSearched: project.totalSearched,
      })

      const newSessionId = await restoreSession(project.papers)
      if (newSessionId) {
        setSessionId(newSessionId)
      }
      setActiveProjectId(id)
      setLoading(null)
    },
    [getFullProject, hydrateFromProject, restoreSession, setSessionId, setActiveProjectId],
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      deleteProject(id)
    },
    [deleteProject],
  )

  if (projects.length === 0) return null

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-sm font-semibold text-gray-500">Recent Projects</h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            isActive={p.id === activeProjectId}
            isLoading={loading === p.id}
            onLoad={() => handleLoad(p.id)}
            onDelete={(e) => handleDelete(e, p.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ProjectCard({
  project,
  isActive,
  isLoading,
  onLoad,
  onDelete,
}: {
  project: ProjectSummary
  isActive: boolean
  isLoading: boolean
  onLoad: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const timeAgo = formatTimeAgo(project.updatedAt)

  return (
    <button
      onClick={onLoad}
      disabled={isLoading}
      className={`group relative text-left w-full px-4 py-3 rounded-xl border transition-all ${
        isActive
          ? 'border-indigo-300 bg-indigo-50/50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm'
      } ${isLoading ? 'opacity-60 cursor-wait' : 'cursor-pointer active:scale-[0.98]'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-800 truncate">{project.name}</div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-400">
            <span>{project.paperCount} papers</span>
            <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
            <span>{project.columnCount} cols</span>
            <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
            <span>{timeAgo}</span>
          </div>
        </div>
        {isLoading ? (
          <svg className="w-4 h-4 text-indigo-400 animate-spin shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all shrink-0"
            title="Delete project"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </button>
  )
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}
