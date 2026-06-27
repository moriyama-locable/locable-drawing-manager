import { useEffect, useState } from 'react'
import { addChangeDrawingLink, createChange, fetchChanges, fetchDrawings, fetchProjects } from '../api/client'
import type { ChangeItem, Drawing, Project } from '../types'

function ChangesPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [changes, setChanges] = useState<ChangeItem[]>([])
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [error, setError] = useState<string | null>(null)

  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [impactLevel, setImpactLevel] = useState('中')

  const [linkChangeId, setLinkChangeId] = useState('')
  const [linkDrawingId, setLinkDrawingId] = useState('')
  const [linkImpactLevel, setLinkImpactLevel] = useState('中')

  useEffect(() => {
    fetchProjects()
      .then((data) => {
        setProjects(data.projects)
        if (data.projects.length > 0) setSelectedProjectId(data.projects[0].project_id)
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!selectedProjectId) return
    fetchChanges(selectedProjectId)
      .then((data) => setChanges(data.changes))
      .catch((err: Error) => setError(err.message))
    fetchDrawings(selectedProjectId)
      .then((data) => setDrawings(data.drawings))
      .catch((err: Error) => setError(err.message))
  }, [selectedProjectId])

  async function handleCreateChange() {
    if (!selectedProjectId || !reason || !detail) return
    try {
      await createChange(selectedProjectId, { change_reason: reason, change_detail: detail, impact_level: impactLevel })
      setReason('')
      setDetail('')
      const data = await fetchChanges(selectedProjectId)
      setChanges(data.changes)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function handleAddLink() {
    if (!linkChangeId || !linkDrawingId) return
    try {
      await addChangeDrawingLink(linkChangeId, linkDrawingId, linkImpactLevel)
      if (selectedProjectId) {
        const data = await fetchDrawings(selectedProjectId)
        setDrawings(data.drawings)
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="page">
      <h1>変更項目</h1>
      {error && <p className="error-text">{error}</p>}

      <div className="changes-project-select">
        <label>
          プロジェクト
          <select value={selectedProjectId ?? ''} onChange={(e) => setSelectedProjectId(e.target.value)}>
            {projects.map((project) => (
              <option key={project.project_id} value={project.project_id}>
                {project.project_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section>
        <h2>変更項目一覧</h2>
        {changes.length === 0 ? (
          <p className="empty-hint">変更項目がありません。</p>
        ) : (
          <table className="drawing-table">
            <thead>
              <tr>
                <th>変更理由</th>
                <th>変更内容</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={change.change_id}>
                  <td>{change.change_reason}</td>
                  <td>{change.change_detail}</td>
                  <td>{change.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>変更項目を追加</h2>
        <div className="change-form">
          <input placeholder="変更理由" value={reason} onChange={(e) => setReason(e.target.value)} />
          <input placeholder="変更内容" value={detail} onChange={(e) => setDetail(e.target.value)} />
          <select value={impactLevel} onChange={(e) => setImpactLevel(e.target.value)}>
            <option value="高">高</option>
            <option value="中">中</option>
            <option value="低">低</option>
          </select>
          <button type="button" onClick={handleCreateChange}>
            追加
          </button>
        </div>
      </section>

      <section>
        <h2>影響図面をリンク</h2>
        <div className="change-form">
          <select value={linkChangeId} onChange={(e) => setLinkChangeId(e.target.value)}>
            <option value="">変更項目を選択</option>
            {changes.map((change) => (
              <option key={change.change_id} value={change.change_id}>
                {change.change_reason} - {change.change_detail}
              </option>
            ))}
          </select>
          <select value={linkDrawingId} onChange={(e) => setLinkDrawingId(e.target.value)}>
            <option value="">図面を選択</option>
            {drawings.map((drawing) => (
              <option key={drawing.drawing_id} value={drawing.drawing_id}>
                {drawing.drawing_no} {drawing.drawing_name}
              </option>
            ))}
          </select>
          <select value={linkImpactLevel} onChange={(e) => setLinkImpactLevel(e.target.value)}>
            <option value="高">高</option>
            <option value="中">中</option>
            <option value="低">低</option>
          </select>
          <button type="button" onClick={handleAddLink}>
            リンク追加
          </button>
        </div>
      </section>
    </div>
  )
}

export default ChangesPage
