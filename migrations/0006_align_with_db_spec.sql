-- Align Project DB / Drawing DB with the latest spec summary
-- - Phase name back to 企画 (spec)
-- - Project DB gains 完了予定日 (due_date)
-- - Drawing DB regains 属性 (drawing_type)
-- - Status/necessity wording and progress percentages updated to match spec

UPDATE phases SET phase_name = '企画', updated_at = datetime('now') WHERE phase_code = 'P00';

ALTER TABLE projects ADD COLUMN due_date TEXT;

ALTER TABLE drawings ADD COLUMN drawing_type TEXT NOT NULL DEFAULT '建築図';

UPDATE drawings SET necessity = '必要' WHERE necessity = '必須';

UPDATE status_master SET status_name = '進行中', progress_percent = 50, updated_at = datetime('now') WHERE status_id = 'drawing_status_02';
UPDATE status_master SET progress_percent = 80, updated_at = datetime('now') WHERE status_id = 'drawing_status_03';
UPDATE status_master SET status_name = '完了', progress_percent = 100, updated_at = datetime('now') WHERE status_id = 'drawing_status_04';
UPDATE status_master SET progress_percent = 30, updated_at = datetime('now') WHERE status_id = 'drawing_status_01';

UPDATE drawings SET status = '進行中' WHERE status = '作図中';
UPDATE drawings SET status = '完了' WHERE status = '承認済';
