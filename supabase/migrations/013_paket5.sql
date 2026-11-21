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
