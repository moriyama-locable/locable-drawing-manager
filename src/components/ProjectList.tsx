import { useEffect, useState } from 'react'
import { createProject, fetchPhases, fetchProjects } from '../api/client'
import type { Phase, Project } from '../types'

interface ProjectListProps {
  projects: Project[]
  selectedProjectId: string | null
  onSelect: (projectId: string) => void
  onCreated: (projectId: string) => void
}

function ProjectList({ projects, selectedProjectId, onSelect, onCreated }: ProjectListProps) {
  const [projectName, setProjectName] = useState('')
  const [currentPhase, setCurrentPhase] = useState('')
  const [phases, setPhases] = useState<Phase[]>([])
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([])

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

  async function handleCreate() {
    if (!projectName || !currentPhase) return
    try {
      const { project_id } = await createProject({
        project_name: projectName,
        current_phase: currentPhase,
      })
      setProjectName('')
      setCurrentPhase('')
      setError(null)
      onCreated(project_id)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const visibleProjects = tab === 'active' ? projects : archivedProjects

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

      {visibleProjects.length === 0 ? (
        <p className="empty-hint">
          {tab === 'active' ? 'プロジェクトがありません。' : 'アーカイブ済みプロジェクトはありません。'}
        </p>
      ) : (
        <ul className="project-list">
          {visibleProjects.map((project) => (
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

      {tab === 'active' && (
        <div className="project-create-form">
          <input
            placeholder="プロジェクト名"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
          <select value={currentPhase} onChange={(e) => setCurrentPhase(e.target.value)}>
            <option value="">フェーズを選択</option>
            {phases.map((phase) => (
              <option key={phase.phase_code} value={phase.phase_code}>
                {phase.phase_name}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleCreate}>
            + プロジェクトを追加
          </button>
          {error && <p className="error-text">{error}</p>}
        </div>
      )}
    </div>
  )
}

export default ProjectList
