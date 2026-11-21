-- Son Kural Bükücü: çekirdek şema + RLS
create extension if not exists pgcrypto;
create type user_role as enum ('user','moderator','admin');

create table profiles(
 id uuid primary key references auth.users on delete cascade,
 username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
 display_name text, bio text default '', avatar_url text, cover_url text,
 is_private boolean not null default false, is_verified boolean not null default false,
 role user_role not null default 'user', interests text[] default '{}',
 last_seen timestamptz default now(), created_at timestamptz default now());

create table posts(
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references profiles on delete cascade,
 body text check (char_length(body) <= 2000), media_url text, media_type text check (media_type in ('image','video')),
 is_draft boolean not null default false, created_at timestamptz default now(), edited_at timestamptz);
create index on posts(author_id, created_at desc); create index on posts(created_at desc) where not is_draft;

create table follows(
 follower_id uuid references profiles on delete cascade, following_id uuid references profiles on delete cascade,
 status text not null default 'accepted' check (status in ('pending','accepted')),
 created_at timestamptz default now(), primary key(follower_id, following_id), check (follower_id <> following_id));
create table likes(post_id uuid references posts on delete cascade, user_id uuid references profiles on delete cascade, primary key(post_id,user_id));
create table saves(post_id uuid references posts on delete cascade, user_id uuid references profiles on delete cascade, primary key(post_id,user_id));
create table comments(id uuid primary key default gen_random_uuid(), post_id uuid not null references posts on delete cascade,
 author_id uuid not null references profiles on delete cascade, body text not null check (char_length(body) between 1 and 1000), created_at timestamptz default now());
create table blocks(blocker_id uuid references profiles on delete cascade, blocked_id uuid references profiles on delete cascade, muted_only boolean default false, primary key(blocker_id,blocked_id));
create table notifications(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade,
 actor_id uuid references profiles on delete cascade, kind text not null check (kind in ('like','comment','follow','request','message')),
 post_id uuid references posts on delete cascade, read boolean default false, created_at timestamptz default now());
create table reports(id uuid primary key default gen_random_uuid(), reporter_id uuid references profiles on delete set null,
 post_id uuid references posts on delete cascade, user_id uuid references profiles on delete cascade, reason text not null,
 status text default 'open' check (status in ('open','resolved','dismissed')), created_at timestamptz default now());
create table conversations(id uuid primary key default gen_random_uuid(), title text, is_group boolean default false, created_at timestamptz default now());
create table conversation_members(conversation_id uuid references conversations on delete cascade, user_id uuid references profiles on delete cascade, primary key(conversation_id,user_id));
create table messages(id uuid primary key default gen_random_uuid(), conversation_id uuid not null references conversations on delete cascade,
 sender_id uuid not null references profiles on delete cascade, body text, image_url text, pinned boolean default false,
 read_by uuid[] default '{}', reactions jsonb default '{}', deleted boolean default false, created_at timestamptz default now());
create index on messages(conversation_id, created_at desc);

create function is_staff() returns boolean language sql stable security definer set search_path=public as
 $$ select exists(select 1 from profiles where id=auth.uid() and role in ('moderator','admin')) $$;
create function is_admin() returns boolean language sql stable security definer set search_path=public as
 $$ select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
create function is_member(c uuid) returns boolean language sql stable security definer set search_path=public as
 $$ select exists(select 1 from conversation_members where conversation_id=c and user_id=auth.uid()) $$;
create function can_view_user(u uuid) returns boolean language sql stable security definer set search_path=public as
 $$ select u=auth.uid() or is_staff() or (
   not exists(select 1 from blocks where blocker_id=u and blocked_id=auth.uid() and not muted_only) and
   (not (select is_private from profiles where id=u) or exists(select 1 from follows where follower_id=auth.uid() and following_id=u and status='accepted'))) $$;

