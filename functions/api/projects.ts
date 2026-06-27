interface Env {
  DB: D1Database
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare(
    `SELECT project_id, project_name, current_phase, project_status, sort_order
     FROM projects
     WHERE deleted_at IS NULL
     ORDER BY sort_order ASC`
  ).all()

  return Response.json({ projects: results })
}
