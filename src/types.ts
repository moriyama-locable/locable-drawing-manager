export interface Phase {
  phase_code: string
  phase_name: string
  sort_order: number | null
}

export interface Project {
  project_id: string
  project_name: string
  current_phase: string
  project_status: 'active' | 'completed' | 'archived'
  sort_order: number | null
  alert_count?: number
  archived_at?: string | null
  exported_at?: string | null
  export_file_url?: string | null
}

export type LodJudgement = '不要' | '不足' | 'OK' | '過剰'

export interface LodDefinition {
  lod_level: number
  lod_name: string
  description: string | null
  completion_criteria: string | null
}

export interface DrawingTypeOption {
  drawing_type: string
  sort_order: number | null
}

export type StatusMasterGroup = 'drawing' | 'change' | 'lock'

export interface StatusMasterItem {
  status_id: string
  status_group: StatusMasterGroup
  status_name: string
  sort_order: number | null
  progress_percent: number | null
}

export interface Drawing {
  drawing_id: string
  project_id: string
  drawing_no: string
  drawing_name: string
  drawing_type: string
  necessity: '必須' | '任意' | '不要'
  required_lod: number
  current_lod: number
  lod_judgement: LodJudgement
  status: string
  lock_status: string
  approval_status: string | null
  assignee: string | null
  first_submit_date: string | null
  review_deadline: string | null
  final_deadline: string | null
  drive_pdf_url: string | null
  drive_source_url: string | null
  version: string | null
  has_change_alert: number
  priority_score: number | null
  next_action: string | null
  notes: string | null
}

export interface LodRule {
  rule_id?: string
  phase_code: string
  drawing_type: string
  required_lod: number
  necessity: '必須' | '任意' | '不要'
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
