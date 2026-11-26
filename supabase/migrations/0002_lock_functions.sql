-- İç fonksiyonları dış erişime kapat (Supabase güvenlik denetimi önerisi).
-- Tetikleyici fonksiyonları doğrudan çağrılamaz; tetikleyiciler çalışmaya devam eder.
revoke execute on function log_insert() from public, anon, authenticated;
revoke execute on function log_stage_change() from public, anon, authenticated;
revoke execute on function touch_updated_at() from public, anon, authenticated;
-- RLS kuralları bunları giriş yapmış kullanıcı adına çağırır.
revoke execute on function is_admin() from public, anon;
revoke execute on function is_member() from public, anon;
grant execute on function is_admin() to authenticated;
grant execute on function is_member() to authenticated;
-- email_for_username bilerek anon'a açık: giriş ekranı kullanıcı adını e-postaya çevirir.
