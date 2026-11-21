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