create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,username,display_name) values (new.id, lower(coalesce(new.raw_user_meta_data->>'username','user'||substr(new.id::text,1,8))), new.raw_user_meta_data->>'username'); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create function protect_profile() returns trigger language plpgsql as $$
begin if not is_admin() and (new.role<>old.role or new.is_verified<>old.is_verified) then raise exception 'yetkisiz'; end if; return new; end $$;
create trigger protect_profile_t before update on profiles for each row execute function protect_profile();

alter table profiles enable row level security; alter table posts enable row level security; alter table follows enable row level security;
alter table likes enable row level security; alter table saves enable row level security; alter table comments enable row level security;
alter table blocks enable row level security; alter table notifications enable row level security; alter table reports enable row level security;
alter table conversations enable row level security; alter table conversation_members enable row level security; alter table messages enable row level security;

create policy p_sel on profiles for select using (true);
create policy p_upd on profiles for update using (id=auth.uid() or is_admin()) with check (id=auth.uid() or is_admin());
create policy po_sel on posts for select using ((not is_draft and can_view_user(author_id)) or author_id=auth.uid() or is_staff());
create policy po_ins on posts for insert with check (author_id=auth.uid());
create policy po_upd on posts for update using (author_id=auth.uid()) with check (author_id=auth.uid());
create policy po_del on posts for delete using (author_id=auth.uid() or is_staff());
create policy f_sel on follows for select using (follower_id=auth.uid() or following_id=auth.uid() or is_staff());
create policy f_ins on follows for insert with check (follower_id=auth.uid() and status = case when (select is_private from profiles where id=following_id) then 'pending' else 'accepted' end);
create policy f_upd on follows for update using (following_id=auth.uid()) with check (following_id=auth.uid());
create policy f_del on follows for delete using (follower_id=auth.uid() or following_id=auth.uid());
create policy l_sel on likes for select using (exists(select 1 from posts where id=post_id));
create policy l_ins on likes for insert with check (user_id=auth.uid() and exists(select 1 from posts where id=post_id));
create policy l_del on likes for delete using (user_id=auth.uid());
create policy s_all on saves for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy c_sel on comments for select using (exists(select 1 from posts where id=post_id));
create policy c_ins on comments for insert with check (author_id=auth.uid() and exists(select 1 from posts where id=post_id));
create policy c_del on comments for delete using (author_id=auth.uid() or is_staff());
create policy b_all on blocks for all using (blocker_id=auth.uid()) with check (blocker_id=auth.uid());
create policy n_sel on notifications for select using (user_id=auth.uid());
create policy n_upd on notifications for update using (user_id=auth.uid());
create policy r_ins on reports for insert with check (reporter_id=auth.uid());
create policy r_sel on reports for select using (is_staff());
create policy r_upd on reports for update using (is_staff());
create policy cv_sel on conversations for select using (is_member(id));
create policy cm_sel on conversation_members for select using (is_member(conversation_id));
create policy m_sel on messages for select using (is_member(conversation_id));
create policy m_ins on messages for insert with check (sender_id=auth.uid() and is_member(conversation_id));
create policy m_upd on messages for update using (is_member(conversation_id));

create function notify_like() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into notifications(user_id,actor_id,kind,post_id) select author_id,new.user_id,'like',new.post_id from posts where id=new.post_id and author_id<>new.user_id; return new; end $$;
create trigger t_like after insert on likes for each row execute function notify_like();
create function notify_follow() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into notifications(user_id,actor_id,kind) values (new.following_id,new.follower_id, case when new.status='pending' then 'request' else 'follow' end); return new; end $$;
create trigger t_follow after insert on follows for each row execute function notify_follow();

alter publication supabase_realtime add table messages, notifications;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('media','media',true,26214400,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']) on conflict do nothing;
create policy st_ins on storage.objects for insert to authenticated with check (bucket_id='media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy st_sel on storage.objects for select using (bucket_id='media');
create policy st_del on storage.objects for delete to authenticated using (bucket_id='media' and (storage.foldername(name))[1]=auth.uid()::text);
