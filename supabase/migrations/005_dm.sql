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
