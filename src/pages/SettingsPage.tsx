import { useEffect, useState } from 'react'
import {
  deleteDrawingType,
  deleteStatusMasterItem,
  fetchDrawingTypes,
  fetchLodDefinitions,
  fetchLodRules,
  fetchPhases,
  fetchStatusMaster,
  saveDrawingTypes,
  saveLodRules,
  saveStatusMaster,
} from '../api/client'
import type { DrawingTypeOption, LodDefinition, LodRule, Phase, StatusMasterItem } from '../types'

function HelpIcon({ text }: { text: string }) {
  return (
    <span className="help-icon" tabIndex={0} title={text} aria-label={text}>
      ?
    </span>
  )
}

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
      <h2>
        図面種別管理
        <HelpIcon text="図面の種類（例：平面図、設備図など）を登録・管理します。並び順は一覧表示時の順序に使われます。" />
      </h2>
      {error && <p className="error-text">{error}</p>}
      <div className="table-scroll">
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
      </div>
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
      <h2>
        {title}
        <HelpIcon
          text={
            showProgress
              ? '図面の進行状態（例：作成中、承認済など）を登録します。進捗(%)は全体進捗バーの算出に使われます。'
              : '図面のロック状態（編集可否）の選択肢を登録・管理します。'
          }
        />
      </h2>
      {error && <p className="error-text">{error}</p>}
      <div className="table-scroll">
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
      </div>
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

function LodRulesPanel() {
  const [rules, setRules] = useState<LodRule[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [lodDefinitions, setLodDefinitions] = useState<LodDefinition[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchLodRules()
      .then((data) => setRules(data.lod_rules))
      .catch((err: Error) => setError(err.message))
    fetchPhases()
      .then((data) => setPhases(data.phases))
      .catch(() => {})
    fetchLodDefinitions()
      .then((data) => setLodDefinitions(data.lod_definitions))
      .catch(() => {})
  }, [])

  function updateRule(index: number, patch: Partial<LodRule>) {
    setRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)))
  }

  function addRule() {
    setRules((prev) => [...prev, { phase_code: '', drawing_type: '', required_lod: 1, necessity: '必須' }])
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
    <section>
      <h2>
        LODルール
        <HelpIcon text="フェーズ×図面種別ごとに必要なLOD（詳細度）と必要性を設定します。フェーズ進行時にこのルールに基づいて図面の必要LODが再評価されます。" />
      </h2>
      {error && <p className="error-text">{error}</p>}

      <div className="settings-actions">
        <a className="button-link" href="/manual.html" target="_blank" rel="noopener noreferrer">
          セットアップマニュアルを開く
        </a>
      </div>

      <div className="table-scroll">
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
                <select value={rule.phase_code} onChange={(e) => updateRule(index, { phase_code: e.target.value })}>
                  <option value="">フェーズを選択</option>
                  {!phases.some((p) => p.phase_code === rule.phase_code) && rule.phase_code && (
                    <option value={rule.phase_code}>{rule.phase_code}</option>
                  )}
                  {phases.map((phase) => (
                    <option key={phase.phase_code} value={phase.phase_code}>
                      {phase.phase_name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input
                  value={rule.drawing_type}
                  onChange={(e) => updateRule(index, { drawing_type: e.target.value })}
                />
              </td>
              <td>
                <select
                  value={rule.required_lod}
                  onChange={(e) => updateRule(index, { required_lod: Number(e.target.value) })}
                >
                  {!lodDefinitions.some((l) => l.lod_level === rule.required_lod) && (
                    <option value={rule.required_lod}>{rule.required_lod}</option>
                  )}
                  {lodDefinitions.map((lod) => (
                    <option key={lod.lod_level} value={lod.lod_level}>
                      {lod.lod_name} {lod.description}
                    </option>
                  ))}
                </select>
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
      </div>

      <div className="settings-actions">
        <button type="button" onClick={addRule}>
          ルールを追加
        </button>
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </section>
  )
}

type SettingsSectionId = 'lod_rules' | 'drawing_types' | 'drawing_status' | 'lock_status'

const SETTINGS_SECTIONS: Array<{ id: SettingsSectionId; label: string; help: string }> = [
  { id: 'lod_rules', label: 'LODルール', help: 'フェーズ×図面種別ごとの必要LODを設定します。' },
  { id: 'drawing_types', label: '図面種別管理', help: '図面の種類の登録・管理を行います。' },
  { id: 'drawing_status', label: '図面ステータス管理', help: '図面の進行状態の選択肢を管理します。' },
  { id: 'lock_status', label: 'ロック状態管理', help: '図面のロック状態の選択肢を管理します。' },
]

function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('lod_rules')

  return (
    <div className="page">
      <h1>設定</h1>
      <div className="settings-layout">
        <nav className="settings-nav">
          <ul className="settings-nav-list">
            {SETTINGS_SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  className={section.id === activeSection ? 'settings-nav-item active' : 'settings-nav-item'}
                  onClick={() => setActiveSection(section.id)}
                >
                  <span>{section.label}</span>
                  <HelpIcon text={section.help} />
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="settings-detail">
          {activeSection === 'lod_rules' && <LodRulesPanel />}
          {activeSection === 'drawing_types' && <DrawingTypePanel />}
          {activeSection === 'drawing_status' && (
            <StatusMasterPanel group="drawing" title="図面ステータス管理" showProgress />
          )}
          {activeSection === 'lock_status' && (
            <StatusMasterPanel group="lock" title="ロック状態管理" showProgress={false} />
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
