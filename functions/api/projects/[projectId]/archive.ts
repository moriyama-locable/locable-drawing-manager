import type { Env } from '../../_lib/types'
import { jsonError, nowIso } from '../../_lib/http'

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const projectId = context.params.projectId as string
  const now = nowIso()

  const result = await context.env.DB.prepare(
    `UPDATE projects SET project_status = 'archived', archived_at = ?, updated_at = ?
     WHERE project_id = ? AND deleted_at IS NULL`
  )
    .bind(now, now, projectId)
    .run()

  if (result.meta.changes === 0) {
    return jsonError('Project not found', 'NOT_FOUND', 404)
  }

  return Response.json({ project_id: projectId, project_status: 'archived' })
}
