import { useEffect, useState } from 'react'
import { createDrawing, fetchDrawingTypes, fetchStatusMaster } from '../api/client'

interface DrawingCreateFormProps {
  projectId: string
  onCreated: () => void
}

function DrawingCreateForm({ projectId, onCreated }: DrawingCreateFormProps) {
  const [drawingNo, setDrawingNo] = useState('')
  const [drawingName, setDrawingName] = useState('')
  const [drawingType, setDrawingType] = useState('')
  const [necessity, setNecessity] = useState('任意')
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [drawingTypeOptions, setDrawingTypeOptions] = useState<string[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])

  useEffect(() => {
    fetchDrawingTypes()
      .then((data) => {
        const types = data.drawing_types.map((t) => t.drawing_type)
        setDrawingTypeOptions(types)
        setDrawingType((prev) => prev || types[0] || '')
      })
      .catch(() => {})
    fetchStatusMaster('drawing')
      .then((data) => {
        const names = data.status_master.map((s) => s.status_name)
        setStatusOptions(names)
        setStatus((prev) => prev || names[0] || '')
      })
      .catch(() => {})
  }, [])

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
      <select value={drawingType} onChange={(e) => setDrawingType(e.target.value)}>
        {drawingTypeOptions.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <select value={necessity} onChange={(e) => setNecessity(e.target.value)}>
        <option value="必須">必須</option>
        <option value="任意">任意</option>
        <option value="不要">不要</option>
      </select>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        {statusOptions.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <button type="button" onClick={handleCreate}>
        + 図面を追加
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}

export default DrawingCreateForm
