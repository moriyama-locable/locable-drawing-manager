import { useState } from 'react'
import { createDrawing } from '../api/client'

interface DrawingCreateFormProps {
  projectId: string
  onCreated: () => void
}

function DrawingCreateForm({ projectId, onCreated }: DrawingCreateFormProps) {
  const [drawingNo, setDrawingNo] = useState('')
  const [drawingName, setDrawingName] = useState('')
  const [drawingType, setDrawingType] = useState('')
  const [necessity, setNecessity] = useState('任意')
  const [status, setStatus] = useState('未着手')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!drawingNo || !drawingName || !drawingType || !status) return
    try {
      await createDrawing(projectId, {
        drawing_no: drawingNo,
        drawing_name: drawingName,
        drawing_type: drawingType,
        necessity,
        status,
      })
      setDrawingNo('')
      setDrawingName('')
      setDrawingType('')
      setError(null)
      onCreated()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="change-form drawing-create-form">
      <input placeholder="図面番号" value={drawingNo} onChange={(e) => setDrawingNo(e.target.value)} />
      <input placeholder="図面名" value={drawingName} onChange={(e) => setDrawingName(e.target.value)} />
      <input placeholder="図面種別" value={drawingType} onChange={(e) => setDrawingType(e.target.value)} />
      <select value={necessity} onChange={(e) => setNecessity(e.target.value)}>
        <option value="必須">必須</option>
        <option value="任意">任意</option>
        <option value="不要">不要</option>
      </select>
      <input placeholder="状態" value={status} onChange={(e) => setStatus(e.target.value)} />
      <button type="button" onClick={handleCreate}>
        + 図面を追加
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}

export default DrawingCreateForm
