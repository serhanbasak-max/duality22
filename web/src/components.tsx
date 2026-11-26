import { useState } from 'react'
import { sb, useData, errText, type Row } from './lib'

export type Field = {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'date' | 'select' | 'url' | 'email' | 'tel'
  options?: [string, string][]
  required?: boolean
  placeholder?: string
}

// Ortak ekle/düzenle formu. row verilirse düzenler, yoksa yeni kayıt açar.
export function EntityForm(props: {
  table: string
  title: string
  fields: Field[]
  row?: Row
  defaults?: Row
  onSaved?: (r: Row) => void
}) {
  const { reload, toast, close, me } = useData()
  const [v, setV] = useState<Row>(() => ({ ...(props.defaults ?? {}), ...(props.row ?? {}) }))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    for (const f of props.fields) if (f.required && !String(v[f.key] ?? '').trim()) return setErr(`"${f.label}" boş bırakılamaz.`)
    const data: Row = {}
    for (const f of props.fields) {
      const x = v[f.key]
      data[f.key] = x === '' || x === undefined ? null : x
    }
    setBusy(true); setErr('')
    const res = props.row
      ? await sb.from(props.table).update(data).eq('id', props.row.id).select().single()
      : await sb.from(props.table).insert(data).select().single()
    setBusy(false)
    if (res.error) return setErr(errText(res.error))
    await reload()
    toast(props.row ? 'Kaydedildi' : 'Eklendi — tüm ortaklar görebilir')
    close()
    props.onSaved?.(res.data)
  }

  return (
    <>
      <h2>{props.title}</h2>
      <div className="sub">{props.row ? 'Düzenleniyor' : `Kayıt ${me.full_name} adına açılır, tüm ortaklar görür`}</div>
      {props.fields.map(f => (
        <div className="f" key={f.key}>
          <label>{f.label}{f.required ? ' *' : ''}</label>
          {f.type === 'select' ? (
            <select value={v[f.key] ?? ''} onChange={e => setV({ ...v, [f.key]: e.target.value })}>
              {!f.required && <option value="">—</option>}
              {f.options!.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea rows={3} value={v[f.key] ?? ''} placeholder={f.placeholder} onChange={e => setV({ ...v, [f.key]: e.target.value })} />
          ) : (
            <input type={f.type ?? 'text'} value={v[f.key] ?? ''} placeholder={f.placeholder} onChange={e => setV({ ...v, [f.key]: e.target.value })} />
          )}
        </div>
      ))}
      <div className="err">{err}</div>
      <div className="act">
        <button className="btn" disabled={busy} onClick={save}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button className="btn gr" onClick={close}>Vazgeç</button>
      </div>
    </>
  )
}

// Yönetici için silme düğmesi
export function DeleteButton({ table, id, what }: { table: string; id: string; what: string }) {
  const { isAdmin, reload, toast, close } = useData()
  if (!isAdmin) return null
  return (
    <button className="btn s rd" onClick={async () => {
      if (!confirm(`${what} silinsin mi? Bu geri alınamaz.`)) return
      const { error } = await sb.from(table).delete().eq('id', id)
      if (error) return toast(errText(error))
      await reload(); close(); toast('Silindi')
    }}>Sil</button>
  )
}

export function Bars({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(r => r[1]))
  return (
    <div className="bars">
      {rows.map(([l, n]) => (
        <div key={l}><span>{l}</span><i style={{ width: Math.max(4, (n / max) * 200) }} />{n}</div>
      ))}
    </div>
  )
}

export function Search({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  return <input className="search" placeholder="Ara…" value={value} onChange={e => onChange(e.target.value)} />
}

export const has = (q: string, ...xs: unknown[]) =>
  !q || xs.join(' ').toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr'))
