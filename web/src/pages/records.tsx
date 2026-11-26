import { useState } from 'react'
import { useData, label, statusTag, SUP_STATUS, CONTACT_ROLE, FILE_KIND, STAGES, initials, type Row } from '../lib'
import { EntityForm, DeleteButton, Search, has, type Field } from '../components'
import { OppDetail, OppForm } from './opps'

// ---------- Alan tanımları ----------
export function supplierFields(): Field[] {
  return [
    { key: 'name', label: 'Firma adı', required: true },
    { key: 'country', label: 'Ülke', placeholder: 'Türkiye' },
    { key: 'sector', label: 'Faaliyet alanı', placeholder: 'ör. Asansör güvenlik ekipmanı' },
    { key: 'product_summary', label: 'Ürünler (kısa)', placeholder: 'ör. Boy fotosel, kapı dedektörü' },
    { key: 'status', label: 'Durum', type: 'select', options: SUP_STATUS, required: true },
    { key: 'website', label: 'Web sitesi' },
    { key: 'notes', label: 'Nasıl tanıştınız? / not', type: 'textarea' },
  ]
}
function productFields(suppliers: Row[]): Field[] {
  return [
    { key: 'name', label: 'Ürün adı', required: true },
    { key: 'supplier_id', label: 'Tedarikçi', type: 'select', required: true, options: suppliers.map(s => [s.id, s.name]) },
    { key: 'product_group', label: 'Ürün grubu' },
    { key: 'target_markets', label: 'Hedef pazar', placeholder: 'ör. Karadağ, Bulgaristan' },
    { key: 'price_info', label: 'Fiyat bilgisi', placeholder: 'ör. Talep üzerine' },
  ]
}
export function customerFields(): Field[] {
  return [
    { key: 'name', label: 'Firma adı', required: true },
    { key: 'country', label: 'Ülke' },
    { key: 'sector', label: 'Sektör' },
    { key: 'needs', label: 'İhtiyacı' },
    { key: 'source', label: 'Kaynak / bağlantı', placeholder: 'ör. Saha ziyareti, Serkan Bey bağlantısı' },
  ]
}
function contactFields(suppliers: Row[], customers: Row[]): Field[] {
  return [
    { key: 'full_name', label: 'Ad soyad', required: true },
    { key: 'role', label: 'Rol', type: 'select', options: CONTACT_ROLE, required: true },
    { key: 'title', label: 'Unvan' },
    { key: 'phone', label: 'Telefon', type: 'tel' },
    { key: 'email', label: 'E-posta', type: 'email' },
    { key: 'supplier_id', label: 'Bağlı tedarikçi', type: 'select', options: suppliers.map(s => [s.id, s.name]) },
    { key: 'customer_id', label: 'Bağlı müşteri', type: 'select', options: customers.map(s => [s.id, s.name]) },
    { key: 'company_text', label: 'Firma (sistemde kayıtlı değilse)' },
    { key: 'notes', label: 'Not', type: 'textarea' },
  ]
}
function fileFields(suppliers: Row[], opps: Row[]): Field[] {
  return [
    { key: 'name', label: 'Dosya adı', required: true },
    { key: 'kind', label: 'Tür', type: 'select', options: FILE_KIND, required: true },
    { key: 'drive_file_id', label: 'Drive bağlantısı', type: 'url', placeholder: 'https://drive.google.com/…' },
    { key: 'supplier_id', label: 'Tedarikçi', type: 'select', options: suppliers.map(s => [s.id, s.name]) },
    { key: 'opportunity_id', label: 'Fırsat', type: 'select', options: opps.map(s => [s.id, s.title]) },
    { key: 'summary', label: 'Kısa özet', type: 'textarea' },
  ]
}

// ---------- Tedarikçiler ----------
export function Suppliers() {
  const { suppliers, files, pname, open } = useData()
  const [q, setQ] = useState('')
  const list = suppliers.filter(t => has(q, t.name, t.sector, t.product_summary, t.country))
  return (
    <>
      <div className="bar"><h2>Tedarikçiler</h2><Search value={q} onChange={setQ} />
        <button className="btn" onClick={() => open(<EntityForm table="suppliers" title="Tedarikçi ekle" fields={supplierFields()} defaults={{ status: 'aday' }} />)}>+ Tedarikçi ekle</button></div>
      {!list.length && <div className="empty">{q ? 'Sonuç yok.' : 'Henüz tedarikçi yok. İlk kaydı siz ekleyin.'}</div>}
      <div className="grid">{list.map(t => {
        const n = files.filter(f => f.supplier_id === t.id).length
        return (
          <div className="card" key={t.id} onClick={() => open(<SupplierDetail id={t.id} />)}>
            <h3>{t.name}</h3>
            <p>{[t.sector, t.country].filter(Boolean).join(' · ')}</p>
            {t.product_summary && <p>{t.product_summary}</p>}
            <span className={'tag ' + statusTag(t.status)}>{label(SUP_STATUS, t.status)}</span>
            <span className="tag gy">{pname(t.created_by)}</span>
            {n > 0 && <span className="tag">📎 {n}</span>}
          </div>)
      })}</div>
    </>
  )
}

