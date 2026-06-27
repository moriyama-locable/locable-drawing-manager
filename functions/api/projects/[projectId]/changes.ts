import type { Env } from '../../_lib/types'
import { generateId, jsonError, nowIso } from '../../_lib/http'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const projectId = context.params.projectId as string

  const { results } = await context.env.DB.prepare(
    `SELECT * FROM changes WHERE project_id = ? ORDER BY created_at DESC`
  )
    .bind(projectId)
    .all()

  return Response.json({ changes: results })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const projectId = context.params.projectId as string
  const body = await context.request.json<{
    change_reason?: string
    change_detail?: string
    requested_by?: string
    requested_date?: string
    impact_level?: string
    cost_impact?: string
    schedule_impact?: string
  }>()

  if (!body.change_reason || !body.change_detail || !body.impact_level) {
    return jsonError(
      'change_reason, change_detail and impact_level are required',
      'INVALID_BODY'
    )
  }

  const changeId = generateId('CHG')
  const now = nowIso()

  await context.env.DB.prepare(
    `INSERT INTO changes (
      change_id, project_id, change_reason, change_detail, requested_by,
      requested_date, impact_level, cost_impact, schedule_impact, status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '未確認', ?, ?)`
  )
    .bind(
      changeId,
      projectId,
      body.change_reason,
      body.change_detail,
      body.requested_by ?? null,
      body.requested_date ?? null,
      body.impact_level,
      body.cost_impact ?? null,
      body.schedule_impact ?? null,
      now,
      now
    )
    .run()

  return Response.json({ change_id: changeId }, { status: 201 })
}
