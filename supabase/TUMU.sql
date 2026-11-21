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
create table stories(id uuid primary key default gen_random_uuid(), author_id uuid not null references profiles on delete cascade,
 media_url text not null, media_type text not null check (media_type in ('image','video')),
 audience text not null default 'all' check (audience in ('all','followers')),
 created_at timestamptz default now(), expires_at timestamptz not null default now()+interval '24 hours');
create index on stories(author_id, expires_at);
create table story_views(story_id uuid references stories on delete cascade, user_id uuid references profiles on delete cascade,
 reaction text check (char_length(reaction)<=8), created_at timestamptz default now(), primary key(story_id,user_id));
create table reposts(post_id uuid references posts on delete cascade, user_id uuid references profiles on delete cascade, created_at timestamptz default now(), primary key(post_id,user_id));
create table notes(user_id uuid primary key references profiles on delete cascade, body text not null check (char_length(body) between 1 and 60),
 expires_at timestamptz not null default now()+interval '24 hours');
alter table stories enable row level security; alter table story_views enable row level security; alter table reposts enable row level security; alter table notes enable row level security;
create policy s_sel on stories for select using (author_id=auth.uid() or is_staff() or (expires_at>now() and can_view_user(author_id) and
 (audience='all' or exists(select 1 from follows where follower_id=auth.uid() and following_id=author_id and status='accepted'))));
create policy s_ins on stories for insert with check (author_id=auth.uid());
create policy s_del on stories for delete using (author_id=auth.uid() or is_staff());
create policy sv_sel on story_views for select using (user_id=auth.uid() or exists(select 1 from stories where id=story_id and author_id=auth.uid()));
create policy sv_ins on story_views for insert with check (user_id=auth.uid() and exists(select 1 from stories where id=story_id));
create policy sv_upd on story_views for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy rp_sel on reposts for select using (exists(select 1 from posts where id=post_id));
create policy rp_ins on reposts for insert with check (user_id=auth.uid() and exists(select 1 from posts where id=post_id));
create policy rp_del on reposts for delete using (user_id=auth.uid());
create policy nt_sel on notes for select using (user_id=auth.uid() or (expires_at>now() and can_view_user(user_id)));
create policy nt_ins on notes for insert with check (user_id=auth.uid());
create policy nt_upd on notes for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy nt_del on notes for delete using (user_id=auth.uid());
create or replace function profile_stats(u uuid) returns json language sql stable security definer set search_path=public as $$
 select json_build_object(
  'posts',(select count(*) from posts where author_id=u and not is_draft),
  'followers',(select count(*) from follows where following_id=u and status='accepted'),
  'following',(select count(*) from follows where follower_id=u and status='accepted')) $$;
