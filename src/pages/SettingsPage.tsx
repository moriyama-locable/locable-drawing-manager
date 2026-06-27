import { useEffect, useState } from 'react'
import { fetchLodRules, saveLodRules } from '../api/client'
import type { LodRule } from '../types'

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
    </div>
  )
}

export default SettingsPage
