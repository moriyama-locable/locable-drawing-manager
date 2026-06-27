-- Seed master data

INSERT INTO phases (phase_code, phase_name, sort_order) VALUES
  ('P00', '企画', 0),
  ('P10', '基本設計', 10),
  ('P20', '実施設計', 20),
  ('P30', '施工図', 30),
  ('P40', '竣工', 40);

INSERT INTO lod_definitions (lod_level, lod_name, description, completion_criteria) VALUES
  (0, 'LOD0', '未着手', '図面が存在しない'),
  (1, 'LOD1', '概要検討', '配置・概略のみ確定'),
  (2, 'LOD2', '基本設計確定', '主要寸法・仕様が確定'),
  (3, 'LOD3', '実施設計確定', '詳細寸法・仕様がすべて確定'),
  (4, 'LOD4', '施工図確定', '施工に必要な情報がすべて確定'),
  (5, 'LOD5', '製作図確定', '製作に必要な情報がすべて確定'),
  (6, 'LOD6', '竣工確定', '竣工時点の最終情報');

INSERT INTO drawing_types (drawing_type, sort_order) VALUES
  ('全体平面図', 0),
  ('展開図', 10),
  ('天井伏図', 20),
  ('仕上表', 30);

INSERT INTO status_master (status_id, status_group, status_name, sort_order) VALUES
  ('drawing_status_01', 'drawing', '未着手', 0),
  ('drawing_status_02', 'drawing', '作図中', 10),
  ('drawing_status_03', 'drawing', '確認中', 20),
  ('drawing_status_04', 'drawing', '承認済', 30),
  ('change_status_01', 'change', '未確認', 0),
  ('change_status_02', 'change', '確認中', 10),
  ('change_status_03', 'change', '承認済', 20),
  ('change_status_04', 'change', '反映中', 30),
  ('change_status_05', 'change', '対応済', 40),
  ('change_status_06', 'change', '却下', 50),
  ('lock_status_01', 'lock', '編集可', 0),
  ('lock_status_02', 'lock', 'フェーズロック', 10),
  ('lock_status_03', 'lock', '承認ロック', 20),
  ('lock_status_04', 'lock', '施工ロック', 30),
  ('lock_status_05', 'lock', '竣工ロック', 40);
