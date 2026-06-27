import type { Env } from '../_lib/types'
import { jsonError, nowIso } from '../_lib/http'
import { judgeLod, nextActionForLod } from '../_lib/lod'

interface DrawingRow {
  drawing_id: string
  project_id: string
  required_lod: number
  current_lod: number
}

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

const PATCHABLE_FIELDS = [
  'drawing_no',
  'drawing_name',
  'drawing_type',
  'necessity',
  'required_lod',
  'current_lod',
  'status',
  'lock_status',
  'approval_status',
  'assignee',
  'first_submit_date',
  'review_deadline',
  'final_deadline',
  'drive_pdf_url',
  'drive_source_url',
  'version',
  'priority_score',
  'next_action',
  'notes',
] as const

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const drawingId = context.params.drawingId as string
  const body = await context.request.json<Record<string, unknown>>()

  const existing = await context.env.DB.prepare(
    `SELECT drawing_id, project_id, required_lod, current_lod FROM drawings WHERE drawing_id = ?`
  )
    .bind(drawingId)
    .first<DrawingRow>()

  if (!existing) {
    return jsonError('Drawing not found', 'NOT_FOUND', 404)
  }

  const updates = PATCHABLE_FIELDS.filter((field) => field in body)
  if (updates.length === 0) {
    return jsonError('No updatable fields provided', 'INVALID_BODY')
  }

  const requiredLod = (body.required_lod as number | undefined) ?? existing.required_lod
  const currentLod = (body.current_lod as number | undefined) ?? existing.current_lod
  const judgement = judgeLod(requiredLod, currentLod)
  const nextAction = (body.next_action as string | undefined) ?? nextActionForLod(judgement)

  const fields = new Set([...updates, 'lod_judgement', 'next_action'])
  const setClause = [...fields].map((field) => `${field} = ?`).join(', ')
  const values = [...fields].map((field) => {
    if (field === 'lod_judgement') return judgement
    if (field === 'next_action') return nextAction
    return body[field]
  })

  await context.env.DB.prepare(
    `UPDATE drawings SET ${setClause}, updated_at = ? WHERE drawing_id = ?`
  )
    .bind(...values, nowIso(), drawingId)
    .run()

  return Response.json({ drawing_id: drawingId, lod_judgement: judgement })
}
