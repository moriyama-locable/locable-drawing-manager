import { useEffect, useState } from 'react'
import {
  deleteDrawingType,
  deleteStatusMasterItem,
  fetchDrawingTypes,
  fetchLodRules,
  fetchStatusMaster,
  saveDrawingTypes,
  saveLodRules,
  saveStatusMaster,
} from '../api/client'
import type { DrawingTypeOption, LodRule, StatusMasterItem } from '../types'

interface DrawingTypeRow {
  drawing_type: string
  original_drawing_type?: string
  sort_order: number | null
}

function drawingTypeToRow(opt: DrawingTypeOption): DrawingTypeRow {
  return { drawing_type: opt.drawing_type, original_drawing_type: opt.drawing_type, sort_order: opt.sort_order }
}

interface StatusRow {
  status_id?: string
  status_name: string
  sort_order: number | null
  progress_percent: number | null
}

function statusItemToRow(item: StatusMasterItem): StatusRow {
  return {
    status_id: item.status_id,
    status_name: item.status_name,
    sort_order: item.sort_order,
    progress_percent: item.progress_percent,
  }
}

function DrawingTypePanel() {
  const [rows, setRows] = useState<DrawingTypeRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function load() {
    fetchDrawingTypes()
      .then((data) => setRows(data.drawing_types.map(drawingTypeToRow)))
      .catch((err: Error) => setError(err.message))
  }

  useEffect(load, [])

  function updateRow(index: number, patch: Partial<DrawingTypeRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function addRow() {
    setRows((prev) => [...prev, { drawing_type: '', sort_order: prev.length }])
  }

  async function removeRow(index: number) {
    const row = rows[index]
    if (!row.original_drawing_type) {
      setRows((prev) => prev.filter((_, i) => i !== index))
      return
    }
    setError(null)
    try {
      await deleteDrawingType(row.original_drawing_type)
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await saveDrawingTypes(
        rows
          .filter((row) => row.drawing_type)
          .map((row) => ({
            drawing_type: row.drawing_type,
            original_drawing_type: row.original_drawing_type,
            sort_order: row.sort_order ?? undefined,
          }))
      )
      load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h2>図面種別管理</h2>
      {error && <p className="error-text">{error}</p>}
      <table className="drawing-table">
        <thead>
          <tr>
            <th>図面種別</th>
            <th>並び順</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.original_drawing_type ?? `new-${index}`}>
              <td>
                <input
                  value={row.drawing_type}
                  onChange={(e) => updateRow(index, { drawing_type: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={row.sort_order ?? ''}
                  onChange={(e) => updateRow(index, { sort_order: e.target.value ? Number(e.target.value) : null })}
                />
              </td>
              <td>
                <button type="button" className="link-button" onClick={() => removeRow(index)}>
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="settings-actions">
        <button type="button" onClick={addRow}>
          種別を追加
        </button>
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </section>
  )
}

function StatusMasterPanel({
  group,
  title,
  showProgress,
}: {
  group: 'drawing' | 'lock'
  title: string
  showProgress: boolean
}) {
  const [rows, setRows] = useState<StatusRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function load() {
    fetchStatusMaster(group)
      .then((data) => setRows(data.status_master.map(statusItemToRow)))
      .catch((err: Error) => setError(err.message))
  }

  useEffect(load, [])

  function updateRow(index: number, patch: Partial<StatusRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  function addRow() {
    setRows((prev) => [...prev, { status_name: '', sort_order: prev.length, progress_percent: 0 }])
  }

  async function removeRow(index: number) {
    const row = rows[index]
    if (!row.status_id) {
      setRows((prev) => prev.filter((_, i) => i !== index))
      return
    }
    setError(null)
    try {
      await deleteStatusMasterItem(row.status_id)
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await saveStatusMaster(
        group,
        rows
          .filter((row) => row.status_name)
          .map((row) => ({
            status_id: row.status_id,
            status_name: row.status_name,
            sort_order: row.sort_order ?? undefined,
            progress_percent: row.progress_percent ?? undefined,
          }))
      )
      load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <h2>{title}</h2>
      {error && <p className="error-text">{error}</p>}
      <table className="drawing-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>並び順</th>
            {showProgress && <th>進捗(%)</th>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.status_id ?? `new-${index}`}>
              <td>
                <input
                  value={row.status_name}
                  onChange={(e) => updateRow(index, { status_name: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={row.sort_order ?? ''}
                  onChange={(e) => updateRow(index, { sort_order: e.target.value ? Number(e.target.value) : null })}
                />
              </td>
              {showProgress && (
                <td>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={row.progress_percent ?? ''}
                    onChange={(e) =>
                      updateRow(index, { progress_percent: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </td>
              )}
              <td>
                <button type="button" className="link-button" onClick={() => removeRow(index)}>
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="settings-actions">
        <button type="button" onClick={addRow}>
          項目を追加
        </button>
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </section>
  )
}

function SettingsPage() {
  const [rules, setRules] = useState<LodRule[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchLodRules()
      .then((data) => setRules(data.lod_rules))
      .catch((err: Error) => setError(err.message))
  }, [])

  function updateRule(index: number, patch: Partial<LodRule>) {
    setRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)))
  }

  function addRule() {
    setRules((prev) => [...prev, { phase_code: '', drawing_type: '', required_lod: 0, necessity: '必須' }])
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await saveLodRules(rules)
      const data = await fetchLodRules()
      setRules(data.lod_rules)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h1>設定</h1>
      <p>フェーズ × 図面種別ごとの必要LODを管理します。</p>
      {error && <p className="error-text">{error}</p>}

      <div className="settings-actions">
        <a className="button-link" href="/manual.html" target="_blank" rel="noopener noreferrer">
          セットアップマニュアルを開く
        </a>
      </div>

      <table className="drawing-table">
        <thead>
          <tr>
            <th>フェーズコード</th>
            <th>図面種別</th>
            <th>必要LOD</th>
            <th>必要性</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule, index) => (
            <tr key={rule.rule_id ?? `new-${index}`}>
              <td>
                <input
                  value={rule.phase_code}
                  onChange={(e) => updateRule(index, { phase_code: e.target.value })}
                />
              </td>
              <td>
                <input
                  value={rule.drawing_type}
                  onChange={(e) => updateRule(index, { drawing_type: e.target.value })}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  max={6}
                  value={rule.required_lod}
                  onChange={(e) => updateRule(index, { required_lod: Number(e.target.value) })}
                />
              </td>
              <td>
                <select
                  value={rule.necessity}
                  onChange={(e) => updateRule(index, { necessity: e.target.value as LodRule['necessity'] })}
                >
                  <option value="必須">必須</option>
                  <option value="任意">任意</option>
                  <option value="不要">不要</option>
                </select>
              </td>
              <td>
                <button type="button" className="link-button" onClick={() => removeRule(index)}>
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="settings-actions">
        <button type="button" onClick={addRule}>
          ルールを追加
        </button>
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      <DrawingTypePanel />
      <StatusMasterPanel group="drawing" title="図面ステータス管理" showProgress />
      <StatusMasterPanel group="lock" title="ロック状態管理" showProgress={false} />
    </div>
  )
}

export default SettingsPage
