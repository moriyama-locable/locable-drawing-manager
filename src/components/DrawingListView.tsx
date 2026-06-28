import { Fragment, useEffect, useRef, useState } from 'react'
import type { Drawing } from '../types'
import TagBadge from './TagBadge'

export type DrawingSortKey = 'drawing_no' | 'drawing_name' | 'necessity' | 'lod' | 'status' | 'deadline'

export type SortDirection = 'asc' | 'desc'

export type DrawingGroupKey = 'none' | 'status' | 'necessity'

const NECESSITY_OPTIONS = ['必須', '任意', '不要'] as const

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
  onFieldChange?: (drawingId: string, patch: Partial<Drawing>) => void
  statusOptions?: string[]
  sortKey?: DrawingSortKey | null
  sortDirection?: SortDirection
  onSortChange?: (key: DrawingSortKey) => void
  groupBy?: DrawingGroupKey
}

function EditableText({
  value,
  onCommit,
  placeholder,
}: {
  value: string
  onCommit: (next: string) => void
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(value)
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, value])

  function commit() {
    setEditing(false)
    if (draft !== value) onCommit(draft)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="cell-edit-input"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <button type="button" className="cell-edit-trigger" onClick={() => setEditing(true)}>
      {value || <span className="cell-edit-placeholder">{placeholder ?? '未入力'}</span>}
    </button>
  )
}

function EditableNumber({ value, onCommit }: { value: number; onCommit: (next: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(String(value))
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, value])

  function commit() {
    setEditing(false)
    const next = Number(draft)
    if (!Number.isNaN(next) && next !== value) onCommit(next)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        className="cell-edit-input cell-edit-input-narrow"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <button type="button" className="cell-edit-trigger" onClick={() => setEditing(true)}>
      {value}
    </button>
  )
}

function EditableDate({ value, onCommit }: { value: string | null; onCommit: (next: string | null) => void }) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="date"
        className="cell-edit-input"
        defaultValue={value ?? ''}
        onBlur={(e) => {
          setEditing(false)
          const next = e.target.value || null
          if (next !== value) onCommit(next)
        }}
      />
    )
  }

  return (
    <button type="button" className="cell-edit-trigger" onClick={() => setEditing(true)}>
      {value ?? <span className="cell-edit-placeholder">未設定</span>}
    </button>
  )
}

function EditableTag({
  value,
  options,
  onCommit,
}: {
  value: string
  options: string[]
  onCommit: (next: string) => void
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <select
        autoFocus
        className="cell-edit-select"
        value={value}
        onChange={(e) => {
          setEditing(false)
          if (e.target.value !== value) onCommit(e.target.value)
        }}
        onBlur={() => setEditing(false)}
      >
        {!options.includes(value) && <option value={value}>{value}</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }

  return (
    <button type="button" className="cell-edit-tag-trigger" onClick={() => setEditing(true)}>
      <TagBadge value={value} />
    </button>
  )
}

function DrawingRow({
  drawing,
  onOpenDetail,
  onFieldChange,
  statusOptions,
}: {
  drawing: Drawing
  onOpenDetail: (drawingId: string) => void
  onFieldChange?: (drawingId: string, patch: Partial<Drawing>) => void
  statusOptions: string[]
}) {
  return (
    <tr>
      <td>
        {onFieldChange ? (
          <EditableText
            value={drawing.drawing_no}
            onCommit={(next) => onFieldChange(drawing.drawing_id, { drawing_no: next })}
          />
        ) : (
          <button type="button" className="link-button" onClick={() => onOpenDetail(drawing.drawing_id)}>
            {drawing.drawing_no}
          </button>
        )}
      </td>
      <td>
        {onFieldChange ? (
          <EditableText
            value={drawing.drawing_name}
            onCommit={(next) => onFieldChange(drawing.drawing_id, { drawing_name: next })}
          />
        ) : (
          <button type="button" className="link-button" onClick={() => onOpenDetail(drawing.drawing_id)}>
            {drawing.drawing_name}
          </button>
        )}
      </td>
      <td>
        {onFieldChange ? (
          <EditableTag
            value={drawing.necessity}
            options={[...NECESSITY_OPTIONS]}
            onCommit={(next) =>
              onFieldChange(drawing.drawing_id, { necessity: next as Drawing['necessity'] })
            }
          />
        ) : (
          <TagBadge value={drawing.necessity} />
        )}
      </td>
      <td>
        {onFieldChange ? (
          <EditableNumber
            value={drawing.lod}
            onCommit={(next) => onFieldChange(drawing.drawing_id, { lod: next })}
          />
        ) : (
          drawing.lod
        )}
      </td>
      <td>
        {onFieldChange ? (
          <EditableTag
            value={drawing.status}
            options={statusOptions}
            onCommit={(next) => onFieldChange(drawing.drawing_id, { status: next })}
          />
        ) : (
          <TagBadge value={drawing.status} />
        )}
      </td>
      <td>
        {onFieldChange ? (
          <EditableDate
            value={drawing.deadline}
            onCommit={(next) => onFieldChange(drawing.drawing_id, { deadline: next })}
          />
        ) : (
          drawing.deadline ?? '-'
        )}
      </td>
      <td>
        <button type="button" className="link-button" onClick={() => onOpenDetail(drawing.drawing_id)}>
          詳細
        </button>
      </td>
    </tr>
  )
}

function DrawingListView({
  drawings,
  onOpenDetail,
  onFieldChange,
  statusOptions = [],
  sortKey,
  sortDirection,
  onSortChange,
  groupBy = 'none',
}: DrawingListViewProps) {
  const groups: Array<{ key: string; label: string; rows: Drawing[] }> =
    groupBy === 'none'
      ? [{ key: 'all', label: '', rows: drawings }]
      : Array.from(
          drawings.reduce((map, drawing) => {
            const groupValue = groupBy === 'status' ? drawing.status : drawing.necessity
            const existing = map.get(groupValue) ?? []
            existing.push(drawing)
            map.set(groupValue, existing)
            return map
          }, new Map<string, Drawing[]>())
        ).map(([key, rows]) => ({ key, label: key, rows }))

  return (
    <div className="table-scroll">
      <table className="drawing-table">
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column.key}>
                {onSortChange ? (
                  <button type="button" className="th-sort-button" onClick={() => onSortChange(column.key)}>
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.key}>
              {groupBy !== 'none' && (
                <tr key={`group-${group.key}`} className="drawing-table-group-row">
                  <td colSpan={COLUMNS.length + 1}>
                    <TagBadge value={group.label} />
                    <span className="drawing-table-group-count">{group.rows.length}件</span>
                  </td>
                </tr>
              )}
              {group.rows.map((drawing) => (
                <DrawingRow
                  key={drawing.drawing_id}
                  drawing={drawing}
                  onOpenDetail={onOpenDetail}
                  onFieldChange={onFieldChange}
                  statusOptions={statusOptions}
                />
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DrawingListView