export function SupplierDetail({ id }: { id: string }) {
  const { byId, products, opportunities, files, contacts, pname, open, close } = useData()
  const t = byId('suppliers', id)
  if (!t) return null
  const us = products.filter(u => u.supplier_id === id)
  const fs = opportunities.filter(f => f.supplier_id === id)
  const ds = files.filter(d => d.supplier_id === id)
  const ks = contacts.filter(k => k.supplier_id === id)
  return (
    <>
      <h2>{t.name}</h2>
      <div className="sub">{[t.sector, t.country].filter(Boolean).join(' · ')} · ekleyen {pname(t.created_by)}</div>
      <span className={'tag ' + statusTag(t.status)}>{label(SUP_STATUS, t.status)}</span>
      <dl className="det">
        {ks.length > 0 && <><dt>Yetkililer</dt><dd>{ks.map(k => `${k.full_name}${k.phone ? ' · ' + k.phone : ''}`).join('\n')}</dd></>}
        <dt>Ürünler</dt><dd>{us.map(u => u.name).join(', ') || t.product_summary || '—'}</dd>
        {t.website && <><dt>Web</dt><dd><a href={/^https?:/.test(t.website) ? t.website : 'https://' + t.website} target="_blank" rel="noreferrer">{t.website}</a></dd></>}
        <dt>Not</dt><dd>{t.notes || '—'}</dd>
        <dt>Bağlı fırsatlar</dt><dd>{fs.length ? fs.map(f => (
          <div key={f.id}><a href="#" onClick={e => { e.preventDefault(); open(<OppDetail id={f.id} />) }}>{f.title}</a> <span className="tag">{label(STAGES, f.stage)}</span></div>)) : '—'}</dd>
        <dt>Dosyalar</dt><dd>{ds.length ? ds.map(d => <div key={d.id}>📄 {d.drive_file_id ? <a href={d.drive_file_id} target="_blank" rel="noreferrer">{d.name}</a> : d.name}</div>) : '—'}</dd>
      </dl>
      <div className="act">
        <button className="btn s" onClick={() => open(<OppForm defaults={{ supplier_id: id }} />)}>Fırsat aç</button>
        <button className="btn s o" onClick={() => open(<ProductForm supplierId={id} />)}>Ürün ekle</button>
        <button className="btn s o" onClick={() => open(<FileForm supplierId={id} />)}>Dosya ekle</button>
        <button className="btn s o" onClick={() => open(<EntityForm table="suppliers" title="Tedarikçiyi düzenle" fields={supplierFields()} row={t} />)}>Düzenle</button>
        <DeleteButton table="suppliers" id={id} what={t.name} />
        <button className="btn s gr" onClick={close}>Kapat</button>
      </div>
    </>
  )
}

// ---------- Ürünler ----------
function ProductForm({ supplierId, row }: { supplierId?: string; row?: Row }) {
  const { suppliers } = useData()
  if (!suppliers.length) return <><h2>Ürün ekle</h2><p className="note">Önce bir tedarikçi ekleyin; ürünler tedarikçiye bağlanır.</p></>
  return <EntityForm table="products" title={row ? 'Ürünü düzenle' : 'Ürün ekle'} fields={productFields(suppliers)} row={row} defaults={{ supplier_id: supplierId ?? suppliers[0].id }} />
}

export function Products() {
  const { products, byId, open } = useData()
  const [q, setQ] = useState('')
  const list = products.filter(u => has(q, u.name, u.product_group, byId('suppliers', u.supplier_id)?.name, u.target_markets))
  return (
    <>
      <div className="bar"><h2>Ürünler</h2><Search value={q} onChange={setQ} />
        <button className="btn" onClick={() => open(<ProductForm />)}>+ Ürün ekle</button></div>
      {!list.length && <div className="empty">{q ? 'Sonuç yok.' : 'Henüz ürün yok.'}</div>}
      <div className="grid">{list.map(u => (
        <div className="card" key={u.id} onClick={() => open(<>
          <ProductForm row={u} />
          <div className="act"><DeleteButton table="products" id={u.id} what={u.name} /></div></>)}>
          <h3>{u.name}</h3>
          <p>{byId('suppliers', u.supplier_id)?.name}</p>
          {(u.target_markets || u.price_info) && <p>{[u.target_markets && 'Hedef pazar: ' + u.target_markets, u.price_info && 'Fiyat: ' + u.price_info].filter(Boolean).join(' · ')}</p>}
          {u.product_group && <span className="tag">{u.product_group}</span>}
        </div>))}</div>
    </>
  )
}

