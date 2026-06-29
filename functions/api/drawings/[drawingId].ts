import type { Env } from '../_lib/types'
import { jsonError, nowIso, writeAuditLog } from '../_lib/http'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const drawingId = context.params.drawingId as string

  const drawing = await context.env.DB.prepare(`SELECT * FROM drawings WHERE drawing_id = ?`)
    .bind(drawingId)
    .first()

  if (!drawing) {
    return jsonError('Drawing not found', 'NOT_FOUND', 404)
  }

  const { results: relatedChanges } = await context.env.DB.prepare(
    `SELECT c.change_id, c.change_reason, c.change_detail, c.status,
            l.link_id, l.impact_level, l.sync_status
     FROM change_drawing_links l
     JOIN changes c ON c.change_id = l.change_id
     WHERE l.drawing_id = ?
     ORDER BY l.created_at DESC`
  )
    .bind(drawingId)
    .all()

  return Response.json({ drawing, related_changes: relatedChanges })
}

const PATCHABLE_FIELDS = ['drawing_no', 'drawing_name', 'drawing_type', 'necessity', 'lod', 'status', 'deadline'] as const

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const drawingId = context.params.drawingId as string
  const body = await context.request.json<Record<string, unknown>>()

  const existing = await context.env.DB.prepare(`SELECT drawing_id FROM drawings WHERE drawing_id = ?`)
    .bind(drawingId)
    .first()

  if (!existing) {
    return jsonError('Drawing not found', 'NOT_FOUND', 404)
  }

  const updates = PATCHABLE_FIELDS.filter((field) => field in body)
  if (updates.length === 0) {
    return jsonError('No updatable fields provided', 'INVALID_BODY')
  }

  const setClause = updates.map((field) => `${field} = ?`).join(', ')
  const values = updates.map((field) => body[field])

  await context.env.DB.prepare(`UPDATE drawings SET ${setClause}, updated_at = ? WHERE drawing_id = ?`)
    .bind(...values, nowIso(), drawingId)
    .run()

  await writeAuditLog(context.env.DB, {
    entityType: 'drawing',
    entityId: drawingId,
    action: 'update',
    before: existing,
    after: body,
  })

  return Response.json({ drawing_id: drawingId })
}
