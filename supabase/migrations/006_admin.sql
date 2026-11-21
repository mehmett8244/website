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
