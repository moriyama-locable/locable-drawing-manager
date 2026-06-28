import { getTagColor } from '../lib/tagColors'

interface TagBadgeProps {
  value: string
}

function TagBadge({ value }: TagBadgeProps) {
  const { bg, color } = getTagColor(value)
  return (
    <span className="tag-badge" style={{ background: bg, color }}>
      {value}
    </span>
  )
}

export default TagBadge
