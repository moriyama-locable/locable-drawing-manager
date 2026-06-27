import type { Env } from './_lib/types'
import { generateId, jsonError, nowIso, writeAuditLog } from './_lib/http'
import { buildDefaultDrawingStatements } from './_lib/defaultDrawings'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const statusParam = new URL(context.request.url).searchParams.get('status')

  const { results } = await (statusParam === 'archived'
    ? context.env.DB.prepare(
        `SELECT project_id, project_name, current_phase, project_status, sort_order, archived_at, exported_at, export_file_url
         FROM projects
         WHERE deleted_at IS NULL AND project_status = 'archived'
         ORDER BY archived_at DESC`
      )
    : context.env.DB.prepare(
        `SELECT project_id, project_name, current_phase, project_status, sort_order, exported_at, export_file_url
         FROM projects
         WHERE deleted_at IS NULL AND project_status != 'archived'
         ORDER BY sort_order ASC`
      )
  ).all()

  return Response.json({ projects: results })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{
    project_name?: string
    current_phase?: string
    project_status?: string
    sort_order?: number
  }>()

  if (!body.project_name || !body.current_phase) {
    return jsonError('project_name and current_phase are required', 'INVALID_BODY')
  }

  const projectId = generateId('PRJ')
  const now = nowIso()

  await context.env.DB.prepare(
    `INSERT INTO projects (project_id, project_name, current_phase, project_status, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      projectId,
      body.project_name,
      body.current_phase,
      body.project_status ?? 'active',
      body.sort_order ?? null,
      now,
      now
    )
    .run()

  await writeAuditLog(context.env.DB, {
    entityType: 'project',
    entityId: projectId,
    action: 'create',
    after: body,
  })

  const { statements, createdCount } = await buildDefaultDrawingStatements(
    context.env.DB,
    projectId,
    body.current_phase,
    new Set(),
    1
  )

  if (statements.length > 0) {
    await context.env.DB.batch(statements)
    await writeAuditLog(context.env.DB, {
      entityType: 'drawing',
      entityId: projectId,
      action: 'default_generate',
      after: { phase_code: body.current_phase, created_count: createdCount },
    })
  }

  return Response.json({ project_id: projectId, default_drawings_created: createdCount }, { status: 201 })
}
