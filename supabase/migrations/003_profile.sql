create or replace function profile_stats(u uuid) returns json language sql stable security definer set search_path=public as $$
 select json_build_object(
  'posts',(select count(*) from posts where author_id=u and not is_draft),
  'followers',(select count(*) from follows where following_id=u and status='accepted'),
  'following',(select count(*) from follows where follower_id=u and status='accepted')) $$;
