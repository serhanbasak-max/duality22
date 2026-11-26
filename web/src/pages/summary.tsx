import { useEffect, useState } from 'react'
import { sb, useData, label, STAGES, SUP_STATUS, fmtDate, fmtTime, initials, today, errText, type Row } from '../lib'
import { Bars } from '../components'
import { OppDetail } from './opps'

export function Summary({ go }: { go: (tab: string) => void }) {
  const { me, suppliers, opportunities, matches, activity, pname, open } = useData()
  const active = opportunities.filter(o => !o.lost && o.stage !== 'kapandi')
  const week = new Date(); week.setDate(week.getDate() + 7)
  const soon = active.filter(o => o.next_step_date && o.next_step_date <= week.toISOString().slice(0, 10))
  const waiting = matches.filter(m => m.status === 'bekliyor').length
  const upcoming = active.filter(o => o.next_step).sort((a, b) => (a.next_step_date || '9999').localeCompare(b.next_step_date || '9999')).slice(0, 8)
  return (
    <>
      <h2 style={{ fontSize: 17, margin: '0 0 10px' }}>Hoş geldiniz, {me.full_name}</h2>
      <div className="kpis">
        <div className="kpi" style={{ cursor: 'pointer' }} onClick={() => go('ted')}><b>{suppliers.length}</b><span>Tedarikçi</span></div>
        <div className="kpi" style={{ cursor: 'pointer' }} onClick={() => go('firsat')}><b>{active.length}</b><span>Açık fırsat</span></div>
        <div className="kpi" style={{ cursor: 'pointer' }} onClick={() => go('esl')}><b>{waiting}</b><span>Size bekleyen eşleşme</span></div>
        <div className="kpi"><b>{soon.length}</b><span>Bu hafta adım</span></div>
      </div>
      <div className="two">
        <div className="panel"><h3>Nasıl çalışır?</h3>
          <div className="flow"><b>Ortak kayıt girer</b><i>→</i><b>Herkes görür</b><i>→</i><b>Sistem ortakların çevresiyle eşler</b><i>→</i><b>İlgili ortağa uyarı</b><i>→</i><b>Duality 22 kartıyla teklif</b></div>
          <p style={{ fontSize: 12.5, color: 'var(--mut)' }}>Tanıştığınız tedarikçiyi, ürünü, alıcıyı ve aracıyı buraya girin; tüm ortaklar anında görür. Fırsatlar beş aşamalı panoda ilerler. Her ortak isterse kendi müşteri çevresini bağlar; sistem yeni kayıtları bu çevreyle karşılaştırıp yalnızca o ortağa "Duality 22 olarak teklif verelim mi?" diye sorar. Çevre listeleri yalnızca sahibine görünür.</p>
        </div>
        <div className="panel"><h3>Son hareketler</h3>
          {!activity.length && <div className="empty">Henüz hareket yok.</div>}
          {activity.slice(0, 8).map(a => (
            <div className="row" key={a.id}>
              <div className="who">{a.actor_id ? initials(pname(a.actor_id)) : '⚡'}</div>
              <div className="t"><b>{a.actor_id ? pname(a.actor_id) : 'Sistem'}</b><span>{a.summary.replace(/: (fikir|temas|numune_teklif|siparis|kapandi)$/, (_: string, s: string) => ': ' + label(STAGES, s) + ' aşamasına taşındı')} · {fmtTime(a.created_at)}</span></div>
            </div>))}
        </div>
      </div>
      <div className="panel" style={{ marginTop: 12 }}><h3>Yaklaşan adımlar</h3>
        {!upcoming.length && <div className="empty">Sonraki adımı girilmiş açık fırsat yok.</div>}
        {upcoming.map(o => (
          <div className="row" key={o.id} style={{ cursor: 'pointer' }} onClick={() => open(<OppDetail id={o.id} />)}>
            <div className="who">{initials(pname(o.owner_id))}</div>
            <div className="t"><b>{o.title}</b><span>{o.next_step}{o.next_step_date ? ' · ' + fmtDate(o.next_step_date) : ''} · {pname(o.owner_id)}</span></div>
            {o.next_step_date && o.next_step_date < today() && <span className="tag rd">gecikti</span>}
            <span className="tag">{label(STAGES, o.stage)}</span>
          </div>))}
      </div>
    </>
  )
}

