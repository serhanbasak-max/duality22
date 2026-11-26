import { useState } from 'react'
import { sb, useData, label, STAGES, fmtDate, fmtTime, today, errText, type Row } from '../lib'
import { EntityForm, DeleteButton, type Field } from '../components'

export function OppForm({ row, defaults }: { row?: Row; defaults?: Row }) {
  const { suppliers, customers, contacts, profiles, me } = useData()
  const fields: Field[] = [
    { key: 'title', label: 'Fırsat başlığı', required: true, placeholder: 'ör. Bakır tedariki → Y Metal' },
    { key: 'supplier_id', label: 'Tedarikçi', type: 'select', options: suppliers.map(s => [s.id, s.name]) },
    { key: 'customer_id', label: 'Alıcı / müşteri', type: 'select', options: customers.map(s => [s.id, s.name]) },
    { key: 'customer_text', label: 'Alıcı sistemde kayıtlı değilse', placeholder: 'ör. Budva otel projesi' },
    { key: 'intermediary_id', label: 'Aracı kişi', type: 'select', options: contacts.map(s => [s.id, s.full_name]) },
    { key: 'stage', label: 'Aşama', type: 'select', options: STAGES, required: true },
    { key: 'owner_id', label: 'Sorumlu', type: 'select', options: profiles.map(p => [p.id, p.full_name]), required: true },
    { key: 'next_step', label: 'Sonraki adım' },
    { key: 'next_step_date', label: 'Tarih', type: 'date' },
    { key: 'description', label: 'Açıklama', type: 'textarea' },
  ]
  return <EntityForm table="opportunities" title={row ? 'Fırsatı düzenle' : 'Fırsat ekle'} fields={fields} row={row}
    defaults={{ stage: 'fikir', owner_id: me.id, ...defaults }} />
}

async function setStage(id: string, stage: string) {
  return sb.from('opportunities').update({ stage }).eq('id', id)
}

