export function jsonError(message: string, code: string, status = 400): Response {
  return Response.json({ message, code }, { status })
}

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

export async function writeAuditLog(
  db: D1Database,
  entry: {
    entityType: string
    entityId: string
    action: string
    changedBy?: string | null
    before?: unknown
    after?: unknown
  }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO audit_logs (log_id, entity_type, entity_id, action, changed_by, before_data, after_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      generateId('LOG'),
      entry.entityType,
      entry.entityId,
      entry.action,
      entry.changedBy ?? null,
      entry.before !== undefined ? JSON.stringify(entry.before) : null,
      entry.after !== undefined ? JSON.stringify(entry.after) : null,
      nowIso()
    )
    .run()
}
