import type { Drawing } from '../types'
import LodBadge from './LodBadge'

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
            <LodBadge judgement={drawing.lod_judgement} />
          </div>
          <div className="drawing-card-name">{drawing.drawing_name}</div>
          <div className="drawing-card-meta">
            <span>{drawing.drawing_type}</span>
            <span>{drawing.status}</span>
          </div>
          <div className="drawing-card-meta">
            <span>LOD {drawing.current_lod} / {drawing.required_lod}</span>
            {drawing.has_change_alert ? <span className="alert-tag">影響あり</span> : null}
          </div>
        </button>
      ))}
    </div>
  )
}

export default DrawingCardView
