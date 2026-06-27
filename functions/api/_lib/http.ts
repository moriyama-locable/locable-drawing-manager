export function jsonError(message: string, code: string, status = 400): Response {
  return Response.json({ message, code }, { status })
}

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}
