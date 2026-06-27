import { useEffect, useState } from 'react'
import { fetchDrawingDetail } from '../api/client'
import type { ChangeItem, Drawing } from '../types'
import LodBadge from './LodBadge'

interface DrawingDetailModalProps {
  drawingId: string
  onClose: () => void
}

function DrawingDetailModal({ drawingId, onClose }: DrawingDetailModalProps) {
  const [drawing, setDrawing] = useState<Drawing | null>(null)
  const [relatedChanges, setRelatedChanges] = useState<ChangeItem[]>([])
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}>
          閉じる
        </button>
        {error && <p className="error-text">{error}</p>}
        {!error && !drawing && <p>読み込み中...</p>}
        {drawing && (
          <>
            <h2>
              {drawing.drawing_no} {drawing.drawing_name}
            </h2>

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
      </div>
    </div>
  )
}

export default DrawingDetailModal
