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
