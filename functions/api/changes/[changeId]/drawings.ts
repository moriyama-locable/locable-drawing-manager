import type { Env } from '../../_lib/types'
import { generateId, jsonError, nowIso } from '../../_lib/http'

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const changeId = context.params.changeId as string
  const body = await context.request.json<{
    drawing_id?: string
    impact_level?: string
    sync_status?: string
  }>()

  if (!body.drawing_id || !body.impact_level) {
    return jsonError('drawing_id and impact_level are required', 'INVALID_BODY')
  }

  const change = await context.env.DB.prepare(
    `SELECT project_id FROM changes WHERE change_id = ?`
  )
    .bind(changeId)
    .first<{ project_id: string }>()

  if (!change) {
    return jsonError('Change not found', 'NOT_FOUND', 404)
  }

  const linkId = generateId('LNK')
  const syncStatus = body.sync_status ?? '未確認'
  const now = nowIso()

  await context.env.DB.prepare(
    `INSERT INTO change_drawing_links (
      link_id, change_id, project_id, drawing_id, impact_level, sync_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(linkId, changeId, change.project_id, body.drawing_id, body.impact_level, syncStatus, now, now)
    .run()

  const hasAlert = syncStatus === '要確認' || syncStatus === '未反映'
  if (hasAlert) {
    await context.env.DB.prepare(
      `UPDATE drawings SET has_change_alert = 1, updated_at = ? WHERE drawing_id = ?`
    )
      .bind(now, body.drawing_id)
      .run()
  }

  return Response.json({ link_id: linkId }, { status: 201 })
}
