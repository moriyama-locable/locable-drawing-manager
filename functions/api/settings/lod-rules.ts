import type { Env } from '../_lib/types'
import { generateId, jsonError, nowIso, writeAuditLog } from '../_lib/http'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB.prepare(
    `SELECT * FROM lod_rules ORDER BY phase_code ASC, drawing_type ASC`
  ).all()

  return Response.json({ lod_rules: results })
}

interface LodRuleInput {
  rule_id?: string
  phase_code: string
  drawing_type: string
  required_lod: number
  necessity: string
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const body = await context.request.json<{ lod_rules?: LodRuleInput[] }>()

  if (!Array.isArray(body.lod_rules)) {
    return jsonError('lod_rules must be an array', 'INVALID_BODY')
  }

  const now = nowIso()

  try {
    const statements = body.lod_rules.map((rule) => {
      if (!rule.phase_code || !rule.drawing_type || rule.required_lod === undefined || !rule.necessity) {
        throw new Error('Each rule requires phase_code, drawing_type, required_lod and necessity')
      }
      const ruleId = rule.rule_id ?? generateId('LOD')
      return context.env.DB.prepare(
        `INSERT INTO lod_rules (rule_id, phase_code, drawing_type, required_lod, necessity, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(rule_id) DO UPDATE SET
           phase_code = excluded.phase_code,
           drawing_type = excluded.drawing_type,
           required_lod = excluded.required_lod,
           necessity = excluded.necessity,
           updated_at = excluded.updated_at`
      ).bind(ruleId, rule.phase_code, rule.drawing_type, rule.required_lod, rule.necessity, now, now)
    })

    await context.env.DB.batch(statements)
    await writeAuditLog(context.env.DB, {
      entityType: 'lod_rules',
      entityId: 'bulk',
      action: 'update',
      after: { count: statements.length },
    })
    return Response.json({ updated: statements.length })
  } catch {
    return jsonError('Invalid lod_rules payload', 'INVALID_BODY')
  }
}
