import { useEffect, useState } from 'react'
import { fetchDrawingDetail, updateDrawing } from '../api/client'
import type { ChangeItem, Drawing } from '../types'
import LodBadge from './LodBadge'

interface DrawingDetailModalProps {
  drawingId: string
  onClose: () => void
}

type EditableDrawing = Pick<
  Drawing,
  | 'drawing_type'
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

function DrawingDetailModal({ drawingId, onClose }: DrawingDetailModalProps) {
  const [drawing, setDrawing] = useState<Drawing | null>(null)
  const [relatedChanges, setRelatedChanges] = useState<ChangeItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<EditableDrawing | null>(null)
  const [saving, setSaving] = useState(false)

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}>
          閉じる
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
                  <input
                    value={form.drawing_type}
                    onChange={(e) => updateField('drawing_type', e.target.value)}
                  />
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
                  <input value={form.status} onChange={(e) => updateField('status', e.target.value)} />
                </dd>
                <dt>ロック状態</dt>
                <dd>
                  <input
                    value={form.lock_status}
                    onChange={(e) => updateField('lock_status', e.target.value)}
                  />
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
    </div>
  )
}

export default DrawingDetailModal
