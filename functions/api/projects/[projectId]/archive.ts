import type { Env } from '../../_lib/types'
import { jsonError, nowIso, writeAuditLog } from '../../_lib/http'

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const projectId = context.params.projectId as string
  const now = nowIso()

  const project = await context.env.DB.prepare(
    `SELECT exported_at FROM projects WHERE project_id = ? AND deleted_at IS NULL`
  )
    .bind(projectId)
    .first<{ exported_at: string | null }>()

  if (!project) {
    return jsonError('Project not found', 'NOT_FOUND', 404)
  }

  if (!project.exported_at) {
    return jsonError('Project must be exported before archiving', 'NOT_EXPORTED', 409)
  }

  const result = await context.env.DB.prepare(
    `UPDATE projects SET project_status = 'archived', archived_at = ?, updated_at = ?
     WHERE project_id = ? AND deleted_at IS NULL`
  )
    .bind(now, now, projectId)
    .run()

  if (result.meta.changes === 0) {
    return jsonError('Project not found', 'NOT_FOUND', 404)
  }

  await writeAuditLog(context.env.DB, {
    entityType: 'project',
    entityId: projectId,
    action: 'archive',
  })

  return Response.json({ project_id: projectId, project_status: 'archived' })
}
