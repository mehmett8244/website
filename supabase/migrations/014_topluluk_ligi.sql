-- Topluluk Ligi: bağımsız XP, seviye ve başarım altyapısı
-- Mevcut profiles/ranks/posts/likes/comments tablolarının kolonlarını değiştirmez.

create table if not exists public.league_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_xp bigint not null default 0 check (total_xp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  reason text not null,
  event_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.achievements (
  code text primary key,
  name text not null,
  description text not null,
  icon text not null default '🏆',
  xp_reward integer not null default 0 check (xp_reward >= 0),
  event_type text not null check (event_type in ('posts','comments','received_likes','admin')),
  requirement_count integer not null default 0 check (requirement_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_code text not null references public.achievements(code) on delete cascade,
  awarded_by uuid references public.profiles(id) on delete set null,
  awarded_at timestamptz not null default now(),
  unique(user_id, achievement_code)
);

create index if not exists league_stats_xp_idx on public.league_stats(total_xp desc, user_id);
create index if not exists xp_transactions_user_date_idx on public.xp_transactions(user_id, created_at desc);
create index if not exists xp_transactions_date_idx on public.xp_transactions(created_at desc);
create index if not exists user_achievements_user_idx on public.user_achievements(user_id, awarded_at desc);

alter table public.league_stats enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

drop policy if exists league_stats_read on public.league_stats;
create policy league_stats_read on public.league_stats
  for select to authenticated using (true);

drop policy if exists xp_transactions_read_own on public.xp_transactions;
create policy xp_transactions_read_own on public.xp_transactions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists achievements_read on public.achievements;
create policy achievements_read on public.achievements
  for select to authenticated using (is_active or public.is_admin());

drop policy if exists user_achievements_read on public.user_achievements;
create policy user_achievements_read on public.user_achievements
  for select to authenticated using (true);

-- Kullanıcı kaydı tamamlandığında lig istatistiği oluştur.
create or replace function public.create_league_stats_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.league_stats(user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_league_stats_after_profile on public.profiles;
create trigger create_league_stats_after_profile
  after insert on public.profiles
  for each row execute function public.create_league_stats_for_profile();

insert into public.league_stats(user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- XP defteri ve toplam XP tek işlem içinde güncellenir.
-- event_key aynı olayın ikinci kez puanlanmasını engeller.
create or replace function public.apply_league_xp(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_event_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  if p_amount = 0 or p_event_key is null or length(p_event_key) = 0 then
    return;
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    return;
  end if;

  insert into public.league_stats(user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  insert into public.xp_transactions(user_id, amount, reason, event_key)
  values (p_user_id, p_amount, p_reason, p_event_key)
  on conflict (event_key) do nothing
  returning id into inserted_id;

  if inserted_id is not null then
    update public.league_stats
       set total_xp = greatest(0, total_xp + p_amount),
           updated_at = now()
     where user_id = p_user_id;
  end if;
end;
$$;

revoke all on function public.apply_league_xp(uuid, integer, text, text) from public, anon, authenticated;

-- Otomatik başarımlar, her içerik etkinliğinden sonra koşullara göre kontrol edilir.
create or replace function public.evaluate_league_achievements(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  current_count bigint;
  inserted_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_user_id) then
    return;
  end if;

  for a in
    select * from public.achievements
    where is_active and event_type <> 'admin' and requirement_count > 0
  loop
    current_count := 0;

    if a.event_type = 'posts' then
      select count(*) into current_count
      from public.posts
      where author_id = p_user_id and not is_draft;
    elsif a.event_type = 'comments' then
      select count(*) into current_count
      from public.comments
      where author_id = p_user_id;
    elsif a.event_type = 'received_likes' then
      select count(*) into current_count
      from public.likes l
      join public.posts p on p.id = l.post_id
      where p.author_id = p_user_id and l.user_id <> p_user_id and not p.is_draft;
    end if;

    if current_count >= a.requirement_count then
      insert into public.user_achievements(user_id, achievement_code)
      values (p_user_id, a.code)
      on conflict (user_id, achievement_code) do nothing
      returning id into inserted_id;

      if inserted_id is not null and a.xp_reward > 0 then
        perform public.apply_league_xp(
          p_user_id,
          a.xp_reward,
          'Başarım: ' || a.name,
          'achievement:' || a.code || ':' || p_user_id::text
        );
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public.evaluate_league_achievements(uuid) from public, anon, authenticated;

create or replace function public.league_on_post_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.is_draft then
    perform public.apply_league_xp(new.author_id, 10, 'Gönderi paylaştın', 'post:' || new.id::text || ':created');
    perform public.evaluate_league_achievements(new.author_id);
  end if;
  return new;
end;
$$;

create or replace function public.league_on_post_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not old.is_draft then
    perform public.apply_league_xp(old.author_id, -10, 'Gönderi silindi', 'post:' || old.id::text || ':deleted');
  end if;
  return old;
end;
$$;

create or replace function public.league_on_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.apply_league_xp(new.author_id, 3, 'Yorum yaptın', 'comment:' || new.id::text || ':created');
  perform public.evaluate_league_achievements(new.author_id);
  return new;
end;
$$;

create or replace function public.league_on_comment_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.apply_league_xp(old.author_id, -3, 'Yorum silindi', 'comment:' || old.id::text || ':deleted');
  return old;
end;
$$;

create or replace function public.league_on_like_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
begin
  select author_id into post_author
  from public.posts
  where id = new.post_id and not is_draft;

  if post_author is not null and post_author <> new.user_id then
    perform public.apply_league_xp(post_author, 1, 'Gönderine beğeni geldi', 'like:' || gen_random_uuid()::text || ':created');
    perform public.evaluate_league_achievements(post_author);
  end if;
  return new;
end;
$$;

create or replace function public.league_on_like_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
begin
  select author_id into post_author
  from public.posts
  where id = old.post_id;

  if post_author is not null and post_author <> old.user_id then
    perform public.apply_league_xp(post_author, -1, 'Beğeni geri çekildi', 'like:' || gen_random_uuid()::text || ':deleted');
  end if;
  return old;
end;
$$;

drop trigger if exists league_post_insert on public.posts;
create trigger league_post_insert after insert on public.posts
for each row execute function public.league_on_post_insert();

drop trigger if exists league_post_delete on public.posts;
create trigger league_post_delete after delete on public.posts
for each row execute function public.league_on_post_delete();

drop trigger if exists league_comment_insert on public.comments;
create trigger league_comment_insert after insert on public.comments
for each row execute function public.league_on_comment_insert();

drop trigger if exists league_comment_delete on public.comments;
create trigger league_comment_delete after delete on public.comments
for each row execute function public.league_on_comment_delete();

drop trigger if exists league_like_insert on public.likes;
create trigger league_like_insert after insert on public.likes
for each row execute function public.league_on_like_insert();

drop trigger if exists league_like_delete on public.likes;
create trigger league_like_delete after delete on public.likes
for each row execute function public.league_on_like_delete();

-- İlk otomatik başarım örnekleri.
insert into public.achievements(code, name, description, icon, xp_reward, event_type, requirement_count)
values
  ('first_post', 'İlk Adım', 'İlk gönderini paylaş.', '✍️', 25, 'posts', 1),
  ('first_comment', 'Sohbete Katıl', 'İlk yorumunu yap.', '💬', 15, 'comments', 1),
  ('commenter_50', 'Sohbet Ustası', '50 yorum yap.', '🗣️', 75, 'comments', 50),
  ('liked_100', 'Sevilen Üye', 'Gönderilerine 100 geçerli beğeni al.', '💜', 100, 'received_likes', 100)
on conflict (code) do nothing;

-- Migration öncesinde gerekli eşiklere ulaşmış kullanıcıların başarımlarını da tanımla.
do $league$
declare p record;
begin
  for p in select id from public.profiles loop
    perform public.evaluate_league_achievements(p.id);
  end loop;
end;
$league$;

-- Yalnızca yöneticiler başka kullanıcılara özel başarım verebilir.
create or replace function public.admin_award_achievement(p_user_id uuid, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.achievements%rowtype;
  inserted_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yönetici yetkisi gerekli.';
  end if;

  select * into a
  from public.achievements
  where code = p_code and is_active;

  if not found then
    raise exception 'Başarım bulunamadı veya pasif.';
  end if;

  insert into public.user_achievements(user_id, achievement_code, awarded_by)
  values (p_user_id, p_code, auth.uid())
  on conflict (user_id, achievement_code) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return false;
  end if;

  if a.xp_reward > 0 then
    perform public.apply_league_xp(
      p_user_id,
      a.xp_reward,
      'Yönetici başarımı: ' || a.name,
      'achievement:' || a.code || ':' || p_user_id::text
    );
  end if;

  return true;
end;
$$;

revoke all on function public.admin_award_achievement(uuid, text) from public, anon;
grant execute on function public.admin_award_achievement(uuid, text) to authenticated;

-- Seviye formülü: XP(L) = 100 * (L - 1)^2
create or replace function public.league_level(p_total_xp bigint)
returns integer
language sql
immutable
as $$
  select greatest(1, floor(sqrt(greatest(0, p_total_xp)::numeric / 100))::integer + 1);
$$;

grant select on public.league_stats, public.xp_transactions, public.achievements, public.user_achievements to authenticated;
