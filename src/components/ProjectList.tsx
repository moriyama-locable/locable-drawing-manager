import { useEffect, useMemo, useState } from 'react'
import { fetchPhases, fetchProjects } from '../api/client'
import type { Phase, Project } from '../types'

interface ProjectListProps {
  projects: Project[]
  selectedProjectId: string | null
  onSelect: (projectId: string) => void
}

function ProjectList({ projects, selectedProjectId, onSelect }: ProjectListProps) {
  const [phases, setPhases] = useState<Phase[]>([])
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([])
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchPhases()
      .then((data) => setPhases(data.phases))
      .catch((err: Error) => setError(err.message))
  }, [])

  useEffect(() => {
    if (tab !== 'archived') return
    fetchProjects('archived')
      .then((data) => setArchivedProjects(data.projects))
      .catch((err: Error) => setError(err.message))
  }, [tab])

  function phaseName(phaseCode: string): string {
    return phases.find((phase) => phase.phase_code === phaseCode)?.phase_name ?? phaseCode
  }

  function togglePhase(phaseCode: string) {
    setCollapsedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phaseCode)) {
        next.delete(phaseCode)
      } else {
        next.add(phaseCode)
      }
      return next
    })
  }

  const visibleProjects = tab === 'active' ? projects : archivedProjects

  const groupedByPhase = useMemo(() => {
    const sortedPhases = [...phases].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const phaseCodesPresent = sortedPhases.filter((phase) =>
      visibleProjects.some((project) => project.current_phase === phase.phase_code)
    )
    return phaseCodesPresent.map((phase) => ({
      phase,
      projects: visibleProjects.filter((project) => project.current_phase === phase.phase_code),
    }))
  }, [phases, visibleProjects])

  return (
    <div>
      <div className="view-toggle">
        <button type="button" className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>
          進行中
        </button>
        <button type="button" className={tab === 'archived' ? 'active' : ''} onClick={() => setTab('archived')}>
          アーカイブ
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {visibleProjects.length === 0 ? (
        <p className="empty-hint">
          {tab === 'active' ? 'プロジェクトがありません。' : 'アーカイブ済みプロジェクトはありません。'}
        </p>
      ) : (
        <div className="project-phase-groups">
          {groupedByPhase.map(({ phase, projects: phaseProjects }) => {
            const collapsed = collapsedPhases.has(phase.phase_code)
            return (
              <div className="project-phase-group" key={phase.phase_code}>
                <button
                  type="button"
                  className="project-phase-header"
                  onClick={() => togglePhase(phase.phase_code)}
                >
                  <span className={collapsed ? 'project-phase-chevron collapsed' : 'project-phase-chevron'}>▾</span>
                  <span>{phase.phase_name}</span>
                </button>
                {!collapsed && (
                  <ul className="project-list">
                    {phaseProjects.map((project) => (
                      <li key={project.project_id}>
                        <button
                          type="button"
                          className={project.project_id === selectedProjectId ? 'active' : ''}
                          onClick={() => onSelect(project.project_id)}
                        >
                          <span className="project-name">{project.project_name}</span>
                          <span className="project-phase">{phaseName(project.current_phase)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProjectList
