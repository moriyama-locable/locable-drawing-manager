import { useEffect, useState } from 'react'
import { fetchDrawingDetail, fetchDrawingTypes, fetchStatusMaster, updateDrawing } from '../api/client'
import type { ChangeItem, Drawing } from '../types'
import LodBadge from './LodBadge'

interface DrawingDetailModalProps {
  drawingId: string
  onClose: () => void
  variant?: 'modal' | 'panel'
}

type EditableDrawing = Pick<
  Drawing,
  | 'drawing_type'
  | 'necessity'
  | 'required_lod'
  | 'current_lod'
  | 'status'
  | 'lock_status'
  | 'approval_status'
  | 'assignee'
  | 'review_deadline'
  | 'final_deadline'
  | 'drive_pdf_url'
  | 'drive_source_url'
  | 'notes'
>

function toForm(drawing: Drawing): EditableDrawing {
  return {
    drawing_type: drawing.drawing_type,
    necessity: drawing.necessity,
    required_lod: drawing.required_lod,
    current_lod: drawing.current_lod,
    status: drawing.status,
    lock_status: drawing.lock_status,
    approval_status: drawing.approval_status,
    assignee: drawing.assignee,
    review_deadline: drawing.review_deadline,
    final_deadline: drawing.final_deadline,
    drive_pdf_url: drawing.drive_pdf_url,
    drive_source_url: drawing.drive_source_url,
    notes: drawing.notes,
  }
}

function DrawingDetailModal({ drawingId, onClose, variant = 'modal' }: DrawingDetailModalProps) {
  const [drawing, setDrawing] = useState<Drawing | null>(null)
  const [relatedChanges, setRelatedChanges] = useState<ChangeItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<EditableDrawing | null>(null)
  const [saving, setSaving] = useState(false)
  const [drawingTypeOptions, setDrawingTypeOptions] = useState<string[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])
  const [lockStatusOptions, setLockStatusOptions] = useState<string[]>([])

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
    fetchDrawingTypes()
      .then((data) => setDrawingTypeOptions(data.drawing_types.map((t) => t.drawing_type)))
      .catch(() => {})
    fetchStatusMaster('drawing')
      .then((data) => setStatusOptions(data.status_master.map((s) => s.status_name)))
      .catch(() => {})
    fetchStatusMaster('lock')
      .then((data) => setLockStatusOptions(data.status_master.map((s) => s.status_name)))
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
                <dt>図面種別</dt>
                <dd>{drawing.drawing_type}</dd>
                <dt>必要性</dt>
                <dd>{drawing.necessity}</dd>
                <dt>必要LOD</dt>
                <dd>{drawing.required_lod}</dd>
                <dt>現在LOD</dt>
                <dd>{drawing.current_lod}</dd>
                <dt>LOD判定</dt>
                <dd>
                  <LodBadge judgement={drawing.lod_judgement} />
                </dd>
              </dl>
            </section>

            <section>
              <h3>進捗情報</h3>
              <dl className="detail-grid">
                <dt>ステータス</dt>
                <dd>{drawing.status}</dd>
                <dt>ロック状態</dt>
                <dd>{drawing.lock_status}</dd>
                <dt>承認状態</dt>
                <dd>{drawing.approval_status ?? '-'}</dd>
                <dt>担当者</dt>
                <dd>{drawing.assignee ?? '-'}</dd>
                <dt>確認期限</dt>
                <dd>{drawing.review_deadline ?? '-'}</dd>
                <dt>確定期限</dt>
                <dd>{drawing.final_deadline ?? '-'}</dd>
              </dl>
            </section>

            <section>
              <h3>Driveリンク</h3>
              <dl className="detail-grid">
                <dt>最新PDF</dt>
                <dd>
                  {drawing.drive_pdf_url ? (
                    <a href={drawing.drive_pdf_url} target="_blank" rel="noreferrer">
                      開く
                    </a>
                  ) : (
                    '-'
                  )}
                </dd>
                <dt>作業元ファイル</dt>
                <dd>
                  {drawing.drive_source_url ? (
                    <a href={drawing.drive_source_url} target="_blank" rel="noreferrer">
                      開く
                    </a>
                  ) : (
                    '-'
                  )}
                </dd>
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

            <section>
              <h3>備考</h3>
              <p>{drawing.notes ?? '-'}</p>
              <p>次アクション: {drawing.next_action ?? '-'}</p>
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
                <dt>図面種別</dt>
                <dd>
                  <select value={form.drawing_type} onChange={(e) => updateField('drawing_type', e.target.value)}>
                    {!drawingTypeOptions.includes(form.drawing_type) && (
                      <option value={form.drawing_type}>{form.drawing_type}</option>
                    )}
                    {drawingTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </dd>
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
                <dt>必要LOD</dt>
                <dd>
                  <input
                    type="number"
                    value={form.required_lod}
                    onChange={(e) => updateField('required_lod', Number(e.target.value))}
                  />
                </dd>
                <dt>現在LOD</dt>
                <dd>
                  <input
                    type="number"
                    value={form.current_lod}
                    onChange={(e) => updateField('current_lod', Number(e.target.value))}
                  />
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
                <dt>ロック状態</dt>
                <dd>
                  <select value={form.lock_status} onChange={(e) => updateField('lock_status', e.target.value)}>
                    {!lockStatusOptions.includes(form.lock_status) && (
                      <option value={form.lock_status}>{form.lock_status}</option>
                    )}
                    {lockStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </dd>
                <dt>承認状態</dt>
                <dd>
                  <input
                    value={form.approval_status ?? ''}
                    onChange={(e) => updateField('approval_status', e.target.value || null)}
                  />
                </dd>
                <dt>担当者</dt>
                <dd>
                  <input
                    value={form.assignee ?? ''}
                    onChange={(e) => updateField('assignee', e.target.value || null)}
                  />
                </dd>
                <dt>確認期限</dt>
                <dd>
                  <input
                    type="date"
                    value={form.review_deadline ?? ''}
                    onChange={(e) => updateField('review_deadline', e.target.value || null)}
                  />
                </dd>
                <dt>確定期限</dt>
                <dd>
                  <input
                    type="date"
                    value={form.final_deadline ?? ''}
                    onChange={(e) => updateField('final_deadline', e.target.value || null)}
                  />
                </dd>
              </dl>
            </section>

            <section>
              <h3>Driveリンク</h3>
              <dl className="detail-grid">
                <dt>最新PDF</dt>
                <dd>
                  <input
                    value={form.drive_pdf_url ?? ''}
                    onChange={(e) => updateField('drive_pdf_url', e.target.value || null)}
                  />
                </dd>
                <dt>作業元ファイル</dt>
                <dd>
                  <input
                    value={form.drive_source_url ?? ''}
                    onChange={(e) => updateField('drive_source_url', e.target.value || null)}
                  />
                </dd>
              </dl>
            </section>

            <section>
              <h3>備考</h3>
              <textarea
                value={form.notes ?? ''}
                onChange={(e) => updateField('notes', e.target.value || null)}
              />
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
