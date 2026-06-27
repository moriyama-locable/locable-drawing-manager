import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { archiveProject, exportProject, fetchDrawings, fetchProjects, updateProject } from '../api/client'
import ProjectList from '../components/ProjectList'
import DrawingListView from '../components/DrawingListView'
import DrawingCardView from '../components/DrawingCardView'
import DrawingDetailModal from '../components/DrawingDetailModal'
import DrawingCreateForm from '../components/DrawingCreateForm'
import type { Drawing, Project } from '../types'

type ViewMode = 'list' | 'card'

function downloadFile(filename: string, content: string, mimeType: string) {
  if (!content) return
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function DrawingsPage() {
  const [searchParams] = useSearchParams()
  const focus = searchParams.get('focus')

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchText, setSearchText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null)
  const [lifecycleBusy, setLifecycleBusy] = useState(false)

  function loadProjects() {
    return fetchProjects()
      .then((data) => {
        setProjects(data.projects)
        return data.projects
      })
      .catch((err: Error) => {
        setError(err.message)
        return []
      })
  }

  function loadDrawings(projectId: string) {
    return fetchDrawings(projectId)
      .then((data) => setDrawings(data.drawings))
      .catch((err: Error) => setError(err.message))
  }

  useEffect(() => {
    loadProjects().then((loaded) => {
      if (loaded.length > 0) {
        setSelectedProjectId(loaded[0].project_id)
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedProjectId) {
      setDrawings([])
      return
    }
    loadDrawings(selectedProjectId)
  }, [selectedProjectId])

  function handleProjectCreated(projectId: string) {
    loadProjects().then(() => setSelectedProjectId(projectId))
  }

  const selectedProject = useMemo(
    () => projects.find((project) => project.project_id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  )

  const filteredDrawings = useMemo(() => {
    let result = drawings
    if (focus === 'lod_shortage') {
      result = result.filter((drawing) => drawing.lod_judgement === '不足')
    } else if (focus === 'overdue') {
      const today = new Date().toISOString().slice(0, 10)
      result = result.filter(
        (drawing) => drawing.final_deadline && drawing.final_deadline < today && drawing.status !== '承認済'
      )
    }
    if (!searchText) return result
    const keyword = searchText.toLowerCase()
    return result.filter(
      (drawing) =>
        drawing.drawing_no.toLowerCase().includes(keyword) ||
        drawing.drawing_name.toLowerCase().includes(keyword)
    )
  }, [drawings, searchText, focus])

  async function handleMarkCompleted() {
    if (!selectedProjectId) return
    setLifecycleBusy(true)
    setError(null)
    try {
      await updateProject(selectedProjectId, { project_status: 'completed' })
      await loadProjects()
      setNotice('プロジェクトを完了にしました。続けて書き出しを行ってください。')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLifecycleBusy(false)
    }
  }

  async function handleExport() {
    if (!selectedProjectId || !selectedProject) return
    setLifecycleBusy(true)
    setError(null)
    try {
      const result = await exportProject(selectedProjectId)
      const prefix = selectedProject.project_name.replace(/[\\/:*?"<>|]/g, '_')
      downloadFile(`${prefix}_overview.md`, result.project_overview_md, 'text/markdown')
      downloadFile(`${prefix}_drawings.csv`, result.drawings_csv, 'text/csv')
      downloadFile(`${prefix}_changes.csv`, result.changes_csv, 'text/csv')
      downloadFile(`${prefix}_change_drawing_links.csv`, result.change_drawing_links_csv, 'text/csv')
      downloadFile(`${prefix}_lod_status.csv`, result.lod_status_csv, 'text/csv')
      downloadFile(`${prefix}_drive_links.csv`, result.drive_links_csv, 'text/csv')
      await loadProjects()
      setNotice('書き出しが完了しました。ファイルをGoogle Driveの99_Archiveフォルダへ保存してください。')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLifecycleBusy(false)
    }
  }

  async function handleArchive() {
    if (!selectedProjectId) return
    setLifecycleBusy(true)
    setError(null)
    try {
      await archiveProject(selectedProjectId)
      const remaining = await loadProjects()
      setSelectedProjectId(remaining.length > 0 ? remaining[0].project_id : null)
      setNotice('プロジェクトをアーカイブしました。')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLifecycleBusy(false)
    }
  }

  return (
    <div className="page drawings-page">
      <h1>図面管理</h1>
      {error && <p className="error-text">{error}</p>}
      {notice && <p className="empty-hint">{notice}</p>}
      {focus === 'lod_shortage' && <p className="empty-hint">LOD不足の図面のみ表示しています。</p>}
      {focus === 'overdue' && <p className="empty-hint">期限超過の図面のみ表示しています。</p>}

      <div className="drawings-layout">
        <aside className="drawings-left-pane">
          <ProjectList
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelect={setSelectedProjectId}
            onCreated={handleProjectCreated}
          />
        </aside>

        <section className="drawings-right-pane">
          {selectedProject && (
            <div className="settings-actions">
              <span>状態: {selectedProject.project_status}</span>
              {selectedProject.project_status === 'active' && (
                <button type="button" disabled={lifecycleBusy} onClick={handleMarkCompleted}>
                  完了にする
                </button>
              )}
              {selectedProject.project_status === 'completed' && (
                <button type="button" disabled={lifecycleBusy} onClick={handleExport}>
                  書き出し
                </button>
              )}
              {selectedProject.project_status === 'completed' && selectedProject.exported_at && (
                <button type="button" disabled={lifecycleBusy} onClick={handleArchive}>
                  アーカイブする
                </button>
              )}
            </div>
          )}

          {selectedProjectId && (
            <DrawingCreateForm
              projectId={selectedProjectId}
              onCreated={() => loadDrawings(selectedProjectId)}
            />
          )}

          <div className="drawings-toolbar">
            <input
              type="search"
              placeholder="図面番号・図面名で検索"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <div className="view-toggle">
              <button
                type="button"
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
              >
                リスト
              </button>
              <button
                type="button"
                className={viewMode === 'card' ? 'active' : ''}
                onClick={() => setViewMode('card')}
              >
                カード
              </button>
            </div>
          </div>

          {filteredDrawings.length === 0 ? (
            <p className="empty-hint">図面がありません。</p>
          ) : viewMode === 'list' ? (
            <DrawingListView drawings={filteredDrawings} onOpenDetail={setSelectedDrawingId} />
          ) : (
            <DrawingCardView drawings={filteredDrawings} onOpenDetail={setSelectedDrawingId} />
          )}
        </section>
      </div>

      {selectedDrawingId && (
        <DrawingDetailModal drawingId={selectedDrawingId} onClose={() => setSelectedDrawingId(null)} />
      )}
    </div>
  )
}

export default DrawingsPage
