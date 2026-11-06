-- D22 Takip – ilk şema (taslak)
-- Ortak alan: tüm ortaklar okur/yazar, yalnızca yönetici siler.
-- Özel alan (circles, circle_members, matches): yalnızca sahibi görür.

create extension if not exists pg_trgm;

-- ---------- Türler ----------
create type user_role as enum ('yonetici', 'ortak');
create type supplier_status as enum ('aday', 'gorusuluyor', 'anlasmali', 'pasif');
create type opp_stage as enum ('fikir', 'temas', 'numune_teklif', 'siparis', 'kapandi');
create type contact_role as enum ('araci', 'tedarikci_yetkilisi', 'alici_yetkilisi', 'danisman', 'diger');
create type file_kind as enum ('katalog', 'fiyat_listesi', 'teknik_foy', 'sertifika', 'tanitim', 'diger');
create type circle_source as enum ('csv', 'senitix', 'elle', 'diger');
create type match_status as enum ('bekliyor', 'sonra', 'kabul', 'ilgisiz');
create type event_kind as enum ('not', 'asama', 'sistem', 'dosya', 'eslesme');

-- ---------- Kullanıcılar ----------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{2,32}$'),
  full_name text not null,
  role user_role not null default 'ortak',
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'yonetici');
$$;

create or replace function is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid());
$$;

-- Kullanıcı adıyla giriş: ön yüz önce e-postayı alır, sonra signInWithPassword çağırır.
create or replace function email_for_username(p_username text) returns text
language sql stable security definer set search_path = public, auth as $$
  select u.email from auth.users u join profiles p on p.id = u.id
  where p.username = lower(trim(p_username));
$$;
revoke all on function email_for_username(text) from public;
grant execute on function email_for_username(text) to anon, authenticated;

-- ---------- Ortak alan ----------
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  sector text,
  product_summary text,
  status supplier_status not null default 'aday',
  website text,
  notes text,
  drive_folder_id text,
  created_by uuid not null default auth.uid() references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id) on delete cascade,
  name text not null,
  product_group text,
  target_markets text,
  price_info text,
  keywords text[] not null default '{}',
  created_by uuid not null default auth.uid() references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text,
  sector text,
  needs text,
  source text,                       -- "Saha ziyareti", "Serkan Bey bağlantısı"…
  created_by uuid not null default auth.uid() references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role contact_role not null default 'diger',
  title text,
  phone text,
  email text,
  supplier_id uuid references suppliers (id) on delete set null,
  customer_id uuid references customers (id) on delete set null,
  company_text text,                 -- sistemde kaydı olmayan firma
  notes text,
  created_by uuid not null default auth.uid() references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  supplier_id uuid references suppliers (id) on delete set null,
  customer_id uuid references customers (id) on delete set null,
  customer_text text,                -- alıcı henüz kayıtlı değilse ("Budva otel projesi")
  intermediary_id uuid references contacts (id) on delete set null,
  stage opp_stage not null default 'fikir',
  lost boolean not null default false,
  owner_id uuid not null default auth.uid() references profiles (id),  -- sorumlu
  next_step text,
  next_step_date date,
  description text,
  created_by uuid not null default auth.uid() references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table opportunity_events (
  id bigint generated always as identity primary key,
  opportunity_id uuid not null references opportunities (id) on delete cascade,
  kind event_kind not null default 'not',
  body text not null,
  actor_id uuid references profiles (id) default auth.uid(),   -- null = sistem
  created_at timestamptz not null default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind file_kind not null default 'diger',
  supplier_id uuid references suppliers (id) on delete set null,
  opportunity_id uuid references opportunities (id) on delete set null,
  storage_path text,
  drive_file_id text,
  summary text,
  created_by uuid not null default auth.uid() references profiles (id),
  created_at timestamptz not null default now()
);

create table activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles (id),      -- null = sistem
  entity text not null,                         -- 'suppliers', 'opportunities'…
  entity_id uuid,
  action text not null,                         -- 'insert' | 'update' | 'stage'…
  summary text not null,
  created_at timestamptz not null default now()
);

