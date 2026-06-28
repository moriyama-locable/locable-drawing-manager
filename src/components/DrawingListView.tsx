import type { Drawing } from '../types'
import LodBadge from './LodBadge'

export type DrawingSortKey =
  | 'drawing_no'
  | 'drawing_name'
  | 'drawing_type'
  | 'necessity'
  | 'required_lod'
  | 'current_lod'
  | 'lod_judgement'
  | 'status'
  | 'lock_status'
  | 'final_deadline'
  | 'has_change_alert'
  | 'next_action'

export type SortDirection = 'asc' | 'desc'

const COLUMNS: Array<{ key: DrawingSortKey; label: string }> = [
  { key: 'drawing_no', label: '図面番号' },
  { key: 'drawing_name', label: '図面名称' },
  { key: 'drawing_type', label: '種別' },
  { key: 'necessity', label: '必要性' },
  { key: 'required_lod', label: '必要LOD' },
  { key: 'current_lod', label: '現在LOD' },
  { key: 'lod_judgement', label: 'LOD判定' },
  { key: 'status', label: 'ステータス' },
  { key: 'lock_status', label: 'ロック状態' },
  { key: 'final_deadline', label: '期限' },
  { key: 'has_change_alert', label: '影響警告' },
  { key: 'next_action', label: '次アクション' },
]

interface DrawingListViewProps {
  drawings: Drawing[]
  onOpenDetail: (drawingId: string) => void
  onStatusChange?: (drawingId: string, status: string) => void
  onTypeChange?: (drawingId: string, drawingType: string) => void
  statusOptions?: string[]
  typeOptions?: string[]
  sortKey?: DrawingSortKey | null
  sortDirection?: SortDirection
  onSortChange?: (key: DrawingSortKey) => void
}

function DrawingListView({
  drawings,
  onOpenDetail,
  onStatusChange,
  onTypeChange,
  statusOptions = [],
  typeOptions = [],
  sortKey,
  sortDirection,
  onSortChange,
}: DrawingListViewProps) {
  return (
    <div className="table-scroll">
    <table className="drawing-table">
      <thead>
        <tr>
          {COLUMNS.map((column) => (
            <th key={column.key}>
              {onSortChange ? (
                <button
                  type="button"
                  className="th-sort-button"
                  onClick={() => onSortChange(column.key)}
                >
                  {column.label}
                  {sortKey === column.key && (
                    <span className="th-sort-arrow">{sortDirection === 'desc' ? ' ▼' : ' ▲'}</span>
                  )}
                </button>
              ) : (
                column.label
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {drawings.map((drawing) => {
          const noActionNeeded = drawing.lod_judgement === '不要' || drawing.lod_judgement === '過剰'
          return (
            <tr key={drawing.drawing_id} className={noActionNeeded ? 'row-no-action' : ''}>
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
              <td>
                {onTypeChange ? (
                  <select
                    className="status-select"
                    value={drawing.drawing_type}
                    onChange={(e) => onTypeChange(drawing.drawing_id, e.target.value)}
                  >
                    {!typeOptions.includes(drawing.drawing_type) && (
                      <option value={drawing.drawing_type}>{drawing.drawing_type}</option>
                    )}
                    {typeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                ) : (
                  drawing.drawing_type
                )}
              </td>
              <td>{drawing.necessity}</td>
              <td>{drawing.required_lod}</td>
              <td>{drawing.current_lod}</td>
              <td>
                <LodBadge judgement={drawing.lod_judgement} />
              </td>
              <td>
                {onStatusChange ? (
                  <select
                    className="status-select"
                    value={drawing.status}
                    onChange={(e) => onStatusChange(drawing.drawing_id, e.target.value)}
                  >
                    {!statusOptions.includes(drawing.status) && (
                      <option value={drawing.status}>{drawing.status}</option>
                    )}
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                ) : (
                  drawing.status
                )}
              </td>
              <td>
                <span className={drawing.lock_status === '編集可' ? 'lock-badge unlocked' : 'lock-badge locked'}>
                  {drawing.lock_status}
                </span>
              </td>
              <td>{drawing.final_deadline ?? '-'}</td>
              <td>{drawing.has_change_alert ? <span className="alert-tag">影響あり</span> : 'なし'}</td>
              <td>{noActionNeeded ? <span className="no-action-tag">対応不要</span> : drawing.next_action ?? '-'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
    </div>
  )
}

export default DrawingListView