create or replace function notify_comment() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into notifications(user_id,actor_id,kind,post_id) select author_id,new.author_id,'comment',new.post_id from posts where id=new.post_id and author_id<>new.author_id; return new; end $$;
drop trigger if exists t_comment on comments;
create trigger t_comment after insert on comments for each row execute function notify_comment();
create or replace function start_dm(other uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare c uuid;
begin
 if other=auth.uid() then raise exception 'geçersiz'; end if;
 if exists(select 1 from blocks where (blocker_id=other and blocked_id=auth.uid()) or (blocker_id=auth.uid() and blocked_id=other)) then raise exception 'engelli'; end if;
 select a.conversation_id into c from conversation_members a join conversation_members b on a.conversation_id=b.conversation_id join conversations v on v.id=a.conversation_id
  where a.user_id=auth.uid() and b.user_id=other and not v.is_group limit 1;
 if c is null then insert into conversations default values returning id into c; insert into conversation_members values (c,auth.uid()),(c,other); end if;
 return c; end $$;
create or replace function create_group(t text, members uuid[]) returns uuid language plpgsql security definer set search_path=public as $$
declare c uuid; m uuid;
begin
 if array_length(members,1) is null or array_length(members,1)>49 then raise exception 'geçersiz'; end if;
 insert into conversations(title,is_group) values (left(coalesce(nullif(trim(t),''),'Grup'),50),true) returning id into c;
 insert into conversation_members values (c,auth.uid());
 foreach m in array members loop
  if m<>auth.uid() and not exists(select 1 from blocks where blocker_id=m and blocked_id=auth.uid()) then insert into conversation_members values (c,m) on conflict do nothing; end if;
 end loop; return c; end $$;
create or replace function mark_read(cid uuid) returns void language sql security definer set search_path=public as $$
 update messages set read_by=array_append(read_by,auth.uid()) where conversation_id=cid and sender_id<>auth.uid() and not (auth.uid()=any(read_by)) and is_member(cid) $$;
create or replace function react(mid uuid, e text) returns void language plpgsql security definer set search_path=public as $$
declare cur jsonb; arr jsonb;
begin
 select reactions into cur from messages where id=mid and is_member(conversation_id); if cur is null then return; end if;
 arr:=coalesce(cur->e,'[]'::jsonb);
 if arr ? auth.uid()::text then arr:=arr-auth.uid()::text; else arr:=arr||to_jsonb(auth.uid()::text); end if;
 update messages set reactions=case when jsonb_array_length(arr)=0 then cur-e else jsonb_set(cur,array[e],arr) end where id=mid; end $$;
create or replace function protect_message() returns trigger language plpgsql as $$
begin
 if auth.uid() is null then return new; end if;
 if new.sender_id<>old.sender_id or new.conversation_id<>old.conversation_id then raise exception 'yetkisiz'; end if;
 if not (auth.uid()=old.sender_id and new.deleted) and (new.body is distinct from old.body or new.image_url is distinct from old.image_url) then raise exception 'yetkisiz'; end if;
 if auth.uid()<>old.sender_id and new.deleted<>old.deleted then raise exception 'yetkisiz'; end if;
 return new; end $$;
drop trigger if exists protect_message_t on messages;
create trigger protect_message_t before update on messages for each row execute function protect_message();
alter table messages replica identity full;
alter table profiles add column if not exists banned boolean not null default false;
create or replace function not_banned() returns boolean language sql stable security definer set search_path=public as $$ select not coalesce((select banned from profiles where id=auth.uid()),false) $$;
drop policy if exists po_ins on posts; create policy po_ins on posts for insert with check (author_id=auth.uid() and not_banned());
drop policy if exists c_ins on comments; create policy c_ins on comments for insert with check (author_id=auth.uid() and not_banned() and exists(select 1 from posts where id=post_id));
drop policy if exists m_ins on messages; create policy m_ins on messages for insert with check (sender_id=auth.uid() and not_banned() and is_member(conversation_id));
drop policy if exists s_ins on stories; create policy s_ins on stories for insert with check (author_id=auth.uid() and not_banned());
create or replace function protect_profile() returns trigger language plpgsql as $$
begin
 if auth.uid() is not null and not is_admin() and (new.role<>old.role or new.is_verified<>old.is_verified) then raise exception 'yetkisiz'; end if;
 if auth.uid() is not null and not is_staff() and new.banned<>old.banned then raise exception 'yetkisiz'; end if;
 return new; end $$;
create or replace function admin_stats() returns json language plpgsql security definer set search_path=public as $$
begin if not is_staff() then raise exception 'yetkisiz'; end if;
 return json_build_object('users',(select count(*) from profiles),'new_users_7d',(select count(*) from profiles where created_at>now()-interval '7 days'),
 'posts',(select count(*) from posts where not is_draft),'comments',(select count(*) from comments),'messages',(select count(*) from messages),
 'active_stories',(select count(*) from stories where expires_at>now()),'open_reports',(select count(*) from reports where status='open'),'banned',(select count(*) from profiles where banned)); end $$;
create or replace function admin_set_banned(u uuid, v boolean) returns void language plpgsql security definer set search_path=public as $$
begin if not is_staff() or u=auth.uid() or (select role from profiles where id=u)='admin' then raise exception 'yetkisiz'; end if; update profiles set banned=v where id=u; end $$;
create or replace function admin_set_role(u uuid, r user_role) returns void language plpgsql security definer set search_path=public as $$
begin if not is_admin() or u=auth.uid() then raise exception 'yetkisiz'; end if; update profiles set role=r where id=u; end $$;
create or replace function admin_set_verified(u uuid, v boolean) returns void language plpgsql security definer set search_path=public as $$
begin if not is_admin() then raise exception 'yetkisiz'; end if; update profiles set is_verified=v where id=u; end $$;
create or replace function resolve_report(rid uuid, st text, del_post boolean) returns void language plpgsql security definer set search_path=public as $$
declare pid uuid;
begin if not is_staff() or st not in ('resolved','dismissed') then raise exception 'yetkisiz'; end if;
 select post_id into pid from reports where id=rid; update reports set status=st where id=rid;
 if del_post and pid is not null then delete from posts where id=pid; end if; end $$;
create or replace function follow_list(u uuid, kind text) returns table(id uuid, username text, display_name text, avatar_url text) language sql stable security definer set search_path=public as $$
 select p.id,p.username,p.display_name,p.avatar_url from follows f join profiles p on p.id=case when kind='followers' then f.follower_id else f.following_id end
 where f.status='accepted' and can_view_user(u) and case when kind='followers' then f.following_id=u else f.follower_id=u end limit 200 $$;
create or replace function rate_limit() returns trigger language plpgsql as $$
declare n int;
begin execute format('select count(*) from %I where %I=$1 and created_at>now()-$2::interval',TG_TABLE_NAME,TG_ARGV[0]) into n using (to_jsonb(new)->>TG_ARGV[0])::uuid, TG_ARGV[2];
 if n>=TG_ARGV[1]::int then raise exception 'Çok hızlı işlem yapıyorsun, biraz bekle.'; end if; return new; end $$;
drop trigger if exists rl_posts on posts; create trigger rl_posts before insert on posts for each row execute function rate_limit('author_id','20','1 hour');
drop trigger if exists rl_comments on comments; create trigger rl_comments before insert on comments for each row execute function rate_limit('author_id','30','1 minute');
drop trigger if exists rl_messages on messages; create trigger rl_messages before insert on messages for each row execute function rate_limit('sender_id','60','1 minute');
drop trigger if exists rl_reports on reports; create trigger rl_reports before insert on reports for each row execute function rate_limit('reporter_id','10','1 hour');
alter table profiles add column if not exists theme_color text check (theme_color ~ '^#[0-9a-fA-F]{6}$');
alter table stories add column if not exists audio_url text;
alter table messages add column if not exists audio_url text;
update storage.buckets set allowed_mime_types=array['image/jpeg','image/png','image/webp','video/mp4','video/webm','audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav','audio/aac','audio/x-m4a'] where id='media';
alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in ('like','comment','follow','request','message','mention'));
create or replace function notify_mentions() returns trigger language plpgsql security definer set search_path=public as $$
declare m text; pid uuid;
begin
 if new.body is null then return new; end if;
 pid := coalesce((to_jsonb(new)->>'post_id')::uuid, new.id);
 for m in select distinct lower(x[1]) from regexp_matches(new.body,'@([a-zA-Z0-9_]{3,20})','g') as x loop
  insert into notifications(user_id,actor_id,kind,post_id)
  select p.id,new.author_id,'mention',pid from profiles p where p.username=m and p.id<>new.author_id
   and not exists(select 1 from blocks b where b.blocker_id=p.id and b.blocked_id=new.author_id);
 end loop; return new; end $$;
