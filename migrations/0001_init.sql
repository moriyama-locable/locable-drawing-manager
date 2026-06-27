-- Initial schema for locable-drawing-manager
-- Cloudflare D1 (SQLite compatible)

CREATE TABLE projects (
  project_id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  current_phase TEXT NOT NULL,
  project_status TEXT NOT NULL DEFAULT 'active',
  sort_order INTEGER,
  archived_at TEXT,
  exported_at TEXT,
  export_file_url TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE phases (
  phase_code TEXT PRIMARY KEY,
  phase_name TEXT NOT NULL,
  sort_order INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE lod_definitions (
  lod_level INTEGER PRIMARY KEY,
  lod_name TEXT NOT NULL,
  description TEXT,
  completion_criteria TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE drawing_types (
  drawing_type TEXT PRIMARY KEY,
  sort_order INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE status_master (
  status_id TEXT PRIMARY KEY,
  status_group TEXT NOT NULL,
  status_name TEXT NOT NULL,
  sort_order INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE lod_rules (
  rule_id TEXT PRIMARY KEY,
  phase_code TEXT NOT NULL,
  drawing_type TEXT NOT NULL,
  required_lod INTEGER NOT NULL,
  necessity TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (phase_code) REFERENCES phases(phase_code),
  FOREIGN KEY (drawing_type) REFERENCES drawing_types(drawing_type)
);

CREATE TABLE drawings (
  drawing_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  drawing_no TEXT NOT NULL,
  drawing_name TEXT NOT NULL,
  drawing_type TEXT NOT NULL,
  necessity TEXT NOT NULL,
  required_lod INTEGER NOT NULL,
  current_lod INTEGER NOT NULL DEFAULT 0,
  lod_judgement TEXT NOT NULL,
  status TEXT NOT NULL,
  lock_status TEXT NOT NULL DEFAULT '編集可',
  approval_status TEXT,
  assignee TEXT,
  first_submit_date TEXT,
  review_deadline TEXT,
  final_deadline TEXT,
  drive_pdf_url TEXT,
  drive_source_url TEXT,
  version TEXT,
  has_change_alert INTEGER NOT NULL DEFAULT 0,
  priority_score INTEGER,
  next_action TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

CREATE TABLE changes (
  change_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  change_reason TEXT NOT NULL,
  change_detail TEXT NOT NULL,
  requested_by TEXT,
  requested_date TEXT,
  impact_level TEXT NOT NULL,
  cost_impact TEXT,
  schedule_impact TEXT,
  status TEXT NOT NULL,
  approved_by TEXT,
  approved_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

CREATE TABLE change_drawing_links (
  link_id TEXT PRIMARY KEY,
  change_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  drawing_id TEXT NOT NULL,
  impact_level TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  last_checked_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (change_id) REFERENCES changes(change_id),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (drawing_id) REFERENCES drawings(drawing_id)
);

CREATE TABLE audit_logs (
  log_id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  changed_by TEXT,
  before_data TEXT,
  after_data TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE exports (
  export_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  export_type TEXT NOT NULL,
  file_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

CREATE INDEX idx_drawings_project_id ON drawings(project_id);
CREATE INDEX idx_changes_project_id ON changes(project_id);
CREATE INDEX idx_change_drawing_links_change_id ON change_drawing_links(change_id);
CREATE INDEX idx_change_drawing_links_drawing_id ON change_drawing_links(drawing_id);
CREATE INDEX idx_lod_rules_phase_drawing_type ON lod_rules(phase_code, drawing_type);
