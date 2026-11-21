create or replace function trending_tags() returns table(tag text, n bigint) language sql stable security definer set search_path=public as $$
 select lower(m[1]) as tag, count(*) as n from posts p join profiles u on u.id=p.author_id,
 regexp_matches(p.body,'#([[:alnum:]_]{2,30})','g') as m
 where not p.is_draft and not u.is_private and p.body is not null and p.created_at>now()-interval '7 days'
 group by 1 order by n desc, tag limit 10 $$;