drop trigger if exists t_mention_post on posts; create trigger t_mention_post after insert on posts for each row execute function notify_mentions();
drop trigger if exists t_mention_comment on comments; create trigger t_mention_comment after insert on comments for each row execute function notify_mentions();
create or replace function protect_message() returns trigger language plpgsql as $$
begin
 if auth.uid() is null then return new; end if;
 if new.sender_id<>old.sender_id or new.conversation_id<>old.conversation_id then raise exception 'yetkisiz'; end if;
 if not (auth.uid()=old.sender_id and new.deleted) and (new.body is distinct from old.body or new.image_url is distinct from old.image_url or new.audio_url is distinct from old.audio_url) then raise exception 'yetkisiz'; end if;
 if auth.uid()<>old.sender_id and new.deleted<>old.deleted then raise exception 'yetkisiz'; end if;
 return new; end $$;
alter table stories add column if not exists music_id text check (music_id ~ '^[A-Za-z0-9_-]{11}$');
alter table stories add column if not exists music_title text check (char_length(music_title) <= 150);
create or replace function notify_mentions() returns trigger language plpgsql security definer set search_path=public as $$
declare m text; pid uuid;
begin
 if new.body is null then return new; end if;
 pid := coalesce((to_jsonb(new)->>'post_id')::uuid, new.id);
 for m in select distinct lower(x[1]) from regexp_matches(new.body,'@([a-zA-Z0-9_]{3,20})','g') as x loop
  insert into notifications(user_id,actor_id,kind,post_id)
  select p.id,new.author_id,'mention',pid from profiles p where p.username=m and p.id<>new.author_id
   and not exists(select 1 from blocks b where b.blocker_id=p.id and b.blocked_id=new.author_id);
 end loop; return new; end $$;
create or replace function trending_tags() returns table(tag text, n bigint) language sql stable security definer set search_path=public as $$
 select lower(m[1]) as tag, count(*) as n from posts p join profiles u on u.id=p.author_id,
 regexp_matches(p.body,'#([[:alnum:]_]{2,30})','g') as m
 where not p.is_draft and not u.is_private and p.body is not null and p.created_at>now()-interval '7 days'
 group by 1 order by n desc, tag limit 10 $$;
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
-- ===== Çoklu medya =====
create table post_media(id uuid primary key default gen_random_uuid(), post_id uuid not null references posts on delete cascade, url text not null, type text not null check (type in ('image','video')), position int not null default 0);
create index on post_media(post_id, position);
alter table post_media enable row level security;
create policy pm_sel on post_media for select using (exists(select 1 from posts where id=post_id));
create policy pm_ins on post_media for insert with check (not_banned() and exists(select 1 from posts p where p.id=post_id and p.author_id=auth.uid()));
create policy pm_del on post_media for delete using (exists(select 1 from posts p where p.id=post_id and (p.author_id=auth.uid() or is_staff())));
create function limit_post_media() returns trigger language plpgsql as $$ begin if (select count(*) from post_media where post_id=new.post_id)>=10 then raise exception 'En fazla 10 medya eklenebilir.'; end if; return new; end $$;
create trigger t_limit_media before insert on post_media for each row execute function limit_post_media();
-- ===== Yorum yanıtı + yorum beğenisi =====
alter table comments add column if not exists parent_id uuid references comments on delete cascade;
create table comment_likes(comment_id uuid references comments on delete cascade, user_id uuid references profiles on delete cascade, primary key(comment_id,user_id));
alter table comment_likes enable row level security;
create policy cl_sel on comment_likes for select using (exists(select 1 from comments where id=comment_id));
create policy cl_ins on comment_likes for insert with check (user_id=auth.uid() and not_banned());
create policy cl_del on comment_likes for delete using (user_id=auth.uid());
create function check_comment_parent() returns trigger language plpgsql as $$ declare pp comments;
begin if new.parent_id is not null then select * into pp from comments where id=new.parent_id;
 if pp.id is null or pp.post_id<>new.post_id or pp.parent_id is not null then raise exception 'Geçersiz yanıt.'; end if; end if; return new; end $$;
