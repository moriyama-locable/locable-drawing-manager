const PALETTE = [
  { bg: '#e3f5e8', color: '#1f8a4c' },
  { bg: '#e6f0fb', color: '#2563a8' },
  { bg: '#fdeae6', color: '#c0432a' },
  { bg: '#fdf3da', color: '#a87a09' },
  { bg: '#f1e7fb', color: '#7a3fb0' },
  { bg: '#e6f6f6', color: '#2a8a8a' },
  { bg: '#fbe7f1', color: '#b03a78' },
  { bg: '#eef0f3', color: '#5a6270' },
]

const NECESSITY_COLORS: Record<string, { bg: string; color: string }> = {
  必須: { bg: '#fdeae6', color: '#c0432a' },
  任意: { bg: '#e6f0fb', color: '#2563a8' },
  不要: { bg: '#eef0f3', color: '#5a6270' },
}

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 997
  }
  return hash
}

export function getTagColor(value: string): { bg: string; color: string } {
  if (NECESSITY_COLORS[value]) return NECESSITY_COLORS[value]
  return PALETTE[hashString(value) % PALETTE.length]
}
