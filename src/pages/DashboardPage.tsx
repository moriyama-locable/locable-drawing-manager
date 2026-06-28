import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDashboard, fetchLodDefinitions, fetchProjects, type DashboardSummary } from '../api/client'
import type { LodDefinition, Project } from '../types'

function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [lodDefinitions, setLodDefinitions] = useState<LodDefinition[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
      .then((data) => setProjects(data.projects))
      .catch((err: Error) => setError(err.message))
    fetchLodDefinitions()
      .then((data) => setLodDefinitions(data.lod_definitions))
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
            <div className="lod-progress-row">
              <span className="lod-progress-label">現在LOD分布（簡易→標準→詳細の密度でどこまで進んでいるか）</span>
              <div className="lod-progress-scale">
                {[{ lod_level: 0, lod_name: '未着手' }, ...lodDefinitions]
                  .sort((a, b) => a.lod_level - b.lod_level)
                  .map((lod) => {
                    const count = summary.lod_distribution.find((d) => d.current_lod === lod.lod_level)?.count ?? 0
                    return (
                      <div key={lod.lod_level} className="lod-progress-step" title={`${lod.lod_name}: ${count}件`}>
                        <div className={count > 0 ? 'lod-progress-dot filled' : 'lod-progress-dot'} />
                        <span className="lod-progress-step-label">
                          {lod.lod_name}
                          {count > 0 ? `(${count})` : ''}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          </section>

          <div className="dashboard-cards">
            <div className="dashboard-card">
              <span className="dashboard-card-label">進行中プロジェクト数</span>
              <span className="dashboard-card-value">{summary.active_projects}</span>
            </div>
            <Link className="dashboard-card alert" to="/drawings?focus=lod_shortage">
              <span className="dashboard-card-label">LOD不足図面数</span>
              <span className="dashboard-card-value">{summary.lod_shortage_drawings}</span>
            </Link>
            <Link className="dashboard-card alert" to="/changes?focus=alert">
              <span className="dashboard-card-label">変更影響あり図面数</span>
              <span className="dashboard-card-value">{summary.change_alert_drawings}</span>
            </Link>
            <Link className="dashboard-card alert" to="/drawings?focus=overdue">
              <span className="dashboard-card-label">期限超過数</span>
              <span className="dashboard-card-value">{summary.overdue_count}</span>
            </Link>
            <div className="dashboard-card">
              <span className="dashboard-card-label">ロック済み図面数</span>
              <span className="dashboard-card-value">{summary.locked_drawings}</span>
            </div>
          </div>

          <section>
            <h2>今日見るべき項目</h2>
            {summary.today_priority_items.length === 0 ? (
              <p className="empty-hint">対象の項目はありません。</p>
            ) : (
              <ul className="related-change-list">
                {summary.today_priority_items.map((item) => (
                  <li key={item.drawing_id}>
                    <span>
                      {item.drawing_no} {item.drawing_name}
                    </span>
                    <span>{item.lod_judgement}</span>
                    <span>{item.has_change_alert ? '影響あり' : ''}</span>
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
