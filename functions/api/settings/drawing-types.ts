import type { Env } from '../_lib/types'
import { jsonError, nowIso, writeAuditLog } from '../_lib/http'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare(
    `SELECT drawing_type, sort_order FROM drawing_types ORDER BY sort_order ASC, drawing_type ASC`
  ).all()

  return Response.json({ drawing_types: results })
}

interface DrawingTypeInput {
  drawing_type: string
  original_drawing_type?: string
  sort_order?: number
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{ drawing_types?: DrawingTypeInput[] }>()

  if (!Array.isArray(body.drawing_types)) {
    return jsonError('drawing_types must be an array', 'INVALID_BODY')
  }

  const now = nowIso()
  const statements: D1PreparedStatement[] = []

  try {
    for (const item of body.drawing_types) {
      if (!item.drawing_type) {
        throw new Error('Each item requires drawing_type')
      }
      if (item.original_drawing_type && item.original_drawing_type !== item.drawing_type) {
        statements.push(
          context.env.DB.prepare(
            `UPDATE drawing_types SET drawing_type = ?, sort_order = ?, updated_at = ? WHERE drawing_type = ?`
          ).bind(item.drawing_type, item.sort_order ?? null, now, item.original_drawing_type)
        )
        statements.push(
          context.env.DB.prepare(`UPDATE drawings SET drawing_type = ? WHERE drawing_type = ?`).bind(
            item.drawing_type,
            item.original_drawing_type
          )
        )
        statements.push(
          context.env.DB.prepare(`UPDATE lod_rules SET drawing_type = ? WHERE drawing_type = ?`).bind(
            item.drawing_type,
            item.original_drawing_type
          )
        )
      } else {
        statements.push(
          context.env.DB.prepare(
            `INSERT INTO drawing_types (drawing_type, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(drawing_type) DO UPDATE SET
               sort_order = excluded.sort_order,
               updated_at = excluded.updated_at`
          ).bind(item.drawing_type, item.sort_order ?? null, now, now)
        )
      }
    }
  } catch (err) {
    return jsonError((err as Error).message || 'Invalid drawing_types payload', 'INVALID_BODY')
  }

  if (statements.length > 0) {
    await context.env.DB.batch(statements)
  }
  await writeAuditLog(context.env.DB, {
    entityType: 'drawing_types',
    entityId: 'bulk',
    action: 'update',
    after: { count: body.drawing_types.length },
  })

  return Response.json({ updated: body.drawing_types.length })
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const drawingType = new URL(context.request.url).searchParams.get('drawing_type')
  if (!drawingType) {
    return jsonError('drawing_type query parameter is required', 'INVALID_BODY')
  }

  const [drawingUsage, ruleUsage] = await Promise.all([
    context.env.DB.prepare(`SELECT COUNT(*) AS count FROM drawings WHERE drawing_type = ?`)
      .bind(drawingType)
      .first<{ count: number }>(),
    context.env.DB.prepare(`SELECT COUNT(*) AS count FROM lod_rules WHERE drawing_type = ?`)
      .bind(drawingType)
      .first<{ count: number }>(),
  ])

  if ((drawingUsage?.count ?? 0) > 0 || (ruleUsage?.count ?? 0) > 0) {
    return jsonError('この図面種別は使用中のため削除できません', 'IN_USE', 409)
  }

  await context.env.DB.prepare(`DELETE FROM drawing_types WHERE drawing_type = ?`).bind(drawingType).run()
  await writeAuditLog(context.env.DB, {
    entityType: 'drawing_types',
    entityId: drawingType,
    action: 'delete',
  })

  return new Response(null, { status: 204 })
}
