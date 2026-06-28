import type { Env } from '../_lib/types'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare(
    `SELECT lod_level, lod_name, description, completion_criteria FROM lod_definitions ORDER BY lod_level ASC`
  ).all()

  return Response.json({ lod_definitions: results })
}
