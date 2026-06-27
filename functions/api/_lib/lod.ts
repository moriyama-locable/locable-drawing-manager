export type LodJudgement = '不要' | '不足' | 'OK' | '過剰'

export function judgeLod(requiredLod: number, currentLod: number): LodJudgement {
  if (requiredLod === 0) return '不要'
  if (currentLod < requiredLod) return '不足'
  if (currentLod === requiredLod) return 'OK'
  return '過剰'
}

export function nextActionForLod(judgement: LodJudgement): string {
  switch (judgement) {
    case '不要':
      return '着手しない'
    case '不足':
      return 'LODを上げる'
    case 'OK':
      return '確認・ロック判断'
    case '過剰':
      return 'これ以上触らない'
  }
}
