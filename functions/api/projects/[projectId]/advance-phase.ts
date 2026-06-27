import type { Env } from '../../_lib/types'
import { jsonError, nowIso, writeAuditLog } from '../../_lib/http'
import { judgeLod, nextActionForLod } from '../../_lib/lod'
import { buildDefaultDrawingStatements } from '../../_lib/defaultDrawings'

interface PhaseRow {
  phase_code: string
  sort_order: number | null
}

interface DrawingRow {
  drawing_id: string
  drawing_type: string
  current_lod: number
}

interface LodRuleRow {
  drawing_type: string
  required_lod: number
  necessity: string
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

  const nextPhase = await context.env.DB.prepare(
    `SELECT phase_code, sort_order FROM phases
     WHERE sort_order > ? ORDER BY sort_order ASC LIMIT 1`
  )
    .bind(currentPhase.sort_order)
    .first<PhaseRow>()

  if (!nextPhase) {
    return jsonError('Project is already at the final phase', 'NO_NEXT_PHASE', 409)
  }

  const now = nowIso()

  const { results: drawings } = await context.env.DB.prepare(
    `SELECT drawing_id, drawing_type, current_lod FROM drawings WHERE project_id = ?`
  )
    .bind(projectId)
    .all<DrawingRow>()

  const { results: rules } = await context.env.DB.prepare(
    `SELECT drawing_type, required_lod, necessity FROM lod_rules WHERE phase_code = ?`
  )
    .bind(nextPhase.phase_code)
    .all<LodRuleRow>()

  const rulesByType = new Map(rules.map((rule) => [rule.drawing_type, rule]))

  const statements: D1PreparedStatement[] = [
    context.env.DB
      .prepare(`UPDATE projects SET current_phase = ?, updated_at = ? WHERE project_id = ?`)
      .bind(nextPhase.phase_code, now, projectId),
  ]

  let updatedCount = 0
  for (const drawing of drawings) {
    const rule = rulesByType.get(drawing.drawing_type)
    if (!rule) continue

    const judgement = judgeLod(rule.required_lod, drawing.current_lod)
    statements.push(
      context.env.DB
        .prepare(
          `UPDATE drawings SET required_lod = ?, necessity = ?, lod_judgement = ?, next_action = ?, updated_at = ?
           WHERE drawing_id = ?`
        )
        .bind(rule.required_lod, rule.necessity, judgement, nextActionForLod(judgement), now, drawing.drawing_id)
    )
    updatedCount += 1
  }

  const existingDrawingTypes = new Set(drawings.map((d) => d.drawing_type))
  const { statements: createStatements, createdCount } = await buildDefaultDrawingStatements(
    context.env.DB,
    projectId,
    nextPhase.phase_code,
    existingDrawingTypes,
    drawings.length + 1
  )
  statements.push(...createStatements)

  await context.env.DB.batch(statements)

  await writeAuditLog(context.env.DB, {
    entityType: 'project',
    entityId: projectId,
    action: 'advance_phase',
    before: { phase_code: currentPhase.phase_code },
    after: { phase_code: nextPhase.phase_code, updated_drawings: updatedCount, created_drawings: createdCount },
  })

  return Response.json({
    project_id: projectId,
    phase_code: nextPhase.phase_code,
    updated_drawings: updatedCount,
    created_drawings: createdCount,
  })
}
