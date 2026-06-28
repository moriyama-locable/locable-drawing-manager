import { useEffect, useState } from 'react'
import { deleteStatusMasterItem, fetchStatusMaster, saveStatusMaster } from '../api/client'
import type { StatusMasterItem } from '../types'

function HelpIcon({ text }: { text: string }) {
  return (
    <span className="help-icon" tabIndex={0} title={text} aria-label={text}>
      ?
    </span>
  )
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

function StatusMasterPanel({
  group,
  title,
  showProgress,
}: {
  group: 'drawing'
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
        <HelpIcon text="図面の進行状態（例：作成中、承認済など）を登録します。進捗(%)は全体進捗バーの算出に使われます。" />
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

type SettingsSectionId = 'drawing_status'

const SETTINGS_SECTIONS: Array<{ id: SettingsSectionId; label: string; help: string }> = [
  { id: 'drawing_status', label: '図面ステータス管理', help: '図面の進行状態の選択肢を管理します。' },
]

function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('drawing_status')

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
          {activeSection === 'drawing_status' && (
            <StatusMasterPanel group="drawing" title="図面ステータス管理" showProgress />
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
