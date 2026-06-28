-- Simplify drawings to: drawing_no, drawing_name, necessity, lod, status, deadline
-- Drops drawing_type/lock/approval/assignee/dates/drive links/version/change-alert/priority/next-action/notes
-- and the now-unused drawing_types and lod_rules master tables.

ALTER TABLE drawings RENAME COLUMN required_lod TO lod;
ALTER TABLE drawings RENAME COLUMN review_deadline TO deadline;

ALTER TABLE drawings DROP COLUMN drawing_type;
ALTER TABLE drawings DROP COLUMN current_lod;
ALTER TABLE drawings DROP COLUMN lod_judgement;
ALTER TABLE drawings DROP COLUMN lock_status;
ALTER TABLE drawings DROP COLUMN approval_status;
ALTER TABLE drawings DROP COLUMN assignee;
ALTER TABLE drawings DROP COLUMN first_submit_date;
ALTER TABLE drawings DROP COLUMN final_deadline;
ALTER TABLE drawings DROP COLUMN drive_pdf_url;
ALTER TABLE drawings DROP COLUMN drive_source_url;
ALTER TABLE drawings DROP COLUMN version;
ALTER TABLE drawings DROP COLUMN has_change_alert;
ALTER TABLE drawings DROP COLUMN priority_score;
ALTER TABLE drawings DROP COLUMN next_action;
ALTER TABLE drawings DROP COLUMN notes;

DELETE FROM status_master WHERE status_group = 'lock';

DROP TABLE lod_rules;
DROP TABLE drawing_types;
