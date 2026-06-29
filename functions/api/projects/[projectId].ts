import type { Env } from '../_lib/types'
import { jsonError, nowIso, writeAuditLog } from '../_lib/http'

const PATCHABLE_FIELDS = ['project_name', 'current_phase', 'due_date', 'project_status', 'sort_order'] as const

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const projectId = context.params.projectId as string
  const body = await context.request.json<Record<string, unknown>>()

  const updates = PATCHABLE_FIELDS.filter((field) => field in body)
  if (updates.length === 0) {
    return jsonError('No updatable fields provided', 'INVALID_BODY')
  }

  const setClause = updates.map((field) => `${field} = ?`).join(', ')
  const values = updates.map((field) => body[field])

  const result = await context.env.DB.prepare(
    `UPDATE projects SET ${setClause}, updated_at = ? WHERE project_id = ? AND deleted_at IS NULL`
  )
    .bind(...values, nowIso(), projectId)
    .run()

  if (result.meta.changes === 0) {
    return jsonError('Project not found', 'NOT_FOUND', 404)
  }

  await writeAuditLog(context.env.DB, {
    entityType: 'project',
    entityId: projectId,
    action: 'update',
    after: body,
  })

  return Response.json({ project_id: projectId })
}
