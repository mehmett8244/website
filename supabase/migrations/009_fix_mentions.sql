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
