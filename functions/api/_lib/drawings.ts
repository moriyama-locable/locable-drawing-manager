export const DRAWING_TYPE_PREFIX: Record<string, string> = {
  建築図: 'A',
  詳細図: 'D',
  電気設備図: 'E',
  機械設備図: 'M',
}

export function drawingNoPrefix(drawingType: string): string {
  return DRAWING_TYPE_PREFIX[drawingType] ?? 'A'
}

export interface DefaultDrawingSeed {
  drawing_name: string
  necessity: '必要' | '任意' | '不要'
  lod: number
  status: string
  drawing_type: string
}

export const DEFAULT_DRAWING_LIST: DefaultDrawingSeed[] = [
  { drawing_name: 'イメージパース', necessity: '必要', lod: 1, status: '未着手', drawing_type: '建築図' },
  { drawing_name: '仕上げ表', necessity: '必要', lod: 1, status: '未着手', drawing_type: '建築図' },
  { drawing_name: '平面図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '建築図' },
  { drawing_name: '展開図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '建築図' },
  { drawing_name: '床伏図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '建築図' },
  { drawing_name: '総合天伏図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '建築図' },
  { drawing_name: '建具リスト', necessity: '必要', lod: 1, status: '未着手', drawing_type: '建築図' },
  { drawing_name: '詳細図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '詳細図' },
  { drawing_name: '什器図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '詳細図' },
  { drawing_name: '什器図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '詳細図' },
  { drawing_name: '什器図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '詳細図' },
  { drawing_name: '什器図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '詳細図' },
  { drawing_name: '什器図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '詳細図' },
  { drawing_name: '什器図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '詳細図' },
  { drawing_name: '照明配灯図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '電気設備図' },
  { drawing_name: '照明機器リスト', necessity: '必要', lod: 1, status: '未着手', drawing_type: '電気設備図' },
  { drawing_name: 'コンセント図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '電気設備図' },
  { drawing_name: '弱電図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '電気設備図' },
  { drawing_name: '空調設備図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '機械設備図' },
  { drawing_name: '空調機器リスト', necessity: '必要', lod: 1, status: '未着手', drawing_type: '機械設備図' },
  { drawing_name: '衛生設備図', necessity: '必要', lod: 1, status: '未着手', drawing_type: '機械設備図' },
  { drawing_name: '衛生機器リスト', necessity: '必要', lod: 1, status: '未着手', drawing_type: '機械設備図' },
]
