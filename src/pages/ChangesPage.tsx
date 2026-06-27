import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  addChangeDrawingLink,
  createChange,
  deleteChangeDrawingLink,
  fetchChanges,
  fetchDrawings,
  fetchProjects,
  updateChange,
  updateChangeDrawingLink,
} from '../api/client'
import type { ChangeItem, Drawing, Project } from '../types'

const CHANGE_STATUS_OPTIONS = ['未確認', '確認中', '承認済', '反映中', '対応済', '却下']
const SYNC_STATUS_OPTIONS = ['未確認', '要確認', '未反映', '反映済', '対象外']
const ALERT_SYNC_STATUSES = new Set(['要確認', '未反映'])

function ChangesPage() {
  const [searchParams] = useSearchParams()
  const focus = searchParams.get('focus')

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

  function reloadChanges(projectId: string) {
    return fetchChanges(projectId)
      .then((data) => setChanges(data.changes))
      .catch((err: Error) => setError(err.message))
  }

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
    reloadChanges(selectedProjectId)
    fetchDrawings(selectedProjectId)
      .then((data) => setDrawings(data.drawings))
      .catch((err: Error) => setError(err.message))
  }, [selectedProjectId])

  const visibleChanges = useMemo(() => {
    if (focus !== 'alert') return changes
    return changes.filter((change) => change.links?.some((link) => ALERT_SYNC_STATUSES.has(link.sync_status)))
  }, [changes, focus])

  async function handleCreateChange() {
    if (!selectedProjectId || !reason || !detail) return
    try {
      await createChange(selectedProjectId, { change_reason: reason, change_detail: detail, impact_level: impactLevel })
      setReason('')
      setDetail('')
      await reloadChanges(selectedProjectId)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function handleChangeStatus(changeId: string, status: string) {
    if (!selectedProjectId) return
    try {
      await updateChange(changeId, { status })
      await reloadChanges(selectedProjectId)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function handleAddLink() {
    if (!linkChangeId || !linkDrawingId || !selectedProjectId) return
    try {
      await addChangeDrawingLink(linkChangeId, linkDrawingId, linkImpactLevel)
      await reloadChanges(selectedProjectId)
      const data = await fetchDrawings(selectedProjectId)
      setDrawings(data.drawings)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function handleLinkSyncStatusChange(linkId: string, syncStatus: string) {
    if (!selectedProjectId) return
    try {
      await updateChangeDrawingLink(linkId, syncStatus)
      await reloadChanges(selectedProjectId)
      const data = await fetchDrawings(selectedProjectId)
      setDrawings(data.drawings)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function handleDeleteLink(linkId: string) {
    if (!selectedProjectId) return
    try {
      await deleteChangeDrawingLink(linkId)
      await reloadChanges(selectedProjectId)
      const data = await fetchDrawings(selectedProjectId)
      setDrawings(data.drawings)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="page">
      <h1>変更項目</h1>
      {error && <p className="error-text">{error}</p>}
      {focus === 'alert' && <p className="empty-hint">変更影響ありの項目のみ表示しています。</p>}

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
        {visibleChanges.length === 0 ? (
          <p className="empty-hint">変更項目がありません。</p>
        ) : (
          <table className="drawing-table">
            <thead>
              <tr>
                <th>変更理由</th>
                <th>変更内容</th>
                <th>影響度</th>
                <th>状態</th>
                <th>影響図面</th>
              </tr>
            </thead>
            <tbody>
              {visibleChanges.map((change) => (
                <tr key={change.change_id}>
                  <td>{change.change_reason}</td>
                  <td>{change.change_detail}</td>
                  <td>{change.impact_level}</td>
                  <td>
                    <select
                      value={change.status}
                      onChange={(e) => handleChangeStatus(change.change_id, e.target.value)}
                    >
                      {CHANGE_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {!change.links || change.links.length === 0 ? (
                      <span className="empty-hint">なし</span>
                    ) : (
                      <ul className="related-change-list">
                        {change.links.map((link) => (
                          <li key={link.link_id}>
                            <span>
                              {link.drawing_no} {link.drawing_name}
                            </span>
                            <select
                              value={link.sync_status}
                              onChange={(e) => handleLinkSyncStatusChange(link.link_id, e.target.value)}
                            >
                              {SYNC_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <button type="button" className="link-button" onClick={() => handleDeleteLink(link.link_id)}>
                              削除
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
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
