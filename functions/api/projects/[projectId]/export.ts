import type { Env } from '../../_lib/types'
import { generateId, jsonError, nowIso } from '../../_lib/http'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = rows.map((row) =>
    headers.map((h) => String(row[h] ?? '').replaceAll('"', '""')).map((v) => `"${v}"`).join(',')
  )
  return [headers.join(','), ...lines].join('\n')
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const projectId = context.params.projectId as string

  const project = await context.env.DB.prepare(
    `SELECT * FROM projects WHERE project_id = ? AND deleted_at IS NULL`
  )
    .bind(projectId)
    .first()

  if (!project) {
    return jsonError('Project not found', 'NOT_FOUND', 404)
  }

  const drawings = await context.env.DB.prepare(`SELECT * FROM drawings WHERE project_id = ?`)
    .bind(projectId)
    .all()
  const changes = await context.env.DB.prepare(`SELECT * FROM changes WHERE project_id = ?`)
    .bind(projectId)
    .all()
  const links = await context.env.DB.prepare(
    `SELECT * FROM change_drawing_links WHERE project_id = ?`
  )
    .bind(projectId)
    .all()

  const exportId = generateId('EXP')
  const now = nowIso()

  await context.env.DB.prepare(
    `INSERT INTO exports (export_id, project_id, export_type, file_url, created_at)
     VALUES (?, ?, 'full', NULL, ?)`
  )
    .bind(exportId, projectId, now)
    .run()

  await context.env.DB.prepare(
    `UPDATE projects SET exported_at = ?, updated_at = ? WHERE project_id = ?`
  )
    .bind(now, now, projectId)
    .run()

  return Response.json({
    export_id: exportId,
    drawings_csv: toCsv(drawings.results as Record<string, unknown>[]),
    changes_csv: toCsv(changes.results as Record<string, unknown>[]),
    change_drawing_links_csv: toCsv(links.results as Record<string, unknown>[]),
  })
}