create trigger t_comment_parent before insert on comments for each row execute function check_comment_parent();
create or replace function notify_comment() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into notifications(user_id,actor_id,kind,post_id) select author_id,new.author_id,'comment',new.post_id from posts where id=new.post_id and author_id<>new.author_id;
 if new.parent_id is not null then
  insert into notifications(user_id,actor_id,kind,post_id) select c.author_id,new.author_id,'comment',new.post_id from comments c
   where c.id=new.parent_id and c.author_id<>new.author_id and c.author_id<>(select author_id from posts where id=new.post_id);
 end if; return new; end $$;
-- ===== Sabit gönderi =====
alter table posts add column if not exists pinned boolean not null default false;
create function limit_pins() returns trigger language plpgsql as $$ begin
 if new.pinned and (TG_OP='INSERT' or not old.pinned) and (select count(*) from posts where author_id=new.author_id and pinned)>=3 then raise exception 'En fazla 3 gönderi sabitleyebilirsin.'; end if; return new; end $$;
create trigger t_pins before insert or update on posts for each row execute function limit_pins();
-- ===== Hikâye vurguları =====
create table highlights(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, title text not null check (char_length(title) between 1 and 20), created_at timestamptz default now());
create table highlight_items(id uuid primary key default gen_random_uuid(), highlight_id uuid not null references highlights on delete cascade, media_url text not null, media_type text not null check (media_type in ('image','video')),
 overlays jsonb not null default '[]'::jsonb check (jsonb_typeof(overlays)='array' and jsonb_array_length(overlays)<=12), music_id text check (music_id ~ '^[A-Za-z0-9_-]{11}$'), music_title text, music_start int not null default 0, position int not null default 0, created_at timestamptz default now());
alter table highlights enable row level security; alter table highlight_items enable row level security;
create policy hl_sel on highlights for select using (can_view_user(user_id));
create policy hl_ins on highlights for insert with check (user_id=auth.uid() and not_banned());
create policy hl_upd on highlights for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy hl_del on highlights for delete using (user_id=auth.uid());
create policy hi_sel on highlight_items for select using (exists(select 1 from highlights h where h.id=highlight_id));
create policy hi_ins on highlight_items for insert with check (exists(select 1 from highlights h where h.id=highlight_id and h.user_id=auth.uid()));
create policy hi_del on highlight_items for delete using (exists(select 1 from highlights h where h.id=highlight_id and h.user_id=auth.uid()));
-- ===== Topluluk ve kanallar =====
create table communities(id uuid primary key default gen_random_uuid(), name text not null unique check (char_length(name) between 2 and 40), description text not null default '', is_default boolean not null default false, created_at timestamptz default now());
create unique index one_default_community on communities(is_default) where is_default;
create table community_members(community_id uuid references communities on delete cascade, user_id uuid references profiles on delete cascade, primary key(community_id,user_id));
create table channels(id uuid primary key default gen_random_uuid(), community_id uuid not null references communities on delete cascade, name text not null check (char_length(name) between 1 and 40),
 kind text not null default 'announce' check (kind in ('announce','chat')), staff_only boolean not null default true, position int not null default 0, unique(community_id,name));
create table channel_posts(id uuid primary key default gen_random_uuid(), channel_id uuid not null references channels on delete cascade, author_id uuid not null references profiles on delete cascade,
 body text not null check (char_length(body) between 1 and 4000), image_url text, created_at timestamptz default now());
create index on channel_posts(channel_id, created_at desc);
create function in_community(c uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from community_members where community_id=c and user_id=auth.uid()) $$;
create function can_post_channel(ch uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from channels c where c.id=ch and in_community(c.community_id) and (not c.staff_only or is_staff())) $$;
alter table communities enable row level security; alter table community_members enable row level security; alter table channels enable row level security; alter table channel_posts enable row level security;
create policy co_sel on communities for select using (in_community(id) or is_staff());
create policy co_ins on communities for insert with check (is_admin());
create policy co_upd on communities for update using (is_admin()) with check (is_admin());
create policy co_del on communities for delete using (is_admin());
create policy cmm_sel on community_members for select using (user_id=auth.uid() or is_staff());
create policy ch_sel on channels for select using (in_community(community_id) or is_staff());
create policy ch_ins on channels for insert with check (is_admin());
create policy ch_upd on channels for update using (is_admin()) with check (is_admin());
create policy ch_del on channels for delete using (is_admin());
create policy cp_sel on channel_posts for select using (exists(select 1 from channels c where c.id=channel_id and (in_community(c.community_id) or is_staff())));
create policy cp_ins on channel_posts for insert with check (author_id=auth.uid() and not_banned() and can_post_channel(channel_id));
create policy cp_del on channel_posts for delete using (author_id=auth.uid() or is_staff());
insert into communities(name,description,is_default) values ('Genel','Tüm üyelerin otomatik katıldığı topluluk. Duyurular burada yayınlanır.',true) on conflict do nothing;
insert into channels(community_id,name,kind,staff_only) select id,'Duyurular','announce',true from communities where is_default on conflict do nothing;
insert into community_members select c.id,p.id from communities c, profiles p where c.is_default on conflict do nothing;
create function join_default_community() returns trigger language plpgsql security definer set search_path=public as $$ begin
 insert into community_members select id,new.id from communities where is_default on conflict do nothing; return new; end $$;
