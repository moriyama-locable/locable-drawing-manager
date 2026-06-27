import type { ChangeItem, Drawing, LodRule, Project } from '../types'

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

export function fetchProjects(): Promise<{ projects: Project[] }> {
  return request('/api/projects')
}

export interface CreateProjectInput {
  project_name: string
  current_phase: string
}

export function createProject(input: CreateProjectInput): Promise<{ project_id: string }> {
  return request('/api/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  })
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

export interface DashboardSummary {
  active_projects: number
  lod_shortage_drawings: number
  change_alert_drawings: number
  overdue_count: number
  locked_drawings: number
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

export function fetchDashboard(): Promise<DashboardSummary> {
  return request('/api/dashboard')
}
