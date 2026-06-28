import type { Drawing } from '../types'

export type DrawingSortKey = 'drawing_no' | 'drawing_name' | 'necessity' | 'lod' | 'status' | 'deadline'

export type SortDirection = 'asc' | 'desc'

const COLUMNS: Array<{ key: DrawingSortKey; label: string }> = [
  { key: 'drawing_no', label: '図面番号' },
  { key: 'drawing_name', label: '図面名称' },
  { key: 'necessity', label: '必要性' },
  { key: 'lod', label: 'LOD' },
  { key: 'status', label: 'ステータス' },
  { key: 'deadline', label: '期限' },
]

interface DrawingListViewProps {
  drawings: Drawing[]
  onOpenDetail: (drawingId: string) => void
  onStatusChange?: (drawingId: string, status: string) => void
  statusOptions?: string[]
  sortKey?: DrawingSortKey | null
  sortDirection?: SortDirection
  onSortChange?: (key: DrawingSortKey) => void
}

function DrawingListView({
  drawings,
  onOpenDetail,
  onStatusChange,
  statusOptions = [],
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
            <td>{drawing.necessity}</td>
            <td>{drawing.lod}</td>
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
            <td>{drawing.deadline ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  )
}

export default DrawingListView