// ---------- Müşteriler ----------
export function Customers() {
  const { customers, opportunities, pname, open } = useData()
  const [q, setQ] = useState('')
  const list = customers.filter(m => has(q, m.name, m.sector, m.country, m.needs, m.source))
  return (
    <>
      <div className="bar"><h2>Müşteriler / alıcılar</h2><Search value={q} onChange={setQ} />
        <button className="btn" onClick={() => open(<EntityForm table="customers" title="Müşteri / alıcı ekle" fields={customerFields()} />)}>+ Müşteri ekle</button></div>
      {!list.length && <div className="empty">{q ? 'Sonuç yok.' : 'Henüz müşteri yok.'}</div>}
      <div className="grid">{list.map(m => {
        const n = opportunities.filter(o => o.customer_id === m.id).length
        return (
          <div className="card" key={m.id} onClick={() => open(<>
            <EntityForm table="customers" title="Müşteriyi düzenle" fields={customerFields()} row={m} />
            <div className="act">
              <button className="btn s o" onClick={() => open(<OppForm defaults={{ customer_id: m.id }} />)}>Bu müşteri için fırsat aç</button>
              <DeleteButton table="customers" id={m.id} what={m.name} /></div></>)}>
            <h3>{m.name}</h3>
            <p>{[m.sector, m.country].filter(Boolean).join(' · ')}</p>
            {m.needs && <p>İhtiyaç: {m.needs}</p>}
            {m.source && <span className="tag vi">{m.source}</span>}
            <span className="tag gy">{pname(m.created_by)}</span>
            {n > 0 && <span className="tag">{n} fırsat</span>}
          </div>)
      })}</div>
    </>
  )
}

// ---------- Kişiler ----------
export function Contacts() {
  const { contacts, suppliers, customers, byId, pname, open } = useData()
  const [q, setQ] = useState('')
  const company = (k: Row) => byId('suppliers', k.supplier_id)?.name || byId('customers', k.customer_id)?.name || k.company_text || ''
  const list = contacts.filter(k => has(q, k.full_name, company(k), k.phone, k.email))
  const fields = contactFields(suppliers, customers)
  return (
    <>
      <div className="bar"><h2>Kişiler</h2><Search value={q} onChange={setQ} />
        <button className="btn" onClick={() => open(<EntityForm table="contacts" title="Kişi ekle" fields={fields} defaults={{ role: 'araci' }} />)}>+ Kişi ekle</button></div>
      {!list.length ? <div className="empty">{q ? 'Sonuç yok.' : 'Henüz kişi yok.'}</div> :
        <div className="panel">{list.map(k => (
          <div className="row" key={k.id} style={{ cursor: 'pointer' }} onClick={() => open(<>
            <EntityForm table="contacts" title="Kişiyi düzenle" fields={fields} row={k} />
            <div className="act"><DeleteButton table="contacts" id={k.id} what={k.full_name} /></div></>)}>
            <div className="who">{initials(k.full_name)}</div>
            <div className="t"><b>{k.full_name} <span style={{ fontWeight: 400, color: 'var(--mut)' }}>· {label(CONTACT_ROLE, k.role)}</span></b>
              <span>{[company(k), k.phone, k.email].filter(Boolean).join(' · ')}</span></div>
            <span className="tag gy">{pname(k.created_by)}</span>
          </div>))}</div>}
    </>
  )
}

// ---------- Dosyalar ----------
function FileForm({ supplierId, row }: { supplierId?: string; row?: Row }) {
  const { suppliers, opportunities } = useData()
  return <EntityForm table="files" title={row ? 'Dosyayı düzenle' : 'Dosya ekle'} fields={fileFields(suppliers, opportunities)} row={row} defaults={{ kind: 'katalog', supplier_id: supplierId }} />
}

export function Files() {
  const { files, byId, open } = useData()
  const [q, setQ] = useState('')
  const list = files.filter(d => has(q, d.name, d.summary, byId('suppliers', d.supplier_id)?.name))
  return (
    <>
      <div className="bar"><h2>Dosyalar</h2><Search value={q} onChange={setQ} />
        <button className="btn" onClick={() => open(<FileForm />)}>+ Dosya ekle</button></div>
      <div className="note">Şimdilik dosyanın Drive bağlantısını ekliyorsunuz. Sonraki aşamada dosya doğrudan buradan yüklenecek, Drive'daki firma klasörüne gidecek ve kısa özeti otomatik çıkacak.</div>
      {!list.length ? <div className="empty">{q ? 'Sonuç yok.' : 'Henüz dosya yok.'}</div> :
        <div className="panel">{list.map(d => (
          <div className="row" key={d.id}>
            <div className="who">📄</div>
            <div className="t"><b>{d.drive_file_id ? <a href={d.drive_file_id} target="_blank" rel="noreferrer">{d.name}</a> : d.name}</b>
              <span>{[byId('suppliers', d.supplier_id)?.name, label(FILE_KIND, d.kind), d.summary].filter(Boolean).join(' · ')}</span></div>
            <button className="btn s gr" onClick={() => open(<><FileForm row={d} /><div className="act"><DeleteButton table="files" id={d.id} what={d.name} /></div></>)}>Düzenle</button>
          </div>))}</div>}
    </>
  )
}