export function Opportunities() {
  const { opportunities, byId, pname, open, reload, toast } = useData()
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [showLost, setShowLost] = useState(false)
  const list = opportunities.filter(o => showLost || !o.lost)
  return (
    <>
      <div className="bar"><h2>İş fırsatları</h2>
        <label style={{ fontSize: 12, color: 'var(--mut)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={showLost} onChange={e => setShowLost(e.target.checked)} />Kaybedilenleri göster</label>
        <button className="btn" onClick={() => open(<OppForm />)}>+ Fırsat ekle</button></div>
      <div className="pipe">{STAGES.map(([k, l]) => {
        const col = list.filter(o => o.stage === k)
        return (
          <div key={k} className={'col' + (over === k ? ' drop' : '')}
            onDragOver={e => { e.preventDefault(); setOver(k) }} onDragLeave={() => setOver(null)}
            onDrop={async () => {
              setOver(null); if (!drag) return
              const o = byId('opportunities', drag); setDrag(null)
              if (!o || o.stage === k) return
              const { error } = await setStage(o.id, k)
              if (error) return toast(errText(error))
              await reload(); toast(`Aşama → ${l}`)
            }}>
            <h4>{l} ({col.length})</h4>
            {col.map(o => {
              const late = o.next_step_date && o.next_step_date < today() && o.stage !== 'kapandi'
              return (
                <div className="card" key={o.id} draggable onDragStart={() => setDrag(o.id)} onClick={() => open(<OppDetail id={o.id} />)}>
                  <h3>{o.title}</h3>
                  <p>{[byId('suppliers', o.supplier_id)?.name, byId('contacts', o.intermediary_id) && 'aracı: ' + byId('contacts', o.intermediary_id)!.full_name].filter(Boolean).join(' · ')}</p>
                  {o.next_step && <p>⏭ {o.next_step}{o.next_step_date ? ' · ' + fmtDate(o.next_step_date) : ''}</p>}
                  <span className="tag gy">{pname(o.owner_id)}</span>
                  {late && <span className="tag rd">gecikti</span>}
                  {o.lost && <span className="tag rd">kaybedildi</span>}
                </div>)
            })}
          </div>)
      })}</div>
      {!opportunities.length && <div className="empty">Henüz fırsat yok. "+ Fırsat ekle" ile başlayın; kartları sürükleyerek aşama değiştirebilirsiniz.</div>}
    </>
  )
}

export function OppDetail({ id }: { id: string }) {
  const { byId, pname, open, close, reload, toast } = useData()
  const [events, setEvents] = useState<Row[] | null>(null)
  const [note, setNote] = useState('')
  const o = byId('opportunities', id)
  if (events === null) {
    sb.from('opportunity_events').select('*').eq('opportunity_id', id).order('created_at', { ascending: false })
      .then(r => setEvents(r.data ?? []))
  }
  if (!o) return null
  const sup = byId('suppliers', o.supplier_id), cus = byId('customers', o.customer_id), ara = byId('contacts', o.intermediary_id)

  async function refreshEvents() {
    const r = await sb.from('opportunity_events').select('*').eq('opportunity_id', id).order('created_at', { ascending: false })
    setEvents(r.data ?? [])
  }
  async function stage(v: string) {
    const { error } = await setStage(id, v)
    if (error) return toast(errText(error))
    await reload(); await refreshEvents(); toast('Aşama güncellendi')
  }
  async function addNote() {
    if (!note.trim()) return
    const { error } = await sb.from('opportunity_events').insert({ opportunity_id: id, kind: 'not', body: note.trim() })
    if (error) return toast(errText(error))
    setNote(''); await refreshEvents(); toast('Not eklendi')
  }
  async function toggleLost() {
    const { error } = await sb.from('opportunities').update({ lost: !o!.lost }).eq('id', id)
    if (error) return toast(errText(error))
    await reload(); toast(o!.lost ? 'Fırsat yeniden açıldı' : 'Kaybedildi olarak işaretlendi')
  }

  return (
    <>
      <h2>{o.title}</h2>
      <div className="sub">açan {pname(o.created_by)} · sorumlu {pname(o.owner_id)}</div>
      <div className="flow">
        <b>{sup?.name ?? 'Tedarikçi —'}</b><i>→</i>{ara && <><b>{ara.full_name}</b><i>→</i></>}<b>{cus?.name ?? o.customer_text ?? 'Alıcı —'}</b>
      </div>
      <div className="f"><label>Aşama</label>
        <select value={o.stage} onChange={e => stage(e.target.value)}>{STAGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      <dl className="det">
        <dt>Sonraki adım</dt><dd>{o.next_step || '—'}{o.next_step_date ? ' · ' + fmtDate(o.next_step_date) : ''}</dd>
        {o.description && <><dt>Açıklama</dt><dd>{o.description}</dd></>}
        <dt>Geçmiş</dt>
        <dd><div className="tl">{(events ?? []).map(ev => (
          <div key={ev.id}>{ev.kind === 'asama' ? 'Aşama → ' + label(STAGES, ev.body.replace('Aşama → ', '')) : ev.body}
            <small>{fmtTime(ev.created_at)} · {ev.actor_id ? pname(ev.actor_id) : 'Sistem'}</small></div>))}
          <div>Fırsat açıldı<small>{fmtTime(o.created_at)} · {pname(o.created_by)}</small></div></div></dd>
      </dl>
      <div className="f"><label>Not ekle</label><textarea rows={2} value={note} placeholder="Görüşme notu…" onChange={e => setNote(e.target.value)} /></div>
      <div className="act">
        <button className="btn s" onClick={addNote}>Notu kaydet</button>
        <button className="btn s o" onClick={() => open(<OppForm row={o} />)}>Düzenle</button>
        <button className="btn s o" onClick={toggleLost}>{o.lost ? 'Yeniden aç' : 'Kaybedildi'}</button>
        <DeleteButton table="opportunities" id={id} what={o.title} />
        <button className="btn s gr" onClick={close}>Kapat</button>
      </div>
    </>
  )
}

