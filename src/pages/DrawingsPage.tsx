import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  advanceProjectPhase,
  archiveProject,
  exportProject,
  fetchDrawings,
  fetchPhases,
  fetchProjects,
  importDrawings,
  updateDrawing,
  updateProject,
} from '../api/client'
import ProjectList from '../components/ProjectList'
import DrawingListView from '../components/DrawingListView'
import DrawingCardView from '../components/DrawingCardView'
import DrawingDetailModal from '../components/DrawingDetailModal'
import DrawingCreateForm from '../components/DrawingCreateForm'
import type { Drawing, LodJudgement, Phase, Project } from '../types'
import { buildDrawingImportTemplate, parseCsv } from '../lib/csv'

const LOD_FILTER_OPTIONS: Array<LodJudgement | 'all'> = ['all', '不足', 'OK', '過剰', '不要']
const LOD_FILTER_LABELS: Record<LodJudgement | 'all', string> = {
  all: 'すべて',
  不足: '不足（要対応）',
  OK: 'OK',
  過剰: '過剰',
  不要: '不要（対応不要）',
}

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
  const [phases, setPhases] = useState<Phase[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchText, setSearchText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null)
  const [lifecycleBusy, setLifecycleBusy] = useState(false)
  const [lodFilter, setLodFilter] = useState<LodJudgement | 'all'>('all')
  const [importBusy, setImportBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    fetchPhases()
      .then((data) => setPhases(data.phases))
      .catch((err: Error) => setError(err.message))
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

  const nextPhase = useMemo(() => {
    if (!selectedProject) return null
    const current = phases.find((phase) => phase.phase_code === selectedProject.current_phase)
    if (!current) return null
    return (
      phases
        .filter((phase) => (phase.sort_order ?? 0) > (current.sort_order ?? 0))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0] ?? null
    )
  }, [phases, selectedProject])

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
    if (lodFilter !== 'all') {
      result = result.filter((drawing) => drawing.lod_judgement === lodFilter)
    }
    if (!searchText) return result
    const keyword = searchText.toLowerCase()
    return result.filter(
      (drawing) =>
        drawing.drawing_no.toLowerCase().includes(keyword) ||
        drawing.drawing_name.toLowerCase().includes(keyword)
    )
  }, [drawings, searchText, focus, lodFilter])

  const progressStats = useMemo(() => {
    const needed = drawings.filter((d) => d.necessity !== '不要')
    const notNeeded = drawings.length - needed.length
    const approved = needed.filter((d) => d.status === '承認済').length
    const percent = needed.length > 0 ? Math.round((approved / needed.length) * 100) : 0
    const statusCounts = new Map<string, number>()
    for (const d of needed) {
      statusCounts.set(d.status, (statusCounts.get(d.status) ?? 0) + 1)
    }
    const currentLodCounts = new Map<number, number>()
    for (const d of needed) {
      currentLodCounts.set(d.current_lod, (currentLodCounts.get(d.current_lod) ?? 0) + 1)
    }
    return {
      total: drawings.length,
      needed: needed.length,
      notNeeded,
      approved,
      percent,
      statusCounts: Array.from(statusCounts.entries()),
      currentLodCounts: Array.from(currentLodCounts.entries()).sort((a, b) => a[0] - b[0]),
    }
  }, [drawings])

  async function handleStatusChange(drawingId: string, status: string) {
    setDrawings((prev) => prev.map((d) => (d.drawing_id === drawingId ? { ...d, status } : d)))
    try {
      await updateDrawing(drawingId, { status })
    } catch (err) {
      setError((err as Error).message)
      if (selectedProjectId) loadDrawings(selectedProjectId)
    }
  }

  function handleDownloadTemplate() {
    const blob = new Blob([buildDrawingImportTemplate()], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'drawing_import_template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !selectedProjectId) return
    setImportBusy(true)
    setError(null)
    setNotice(null)
    try {
      const text = await file.text()
      const rows = parseCsv(text)
      const result = await importDrawings(
        selectedProjectId,
        rows.map((row) => ({
          drawing_no: row.drawing_no,
          drawing_name: row.drawing_name,
          drawing_type: row.drawing_type,
          necessity: row.necessity || undefined,
          required_lod: row.required_lod ? Number(row.required_lod) : undefined,
          current_lod: row.current_lod ? Number(row.current_lod) : undefined,
          status: row.status,
          lock_status: row.lock_status || undefined,
          final_deadline: row.final_deadline || undefined,
        }))
      )
      await loadDrawings(selectedProjectId)
      if (result.errors.length > 0) {
        setError(
          `${result.imported_count}件取り込みました。${result.errors.length}件はエラーで取り込めませんでした（${result.errors
            .slice(0, 3)
            .map((e2) => `${e2.row}行目: ${e2.message}`)
            .join(', ')}）`
        )
      } else {
        setNotice(`${result.imported_count}件の図面をCSVから取り込みました。`)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setImportBusy(false)
    }
  }

  async function handleAdvancePhase() {
    if (!selectedProjectId || !nextPhase) return
    if (!window.confirm(`「${nextPhase.phase_name}」へ進行します。既存の図面の必要LODを再評価します。よろしいですか？`)) {
      return
    }
    setLifecycleBusy(true)
    setError(null)
    try {
      const result = await advanceProjectPhase(selectedProjectId)
      await Promise.all([loadProjects(), loadDrawings(selectedProjectId)])
      setNotice(
        `「${nextPhase.phase_name}」へ進行しました。図面を${result.updated_drawings}件更新、${result.created_drawings}件追加しました。`
      )
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLifecycleBusy(false)
    }
  }

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
              <span>
                現在フェーズ:{' '}
                {phases.find((phase) => phase.phase_code === selectedProject.current_phase)?.phase_name ??
                  selectedProject.current_phase}
              </span>
              {selectedProject.project_status === 'active' && nextPhase && (
                <button type="button" disabled={lifecycleBusy} onClick={handleAdvancePhase}>
                  次のフェーズへ進む（{nextPhase.phase_name}）
                </button>
              )}
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

          {selectedProjectId && drawings.length > 0 && (
            <div className="progress-summary">
              <div className="progress-summary-header">
                <span className="progress-summary-title">全体進捗</span>
                <span className="progress-summary-percent">{progressStats.percent}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progressStats.percent}%` }} />
              </div>
              <div className="progress-summary-meta">
                <span>対応対象 {progressStats.needed}件中 承認済 {progressStats.approved}件</span>
                <span className="progress-summary-na">対応不要 {progressStats.notNeeded}件（無視してOK）</span>
              </div>
              <div className="progress-status-chips">
                {progressStats.statusCounts.map(([status, count]) => (
                  <span key={status} className="progress-status-chip">
                    {status} {count}件
                  </span>
                ))}
              </div>
              <div className="lod-progress-row">
                <span className="lod-progress-label">現在LOD分布</span>
                <div className="lod-progress-scale">
                  {[0, 1, 2, 3, 4, 5, 6].map((lod) => {
                    const count = progressStats.currentLodCounts.find(([l]) => l === lod)?.[1] ?? 0
                    return (
                      <div key={lod} className="lod-progress-step" title={`LOD${lod}: ${count}件`}>
                        <div
                          className={count > 0 ? 'lod-progress-dot filled' : 'lod-progress-dot'}
                        />
                        <span className="lod-progress-step-label">
                          LOD{lod}
                          {count > 0 ? `(${count})` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {selectedProjectId && (
            <DrawingCreateForm
              projectId={selectedProjectId}
              onCreated={() => loadDrawings(selectedProjectId)}
            />
          )}

          {selectedProjectId && (
            <div className="csv-import-row">
              <button type="button" disabled={importBusy} onClick={() => fileInputRef.current?.click()}>
                {importBusy ? '取り込み中...' : 'CSVインポート'}
              </button>
              <button type="button" className="link-button" onClick={handleDownloadTemplate}>
                テンプレートをダウンロード
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
            </div>
          )}

          <div className="drawings-toolbar">
            <input
              type="search"
              placeholder="図面番号・図面名で検索"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <label className="lod-filter-select">
              LOD判定
              <select value={lodFilter} onChange={(e) => setLodFilter(e.target.value as LodJudgement | 'all')}>
                {LOD_FILTER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {LOD_FILTER_LABELS[opt]}
                  </option>
                ))}
              </select>
            </label>
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
            <DrawingListView
              drawings={filteredDrawings}
              onOpenDetail={setSelectedDrawingId}
              onStatusChange={handleStatusChange}
            />
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
