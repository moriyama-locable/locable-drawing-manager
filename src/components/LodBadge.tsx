import type { LodJudgement } from '../types'

const CLASS_BY_JUDGEMENT: Record<LodJudgement, string> = {
  不足: 'lod-badge lod-shortage',
  OK: 'lod-badge lod-ok',
  過剰: 'lod-badge lod-excess',
  不要: 'lod-badge lod-na',
}

function LodBadge({ judgement }: { judgement: LodJudgement }) {
  return <span className={CLASS_BY_JUDGEMENT[judgement]}>{judgement}</span>
}

export default LodBadge