create trigger t_join_default after insert on profiles for each row execute function join_default_community();
alter publication supabase_realtime add table channel_posts;
-- ===== Push + bildirim ayarları =====
create table push_subscriptions(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, endpoint text not null unique, p256dh text not null, auth_key text not null, created_at timestamptz default now());
alter table push_subscriptions enable row level security;
create policy ps_sel on push_subscriptions for select using (user_id=auth.uid());
create policy ps_del on push_subscriptions for delete using (user_id=auth.uid());
create function save_push(e text, p text, a text) returns void language plpgsql security definer set search_path=public as $$
begin if auth.uid() is null then raise exception 'yetkisiz'; end if;
 insert into push_subscriptions(user_id,endpoint,p256dh,auth_key) values (auth.uid(),e,p,a) on conflict (endpoint) do update set user_id=auth.uid(), p256dh=excluded.p256dh, auth_key=excluded.auth_key; end $$;
create table notification_prefs(user_id uuid primary key references profiles on delete cascade, likes boolean not null default true, comments boolean not null default true, follows boolean not null default true,
 messages boolean not null default true, mentions boolean not null default true, push boolean not null default true);
alter table notification_prefs enable row level security;
create policy np_all on notification_prefs for all using (user_id=auth.uid()) with check (user_id=auth.uid());
alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check check (kind in ('like','comment','follow','request','message','mention','warning'));
create function filter_notification() returns trigger language plpgsql security definer set search_path=public as $$ declare p notification_prefs;
begin
 if new.actor_id is not null and exists(select 1 from blocks where blocker_id=new.user_id and blocked_id=new.actor_id) then return null; end if;
 select * into p from notification_prefs where user_id=new.user_id;
 if found and ((new.kind='like' and not p.likes) or (new.kind='comment' and not p.comments) or (new.kind in ('follow','request') and not p.follows) or (new.kind='message' and not p.messages) or (new.kind='mention' and not p.mentions)) then return null; end if;
 return new; end $$;
create trigger t_notif_filter before insert on notifications for each row execute function filter_notification();
-- ===== Davet =====
alter table profiles add column if not exists invite_code text unique default substr(md5(random()::text||clock_timestamp()::text),1,8);
alter table profiles add column if not exists invited_by uuid references profiles on delete set null;
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,username,display_name,invited_by) values (new.id, lower(coalesce(new.raw_user_meta_data->>'username','user'||substr(new.id::text,1,8))), new.raw_user_meta_data->>'username',
 (select id from profiles where invite_code=new.raw_user_meta_data->>'invite' limit 1)); return new; end $$;
create or replace function protect_profile() returns trigger language plpgsql as $$
begin
 if auth.uid() is not null and not is_admin() and (new.role<>old.role or new.is_verified<>old.is_verified or new.rank_id is distinct from old.rank_id) then raise exception 'yetkisiz'; end if;
 if auth.uid() is not null and not is_staff() and new.banned<>old.banned then raise exception 'yetkisiz'; end if;
 if auth.uid() is not null and (new.invited_by is distinct from old.invited_by or new.invite_code is distinct from old.invite_code) then raise exception 'yetkisiz'; end if;
 return new; end $$;
-- ===== Moderasyon =====
create table banned_words(word text primary key check (word ~ '^[[:alnum:]_]+( [[:alnum:]_]+)*$' and word=lower(word) and char_length(word) between 2 and 40));
alter table banned_words enable row level security;
create policy bw_sel on banned_words for select using (is_staff());
create policy bw_ins on banned_words for insert with check (is_staff());
create policy bw_del on banned_words for delete using (is_staff());
create function has_banned_word(t text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from banned_words w where t ~* ('(^|[^[:alnum:]_])'||w.word||'([^[:alnum:]_]|$)')) $$;
create function block_banned_words() returns trigger language plpgsql as $$ begin
 if new.body is not null and not is_staff() and has_banned_word(new.body) then raise exception 'Bu içerik yasaklı bir kelime içeriyor.'; end if; return new; end $$;
create trigger t_bw_posts before insert or update of body on posts for each row execute function block_banned_words();
create trigger t_bw_comments before insert or update of body on comments for each row execute function block_banned_words();
create table warnings(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, by_user uuid references profiles on delete set null, reason text not null check (char_length(reason) between 1 and 500), read boolean not null default false, created_at timestamptz default now());
alter table warnings enable row level security;
create policy w_sel on warnings for select using (user_id=auth.uid() or is_staff());
create policy w_upd on warnings for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create table appeals(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, message text not null check (char_length(message) between 5 and 1000),
 status text not null default 'open' check (status in ('open','accepted','rejected')), created_at timestamptz default now());