-- ---------- Özel alan (çevre + eşleşme) ----------
create table circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  name text not null,                -- "İK Ekspert müşterileri"
  source circle_source not null default 'csv',
  source_ref text,                   -- dış sistem kimliği (ör. Senitix hesap/rapor)
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create table circle_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  owner_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  name text not null,
  sector text,
  country text,
  needs text,
  keywords text[] not null default '{}',
  external_ref text,
  created_at timestamptz not null default now(),
  unique (circle_id, external_ref)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,  -- uyarılacak ortak
  circle_member_id uuid not null references circle_members (id) on delete cascade,
  supplier_id uuid references suppliers (id) on delete cascade,
  product_id uuid references products (id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  reason text not null,
  status match_status not null default 'bekliyor',
  remind_at timestamptz,
  opportunity_id uuid references opportunities (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  check (supplier_id is not null or product_id is not null)
);
create unique index matches_pair_uq
  on matches (circle_member_id, coalesce(supplier_id, '00000000-0000-0000-0000-000000000000'::uuid),
              coalesce(product_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ---------- İndeksler ----------
create index on products (supplier_id);
create index on contacts (supplier_id);
create index on contacts (customer_id);
create index on opportunities (supplier_id);
create index on opportunities (customer_id);
create index on opportunities (owner_id);
create index on opportunities (stage) where not lost;
create index on opportunity_events (opportunity_id, created_at);
create index on files (supplier_id);
create index on activity_log (created_at desc);
create index on circle_members (circle_id);
create index on circle_members (owner_id);
create index on matches (owner_id, status);
create index suppliers_trgm on suppliers using gin ((coalesce(name,'') || ' ' || coalesce(sector,'') || ' ' || coalesce(product_summary,'')) gin_trgm_ops);
create index products_trgm on products using gin ((coalesce(name,'') || ' ' || coalesce(product_group,'')) gin_trgm_ops);
create index circle_members_trgm on circle_members using gin ((coalesce(sector,'') || ' ' || coalesce(needs,'')) gin_trgm_ops);

-- ---------- updated_at ----------
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create trigger t_suppliers_touch before update on suppliers for each row execute function touch_updated_at();
create trigger t_products_touch before update on products for each row execute function touch_updated_at();
create trigger t_customers_touch before update on customers for each row execute function touch_updated_at();
create trigger t_contacts_touch before update on contacts for each row execute function touch_updated_at();
create trigger t_opportunities_touch before update on opportunities for each row execute function touch_updated_at();

-- ---------- Aşama değişimi → geçmiş ----------
create or replace function log_stage_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.stage is distinct from old.stage then
    insert into opportunity_events (opportunity_id, kind, body, actor_id)
    values (new.id, 'asama', 'Aşama → ' || new.stage::text, auth.uid());
    insert into activity_log (actor_id, entity, entity_id, action, summary)
    values (auth.uid(), 'opportunities', new.id, 'stage', new.title || ': ' || new.stage::text);
  end if;
  return new;
end $$;
create trigger t_opp_stage after update on opportunities for each row execute function log_stage_change();

-- ---------- Yeni kayıt → son hareketler ----------
create or replace function log_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare label text;
begin
  label := case tg_table_name
    when 'suppliers' then 'Tedarikçi eklendi: '
    when 'products' then 'Ürün eklendi: '
    when 'customers' then 'Müşteri eklendi: '
    when 'opportunities' then 'Fırsat açıldı: '
    else 'Kayıt eklendi: ' end;
  insert into activity_log (actor_id, entity, entity_id, action, summary)
  values (auth.uid(), tg_table_name, new.id, 'insert',
          label || coalesce(to_jsonb(new)->>'name', to_jsonb(new)->>'title', ''));
  return new;
end $$;
create trigger t_sup_log after insert on suppliers for each row execute function log_insert();
create trigger t_prd_log after insert on products for each row execute function log_insert();
create trigger t_cus_log after insert on customers for each row execute function log_insert();
create trigger t_opp_log after insert on opportunities for each row execute function log_insert();

-- ---------- RLS ----------
alter table profiles enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table customers enable row level security;
alter table contacts enable row level security;
alter table opportunities enable row level security;
alter table opportunity_events enable row level security;
alter table files enable row level security;
alter table activity_log enable row level security;
alter table circles enable row level security;
alter table circle_members enable row level security;
alter table matches enable row level security;

-- profiles: herkes okur, kişi kendi adını düzenler, rol/yeni kullanıcı yalnızca yönetici
create policy profiles_read on profiles for select to authenticated using (is_member());
create policy profiles_admin on profiles for all to authenticated using (is_admin()) with check (is_admin());
create policy profiles_self_update on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from profiles p where p.id = auth.uid()));

-- Ortak alan tabloları: oku/ekle/düzenle = ortak, sil = yönetici
do $$
declare t text;
begin
  foreach t in array array['suppliers','products','customers','contacts','opportunities','files'] loop
    execute format('create policy %1$s_read on %1$s for select to authenticated using (is_member())', t);
    execute format('create policy %1$s_insert on %1$s for insert to authenticated with check (is_member() and created_by = auth.uid())', t);
    execute format('create policy %1$s_update on %1$s for update to authenticated using (is_member()) with check (is_member())', t);
    execute format('create policy %1$s_delete on %1$s for delete to authenticated using (is_admin())', t);
  end loop;
end $$;

create policy events_read on opportunity_events for select to authenticated using (is_member());
create policy events_insert on opportunity_events for insert to authenticated
  with check (is_member() and actor_id = auth.uid() and kind = 'not');
create policy activity_read on activity_log for select to authenticated using (is_member());

-- Özel alan: yalnızca sahibi (yönetici dahil başkası göremez)
create policy circles_own on circles for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy circle_members_own on circle_members for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
              and exists (select 1 from circles c where c.id = circle_id and c.owner_id = auth.uid()));
-- Eşleşmeleri yalnızca motor (service_role) üretir; ortak kendi önerisini görür ve karar verir.
create policy matches_read on matches for select to authenticated using (owner_id = auth.uid());
create policy matches_decide on matches for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
