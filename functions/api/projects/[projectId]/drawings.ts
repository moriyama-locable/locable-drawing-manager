import type { Env } from '../../_lib/types'
import { generateId, jsonError, nowIso } from '../../_lib/http'
import { judgeLod, nextActionForLod } from '../../_lib/lod'

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
    drawing_no?: string
    drawing_name?: string
    drawing_type?: string
    necessity?: string
    current_lod?: number
    status?: string
    lock_status?: string
    final_deadline?: string
  }>()

  if (!body.drawing_no || !body.drawing_name || !body.drawing_type || !body.status) {
    return jsonError(
      'drawing_no, drawing_name, drawing_type and status are required',
      'INVALID_BODY'
    )
  }

  const phaseRow = await context.env.DB.prepare(
    `SELECT current_phase FROM projects WHERE project_id = ? AND deleted_at IS NULL`
  )
    .bind(projectId)
    .first<{ current_phase: string }>()

  if (!phaseRow) {
    return jsonError('Project not found', 'NOT_FOUND', 404)
  }

  const ruleRow = await context.env.DB.prepare(
    `SELECT required_lod, necessity FROM lod_rules WHERE phase_code = ? AND drawing_type = ?`
  )
    .bind(phaseRow.current_phase, body.drawing_type)
    .first<{ required_lod: number; necessity: string }>()

  const requiredLod = ruleRow?.required_lod ?? 0
  const necessity = body.necessity ?? ruleRow?.necessity ?? '任意'
  const currentLod = body.current_lod ?? 0
  const judgement = judgeLod(requiredLod, currentLod)

  const drawingId = generateId('DWG')
  const now = nowIso()

  await context.env.DB.prepare(
    `INSERT INTO drawings (
      drawing_id, project_id, drawing_no, drawing_name, drawing_type, necessity,
      required_lod, current_lod, lod_judgement, status, lock_status,
      final_deadline, has_change_alert, next_action, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
  )
    .bind(
      drawingId,
      projectId,
      body.drawing_no,
      body.drawing_name,
      body.drawing_type,
      necessity,
      requiredLod,
      currentLod,
      judgement,
      body.status,
      body.lock_status ?? '編集可',
      body.final_deadline ?? null,
      nextActionForLod(judgement),
      now,
      now
    )
    .run()

  return Response.json({ drawing_id: drawingId }, { status: 201 })
}
