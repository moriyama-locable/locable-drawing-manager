import { generateId, nowIso } from './http'
import { judgeLod, nextActionForLod } from './lod'

interface LodRuleRow {
  drawing_type: string
  required_lod: number
  necessity: string
}

/**
 * Builds INSERT statements for drawings that have an lod_rules entry for the given phase
 * but no existing drawing row yet (used both at project creation and phase advance).
 */
export async function buildDefaultDrawingStatements(
  db: D1Database,
  projectId: string,
  phaseCode: string,
  existingDrawingTypes: Set<string>,
  nextSeq: number
): Promise<{ statements: D1PreparedStatement[]; createdCount: number }> {
  const { results } = await db
    .prepare(`SELECT drawing_type, required_lod, necessity FROM lod_rules WHERE phase_code = ?`)
    .bind(phaseCode)
    .all<LodRuleRow>()

  const statements: D1PreparedStatement[] = []
  const now = nowIso()
  let seq = nextSeq

  for (const rule of results) {
    if (existingDrawingTypes.has(rule.drawing_type)) continue

    const judgement = judgeLod(rule.required_lod, 0)
    const drawingId = generateId('DWG')
    const drawingNo = `TBD-${String(seq).padStart(3, '0')}`
    seq += 1

    statements.push(
      db
        .prepare(
          `INSERT INTO drawings (
            drawing_id, project_id, drawing_no, drawing_name, drawing_type, necessity,
            required_lod, current_lod, lod_judgement, status, lock_status,
            has_change_alert, next_action, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 0, ?, ?, ?)`
        )
        .bind(
          drawingId,
          projectId,
          drawingNo,
          rule.drawing_type,
          rule.drawing_type,
          rule.necessity,
          rule.required_lod,
          judgement,
          '未着手',
          '編集可',
          nextActionForLod(judgement),
          now,
          now
        )
    )
  }

  return { statements, createdCount: statements.length }
}
