import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDashboard, fetchProjects, type DashboardSummary } from '../api/client'
import type { Project } from '../types'

function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
      .then((data) => setProjects(data.projects))
      .catch((err: Error) => setError(err.message))
  }, [])

  useEffect(() => {
    fetchDashboard(selectedProjectId || undefined)
      .then(setSummary)
      .catch((err: Error) => setError(err.message))
  }, [selectedProjectId])

  return (
    <div className="page">
      <h1>ダッシュボード</h1>
      {error && <p className="error-text">{error}</p>}

      <div className="changes-project-select">
        <label>
          プロジェクトで絞り込む
          <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}>
            <option value="">すべて</option>
            {projects.map((project) => (
              <option key={project.project_id} value={project.project_id}>
                {project.project_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {summary && (
        <>
          <section className="progress-summary">
            <div className="progress-summary-header">
              <span className="progress-summary-title">全体進捗（承認済の割合）</span>
              <span className="progress-summary-percent">{summary.progress_percent}%</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${summary.progress_percent}%` }} />
            </div>
            <div className="progress-summary-meta">
              <span className="progress-summary-na">
                対応不要の図面 {summary.not_needed_drawings}件（進捗から除外・無視してOK）
              </span>
            </div>
            <div className="progress-status-chips">
              {summary.status_breakdown.map((s) => (
                <span key={s.status} className="progress-status-chip">
                  {s.status} {s.count}件
                </span>
              ))}
            </div>
          </section>

          <div className="dashboard-cards">
            <div className="dashboard-card">
              <span className="dashboard-card-label">進行中プロジェクト数</span>
              <span className="dashboard-card-value">{summary.active_projects}</span>
            </div>
            <Link className="dashboard-card alert" to="/drawings?focus=overdue">
              <span className="dashboard-card-label">期限超過数</span>
              <span className="dashboard-card-value">{summary.overdue_count}</span>
            </Link>
          </div>

          <section>
            <h2>期限が近い図面</h2>
            {summary.upcoming_deadlines.length === 0 ? (
              <p className="empty-hint">対象の項目はありません。</p>
            ) : (
              <ul className="related-change-list">
                {summary.upcoming_deadlines.map((item) => (
                  <li key={item.drawing_id}>
                    <span>
                      {item.drawing_no} {item.drawing_name}
                    </span>
                    <span>{item.deadline}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default DashboardPage
