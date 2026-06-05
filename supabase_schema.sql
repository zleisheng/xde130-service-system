-- XDE130 V6 登录痕迹 + 查询记录 Supabase 建表脚本
-- 在 Supabase SQL Editor 里执行

create table if not exists public.xde130_access_logs (
  id bigserial primary key,
  event_type text not null,
  operator_name text,
  operator_id text,
  role text,
  query_text text,
  matched_count integer default 0,
  detail jsonb default '{}'::jsonb,
  user_agent text,
  device text,
  session_id text,
  created_at timestamptz default now()
);

alter table public.xde130_access_logs enable row level security;

-- 内测简化策略：允许前端匿名写入和读取记录。
-- 如需更高安全，后期建议改成 Cloudflare Worker / 后台接口，不直接开放 select。
drop policy if exists "xde130_insert_logs" on public.xde130_access_logs;
create policy "xde130_insert_logs"
on public.xde130_access_logs
for insert
to anon
with check (true);

drop policy if exists "xde130_read_logs" on public.xde130_access_logs;
create policy "xde130_read_logs"
on public.xde130_access_logs
for select
to anon
using (true);
