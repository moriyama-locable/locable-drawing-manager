import type { Env } from '../_lib/types'
import { jsonError, nowIso, writeAuditLog } from '../_lib/http'

const PATCHABLE_FIELDS = [
  'change_reason',
  'change_detail',
  'requested_by',
  'requested_date',
  'impact_level',
  'cost_impact',
  'schedule_impact',
  'status',
  'approved_by',
  'approved_date',
  'notes',
] as const

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const changeId = context.params.changeId as string
  const body = await context.request.json<Record<string, unknown>>()

  const updates = PATCHABLE_FIELDS.filter((field) => field in body)
  if (updates.length === 0) {
    return jsonError('No updatable fields provided', 'INVALID_BODY')
  }

  const setClause = updates.map((field) => `${field} = ?`).join(', ')
  const values = updates.map((field) => body[field])

  const result = await context.env.DB.prepare(
    `UPDATE changes SET ${setClause}, updated_at = ? WHERE change_id = ?`
  )
    .bind(...values, nowIso(), changeId)
    .run()

  if (result.meta.changes === 0) {
    return jsonError('Change not found', 'NOT_FOUND', 404)
  }

  await writeAuditLog(context.env.DB, {
    entityType: 'change',
    entityId: changeId,
    action: 'update',
    after: body,
  })

  return Response.json({ change_id: changeId })
}
