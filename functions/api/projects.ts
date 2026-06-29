import type { Env } from './_lib/types'
import { generateId, jsonError, nowIso, writeAuditLog } from './_lib/http'
import { DEFAULT_DRAWING_LIST, drawingNoPrefix } from './_lib/drawings'

const DEFAULT_PHASE_CODE = 'P00'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const statusParam = new URL(context.request.url).searchParams.get('status')

  const { results } = await (statusParam === 'archived'
    ? context.env.DB.prepare(
        `SELECT project_id, project_name, current_phase, due_date, project_status, sort_order, archived_at, exported_at, export_file_url
         FROM projects
         WHERE deleted_at IS NULL AND project_status = 'archived'
         ORDER BY archived_at DESC`
      )
    : context.env.DB.prepare(
        `SELECT project_id, project_name, current_phase, due_date, project_status, sort_order, exported_at, export_file_url
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
    due_date?: string
    project_status?: string
    sort_order?: number
  }>()

  if (!body.project_name) {
    return jsonError('project_name is required', 'INVALID_BODY')
  }

  const projectId = generateId('PRJ')
  const now = nowIso()
  const today = now.slice(0, 10)

  await context.env.DB.prepare(
    `INSERT INTO projects (project_id, project_name, current_phase, due_date, project_status, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      projectId,
      body.project_name,
      body.current_phase ?? DEFAULT_PHASE_CODE,
      body.due_date ?? today,
      body.project_status ?? 'active',
      body.sort_order ?? null,
      now,
      now
    )
    .run()

  const drawingStatements = DEFAULT_DRAWING_LIST.map((seed, index) =>
    context.env.DB.prepare(
      `INSERT INTO drawings (
        drawing_id, project_id, drawing_no, drawing_name, drawing_type, necessity, lod, status, deadline, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      generateId('DWG'),
      projectId,
      `${drawingNoPrefix(seed.drawing_type)}${index + 1}`,
      seed.drawing_name,
      seed.drawing_type,
      seed.necessity,
      seed.lod,
      seed.status,
      today,
      now,
      now
    )
  )
  await context.env.DB.batch(drawingStatements)

  await writeAuditLog(context.env.DB, {
    entityType: 'project',
    entityId: projectId,
    action: 'create',
    after: body,
  })

  return Response.json({ project_id: projectId }, { status: 201 })
}
