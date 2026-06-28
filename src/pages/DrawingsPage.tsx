import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  advanceProjectPhase,
  archiveProject,
  createProject,
  exportProject,
  fetchDrawings,
  fetchDrawingTypes,
  fetchPhases,
  fetchProjects,
  fetchStatusMaster,
  importDrawings,
  revertProjectPhase,
  updateDrawing,
  updateProject,
} from '../api/client'
import ProjectList from '../components/ProjectList'
import DrawingListView, { type DrawingSortKey, type SortDirection } from '../components/DrawingListView'
import DrawingCardView from '../components/DrawingCardView'
import DrawingDetailModal from '../components/DrawingDetailModal'
import DrawingCreateForm from '../components/DrawingCreateForm'
import {
  type Drawing,
  type DrawingTypeOption,
  type LodJudgement,
  type Phase,
  type Project,
  type StatusMasterItem,
} from '../types'
import { buildDrawingImportTemplate, parseCsv } from '../lib/csv'

const LOD_FILTER_OPTIONS: Array<LodJudgement | 'all'> = ['all', '不足', 'OK', '過剰', '不要']
const LOD_FILTER_LABELS: Record<LodJudgement | 'all', string> = {
  all: 'すべて',
  不足: '不足（要対応）',
  OK: 'OK',
  過剰: '過剰',
  不要: '不要（対応不要）',
}

const NECESSITY_FILTER_OPTIONS = ['all', '必須', '任意', '不要'] as const
type NecessityFilter = (typeof NECESSITY_FILTER_OPTIONS)[number]

function compareDrawingValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'ja')
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
  const [necessityFilter, setNecessityFilter] = useState<NecessityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [drawingTypeOptions, setDrawingTypeOptions] = useState<DrawingTypeOption[]>([])
  const [statusMasterItems, setStatusMasterItems] = useState<StatusMasterItem[]>([])
  const [sortKey, setSortKey] = useState<DrawingSortKey | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [importBusy, setImportBusy] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectPhase, setNewProjectPhase] = useState('')
  const [newProjectError, setNewProjectError] = useState<string | null>(null)
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
    fetchDrawingTypes()
      .then((data) => setDrawingTypeOptions(data.drawing_types))
      .catch((err: Error) => setError(err.message))
    fetchStatusMaster('drawing')
      .then((data) => setStatusMasterItems(data.status_master))
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

  async function handleCreateProject() {
    if (!newProjectName || !newProjectPhase) return
    try {
      const { project_id } = await createProject({
        project_name: newProjectName,
        current_phase: newProjectPhase,
      })
      setNewProjectName('')
      setNewProjectPhase('')
      setNewProjectError(null)
      handleProjectCreated(project_id)
    } catch (err) {
      setNewProjectError((err as Error).message)
    }
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

  const prevPhase = useMemo(() => {
    if (!selectedProject) return null
    const current = phases.find((phase) => phase.phase_code === selectedProject.current_phase)
    if (!current) return null
    return (
      phases
        .filter((phase) => (phase.sort_order ?? 0) < (current.sort_order ?? 0))
        .sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0))[0] ?? null
    )
  }, [phases, selectedProject])

  const typeFilterOptions = useMemo(
    () => drawingTypeOptions.map((opt) => opt.drawing_type),
    [drawingTypeOptions]
  )

  const statusFilterOptions = useMemo(
    () => statusMasterItems.map((item) => item.status_name),
    [statusMasterItems]
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
    if (lodFilter !== 'all') {
      result = result.filter((drawing) => drawing.lod_judgement === lodFilter)
    }
    if (necessityFilter !== 'all') {
      result = result.filter((drawing) => drawing.necessity === necessityFilter)
    }
    if (statusFilter !== 'all') {
      result = result.filter((drawing) => drawing.status === statusFilter)
    }
    if (typeFilter !== 'all') {
      result = result.filter((drawing) => drawing.drawing_type === typeFilter)
    }
    if (searchText) {
      const keyword = searchText.toLowerCase()
      result = result.filter(
        (drawing) =>
          drawing.drawing_no.toLowerCase().includes(keyword) ||
          drawing.drawing_name.toLowerCase().includes(keyword)
      )
    }
    return result
  }, [drawings, searchText, focus, lodFilter, necessityFilter, statusFilter, typeFilter])

  const sortedDrawings = useMemo(() => {
    if (!sortKey) return filteredDrawings
    const sorted = [...filteredDrawings].sort((a, b) => compareDrawingValues(a[sortKey], b[sortKey]))
    if (sortDirection === 'desc') sorted.reverse()
    return sorted
  }, [filteredDrawings, sortKey, sortDirection])

  useEffect(() => {
    setPage(1)
  }, [selectedProjectId, searchText, lodFilter, necessityFilter, statusFilter, typeFilter, focus])

  const totalPages = Math.max(1, Math.ceil(sortedDrawings.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedDrawings = useMemo(
    () => sortedDrawings.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedDrawings, currentPage, pageSize]
  )

  function handleSortChange(key: DrawingSortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const workQueueStats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const notStarted = drawings.filter((d) => d.status === '未着手').length
    const needsReview = drawings.filter((d) => d.status === '要確認').length
    const hasDeadline = drawings.filter(
      (d) => d.final_deadline && d.final_deadline >= today && d.status !== '承認済'
    ).length
    return { notStarted, needsReview, hasDeadline }
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

  async function handleRevertPhase() {
    if (!selectedProjectId || !prevPhase) return
    if (!window.confirm(`「${prevPhase.phase_name}」へ戻します。既存の図面の必要LODを再評価します。よろしいですか？`)) {
      return
    }
    setLifecycleBusy(true)
    setError(null)
    try {
      const result = await revertProjectPhase(selectedProjectId)
      await Promise.all([loadProjects(), loadDrawings(selectedProjectId)])
      setNotice(`「${prevPhase.phase_name}」へ戻しました。図面を${result.updated_drawings}件更新しました。`)
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

  async function handleRevertToActive() {
    if (!selectedProjectId) return
    if (!window.confirm('プロジェクトを進行中に戻します。よろしいですか？')) {
      return
    }
    setLifecycleBusy(true)
    setError(null)
    try {
      await updateProject(selectedProjectId, { project_status: 'active' })
      await loadProjects()
      setNotice('プロジェクトを進行中に戻しました。')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLifecycleBusy(false)
    }
  }

  async function handleUnarchive() {
    if (!selectedProjectId) return
    if (!window.confirm('アーカイブを取り消し、完了状態に戻します。よろしいですか？')) {
      return
    }
    setLifecycleBusy(true)
    setError(null)
    try {
      await updateProject(selectedProjectId, { project_status: 'completed' })
      await loadProjects()
      setNotice('アーカイブを取り消し、完了状態に戻しました。')
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
      <div className="drawings-page-header">
        <div>
          <h1>図面管理</h1>
          {selectedProject && (
            <p className="drawings-breadcrumb">
              {selectedProject.project_name} /{' '}
              {phases.find((phase) => phase.phase_code === selectedProject.current_phase)?.phase_name ??
                selectedProject.current_phase}
            </p>
          )}
        </div>
        {selectedProjectId && (
          <div className="drawings-header-actions">
            <button type="button" disabled={importBusy} onClick={() => fileInputRef.current?.click()}>
              {importBusy ? '取り込み中...' : 'CSVインポート'}
            </button>
            <button type="button" onClick={handleDownloadTemplate}>
              テンプレートDL
            </button>
            <button type="button" className="primary" onClick={() => setShowCreateForm((prev) => !prev)}>
              + 図面を追加
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
      </div>

      {error && <p className="error-text">{error}</p>}
      {notice && <p className="empty-hint">{notice}</p>}
      {focus === 'lod_shortage' && <p className="empty-hint">LOD不足の図面のみ表示しています。</p>}
      {focus === 'overdue' && <p className="empty-hint">期限超過の図面のみ表示しています。</p>}

      {showCreateForm && selectedProjectId && (
        <DrawingCreateForm
          projectId={selectedProjectId}
          onCreated={() => {
            loadDrawings(selectedProjectId)
            setShowCreateForm(false)
          }}
        />
      )}

      <div className="drawings-layout">
        <aside className="drawings-left-pane-stack">
          <div className="drawings-left-pane">
            <ProjectList
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelect={setSelectedProjectId}
            />
          </div>

          <div className="drawings-management-pane">
            {selectedProject && (
              <span className="drawings-management-current-phase">
                現在フェーズ:{' '}
                <strong>
                  {phases.find((phase) => phase.phase_code === selectedProject.current_phase)?.phase_name ??
                    selectedProject.current_phase}
                </strong>
              </span>
            )}

            <select value={newProjectPhase} onChange={(e) => setNewProjectPhase(e.target.value)}>
              <option value="">フェーズを選択</option>
              {phases.map((phase) => (
                <option key={phase.phase_code} value={phase.phase_code}>
                  {phase.phase_name}
                </option>
              ))}
            </select>
            <input
              placeholder="プロジェクト名"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
            <button type="button" onClick={handleCreateProject}>
              + プロジェクト追加
            </button>
            {newProjectError && <p className="error-text">{newProjectError}</p>}

            {selectedProject && (
              <div className="settings-actions">
                {selectedProject.project_status === 'active' && nextPhase && (
                  <button type="button" disabled={lifecycleBusy} onClick={handleAdvancePhase}>
                    次のフェーズへ進む（{nextPhase.phase_name}）
                  </button>
                )}
                {selectedProject.project_status === 'active' && prevPhase && (
                  <button type="button" disabled={lifecycleBusy} onClick={handleRevertPhase}>
                    前のフェーズへ戻る（{prevPhase.phase_name}）
                  </button>
                )}
                {selectedProject.project_status === 'active' && (
                  <button type="button" className="primary" disabled={lifecycleBusy} onClick={handleMarkCompleted}>
                    ✓ 完了にする
                  </button>
                )}
                {selectedProject.project_status === 'completed' && (
                  <button type="button" disabled={lifecycleBusy} onClick={handleRevertToActive}>
                    進行中に戻す
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
                {selectedProject.project_status === 'archived' && (
                  <button type="button" disabled={lifecycleBusy} onClick={handleUnarchive}>
                    アーカイブを取り消す
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        <section className="drawings-center-pane">
          {selectedProjectId && (
            <div className="work-queue">
              <span className="work-queue-title">作業キュー</span>
              <div className="work-queue-items">
                <div className="work-queue-chip">
                  <span>未着手</span>
                  <span className="work-queue-count">{workQueueStats.notStarted}</span>
                </div>
                <div className={workQueueStats.needsReview > 0 ? 'work-queue-chip warn' : 'work-queue-chip'}>
                  <span className={workQueueStats.needsReview > 0 ? 'work-queue-label-warn' : ''}>要確認</span>
                  <span className="work-queue-count">{workQueueStats.needsReview}</span>
                </div>
                <div className={workQueueStats.hasDeadline > 0 ? 'work-queue-chip warn' : 'work-queue-chip'}>
                  <span className={workQueueStats.hasDeadline > 0 ? 'work-queue-label-warn' : ''}>期限あり</span>
                  <span className="work-queue-count">{workQueueStats.hasDeadline}</span>
                </div>
              </div>
            </div>
          )}

          <div className="drawings-table-card">
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
            <label className="lod-filter-select">
              必要性
              <select
                value={necessityFilter}
                onChange={(e) => setNecessityFilter(e.target.value as NecessityFilter)}
              >
                <option value="all">すべて</option>
                {NECESSITY_FILTER_OPTIONS.filter((opt) => opt !== 'all').map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="lod-filter-select">
              ステータス
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">すべて</option>
                {statusFilterOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <label className="lod-filter-select">
              種別
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">すべて</option>
                {typeFilterOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
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

          {sortedDrawings.length === 0 ? (
            <p className="empty-hint">図面がありません。</p>
          ) : viewMode === 'list' ? (
            <DrawingListView
              drawings={pagedDrawings}
              onOpenDetail={setSelectedDrawingId}
              onStatusChange={handleStatusChange}
              statusOptions={statusFilterOptions}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
            />
          ) : (
            <DrawingCardView drawings={pagedDrawings} onOpenDetail={setSelectedDrawingId} />
          )}

          {sortedDrawings.length > 0 && (
            <div className="drawings-pagination">
              <span className="drawings-pagination-total">全{sortedDrawings.length}件</span>
              <div className="drawings-pagination-controls">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹
                </button>
                <span className="drawings-pagination-page">{currentPage}</span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  ›
                </button>
              </div>
              <label className="lod-filter-select">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                >
                  <option value={20}>20件 / ページ</option>
                  <option value={50}>50件 / ページ</option>
                  <option value={100}>100件 / ページ</option>
                </select>
              </label>
            </div>
          )}
          </div>
        </section>

        <aside className="drawings-detail-pane">
          {selectedDrawingId ? (
            <DrawingDetailModal
              drawingId={selectedDrawingId}
              onClose={() => setSelectedDrawingId(null)}
              variant="panel"
            />
          ) : (
            <div className="detail-pane-placeholder">
              <span className="detail-pane-placeholder-icon">📄</span>
              <span>選択中の図面</span>
              <span>表から図面を選択すると、詳細情報がここに表示されます。</span>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default DrawingsPage
