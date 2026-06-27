-- Add admin-configurable progress weight for drawing statuses

ALTER TABLE status_master ADD COLUMN progress_percent INTEGER;

UPDATE status_master SET progress_percent = 0 WHERE status_id = 'drawing_status_01';
UPDATE status_master SET progress_percent = 50 WHERE status_id = 'drawing_status_02';
UPDATE status_master SET progress_percent = 70 WHERE status_id = 'drawing_status_03';
UPDATE status_master SET progress_percent = 100 WHERE status_id = 'drawing_status_04';