create unique index one_open_appeal on appeals(user_id) where status='open';
alter table appeals enable row level security;
create policy ap_ins on appeals for insert with check (user_id=auth.uid());
create policy ap_sel on appeals for select using (user_id=auth.uid() or is_staff());
create table admin_logs(id uuid primary key default gen_random_uuid(), actor_id uuid references profiles on delete set null, action text not null, target_user uuid references profiles on delete set null, details text, created_at timestamptz default now());
alter table admin_logs enable row level security;
create policy al_sel on admin_logs for select using (is_staff());
create function log_action(a text, tu uuid, d text) returns void language sql security definer set search_path=public as $$ insert into admin_logs(actor_id,action,target_user,details) values (auth.uid(),a,tu,d) $$;
revoke all on function log_action(text,uuid,text) from public, anon, authenticated;
create or replace function admin_set_banned(u uuid, v boolean) returns void language plpgsql security definer set search_path=public as $$
begin if not is_staff() or u=auth.uid() or (select role from profiles where id=u)='admin' then raise exception 'yetkisiz'; end if; update profiles set banned=v where id=u; perform log_action(case when v then 'ban' else 'unban' end,u,null); end $$;
create or replace function admin_set_role(u uuid, r user_role) returns void language plpgsql security definer set search_path=public as $$
begin if not is_admin() or u=auth.uid() then raise exception 'yetkisiz'; end if; update profiles set role=r where id=u; perform log_action('role',u,r::text); end $$;
create or replace function admin_set_verified(u uuid, v boolean) returns void language plpgsql security definer set search_path=public as $$
begin if not is_admin() then raise exception 'yetkisiz'; end if; update profiles set is_verified=v where id=u; perform log_action('verified',u,v::text); end $$;
create or replace function admin_set_rank(u uuid, r uuid) returns void language plpgsql security definer set search_path=public as $$
begin if not is_admin() then raise exception 'yetkisiz'; end if; update profiles set rank_id=r where id=u; perform log_action('rank',u,coalesce((select name from ranks where id=r),'kaldırıldı')); end $$;
create or replace function resolve_report(rid uuid, st text, del_post boolean) returns void language plpgsql security definer set search_path=public as $$
declare pid uuid; tu uuid;
begin if not is_staff() or st not in ('resolved','dismissed') then raise exception 'yetkisiz'; end if;
 select post_id,user_id into pid,tu from reports where id=rid; update reports set status=st where id=rid;
 perform log_action('report_'||st,tu,case when del_post then 'gönderi silindi' else null end);
 if del_post and pid is not null then delete from posts where id=pid; end if; end $$;
create function warn_user(u uuid, reason text) returns void language plpgsql security definer set search_path=public as $$
begin if not is_staff() then raise exception 'yetkisiz'; end if;
 insert into warnings(user_id,by_user,reason) values (u,auth.uid(),reason); insert into notifications(user_id,actor_id,kind) values (u,null,'warning'); perform log_action('warn',u,left(reason,100)); end $$;
create function resolve_appeal(aid uuid, accept boolean) returns void language plpgsql security definer set search_path=public as $$
declare uid uuid;
begin if not is_staff() then raise exception 'yetkisiz'; end if;
 update appeals set status=case when accept then 'accepted' else 'rejected' end where id=aid and status='open' returning user_id into uid;
 if uid is null then raise exception 'itiraz bulunamadı'; end if;
 if accept then update profiles set banned=false where id=uid; end if; perform log_action(case when accept then 'appeal_accept' else 'appeal_reject' end,uid,null); end $$;
create function log_post_delete() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if auth.uid() is not null and old.author_id<>auth.uid() and is_staff() then insert into admin_logs(actor_id,action,target_user,details) values (auth.uid(),'post_delete',old.author_id,left(coalesce(old.body,''),100)); end if; return old; end $$;
create trigger t_log_post_delete after delete on posts for each row execute function log_post_delete();
-- ===== Ayrılmış kullanıcı adları =====
create function check_username() returns trigger language plpgsql as $$ begin
 if new.username in ('ara','giris','bildirimler','olustur','mesajlar','topluluk','ayarlar','yonetim','etiket','p','api','auth','gizlilik','kosullar','kvkk','admin','davet') then raise exception 'Bu kullanıcı adı kullanılamaz.'; end if; return new; end $$;
