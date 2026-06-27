export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((line) => line.length > 0)
  if (lines.length === 0) return []
  const headers = splitCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, i) => {
      row[header.trim()] = (values[i] ?? '').trim()
    })
    return row
  })
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export const DRAWING_IMPORT_HEADERS = [
  'drawing_no',
  'drawing_name',
  'drawing_type',
  'necessity',
  'required_lod',
  'current_lod',
  'status',
  'lock_status',
  'final_deadline',
]

export function buildDrawingImportTemplate(): string {
  return `${DRAWING_IMPORT_HEADERS.join(',')}\nA-001,1階平面図,全体平面図,必須,,0,未着手,編集可,\n`
}
