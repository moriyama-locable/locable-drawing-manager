import { useEffect, useState } from 'react'
import { fetchDrawingDetail, fetchLodDefinitions, fetchStatusMaster, updateDrawing } from '../api/client'
import type { ChangeItem, Drawing, LodDefinition } from '../types'

interface DrawingDetailModalProps {
  drawingId: string
  onClose: () => void
  variant?: 'modal' | 'panel'
}

type EditableDrawing = Pick<Drawing, 'necessity' | 'lod' | 'status' | 'deadline'>

function toForm(drawing: Drawing): EditableDrawing {
  return {
    necessity: drawing.necessity,
    lod: drawing.lod,
    status: drawing.status,
    deadline: drawing.deadline,
  }
}

function DrawingDetailModal({ drawingId, onClose, variant = 'modal' }: DrawingDetailModalProps) {
  const [drawing, setDrawing] = useState<Drawing | null>(null)
  const [relatedChanges, setRelatedChanges] = useState<ChangeItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<EditableDrawing | null>(null)
  const [saving, setSaving] = useState(false)
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [lodOptions, setLodOptions] = useState<LodDefinition[]>([])

  useEffect(() => {
    let cancelled = false
    fetchDrawingDetail(drawingId)
      .then((data) => {
        if (cancelled) return
        setDrawing(data.drawing)
        setRelatedChanges(data.related_changes)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [drawingId])

  useEffect(() => {
    fetchStatusMaster('drawing')
      .then((data) => setStatusOptions(data.status_master.map((s) => s.status_name)))
      .catch(() => {})
    fetchLodDefinitions()
      .then((data) => setLodOptions(data.lod_definitions))
      .catch(() => {})
  }, [])

  function startEditing() {
    if (!drawing) return
    setForm(toForm(drawing))
    setIsEditing(true)
    setError(null)
  }

  function cancelEditing() {
    setIsEditing(false)
    setForm(null)
    setError(null)
  }

  function updateField<K extends keyof EditableDrawing>(key: K, value: EditableDrawing[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function handleSave() {
    if (!form) return
    setSaving(true)
    try {
      await updateDrawing(drawingId, form)
      const data = await fetchDrawingDetail(drawingId)
      setDrawing(data.drawing)
      setRelatedChanges(data.related_changes)
      setIsEditing(false)
      setForm(null)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const isPanel = variant === 'panel'
  const content = (
    <div
      className={isPanel ? 'detail-panel' : 'modal-panel'}
      onClick={isPanel ? undefined : (e) => e.stopPropagation()}
    >
      <button type="button" className="modal-close" onClick={onClose}>
        {isPanel ? '選択を解除' : '閉じる'}
      </button>
        {error && <p className="error-text">{error}</p>}
        {!error && !drawing && <p>読み込み中...</p>}
        {drawing && !isEditing && (
          <>
            <h2>
              {drawing.drawing_no} {drawing.drawing_name}
            </h2>
            <button type="button" onClick={startEditing}>
              編集する
            </button>

            <section>
              <h3>基本情報</h3>
              <dl className="detail-grid">
                <dt>必要性</dt>
                <dd>{drawing.necessity}</dd>
                <dt>LOD</dt>
                <dd>{drawing.lod}</dd>
              </dl>
            </section>

            <section>
              <h3>進捗情報</h3>
              <dl className="detail-grid">
                <dt>ステータス</dt>
                <dd>{drawing.status}</dd>
                <dt>期限</dt>
                <dd>{drawing.deadline ?? '-'}</dd>
              </dl>
            </section>

            <section>
              <h3>関連変更項目</h3>
              {relatedChanges.length === 0 ? (
                <p className="empty-hint">関連する変更項目はありません。</p>
              ) : (
                <ul className="related-change-list">
                  {relatedChanges.map((change) => (
                    <li key={change.link_id ?? change.change_id}>
                      <span>{change.change_reason}</span>
                      <span>{change.change_detail}</span>
                      <span>{change.sync_status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
        {drawing && isEditing && form && (
          <>
            <h2>
              {drawing.drawing_no} {drawing.drawing_name}
            </h2>

            <section>
              <h3>基本情報</h3>
              <dl className="detail-grid">
                <dt>必要性</dt>
                <dd>
                  <select
                    value={form.necessity}
                    onChange={(e) => updateField('necessity', e.target.value as EditableDrawing['necessity'])}
                  >
                    <option value="必須">必須</option>
                    <option value="任意">任意</option>
                    <option value="不要">不要</option>
                  </select>
                </dd>
                <dt>LOD</dt>
                <dd>
                  <select value={form.lod} onChange={(e) => updateField('lod', Number(e.target.value))}>
                    {!lodOptions.some((l) => l.lod_level === form.lod) && (
                      <option value={form.lod}>{form.lod}</option>
                    )}
                    {lodOptions.map((lod) => (
                      <option key={lod.lod_level} value={lod.lod_level}>
                        {lod.lod_name} {lod.description}
                      </option>
                    ))}
                  </select>
                </dd>
              </dl>
            </section>

            <section>
              <h3>進捗情報</h3>
              <dl className="detail-grid">
                <dt>ステータス</dt>
                <dd>
                  <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                    {!statusOptions.includes(form.status) && (
                      <option value={form.status}>{form.status}</option>
                    )}
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </dd>
                <dt>期限</dt>
                <dd>
                  <input
                    type="date"
                    value={form.deadline ?? ''}
                    onChange={(e) => updateField('deadline', e.target.value || null)}
                  />
                </dd>
              </dl>
            </section>

            <div className="modal-actions">
              <button type="button" onClick={handleSave} disabled={saving}>
                {saving ? '保存中...' : '保存する'}
              </button>
              <button type="button" onClick={cancelEditing} disabled={saving}>
                キャンセル
              </button>
            </div>
          </>
        )}
    </div>
  )

  if (isPanel) return content

  return (
    <div className="modal-overlay" onClick={onClose}>
      {content}
    </div>
  )
}

export default DrawingDetailModal
