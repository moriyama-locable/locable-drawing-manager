import type { Env } from '../_lib/types'
import { jsonError, nowIso, writeAuditLog } from '../_lib/http'

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const linkId = context.params.linkId as string
  const body = await context.request.json<{ sync_status?: string; last_checked_date?: string }>()

  if (!body.sync_status) {
    return jsonError('sync_status is required', 'INVALID_BODY')
  }

  const link = await context.env.DB.prepare(
    `SELECT drawing_id FROM change_drawing_links WHERE link_id = ?`
  )
    .bind(linkId)
    .first<{ drawing_id: string }>()

  if (!link) {
    return jsonError('Link not found', 'NOT_FOUND', 404)
  }

  const now = nowIso()

  await context.env.DB.prepare(
    `UPDATE change_drawing_links SET sync_status = ?, last_checked_date = ?, updated_at = ? WHERE link_id = ?`
  )
    .bind(body.sync_status, body.last_checked_date ?? now, now, linkId)
    .run()

  const { results: remainingAlerts } = await context.env.DB.prepare(
    `SELECT link_id FROM change_drawing_links WHERE drawing_id = ? AND sync_status IN ('要確認', '未反映')`
  )
    .bind(link.drawing_id)
    .all()

  await context.env.DB.prepare(
    `UPDATE drawings SET has_change_alert = ?, updated_at = ? WHERE drawing_id = ?`
  )
    .bind(remainingAlerts.length > 0 ? 1 : 0, now, link.drawing_id)
    .run()

  await writeAuditLog(context.env.DB, {
    entityType: 'change_drawing_link',
    entityId: linkId,
    action: 'update',
    after: { sync_status: body.sync_status },
  })

  return Response.json({ link_id: linkId })
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const linkId = context.params.linkId as string

  const link = await context.env.DB.prepare(
    `SELECT drawing_id FROM change_drawing_links WHERE link_id = ?`
  )
    .bind(linkId)
    .first<{ drawing_id: string }>()

  if (!link) {
    return jsonError('Link not found', 'NOT_FOUND', 404)
  }

  await context.env.DB.prepare(`DELETE FROM change_drawing_links WHERE link_id = ?`)
    .bind(linkId)
    .run()

  const { results: remainingAlerts } = await context.env.DB.prepare(
    `SELECT link_id FROM change_drawing_links WHERE drawing_id = ? AND sync_status IN ('要確認', '未反映')`
  )
    .bind(link.drawing_id)
    .all()

  await context.env.DB.prepare(
    `UPDATE drawings SET has_change_alert = ?, updated_at = ? WHERE drawing_id = ?`
  )
    .bind(remainingAlerts.length > 0 ? 1 : 0, nowIso(), link.drawing_id)
    .run()

  await writeAuditLog(context.env.DB, {
    entityType: 'change_drawing_link',
    entityId: linkId,
    action: 'delete',
  })

  return new Response(null, { status: 204 })
}
