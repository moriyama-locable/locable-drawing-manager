import type { Env } from '../../_lib/types'
import { jsonError, nowIso, writeAuditLog } from '../../_lib/http'

interface PhaseRow {
  phase_code: string
  sort_order: number | null
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const projectId = context.params.projectId as string

  const project = await context.env.DB.prepare(
    `SELECT current_phase FROM projects WHERE project_id = ? AND deleted_at IS NULL`
  )
    .bind(projectId)
    .first<{ current_phase: string }>()

  if (!project) {
    return jsonError('Project not found', 'NOT_FOUND', 404)
  }

  const currentPhase = await context.env.DB.prepare(
    `SELECT phase_code, sort_order FROM phases WHERE phase_code = ?`
  )
    .bind(project.current_phase)
    .first<PhaseRow>()

  if (!currentPhase) {
    return jsonError('Current phase is not a recognized phase', 'INVALID_STATE', 409)
  }

  const prevPhase = await context.env.DB.prepare(
    `SELECT phase_code, sort_order FROM phases
     WHERE sort_order < ? ORDER BY sort_order DESC LIMIT 1`
  )
    .bind(currentPhase.sort_order)
    .first<PhaseRow>()

  if (!prevPhase) {
    return jsonError('Project is already at the first phase', 'NO_PREV_PHASE', 409)
  }

  const now = nowIso()

  await context.env.DB.prepare(`UPDATE projects SET current_phase = ?, updated_at = ? WHERE project_id = ?`)
    .bind(prevPhase.phase_code, now, projectId)
    .run()

  await writeAuditLog(context.env.DB, {
    entityType: 'project',
    entityId: projectId,
    action: 'revert_phase',
    before: { phase_code: currentPhase.phase_code },
    after: { phase_code: prevPhase.phase_code },
  })

  return Response.json({ project_id: projectId, phase_code: prevPhase.phase_code })
}
