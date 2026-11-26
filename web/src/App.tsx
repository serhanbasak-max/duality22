import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { sb, AUTH_LINK, DataCtx, loadAll, errText, type Ctx, type Data } from './lib'
import { Suppliers, Products, Customers, Contacts, Files } from './pages/records'
import { Opportunities } from './pages/opps'
import { Summary, Matches, Report, Account } from './pages/summary'

const TABS: [string, string][] = [
  ['ozet', 'Özet'], ['firsat', 'Fırsatlar'], ['esl', 'Eşleşmeler'], ['ted', 'Tedarikçiler'], ['urun', 'Ürünler'],
  ['mus', 'Müşteriler'], ['kisi', 'Kişiler'], ['dosya', 'Dosyalar'], ['rapor', 'Rapor'], ['hesap', 'Hesabım'],
]
const readTab = () => { const t = location.hash.replace('#/', ''); return TABS.some(x => x[0] === t) ? t : 'ozet' }

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [setPw, setSetPw] = useState<'invite' | 'recovery' | null>(AUTH_LINK)

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = sb.auth.onAuthStateChange((ev, s) => {
      setSession(s)
      if (ev === 'PASSWORD_RECOVERY') setSetPw('recovery')
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (session && setPw) return <SetPassword mode={setPw} done={() => { setSetPw(null); location.hash = '' }} />
  if (!session) return <Login />
  return <Shell session={session} />
}

function Login() {
  const [u, setU] = useState(''), [p, setP] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const [forgot, setForgot] = useState(false), [sent, setSent] = useState(false)

  async function emailOf(name: string) {
    const v = name.trim().toLowerCase()
    if (v.includes('@')) return v
    const { data } = await sb.rpc('email_for_username', { p_username: v })
    return (data as string | null) ?? null
  }
  async function login() {
    setBusy(true); setErr('')
    const email = await emailOf(u)
    if (!email) { setBusy(false); return setErr('Kullanıcı adı veya şifre hatalı.') }
    const { error } = await sb.auth.signInWithPassword({ email, password: p })
    setBusy(false)
    if (error) setErr(errText(error))
  }
  async function reset() {
    setBusy(true); setErr('')
    const email = await emailOf(u)
    if (email) await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })
    setBusy(false); setSent(true) // kullanıcı adının var olup olmadığını belli etme
  }

  return (
    <div className="login"><div className="box">
      <img src="./brand/logo-renkli.png" alt="Duality 22" />
      <h2>D22 Takip</h2>
      <div className="sub">Ortak girişi · tedarikçi, fırsat ve proje takibi</div>
      <div className="f"><label>Kullanıcı adı</label>
        <input value={u} autoComplete="username" placeholder="örn. ibrahim" onChange={e => setU(e.target.value)} /></div>
      {!forgot ? <>
        <div className="f"><label>Şifre</label>
          <input type="password" value={p} autoComplete="current-password" onChange={e => setP(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()} /></div>
        <button className="btn" disabled={busy || !u || !p} onClick={login}>{busy ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
        <div className="err">{err}</div>
        <button className="link" onClick={() => { setForgot(true); setErr('') }}>Şifremi unuttum</button>
      </> : <>
        {sent ? <div className="ok">Kullanıcı adınız kayıtlıysa e-posta adresinize şifre belirleme bağlantısı gönderildi.</div>
          : <button className="btn" disabled={busy || !u} onClick={reset}>Şifre belirleme bağlantısı gönder</button>}
        <button className="link" onClick={() => { setForgot(false); setSent(false) }}>Girişe dön</button>
      </>}
    </div></div>
  )
}

function SetPassword({ mode, done }: { mode: 'invite' | 'recovery'; done: () => void }) {
  const [p1, setP1] = useState(''), [p2, setP2] = useState(''), [err, setErr] = useState('')
  return (
    <div className="login"><div className="box">
      <img src="./brand/logo-renkli.png" alt="Duality 22" />
      <h2>{mode === 'invite' ? 'D22 Takip\'e hoş geldiniz' : 'Yeni şifre'}</h2>
      <div className="sub">Giriş için kullanacağınız şifreyi belirleyin (en az 8 karakter).</div>
      <div className="f"><label>Şifre</label><input type="password" autoComplete="new-password" value={p1} onChange={e => setP1(e.target.value)} /></div>
      <div className="f"><label>Şifre (tekrar)</label><input type="password" autoComplete="new-password" value={p2} onChange={e => setP2(e.target.value)} /></div>
      <button className="btn" onClick={async () => {
        if (p1.length < 8) return setErr('Şifre en az 8 karakter olmalı.')
        if (p1 !== p2) return setErr('Şifreler aynı değil.')
        const { error } = await sb.auth.updateUser({ password: p1 })
        if (error) return setErr(errText(error))
        done()
      }}>Kaydet ve devam et</button>
      <div className="err">{err}</div>
    </div></div>
  )
}

function Shell({ session }: { session: Session }) {
  const [data, setData] = useState<Data | null>(null)
  const [tab, setTab] = useState(readTab)
  const [sheet, setSheet] = useState<React.ReactNode>(null)
  const [toastMsg, setToast] = useState('')

  const reload = useCallback(async () => setData(await loadAll(session.user.id)), [session.user.id])
  useEffect(() => { reload() }, [reload])
  useEffect(() => {
    const f = () => setTab(readTab())
    window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f)
  }, [])
  // Başka bir ortak kayıt eklediğinde sayfayı tazele
  useEffect(() => {
    const ch = sb.channel('degisiklikler')
    for (const t of ['suppliers', 'products', 'customers', 'contacts', 'opportunities', 'files', 'activity_log'])
      ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, () => reload())
    ch.subscribe()
    const iv = setInterval(reload, 120000)
    return () => { sb.removeChannel(ch); clearInterval(iv) }
  }, [reload])

  if (!data) return <div className="empty" style={{ paddingTop: 80 }}>Yükleniyor…</div>
  if (!data.me.id) return (
    <div className="login"><div className="box"><h2>Hesabınız tanımlı değil</h2>
      <div className="sub">Giriş yaptınız ama ortak profiliniz yok. Serhan Bey'e haber verin.</div>
      <button className="btn" onClick={() => sb.auth.signOut()}>Çıkış</button></div></div>)

  const go = (t: string) => { location.hash = '#/' + t }
  const ctx: Ctx = {
    ...data, reload,
    toast: t => { setToast(t); setTimeout(() => setToast(''), 2800) },
    open: n => setSheet(n), close: () => setSheet(null),
    isAdmin: data.me.role === 'yonetici',
    pname: id => data.profiles.find(p => p.id === id)?.full_name ?? '—',
    byId: (t, id) => (id ? (data[t] as Record<string, any>[]).find(x => x.id === id) : undefined),
  }
  const waiting = data.matches.filter(m => m.status === 'bekliyor').length
  const page = ({
    ozet: <Summary go={go} />, firsat: <Opportunities />, esl: <Matches />, ted: <Suppliers />, urun: <Products />,
    mus: <Customers />, kisi: <Contacts />, dosya: <Files />, rapor: <Report />, hesap: <Account />,
  } as Record<string, React.ReactNode>)[tab]

  return (
    <DataCtx.Provider value={ctx}>
      <header>
        <img src="./brand/simge.png" alt="Duality 22" />
        <div><h1>D22 Takip</h1><small>Duality 22 Group · fırsat, tedarikçi ve proje takibi</small></div>
        <span className="sp" />
        <span className="user">👤 {data.me.full_name} · {ctx.isAdmin ? 'Yönetici' : 'Ortak'}</span>
        <button className="hbtn" onClick={() => sb.auth.signOut()}>Çıkış</button>
      </header>
      <nav>{TABS.map(([k, l]) => (
        <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}>
          {l}{k === 'esl' && waiting > 0 && <span className="n">{waiting}</span>}
        </button>))}</nav>
      <main>{page}</main>
      {sheet && <div className="overlay" onClick={e => e.target === e.currentTarget && setSheet(null)}><div className="sheet">{sheet}</div></div>}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </DataCtx.Provider>
  )
}
