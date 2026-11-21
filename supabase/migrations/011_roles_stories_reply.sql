alter table messages add column if not exists reply_to uuid references messages(id) on delete set null;
alter table stories add column if not exists overlays jsonb not null default '[]'::jsonb check (jsonb_typeof(overlays)='array' and jsonb_array_length(overlays)<=12);
alter table stories add column if not exists music_start int not null default 0 check (music_start between 0 and 7200);
create table if not exists ranks(id uuid primary key default gen_random_uuid(), name text not null unique check (char_length(name) between 1 and 20),
 color text not null check (color ~ '^#[0-9a-fA-F]{6}$'), emoji text check (char_length(emoji)<=4), priority int not null default 0,
 can_moderate boolean not null default false, created_at timestamptz default now());
alter table profiles add column if not exists rank_id uuid references ranks on delete set null;
alter table ranks enable row level security;
drop policy if exists rk_sel on ranks; create policy rk_sel on ranks for select using (true);
drop policy if exists rk_ins on ranks; create policy rk_ins on ranks for insert with check (is_admin());
drop policy if exists rk_upd on ranks; create policy rk_upd on ranks for update using (is_admin()) with check (is_admin());
drop policy if exists rk_del on ranks; create policy rk_del on ranks for delete using (is_admin());
create or replace function is_staff() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles p left join ranks r on r.id=p.rank_id where p.id=auth.uid() and (p.role in ('moderator','admin') or coalesce(r.can_moderate,false))) $$;
create or replace function protect_profile() returns trigger language plpgsql as $$
begin
 if auth.uid() is not null and not is_admin() and (new.role<>old.role or new.is_verified<>old.is_verified or new.rank_id is distinct from old.rank_id) then raise exception 'yetkisiz'; end if;
 if auth.uid() is not null and not is_staff() and new.banned<>old.banned then raise exception 'yetkisiz'; end if;
 return new; end $$;
create or replace function admin_set_rank(u uuid, r uuid) returns void language plpgsql security definer set search_path=public as $$
begin if not is_admin() then raise exception 'yetkisiz'; end if; update profiles set rank_id=r where id=u; end $$;
create or replace function protect_message() returns trigger language plpgsql as $$
begin
 if auth.uid() is null then return new; end if;
 if new.sender_id<>old.sender_id or new.conversation_id<>old.conversation_id or new.reply_to is distinct from old.reply_to then raise exception 'yetkisiz'; end if;
 if not (auth.uid()=old.sender_id and new.deleted) and (new.body is distinct from old.body or new.image_url is distinct from old.image_url or new.audio_url is distinct from old.audio_url) then raise exception 'yetkisiz'; end if;
 if auth.uid()<>old.sender_id and new.deleted<>old.deleted then raise exception 'yetkisiz'; end if;
 return new; end $$;
