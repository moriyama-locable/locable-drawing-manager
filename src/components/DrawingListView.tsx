import type { Drawing } from '../types'
import LodBadge from './LodBadge'

interface DrawingListViewProps {
  drawings: Drawing[]
  onOpenDetail: (drawingId: string) => void
}

function DrawingListView({ drawings, onOpenDetail }: DrawingListViewProps) {
  return (
    <table className="drawing-table">
      <thead>
        <tr>
          <th>図面番号</th>
          <th>図面名称</th>
          <th>種別</th>
          <th>必要性</th>
          <th>必要LOD</th>
          <th>現在LOD</th>
          <th>LOD判定</th>
          <th>ステータス</th>
          <th>ロック状態</th>
          <th>期限</th>
          <th>影響警告</th>
          <th>次アクション</th>
        </tr>
      </thead>
      <tbody>
        {drawings.map((drawing) => (
          <tr key={drawing.drawing_id}>
            <td>
              <button type="button" className="link-button" onClick={() => onOpenDetail(drawing.drawing_id)}>
                {drawing.drawing_no}
              </button>
            </td>
            <td>
              <button type="button" className="link-button" onClick={() => onOpenDetail(drawing.drawing_id)}>
                {drawing.drawing_name}
              </button>
            </td>
            <td>{drawing.drawing_type}</td>
            <td>{drawing.necessity}</td>
            <td>{drawing.required_lod}</td>
            <td>{drawing.current_lod}</td>
            <td>
              <LodBadge judgement={drawing.lod_judgement} />
            </td>
            <td>{drawing.status}</td>
            <td>{drawing.lock_status}</td>
            <td>{drawing.final_deadline ?? '-'}</td>
            <td>{drawing.has_change_alert ? <span className="alert-tag">影響あり</span> : 'なし'}</td>
            <td>{drawing.next_action ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default DrawingListView
