import type { Env } from './_lib/types'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.DB
  const today = new Date().toISOString().slice(0, 10)
  const projectId = new URL(context.request.url).searchParams.get('project_id')

  const drawingProjectFilter = projectId ? `AND project_id = ?` : ''
  const changeProjectFilter = projectId ? `AND project_id = ?` : ''
  const bindIfProject = (stmt: D1PreparedStatement): D1PreparedStatement =>
    projectId ? stmt.bind(projectId) : stmt

  const [
    activeProjects,
    lodShortage,
    changeAlerts,
    drawingOverdue,
    changeOverdue,
    locked,
    topItems,
    statusBreakdown,
    lodDistribution,
    notNeeded,
    approvedNeeded,
    totalNeeded,
  ] = await Promise.all([
      db
        .prepare(`SELECT COUNT(*) AS count FROM projects WHERE project_status = 'active' AND deleted_at IS NULL`)
        .first<{ count: number }>(),
      bindIfProject(
        db.prepare(`SELECT COUNT(*) AS count FROM drawings WHERE lod_judgement = '不足' ${drawingProjectFilter}`)
      ).first<{ count: number }>(),
      bindIfProject(
        db.prepare(`SELECT COUNT(*) AS count FROM drawings WHERE has_change_alert = 1 ${drawingProjectFilter}`)
      ).first<{ count: number }>(),
      (() => {
        const stmt = db.prepare(
          `SELECT COUNT(*) AS count FROM drawings WHERE final_deadline IS NOT NULL AND final_deadline < ? AND status != '承認済' ${drawingProjectFilter}`
        )
        return projectId ? stmt.bind(today, projectId) : stmt.bind(today)
      })().first<{ count: number }>(),
      (() => {
        const stmt = db.prepare(
          `SELECT COUNT(*) AS count FROM changes WHERE requested_date IS NOT NULL AND requested_date < ? AND status NOT IN ('対応済', '却下') ${changeProjectFilter}`
        )
        return projectId ? stmt.bind(today, projectId) : stmt.bind(today)
      })().first<{ count: number }>(),
      bindIfProject(
        db.prepare(
          `SELECT COUNT(*) AS count FROM drawings WHERE lock_status IN ('承認ロック', '施工ロック', '竣工ロック') ${drawingProjectFilter}`
        )
      ).first<{ count: number }>(),
      bindIfProject(
        db.prepare(
          `SELECT drawing_id, drawing_no, drawing_name, project_id, lod_judgement, has_change_alert, priority_score
           FROM drawings
           WHERE 1 = 1 ${drawingProjectFilter}
           ORDER BY priority_score DESC, has_change_alert DESC
           LIMIT 10`
        )
      ).all(),
      bindIfProject(
        db.prepare(
          `SELECT status, COUNT(*) AS count FROM drawings WHERE necessity != '不要' ${drawingProjectFilter} GROUP BY status`
        )
      ).all<{ status: string; count: number }>(),
      bindIfProject(
        db.prepare(
          `SELECT current_lod, COUNT(*) AS count FROM drawings WHERE necessity != '不要' ${drawingProjectFilter} GROUP BY current_lod ORDER BY current_lod ASC`
        )
      ).all<{ current_lod: number; count: number }>(),
      bindIfProject(
        db.prepare(`SELECT COUNT(*) AS count FROM drawings WHERE necessity = '不要' ${drawingProjectFilter}`)
      ).first<{ count: number }>(),
      bindIfProject(
        db.prepare(
          `SELECT COUNT(*) AS count FROM drawings WHERE necessity != '不要' AND status = '承認済' ${drawingProjectFilter}`
        )
      ).first<{ count: number }>(),
      bindIfProject(
        db.prepare(`SELECT COUNT(*) AS count FROM drawings WHERE necessity != '不要' ${drawingProjectFilter}`)
      ).first<{ count: number }>(),
    ])

  const total = totalNeeded?.count ?? 0
  const approved = approvedNeeded?.count ?? 0

  return Response.json({
    active_projects: activeProjects?.count ?? 0,
    lod_shortage_drawings: lodShortage?.count ?? 0,
    change_alert_drawings: changeAlerts?.count ?? 0,
    overdue_count: (drawingOverdue?.count ?? 0) + (changeOverdue?.count ?? 0),
    locked_drawings: locked?.count ?? 0,
    today_priority_items: topItems.results,
    status_breakdown: statusBreakdown.results,
    lod_distribution: lodDistribution.results,
    not_needed_drawings: notNeeded?.count ?? 0,
    progress_percent: total > 0 ? Math.round((approved / total) * 100) : 0,
  })
}
