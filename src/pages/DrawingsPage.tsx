import { useEffect, useMemo, useState } from 'react'
import { fetchDrawings, fetchProjects } from '../api/client'
import ProjectList from '../components/ProjectList'
import DrawingListView from '../components/DrawingListView'
import DrawingCardView from '../components/DrawingCardView'
import DrawingDetailModal from '../components/DrawingDetailModal'
import type { Drawing, Project } from '../types'

type ViewMode = 'list' | 'card'

function DrawingsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchText, setSearchText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
      .then((data) => {
        setProjects(data.projects)
        if (data.projects.length > 0) {
          setSelectedProjectId(data.projects[0].project_id)
        }
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  useEffect(() => {
    if (!selectedProjectId) {
      setDrawings([])
      return
    }
    fetchDrawings(selectedProjectId)
      .then((data) => setDrawings(data.drawings))
      .catch((err: Error) => setError(err.message))
  }, [selectedProjectId])

  const filteredDrawings = useMemo(() => {
    if (!searchText) return drawings
    const keyword = searchText.toLowerCase()
    return drawings.filter(
      (drawing) =>
        drawing.drawing_no.toLowerCase().includes(keyword) ||
        drawing.drawing_name.toLowerCase().includes(keyword)
    )
  }, [drawings, searchText])

  return (
    <div className="page drawings-page">
      <h1>図面管理</h1>
      {error && <p className="error-text">{error}</p>}

      <div className="drawings-layout">
        <aside className="drawings-left-pane">
          <ProjectList
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelect={setSelectedProjectId}
          />
        </aside>

        <section className="drawings-right-pane">
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
