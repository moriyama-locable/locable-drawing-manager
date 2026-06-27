import type { Env } from '../../_lib/types'
import { generateId, jsonError, nowIso, writeAuditLog } from '../../_lib/http'

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = rows.map((row) =>
    headers.map((h) => String(row[h] ?? '').replaceAll('"', '""')).map((v) => `"${v}"`).join(',')
  )
  return [headers.join(','), ...lines].join('\n')
}

interface ProjectRow {
  project_id: string
  project_name: string
  current_phase: string
  project_status: string
  created_at: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const projectId = context.params.projectId as string

  const project = await context.env.DB.prepare(
    `SELECT * FROM projects WHERE project_id = ? AND deleted_at IS NULL`
  )
    .bind(projectId)
    .first<ProjectRow>()

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

  const drawingRows = drawings.results as Record<string, unknown>[]
  const lodStatusRows = drawingRows.map((d) => ({
    drawing_no: d.drawing_no,
    drawing_name: d.drawing_name,
    drawing_type: d.drawing_type,
    required_lod: d.required_lod,
    current_lod: d.current_lod,
    lod_judgement: d.lod_judgement,
  }))
  const driveLinkRows = drawingRows.map((d) => ({
    drawing_no: d.drawing_no,
    drawing_name: d.drawing_name,
    drive_pdf_url: d.drive_pdf_url,
    drive_source_url: d.drive_source_url,
  }))

  const overviewMarkdown = [
    `# ${project.project_name} アーカイブ概要`,
    '',
    `- project_id: ${project.project_id}`,
    `- current_phase: ${project.current_phase}`,
    `- project_status: ${project.project_status}`,
    `- 図面数: ${drawingRows.length}`,
    `- 変更項目数: ${(changes.results as Record<string, unknown>[]).length}`,
    `- 書き出し日時: ${now}`,
  ].join('\n')

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

  await writeAuditLog(context.env.DB, {
    entityType: 'project',
    entityId: projectId,
    action: 'export',
    after: { export_id: exportId },
  })

  return Response.json({
    export_id: exportId,
    project_overview_md: overviewMarkdown,
    drawings_csv: toCsv(drawingRows),
    changes_csv: toCsv(changes.results as Record<string, unknown>[]),
    change_drawing_links_csv: toCsv(links.results as Record<string, unknown>[]),
    lod_status_csv: toCsv(lodStatusRows),
    drive_links_csv: toCsv(driveLinkRows),
  })
}
