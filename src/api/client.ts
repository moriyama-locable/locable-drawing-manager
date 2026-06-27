import type {
  ChangeItem,
  Drawing,
  DrawingTypeOption,
  LodRule,
  Phase,
  Project,
  StatusMasterGroup,
  StatusMasterItem,
} from '../types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(body.message ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function fetchProjects(status?: 'archived'): Promise<{ projects: Project[] }> {
  return request(status ? `/api/projects?status=${status}` : '/api/projects')
}

export function updateProject(projectId: string, patch: Partial<Project>): Promise<unknown> {
  return request(`/api/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export interface ExportResult {
  export_id: string
  project_overview_md: string
  drawings_csv: string
  changes_csv: string
  change_drawing_links_csv: string
  lod_status_csv: string
  drive_links_csv: string
}

export function exportProject(projectId: string): Promise<ExportResult> {
  return request(`/api/projects/${projectId}/export`, { method: 'POST' })
}

export function archiveProject(projectId: string): Promise<{ project_id: string; project_status: string }> {
  return request(`/api/projects/${projectId}/archive`, { method: 'PATCH' })
}

export interface CreateProjectInput {
  project_name: string
  current_phase: string
}

export function createProject(
  input: CreateProjectInput
): Promise<{ project_id: string; default_drawings_created: number }> {
  return request('/api/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function fetchPhases(): Promise<{ phases: Phase[] }> {
  return request('/api/settings/phases')
}

export interface AdvancePhaseResult {
  project_id: string
  phase_code: string
  updated_drawings: number
  created_drawings: number
}

export function advanceProjectPhase(projectId: string): Promise<AdvancePhaseResult> {
  return request(`/api/projects/${projectId}/advance-phase`, { method: 'POST' })
}

export interface RevertPhaseResult {
  project_id: string
  phase_code: string
  updated_drawings: number
}

export function revertProjectPhase(projectId: string): Promise<RevertPhaseResult> {
  return request(`/api/projects/${projectId}/revert-phase`, { method: 'POST' })
}

export function fetchDrawings(projectId: string): Promise<{ drawings: Drawing[] }> {
  return request(`/api/projects/${projectId}/drawings`)
}

export interface CreateDrawingInput {
  drawing_no: string
  drawing_name: string
  drawing_type: string
  necessity?: string
  current_lod?: number
  status: string
  lock_status?: string
  final_deadline?: string
}

export function createDrawing(
  projectId: string,
  input: CreateDrawingInput
): Promise<{ drawing_id: string }> {
  return request(`/api/projects/${projectId}/drawings`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export interface ImportDrawingRow {
  drawing_no: string
  drawing_name: string
  drawing_type: string
  necessity?: string
  required_lod?: number
  current_lod?: number
  status: string
  lock_status?: string
  final_deadline?: string
}

export function importDrawings(
  projectId: string,
  rows: ImportDrawingRow[]
): Promise<{ imported_count: number; errors: Array<{ row: number; message: string }> }> {
  return request(`/api/projects/${projectId}/drawings/import`, {
    method: 'POST',
    body: JSON.stringify({ rows }),
  })
}

export function fetchDrawingDetail(
  drawingId: string
): Promise<{ drawing: Drawing; related_changes: ChangeItem[] }> {
  return request(`/api/drawings/${drawingId}`)
}

export function updateDrawing(drawingId: string, patch: Partial<Drawing>): Promise<unknown> {
  return request(`/api/drawings/${drawingId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function fetchLodRules(): Promise<{ lod_rules: LodRule[] }> {
  return request('/api/settings/lod-rules')
}

export function saveLodRules(rules: LodRule[]): Promise<unknown> {
  return request('/api/settings/lod-rules', {
    method: 'PUT',
    body: JSON.stringify({ lod_rules: rules }),
  })
}

export function fetchDrawingTypes(): Promise<{ drawing_types: DrawingTypeOption[] }> {
  return request('/api/settings/drawing-types')
}

export interface DrawingTypeInput {
  drawing_type: string
  original_drawing_type?: string
  sort_order?: number
}

export function saveDrawingTypes(items: DrawingTypeInput[]): Promise<unknown> {
  return request('/api/settings/drawing-types', {
    method: 'PUT',
    body: JSON.stringify({ drawing_types: items }),
  })
}

export function deleteDrawingType(drawingType: string): Promise<void> {
  return request(`/api/settings/drawing-types?drawing_type=${encodeURIComponent(drawingType)}`, {
    method: 'DELETE',
  })
}

export function fetchStatusMaster(group: StatusMasterGroup): Promise<{ status_master: StatusMasterItem[] }> {
  return request(`/api/settings/status-master?group=${group}`)
}

export interface StatusMasterInput {
  status_id?: string
  status_name: string
  sort_order?: number
  progress_percent?: number
}

export function saveStatusMaster(group: StatusMasterGroup, items: StatusMasterInput[]): Promise<unknown> {
  return request('/api/settings/status-master', {
    method: 'PUT',
    body: JSON.stringify({ status_group: group, items }),
  })
}

export function deleteStatusMasterItem(statusId: string): Promise<void> {
  return request(`/api/settings/status-master?status_id=${encodeURIComponent(statusId)}`, {
    method: 'DELETE',
  })
}

export function fetchChanges(projectId: string): Promise<{ changes: ChangeItem[] }> {
  return request(`/api/projects/${projectId}/changes`)
}

export interface CreateChangeInput {
  change_reason: string
  change_detail: string
  impact_level: string
}

export function createChange(
  projectId: string,
  input: CreateChangeInput
): Promise<{ change_id: string }> {
  return request(`/api/projects/${projectId}/changes`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function addChangeDrawingLink(
  changeId: string,
  drawingId: string,
  impactLevel: string
): Promise<{ link_id: string }> {
  return request(`/api/changes/${changeId}/drawings`, {
    method: 'POST',
    body: JSON.stringify({ drawing_id: drawingId, impact_level: impactLevel }),
  })
}

export function updateChangeDrawingLink(linkId: string, syncStatus: string): Promise<{ link_id: string }> {
  return request(`/api/change-drawing-links/${linkId}`, {
    method: 'PATCH',
    body: JSON.stringify({ sync_status: syncStatus }),
  })
}

export function deleteChangeDrawingLink(linkId: string): Promise<void> {
  return request(`/api/change-drawing-links/${linkId}`, { method: 'DELETE' })
}

export function updateChange(changeId: string, patch: Record<string, unknown>): Promise<unknown> {
  return request(`/api/changes/${changeId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export interface DashboardSummary {
  active_projects: number
  lod_shortage_drawings: number
  change_alert_drawings: number
  overdue_count: number
  locked_drawings: number
  status_breakdown: Array<{ status: string; count: number }>
  lod_distribution: Array<{ current_lod: number; count: number }>
  not_needed_drawings: number
  progress_percent: number
  today_priority_items: Array<{
    drawing_id: string
    drawing_no: string
    drawing_name: string
    project_id: string
    lod_judgement: string
    has_change_alert: number
    priority_score: number | null
  }>
}

export function fetchDashboard(projectId?: string): Promise<DashboardSummary> {
  return request(projectId ? `/api/dashboard?project_id=${projectId}` : '/api/dashboard')
}
