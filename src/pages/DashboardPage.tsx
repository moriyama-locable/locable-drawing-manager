import { useEffect, useState } from 'react'
import { fetchDashboard, type DashboardSummary } from '../api/client'

function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboard()
      .then(setSummary)
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <div className="page">
      <h1>ダッシュボード</h1>
      {error && <p className="error-text">{error}</p>}

      {summary && (
        <>
          <div className="dashboard-cards">
            <div className="dashboard-card">
              <span className="dashboard-card-label">進行中プロジェクト数</span>
              <span className="dashboard-card-value">{summary.active_projects}</span>
            </div>
            <div className="dashboard-card alert">
              <span className="dashboard-card-label">LOD不足図面数</span>
              <span className="dashboard-card-value">{summary.lod_shortage_drawings}</span>
            </div>
            <div className="dashboard-card alert">
              <span className="dashboard-card-label">変更影響あり図面数</span>
              <span className="dashboard-card-value">{summary.change_alert_drawings}</span>
            </div>
            <div className="dashboard-card alert">
              <span className="dashboard-card-label">期限超過数</span>
              <span className="dashboard-card-value">{summary.overdue_count}</span>
            </div>
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