create trigger t_username before insert or update of username on profiles for each row execute function check_username();
-- ===== Topluluk yönetimi =====
alter table communities add column if not exists is_public boolean not null default false;
drop policy if exists co_sel on communities;
create policy co_sel on communities for select using (in_community(id) or is_staff() or is_public);
create function join_community(cid uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 if auth.uid() is null or not not_banned() then raise exception 'yetkisiz'; end if;
 if not exists(select 1 from communities where id=cid and (is_public or is_default)) then raise exception 'Bu topluluğa katılamazsın.'; end if;
 insert into community_members(community_id,user_id) values (cid,auth.uid()) on conflict do nothing; end $$;
create function leave_community(cid uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 if exists(select 1 from communities where id=cid and is_default) then raise exception 'Genel topluluktan ayrılamazsın.'; end if;
 delete from community_members where community_id=cid and user_id=auth.uid(); end $$;
create trigger rl_channel_posts before insert on channel_posts for each row execute function rate_limit('author_id','30','1 minute');
create trigger t_bw_channel before insert or update of body on channel_posts for each row execute function block_banned_words();
-- ===== Duyuru bildirimi =====
alter table notifications add column if not exists body text;
alter table notification_prefs add column if not exists announcements boolean not null default true;
do $$ declare r record; begin
 for r in select conname from pg_constraint where conrelid='public.notifications'::regclass and contype='c' and pg_get_constraintdef(oid) ilike '%kind%' loop
  execute format('alter table public.notifications drop constraint %I', r.conname); end loop; end $$;
alter table notifications add constraint notifications_kind_check check (kind in ('like','comment','follow','request','message','mention','warning','announcement','system'));
create or replace function filter_notification() returns trigger language plpgsql security definer set search_path=public as $$ declare p notification_prefs;
begin
 if new.actor_id is not null and exists(select 1 from blocks where blocker_id=new.user_id and blocked_id=new.actor_id) then return null; end if;
 select * into p from notification_prefs where user_id=new.user_id;
 if found and ((new.kind='like' and not p.likes) or (new.kind='comment' and not p.comments) or (new.kind in ('follow','request') and not p.follows) or (new.kind='message' and not p.messages)
   or (new.kind='mention' and not p.mentions) or (new.kind='announcement' and not p.announcements)) then return null; end if;
 return new; end $$;
create function notify_announcement() returns trigger language plpgsql security definer set search_path=public as $$ begin
 insert into notifications(user_id,actor_id,kind,body) select m.user_id,new.author_id,'announcement',left(new.body,120) from channels c join community_members m on m.community_id=c.community_id
  where c.id=new.channel_id and c.kind='announce' and m.user_id<>new.author_id; return new; end $$;
create trigger t_announce after insert on channel_posts for each row execute function notify_announcement();
-- ===== Grup yönetimi + mesaj iletme =====
alter table conversations add column if not exists photo_url text;
alter table conversations add column if not exists created_by uuid references profiles on delete set null;
alter table conversation_members add column if not exists role text not null default 'member' check (role in ('admin','member'));
alter table messages add column if not exists forwarded boolean not null default false;
update conversation_members cm set role='admin' from (select distinct on (conversation_id) conversation_id, user_id from conversation_members where conversation_id in (select id from conversations where is_group) order by conversation_id, ctid) f
 where cm.conversation_id=f.conversation_id and cm.user_id=f.user_id;
create or replace function protect_message() returns trigger language plpgsql as $$
begin
 if auth.uid() is null then return new; end if;
 if new.sender_id<>old.sender_id or new.conversation_id<>old.conversation_id or new.reply_to is distinct from old.reply_to or new.forwarded<>old.forwarded then raise exception 'yetkisiz'; end if;
 if not (auth.uid()=old.sender_id and new.deleted) and (new.body is distinct from old.body or new.image_url is distinct from old.image_url or new.audio_url is distinct from old.audio_url) then raise exception 'yetkisiz'; end if;
 if auth.uid()<>old.sender_id and new.deleted<>old.deleted then raise exception 'yetkisiz'; end if;
 return new; end $$;
create or replace function create_group(t text, members uuid[]) returns uuid language plpgsql security definer set search_path=public as $$
declare c uuid; m uuid;
begin
 if auth.uid() is null or array_length(members,1) is null or array_length(members,1)>49 then raise exception 'geçersiz'; end if;
 insert into conversations(title,is_group,created_by) values (left(coalesce(nullif(trim(t),''),'Grup'),50),true,auth.uid()) returning id into c;
 insert into conversation_members(conversation_id,user_id,role) values (c,auth.uid(),'admin');
 foreach m in array members loop
  if m<>auth.uid() and not exists(select 1 from blocks where blocker_id=m and blocked_id=auth.uid()) then insert into conversation_members(conversation_id,user_id) values (c,m) on conflict do nothing; end if;
 end loop; return c; end $$;
create function is_group_admin(cid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from conversation_members m join conversations c on c.id=m.conversation_id where m.conversation_id=cid and m.user_id=auth.uid() and m.role='admin' and c.is_group) $$;
create function group_add_members(cid uuid, members uuid[]) returns void language plpgsql security definer set search_path=public as $$ declare m uuid;
begin
 if not is_group_admin(cid) then raise exception 'yetkisiz'; end if;
 if (select count(*) from conversation_members where conversation_id=cid)+coalesce(array_length(members,1),0)>50 then raise exception 'Grup en fazla 50 kişi olabilir.'; end if;
 foreach m in array members loop
  if not exists(select 1 from blocks where blocker_id=m and blocked_id=auth.uid()) then insert into conversation_members(conversation_id,user_id) values (cid,m) on conflict do nothing; end if;
 end loop; end $$;
create function group_remove_member(cid uuid, u uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 if not is_group_admin(cid) or u=auth.uid() then raise exception 'yetkisiz'; end if; delete from conversation_members where conversation_id=cid and user_id=u; end $$;
create function group_leave(cid uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 if not exists(select 1 from conversations where id=cid and is_group) then raise exception 'yetkisiz'; end if;
 delete from conversation_members where conversation_id=cid and user_id=auth.uid();
 if not exists(select 1 from conversation_members where conversation_id=cid) then delete from conversations where id=cid;
 elsif not exists(select 1 from conversation_members where conversation_id=cid and role='admin') then
  update conversation_members set role='admin' where conversation_id=cid and user_id=(select user_id from conversation_members where conversation_id=cid limit 1);
 end if; end $$;
create function group_set_admin(cid uuid, u uuid, v boolean) returns void language plpgsql security definer set search_path=public as $$ begin
 if not is_group_admin(cid) then raise exception 'yetkisiz'; end if;
 if not v and (select count(*) from conversation_members where conversation_id=cid and role='admin')<=1 then raise exception 'Grupta en az bir yönetici olmalı.'; end if;
 update conversation_members set role=case when v then 'admin' else 'member' end where conversation_id=cid and user_id=u; end $$;
create function group_update(cid uuid, t text, p text) returns void language plpgsql security definer set search_path=public as $$ begin
 if not is_group_admin(cid) then raise exception 'yetkisiz'; end if;
 update conversations set title=coalesce(left(nullif(trim(t),''),50),title), photo_url=coalesce(p,photo_url) where id=cid; end $$;
-- ===== Eski mesajlarda arama =====
create function search_messages(cid uuid, q text) returns setof messages language sql stable security definer set search_path=public as $$
 select * from messages where conversation_id=cid and is_member(cid) and not deleted and body ilike '%'||replace(replace(replace(q,'\','\\'),'%','\%'),'_','\_')||'%' order by created_at desc limit 50 $$;
-- ===== Doğrulama rozeti başvurusu =====
create table verify_requests(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, message text not null check (char_length(message) between 5 and 1000),
 status text not null default 'open' check (status in ('open','approved','rejected')), created_at timestamptz default now());
create unique index one_open_verify on verify_requests(user_id) where status='open';
alter table verify_requests enable row level security;
create policy vr_ins on verify_requests for insert with check (user_id=auth.uid() and not_banned() and exists(select 1 from profiles where id=auth.uid() and not is_verified));
create policy vr_sel on verify_requests for select using (user_id=auth.uid() or is_staff());
create function resolve_verify(rid uuid, approve boolean) returns void language plpgsql security definer set search_path=public as $$ declare uid uuid;
begin if not is_admin() then raise exception 'yetkisiz'; end if;
 update verify_requests set status=case when approve then 'approved' else 'rejected' end where id=rid and status='open' returning user_id into uid;
 if uid is null then raise exception 'başvuru bulunamadı'; end if;
 if approve then update profiles set is_verified=true where id=uid; end if;
 insert into notifications(user_id,kind,body) values (uid,'system',case when approve then 'Doğrulama başvurun onaylandı, hesabına rozet eklendi.' else 'Doğrulama başvurun bu kez kabul edilmedi.' end);
 perform log_action(case when approve then 'verify_approve' else 'verify_reject' end,uid,null); end $$;
-- ===== Yönetici grafikleri =====
create function admin_daily_stats(days int default 30) returns table(day date, new_users bigint, posts bigint, reports bigint) language plpgsql security definer set search_path=public as $$ begin
 if not is_staff() then raise exception 'yetkisiz'; end if;
 return query select d::date, (select count(*) from profiles where created_at::date=d::date), (select count(*) from posts where created_at::date=d::date and not is_draft), (select count(*) from reports where created_at::date=d::date)
  from generate_series(current_date-(least(greatest(days,1),365)-1), current_date, interval '1 day') d order by 1; end $$;
-- ===== Davet ödülleri =====
create table invite_rewards(id uuid primary key default gen_random_uuid(), invites_required int not null unique check (invites_required between 1 and 1000), rank_id uuid not null references ranks on delete cascade);
alter table invite_rewards enable row level security;
create policy ir_sel on invite_rewards for select using (true);
create policy ir_ins on invite_rewards for insert with check (is_admin());
create policy ir_upd on invite_rewards for update using (is_admin()) with check (is_admin());
create policy ir_del on invite_rewards for delete using (is_admin());
create function check_reward_rank() returns trigger language plpgsql as $$ begin
 if (select can_moderate from ranks where id=new.rank_id) then raise exception 'Moderasyon yetkili rütbe ödül olarak verilemez.'; end if; return new; end $$;
create trigger t_reward_rank before insert or update on invite_rewards for each row execute function check_reward_rank();
create function grant_invite_reward() returns trigger language plpgsql security definer set search_path=public as $$ declare n int; rw invite_rewards; cur uuid; rname text;
begin
 if new.invited_by is null then return new; end if;
 select count(*) into n from profiles where invited_by=new.invited_by;
 select * into rw from invite_rewards where invites_required<=n order by invites_required desc limit 1;
 if rw.id is null then return new; end if;
 select rank_id into cur from profiles where id=new.invited_by;
 if (cur is null or exists(select 1 from invite_rewards where rank_id=cur)) and cur is distinct from rw.rank_id then
  update profiles set rank_id=rw.rank_id where id=new.invited_by; select name into rname from ranks where id=rw.rank_id;
  insert into notifications(user_id,kind,body) values (new.invited_by,'system','Tebrikler! '||n||' kişi davet ettin, "'||rname||'" rütbesi hesabına tanımlandı.');
 end if; return new; end $$;
create trigger t_invite_reward after insert on profiles for each row execute function grant_invite_reward();
-- ===== Topluluk oluşturma yardımcıları =====
create function create_community(n text, d text, pub boolean) returns uuid language plpgsql security definer set search_path=public as $$ declare c uuid;
begin if not is_admin() then raise exception 'yetkisiz'; end if;
 insert into communities(name,description,is_public) values (n,coalesce(d,''),pub) returning id into c;
 insert into community_members(community_id,user_id) values (c,auth.uid()); return c; end $$;
create function community_add_member(cid uuid, u uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 if not is_admin() then raise exception 'yetkisiz'; end if; insert into community_members(community_id,user_id) values (cid,u) on conflict do nothing; end $$;
create function protect_default_community() returns trigger language plpgsql as $$ begin if old.is_default then raise exception 'Genel topluluk silinemez.'; end if; return old; end $$;
create trigger t_protect_default before delete on communities for each row execute function protect_default_community();
