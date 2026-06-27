import { useState } from 'react'
import { createProject } from '../api/client'
import type { Project } from '../types'

interface ProjectListProps {
  projects: Project[]
  selectedProjectId: string | null
  onSelect: (projectId: string) => void
  onCreated: (projectId: string) => void
}

function ProjectList({ projects, selectedProjectId, onSelect, onCreated }: ProjectListProps) {
  const [projectName, setProjectName] = useState('')
  const [currentPhase, setCurrentPhase] = useState('')
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div>
      {projects.length === 0 ? (
        <p className="empty-hint">プロジェクトがありません。</p>
      ) : (
        <ul className="project-list">
          {projects.map((project) => (
            <li key={project.project_id}>
              <button
                type="button"
                className={project.project_id === selectedProjectId ? 'active' : ''}
                onClick={() => onSelect(project.project_id)}
              >
                <span className="project-name">{project.project_name}</span>
                <span className="project-phase">{project.current_phase}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="project-create-form">
        <input
          placeholder="プロジェクト名"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <input
          placeholder="フェーズ"
          value={currentPhase}
          onChange={(e) => setCurrentPhase(e.target.value)}
        />
        <button type="button" onClick={handleCreate}>
          + プロジェクトを追加
        </button>
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  )
}

export default ProjectList