export function Matches() {
  const { matches, byId, reload, toast, me } = useData()
  const [members, setMembers] = useState<Row[]>([])
  useEffect(() => { sb.from('circle_members').select('id,name,sector,country').then(r => setMembers(r.data ?? [])) }, [matches.length])
  const mem = (id: string) => members.find(m => m.id === id)
  const waiting = matches.filter(m => m.status === 'bekliyor' || m.status === 'sonra')
  const done = matches.filter(m => m.status === 'kabul' || m.status === 'ilgisiz')

  async function decide(m: Row, status: string) {
    let opportunity_id = m.opportunity_id
    if (status === 'kabul') {
      const src = byId('products', m.product_id)?.name || byId('suppliers', m.supplier_id)?.name || 'Tedarikçi'
      const target = mem(m.circle_member_id)
      const supplier_id = m.supplier_id || byId('products', m.product_id)?.supplier_id || null
      const r = await sb.from('opportunities').insert({
        title: `${src} → ${target?.name ?? 'çevre müşterisi'}`, supplier_id, customer_text: target?.name ?? null,
        stage: 'fikir', owner_id: me.id, description: 'Eşleşme önerisinden açıldı. ' + m.reason,
        next_step: 'Duality 22 kartıyla teklif hazırla',
      }).select().single()
      if (r.error) return toast(errText(r.error))
      opportunity_id = r.data.id
    }
    const { error } = await sb.from('matches').update({ status, opportunity_id, decided_at: new Date().toISOString() }).eq('id', m.id)
    if (error) return toast(errText(error))
    await reload()
    toast(status === 'kabul' ? 'Fırsat açıldı (Fırsatlar › Fikir)' : status === 'ilgisiz' ? 'İlgisiz olarak işaretlendi' : 'Sonra hatırlatılacak')
  }

  const card = (m: Row) => {
    const src = byId('products', m.product_id)?.name || byId('suppliers', m.supplier_id)?.name
    const t = mem(m.circle_member_id)
    return (
      <div className="match" key={m.id}>
        <h3>🔗 {src} ↔ {t?.name ?? '…'}</h3>
        <p>{m.reason}</p>
        <p><span className="tag vi">Uygunluk %{m.score}</span>
          {m.status === 'kabul' && <span className="tag ok">Fırsata dönüştü</span>}
          {m.status === 'ilgisiz' && <span className="tag gy">İlgisiz</span>}
          {m.status === 'sonra' && <span className="tag wn">Sonra</span>}</p>
        {(m.status === 'bekliyor' || m.status === 'sonra') && <div className="act">
          <button className="btn s g" onClick={() => decide(m, 'kabul')}>Evet – fırsat aç</button>
          {m.status === 'bekliyor' && <button className="btn s o" onClick={() => decide(m, 'sonra')}>Sonra</button>}
          <button className="btn s gr" onClick={() => decide(m, 'ilgisiz')}>İlgisiz</button></div>}
      </div>)
  }
  return (
    <>
      <div className="bar"><h2>Eşleşme önerileri</h2></div>
      <div className="note">Bu sayfa yalnızca size özel. Kendi müşteri çevrenizi bağladığınızda sistem her yeni tedarikçi ve ürünü bu çevreyle karşılaştırır, uygun bulduklarını burada gösterir. Çevre bağlama ve otomatik eşleşme bir sonraki aşamada açılacak.</div>
      {waiting.length ? waiting.map(card) : <div className="empty">Bekleyen öneri yok.</div>}
      {done.length > 0 && <><h3 style={{ fontSize: 13, color: 'var(--mut)', marginTop: 16 }}>Karar verilenler</h3>{done.map(card)}</>}
    </>
  )
}

export function Report() {
  const { opportunities, suppliers, profiles, products, customers, matches } = useData()
  const open = opportunities.filter(o => !o.lost)
  return (
    <>
      <div className="bar"><h2>Rapor</h2></div>
      <div className="two">
        <div className="panel"><h3>Fırsatlar – aşamaya göre</h3><Bars rows={STAGES.map(([k, l]) => [l, open.filter(o => o.stage === k).length])} /></div>
        <div className="panel"><h3>Ortak katkısı (eklenen kayıt)</h3><Bars rows={profiles.map(p => [p.full_name,
          [...suppliers, ...products, ...customers, ...opportunities].filter(x => x.created_by === p.id).length])} /></div>
        <div className="panel"><h3>Tedarikçi durumu</h3><Bars rows={SUP_STATUS.map(([k, l]) => [l, suppliers.filter(t => t.status === k).length])} /></div>
        <div className="panel"><h3>Sorumluya göre açık fırsat</h3><Bars rows={profiles.map(p => [p.full_name,
          open.filter(o => o.owner_id === p.id && o.stage !== 'kapandi').length])} /></div>
        <div className="panel"><h3>Size gelen eşleşmeler</h3><Bars rows={[['Önerilen', matches.length],
          ['Fırsata dönen', matches.filter(m => m.status === 'kabul').length], ['İlgisiz', matches.filter(m => m.status === 'ilgisiz').length]]} /></div>
      </div>
    </>
  )
}

export function Account() {
  const { me, reload, toast } = useData()
  const [name, setName] = useState(me.full_name ?? '')
  const [p1, setP1] = useState(''), [p2, setP2] = useState(''), [err, setErr] = useState('')
  return (
    <>
      <div className="bar"><h2>Hesabım</h2></div>
      <div className="two">
        <div className="panel"><h3>Bilgilerim</h3>
          <div className="f"><label>Kullanıcı adı</label><input value={me.username} disabled /></div>
          <div className="f"><label>Görünen ad</label><input value={name} onChange={e => setName(e.target.value)} /></div>
          <button className="btn s" onClick={async () => {
            const { error } = await sb.from('profiles').update({ full_name: name.trim() }).eq('id', me.id)
            if (error) return toast(errText(error)); await reload(); toast('Kaydedildi')
          }}>Kaydet</button>
        </div>
        <div className="panel"><h3>Şifre değiştir</h3>
          <div className="f"><label>Yeni şifre</label><input type="password" autoComplete="new-password" value={p1} onChange={e => setP1(e.target.value)} /></div>
          <div className="f"><label>Yeni şifre (tekrar)</label><input type="password" autoComplete="new-password" value={p2} onChange={e => setP2(e.target.value)} /></div>
          <div className="err">{err}</div>
          <button className="btn s" onClick={async () => {
            if (p1.length < 8) return setErr('Şifre en az 8 karakter olmalı.')
            if (p1 !== p2) return setErr('Şifreler aynı değil.')
            const { error } = await sb.auth.updateUser({ password: p1 })
            if (error) return setErr(errText(error))
            setErr(''); setP1(''); setP2(''); toast('Şifreniz değişti')
          }}>Şifreyi değiştir</button>
        </div>
      </div>
    </>
  )
}
