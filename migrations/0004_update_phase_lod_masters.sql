-- Update phase and LOD master definitions

UPDATE phases SET phase_name = '企画構想設計', updated_at = datetime('now') WHERE phase_code = 'P00';
UPDATE phases SET phase_name = '基本設計', updated_at = datetime('now') WHERE phase_code = 'P10';
UPDATE phases SET phase_name = '実施設計', updated_at = datetime('now') WHERE phase_code = 'P20';
UPDATE phases SET phase_name = '施工', updated_at = datetime('now') WHERE phase_code = 'P30';
UPDATE phases SET phase_name = '完了', updated_at = datetime('now') WHERE phase_code = 'P40';

DELETE FROM lod_definitions;

INSERT INTO lod_definitions (lod_level, lod_name, description, completion_criteria) VALUES
  (1, 'LOD1', '簡易図面', '簡易図面が確定'),
  (2, 'LOD2', '標準図面', '標準図面が確定'),
  (3, 'LOD3', '詳細図面', '詳細図面が確定');
