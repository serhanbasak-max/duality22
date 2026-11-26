import { createClient } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

// Davet / şifre sıfırlama bağlantısıyla mı gelindi? (supabase-js adresi okumadan önce yakala)
const h = window.location.hash
export const AUTH_LINK: 'invite' | 'recovery' | null =
  /type=invite/.test(h) ? 'invite' : /type=recovery/.test(h) ? 'recovery' : null

export const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY)

export type Row = Record<string, any>

// ---------- Etiketler ----------
export const STAGES: [string, string][] = [
  ['fikir', 'Fikir'], ['temas', 'Temas'], ['numune_teklif', 'Numune / Teklif'], ['siparis', 'Sipariş'], ['kapandi', 'Kapandı'],
]
export const SUP_STATUS: [string, string][] = [
  ['aday', 'Aday'], ['gorusuluyor', 'Görüşülüyor'], ['anlasmali', 'Anlaşmalı'], ['pasif', 'Pasif'],
]
export const CONTACT_ROLE: [string, string][] = [
  ['araci', 'Aracı / bağlantı'], ['tedarikci_yetkilisi', 'Tedarikçi yetkilisi'], ['alici_yetkilisi', 'Alıcı yetkilisi'],
  ['danisman', 'Danışman'], ['diger', 'Diğer'],
]
export const FILE_KIND: [string, string][] = [
  ['katalog', 'Katalog'], ['fiyat_listesi', 'Fiyat listesi'], ['teknik_foy', 'Teknik föy'],
  ['sertifika', 'Sertifika'], ['tanitim', 'Tanıtım'], ['diger', 'Diğer'],
]
export const label = (list: [string, string][], v: string) => list.find(x => x[0] === v)?.[1] ?? v
export const statusTag = (s: string) => ({ anlasmali: 'ok', gorusuluyor: 'wn', aday: 'gy', pasif: 'rd' } as Record<string, string>)[s] ?? 'gy'

export const fmtDate = (d?: string | null) => (d ? d.slice(0, 10).split('-').reverse().join('.') : '')
export const fmtTime = (d: string) => {
  const t = new Date(d), now = new Date()
  const hm = t.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  if (t.toDateString() === now.toDateString()) return 'bugün ' + hm
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (t.toDateString() === y.toDateString()) return 'dün ' + hm
  return t.toLocaleDateString('tr-TR') + ' ' + hm
}
export const initials = (name?: string) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
export const today = () => new Date().toISOString().slice(0, 10)

// ---------- Paylaşılan veri ----------
export type Data = {
  me: Row
  profiles: Row[]
  suppliers: Row[]
  products: Row[]
  customers: Row[]
  contacts: Row[]
  opportunities: Row[]
  files: Row[]
  matches: Row[]
  activity: Row[]
}
export type Ctx = Data & {
  reload: () => Promise<void>
  toast: (t: string) => void
  open: (node: React.ReactNode) => void
  close: () => void
  isAdmin: boolean
  pname: (id?: string | null) => string
  byId: (table: keyof Data, id?: string | null) => Row | undefined
}
export const DataCtx = createContext<Ctx>(null as unknown as Ctx)
export const useData = () => useContext(DataCtx)

export async function loadAll(uid: string): Promise<Data> {
  const q = (t: string, order = 'created_at') => sb.from(t).select('*').order(order, { ascending: false })
  const [profiles, suppliers, products, customers, contacts, opportunities, files, matches, activity] = await Promise.all([
    sb.from('profiles').select('*').order('full_name'),
    q('suppliers'), q('products'), q('customers'), q('contacts'), q('opportunities'), q('files'), q('matches'),
    sb.from('activity_log').select('*').order('created_at', { ascending: false }).limit(30),
  ])
  const d = (r: { data: Row[] | null }) => r.data ?? []
  const p = d(profiles)
  return {
    me: p.find(x => x.id === uid) ?? {},
    profiles: p, suppliers: d(suppliers), products: d(products), customers: d(customers), contacts: d(contacts),
    opportunities: d(opportunities), files: d(files), matches: d(matches), activity: d(activity),
  }
}

// Supabase hatalarını Türkçeleştir
export function errText(e: { message?: string; code?: string } | null): string {
  if (!e) return ''
  const m = e.message || ''
  if (/row-level security/i.test(m)) return 'Bu işlem için yetkiniz yok.'
  if (/foreign key/i.test(m)) return 'Bu kayda bağlı başka kayıtlar var.'
  if (/duplicate key/i.test(m)) return 'Bu kayıt zaten var.'
  if (/Invalid login/i.test(m)) return 'Kullanıcı adı veya şifre hatalı.'
  if (/Password should be/i.test(m)) return 'Şifre en az 8 karakter olmalı.'
  return m
}
