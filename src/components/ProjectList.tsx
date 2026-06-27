import type { Project } from '../types'

interface ProjectListProps {
  projects: Project[]
  selectedProjectId: string | null
  onSelect: (projectId: string) => void
}

function ProjectList({ projects, selectedProjectId, onSelect }: ProjectListProps) {
  if (projects.length === 0) {
    return <p className="empty-hint">プロジェクトがありません。</p>
  }

  return (
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
  )
}

export default ProjectList
