export interface Phase {
  phase_code: string
  phase_name: string
  sort_order: number | null
}

export interface Project {
  project_id: string
  project_name: string
  current_phase: string
  due_date: string | null
  project_status: 'active' | 'completed' | 'archived'
  sort_order: number | null
  alert_count?: number
  archived_at?: string | null
  exported_at?: string | null
  export_file_url?: string | null
}

export interface LodDefinition {
  lod_level: number
  lod_name: string
  description: string | null
  completion_criteria: string | null
}

export type StatusMasterGroup = 'drawing' | 'change'

export interface StatusMasterItem {
  status_id: string
  status_group: StatusMasterGroup
  status_name: string
  sort_order: number | null
  progress_percent: number | null
}

export type DrawingType = '建築図' | '電気設備図' | '機械設備図' | '詳細図'

export interface Drawing {
  drawing_id: string
  project_id: string
  drawing_no: string
  drawing_name: string
  drawing_type: DrawingType
  necessity: '必要' | '任意' | '不要'
  lod: number
  status: string
  deadline: string | null
  created_at: string
  updated_at: string
}

export interface ChangeDrawingLink {
  link_id: string
  change_id: string
  drawing_id: string
  drawing_no: string
  drawing_name: string
  impact_level: string
  sync_status: string
  last_checked_date: string | null
}

export interface ChangeItem {
  change_id: string
  change_reason: string
  change_detail: string
  status: string
  link_id?: string
  impact_level?: string
  sync_status?: string
  links?: ChangeDrawingLink[]
}
