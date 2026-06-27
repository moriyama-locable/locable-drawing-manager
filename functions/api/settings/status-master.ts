import type { Env } from '../_lib/types'
import { generateId, jsonError, nowIso, writeAuditLog } from '../_lib/http'

const GROUP_COLUMN: Record<string, string> = {
  drawing: 'status',
  lock: 'lock_status',
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const group = new URL(context.request.url).searchParams.get('group')
  if (!group) {
    return jsonError('group query parameter is required', 'INVALID_BODY')
  }

  const { results } = await context.env.DB.prepare(
    `SELECT status_id, status_group, status_name, sort_order, progress_percent
     FROM status_master WHERE status_group = ? ORDER BY sort_order ASC, status_name ASC`
  )
    .bind(group)
    .all()

  return Response.json({ status_master: results })
}

interface StatusMasterInput {
  status_id?: string
  status_name: string
  sort_order?: number
  progress_percent?: number
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{ status_group?: string; items?: StatusMasterInput[] }>()

  if (!body.status_group || !Array.isArray(body.items)) {
    return jsonError('status_group and items are required', 'INVALID_BODY')
  }

  const column = GROUP_COLUMN[body.status_group]
  if (!column) {
    return jsonError('Unsupported status_group', 'INVALID_BODY')
  }

  const now = nowIso()
  const statements: D1PreparedStatement[] = []

  for (const item of body.items) {
    if (!item.status_name) {
      return jsonError('Each item requires status_name', 'INVALID_BODY')
    }

    if (item.status_id) {
      const existing = await context.env.DB.prepare(`SELECT status_name FROM status_master WHERE status_id = ?`)
        .bind(item.status_id)
        .first<{ status_name: string }>()

      statements.push(
        context.env.DB.prepare(
          `UPDATE status_master SET status_name = ?, sort_order = ?, progress_percent = ?, updated_at = ? WHERE status_id = ?`
        ).bind(item.status_name, item.sort_order ?? null, item.progress_percent ?? null, now, item.status_id)
      )

      if (existing && existing.status_name !== item.status_name) {
        statements.push(
          context.env.DB.prepare(`UPDATE drawings SET ${column} = ? WHERE ${column} = ?`).bind(
            item.status_name,
            existing.status_name
          )
        )
      }
    } else {
      statements.push(
        context.env.DB.prepare(
          `INSERT INTO status_master (status_id, status_group, status_name, sort_order, progress_percent, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          generateId('STM'),
          body.status_group,
          item.status_name,
          item.sort_order ?? null,
          item.progress_percent ?? null,
          now,
          now
        )
      )
    }
  }

  if (statements.length > 0) {
    await context.env.DB.batch(statements)
  }
  await writeAuditLog(context.env.DB, {
    entityType: 'status_master',
    entityId: body.status_group,
    action: 'update',
    after: { count: body.items.length },
  })

  return Response.json({ updated: body.items.length })
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const statusId = new URL(context.request.url).searchParams.get('status_id')
  if (!statusId) {
    return jsonError('status_id query parameter is required', 'INVALID_BODY')
  }

  const row = await context.env.DB.prepare(`SELECT status_group, status_name FROM status_master WHERE status_id = ?`)
    .bind(statusId)
    .first<{ status_group: string; status_name: string }>()

  if (!row) {
    return jsonError('Status not found', 'NOT_FOUND', 404)
  }

  const column = GROUP_COLUMN[row.status_group]
  if (column) {
    const usage = await context.env.DB.prepare(`SELECT COUNT(*) AS count FROM drawings WHERE ${column} = ?`)
      .bind(row.status_name)
      .first<{ count: number }>()
    if ((usage?.count ?? 0) > 0) {
      return jsonError('この値は使用中のため削除できません', 'IN_USE', 409)
    }
  }

  await context.env.DB.prepare(`DELETE FROM status_master WHERE status_id = ?`).bind(statusId).run()
  await writeAuditLog(context.env.DB, {
    entityType: 'status_master',
    entityId: statusId,
    action: 'delete',
  })

  return new Response(null, { status: 204 })
}
