import { useEffect, useState } from 'react'
import { createDrawing, fetchLodDefinitions, fetchStatusMaster } from '../api/client'
import type { LodDefinition } from '../types'

interface DrawingCreateFormProps {
  projectId: string
  onCreated: () => void
}

function DrawingCreateForm({ projectId, onCreated }: DrawingCreateFormProps) {
  const [drawingNo, setDrawingNo] = useState('')
  const [drawingName, setDrawingName] = useState('')
  const [necessity, setNecessity] = useState('任意')
  const [lod, setLod] = useState(0)
  const [status, setStatus] = useState('')
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lodOptions, setLodOptions] = useState<LodDefinition[]>([])
  const [statusOptions, setStatusOptions] = useState<string[]>([])

  useEffect(() => {
    fetchLodDefinitions()
      .then((data) => setLodOptions(data.lod_definitions))
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
    if (!drawingNo || !drawingName || !status) return
    try {
      await createDrawing(projectId, {
        drawing_no: drawingNo,
        drawing_name: drawingName,
        necessity,
        lod,
        status,
        deadline: deadline || undefined,
      })
      setDrawingNo('')
      setDrawingName('')
      setDeadline('')
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
      <select value={necessity} onChange={(e) => setNecessity(e.target.value)}>
        <option value="必須">必須</option>
        <option value="任意">任意</option>
        <option value="不要">不要</option>
      </select>
      <select value={lod} onChange={(e) => setLod(Number(e.target.value))}>
        <option value={0}>LOD0 未着手</option>
        {lodOptions.map((l) => (
          <option key={l.lod_level} value={l.lod_level}>
            {l.lod_name} {l.description}
          </option>
        ))}
      </select>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        {statusOptions.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      <button type="button" onClick={handleCreate}>
        + 図面を追加
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  )
}

export default DrawingCreateForm
