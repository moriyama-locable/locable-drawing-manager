import type { Drawing } from '../types'
import TagBadge from './TagBadge'

interface DrawingCardViewProps {
  drawings: Drawing[]
  onOpenDetail: (drawingId: string) => void
}

function DrawingCardView({ drawings, onOpenDetail }: DrawingCardViewProps) {
  return (
    <div className="drawing-card-grid">
      {drawings.map((drawing) => (
        <button
          type="button"
          key={drawing.drawing_id}
          className="drawing-card"
          onClick={() => onOpenDetail(drawing.drawing_id)}
        >
          <div className="drawing-card-header">
            <span className="drawing-card-no">{drawing.drawing_no}</span>
            <span>LOD {drawing.lod}</span>
          </div>
          <div className="drawing-card-name">{drawing.drawing_name}</div>
          <div className="drawing-card-meta">
            <TagBadge value={drawing.drawing_type} />
            <TagBadge value={drawing.necessity} />
            <TagBadge value={drawing.status} />
          </div>
          <div className="drawing-card-meta">
            <span>期限: {drawing.deadline ?? '-'}</span>
          </div>
        </button>
      ))}
    </div>
  )
}

export default DrawingCardView
