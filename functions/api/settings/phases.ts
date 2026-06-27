import type { Env } from '../_lib/types'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare(
    `SELECT phase_code, phase_name, sort_order FROM phases ORDER BY sort_order ASC`
  ).all()

  return Response.json({ phases: results })
}
