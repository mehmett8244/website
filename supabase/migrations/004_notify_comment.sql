create or replace function notify_comment() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into notifications(user_id,actor_id,kind,post_id) select author_id,new.author_id,'comment',new.post_id from posts where id=new.post_id and author_id<>new.author_id; return new; end $$;
drop trigger if exists t_comment on comments;
create trigger t_comment after insert on comments for each row execute function notify_comment();
