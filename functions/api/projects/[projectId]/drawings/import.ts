import type { Env } from '../../../_lib/types'
import { generateId, jsonError, nowIso, writeAuditLog } from '../../../_lib/http'

interface ImportRow {
  drawing_no?: string
  drawing_name?: string
  necessity?: string
  lod?: number
  status?: string
  deadline?: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const projectId = context.params.projectId as string
  const body = await context.request.json<{ rows?: ImportRow[] }>()
  const rows = body.rows ?? []

  if (rows.length === 0) {
    return jsonError('rows is required and must not be empty', 'INVALID_BODY')
  }

  const project = await context.env.DB.prepare(
    `SELECT project_id FROM projects WHERE project_id = ? AND deleted_at IS NULL`
  )
    .bind(projectId)
    .first()

  if (!project) {
    return jsonError('Project not found', 'NOT_FOUND', 404)
  }

  const errors: Array<{ row: number; message: string }> = []
  const statements: D1PreparedStatement[] = []
  const now = nowIso()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!row.drawing_no || !row.drawing_name || !row.status) {
      errors.push({ row: i + 1, message: 'drawing_no, drawing_name, status は必須です' })
      continue
    }

    const drawingId = generateId('DWG')

    statements.push(
      context.env.DB.prepare(
        `INSERT INTO drawings (
          drawing_id, project_id, drawing_no, drawing_name, necessity, lod, status, deadline, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        drawingId,
        projectId,
        row.drawing_no,
        row.drawing_name,
        row.necessity ?? '任意',
        row.lod ?? 0,
        row.status,
        row.deadline ?? null,
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
