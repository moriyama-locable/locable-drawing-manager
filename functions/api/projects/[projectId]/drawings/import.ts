import type { Env } from '../../../_lib/types'
import { generateId, jsonError, nowIso, writeAuditLog } from '../../../_lib/http'
import { judgeLod, nextActionForLod } from '../../../_lib/lod'

interface ImportRow {
  drawing_no?: string
  drawing_name?: string
  drawing_type?: string
  necessity?: string
  required_lod?: number
  current_lod?: number
  status?: string
  lock_status?: string
  final_deadline?: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const projectId = context.params.projectId as string
  const body = await context.request.json<{ rows?: ImportRow[] }>()
  const rows = body.rows ?? []

  if (rows.length === 0) {
    return jsonError('rows is required and must not be empty', 'INVALID_BODY')
  }

  const phaseRow = await context.env.DB.prepare(
    `SELECT current_phase FROM projects WHERE project_id = ? AND deleted_at IS NULL`
  )
    .bind(projectId)
    .first<{ current_phase: string }>()

  if (!phaseRow) {
    return jsonError('Project not found', 'NOT_FOUND', 404)
  }

  const errors: Array<{ row: number; message: string }> = []
  const statements: D1PreparedStatement[] = []
  const now = nowIso()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.drawing_no || !row.drawing_name || !row.drawing_type || !row.status) {
      errors.push({ row: i + 1, message: 'drawing_no, drawing_name, drawing_type, status は必須です' })
      continue
    }

    const ruleRow = await context.env.DB.prepare(
      `SELECT required_lod, necessity FROM lod_rules WHERE phase_code = ? AND drawing_type = ?`
    )
      .bind(phaseRow.current_phase, row.drawing_type)
      .first<{ required_lod: number; necessity: string }>()

    const requiredLod = row.required_lod ?? ruleRow?.required_lod ?? 0
    const necessity = row.necessity ?? ruleRow?.necessity ?? '任意'
    const currentLod = row.current_lod ?? 0
    const judgement = judgeLod(requiredLod, currentLod)
    const drawingId = generateId('DWG')

    statements.push(
      context.env.DB.prepare(
        `INSERT INTO drawings (
          drawing_id, project_id, drawing_no, drawing_name, drawing_type, necessity,
          required_lod, current_lod, lod_judgement, status, lock_status,
          final_deadline, has_change_alert, next_action, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
      ).bind(
        drawingId,
        projectId,
        row.drawing_no,
        row.drawing_name,
        row.drawing_type,
        necessity,
        requiredLod,
        currentLod,
        judgement,
        row.status,
        row.lock_status ?? '編集可',
        row.final_deadline ?? null,
        nextActionForLod(judgement),
        now,
        now
      )
    )
  }

  if (statements.length > 0) {
    await context.env.DB.batch(statements)
    await writeAuditLog(context.env.DB, {
      entityType: 'drawing',
      entityId: projectId,
      action: 'import',
      after: { imported_count: statements.length, error_count: errors.length },
    })
  }

  return Response.json({ imported_count: statements.length, errors })
}
