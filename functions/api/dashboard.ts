import type { Env } from './_lib/types'

const STATUS_PROGRESS: Record<string, number> = {
  未着手: 30,
  進行中: 50,
  確認中: 80,
  完了: 100,
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.DB
  const today = new Date().toISOString().slice(0, 10)
  const projectId = new URL(context.request.url).searchParams.get('project_id')

  const drawingProjectFilter = projectId ? `AND project_id = ?` : ''
  const changeProjectFilter = projectId ? `AND project_id = ?` : ''
  const bindIfProject = (stmt: D1PreparedStatement): D1PreparedStatement =>
    projectId ? stmt.bind(projectId) : stmt

  const [activeProjects, drawingOverdue, changeOverdue, upcomingDeadlines, statusBreakdown, notNeeded, totalNeeded] =
    await Promise.all([
      db
        .prepare(`SELECT COUNT(*) AS count FROM projects WHERE project_status = 'active' AND deleted_at IS NULL`)
        .first<{ count: number }>(),
      (() => {
        const stmt = db.prepare(
          `SELECT COUNT(*) AS count FROM drawings WHERE deadline IS NOT NULL AND deadline < ? AND status != '完了' ${drawingProjectFilter}`
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
          `SELECT drawing_id, drawing_no, drawing_name, project_id, deadline
           FROM drawings
           WHERE deadline IS NOT NULL AND status != '完了' ${drawingProjectFilter}
           ORDER BY deadline ASC
           LIMIT 10`
        )
      ).all(),
      bindIfProject(
        db.prepare(
          `SELECT status, COUNT(*) AS count FROM drawings WHERE necessity != '不要' ${drawingProjectFilter} GROUP BY status`
        )
      ).all<{ status: string; count: number }>(),
      bindIfProject(
        db.prepare(`SELECT COUNT(*) AS count FROM drawings WHERE necessity = '不要' ${drawingProjectFilter}`)
      ).first<{ count: number }>(),
      bindIfProject(
        db.prepare(`SELECT COUNT(*) AS count FROM drawings WHERE necessity != '不要' ${drawingProjectFilter}`)
      ).first<{ count: number }>(),
    ])

  const total = totalNeeded?.count ?? 0
  const progressSum = statusBreakdown.results.reduce(
    (sum, row) => sum + (STATUS_PROGRESS[row.status] ?? 0) * row.count,
    0
  )

  return Response.json({
    active_projects: activeProjects?.count ?? 0,
    overdue_count: (drawingOverdue?.count ?? 0) + (changeOverdue?.count ?? 0),
    upcoming_deadlines: upcomingDeadlines.results,
    status_breakdown: statusBreakdown.results,
    not_needed_drawings: notNeeded?.count ?? 0,
    progress_percent: total > 0 ? Math.round(progressSum / total) : 0,
  })
}
