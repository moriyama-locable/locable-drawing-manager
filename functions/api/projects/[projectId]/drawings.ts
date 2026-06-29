import type { Env } from '../../_lib/types'
import { generateId, jsonError, nowIso, writeAuditLog } from '../../_lib/http'
import { drawingNoPrefix } from '../../_lib/drawings'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const projectId = context.params.projectId as string

  const { results } = await context.env.DB.prepare(
    `SELECT * FROM drawings WHERE project_id = ? ORDER BY drawing_no ASC`
  )
    .bind(projectId)
    .all()

  return Response.json({ drawings: results })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const projectId = context.params.projectId as string
  const body = await context.request.json<{
    drawing_name?: string
    drawing_type?: string
    necessity?: string
    lod?: number
    status?: string
    deadline?: string
  }>()

  if (!body.drawing_name || !body.status) {
    return jsonError('drawing_name and status are required', 'INVALID_BODY')
  }

  const project = await context.env.DB.prepare(
    `SELECT project_id FROM projects WHERE project_id = ? AND deleted_at IS NULL`
  )
    .bind(projectId)
    .first()

  if (!project) {
    return jsonError('Project not found', 'NOT_FOUND', 404)
  }

  const drawingType = body.drawing_type ?? '建築図'
  const countRow = await context.env.DB.prepare(`SELECT COUNT(*) AS count FROM drawings WHERE project_id = ?`)
    .bind(projectId)
    .first<{ count: number }>()
  const drawingNo = `${drawingNoPrefix(drawingType)}${(countRow?.count ?? 0) + 1}`

  const drawingId = generateId('DWG')
  const now = nowIso()

  await context.env.DB.prepare(
    `INSERT INTO drawings (
      drawing_id, project_id, drawing_no, drawing_name, drawing_type, necessity, lod, status, deadline, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      drawingId,
      projectId,
      drawingNo,
      body.drawing_name,
      drawingType,
      body.necessity ?? '任意',
      body.lod ?? 0,
      body.status,
      body.deadline ?? null,
      now,
      now
    )
    .run()

  await writeAuditLog(context.env.DB, {
    entityType: 'drawing',
    entityId: drawingId,
    action: 'create',
    after: { project_id: projectId, ...body },
  })

  return Response.json({ drawing_id: drawingId }, { status: 201 })
}
