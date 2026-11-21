create table stories(id uuid primary key default gen_random_uuid(), author_id uuid not null references profiles on delete cascade,
 media_url text not null, media_type text not null check (media_type in ('image','video')),
 audience text not null default 'all' check (audience in ('all','followers')),
 created_at timestamptz default now(), expires_at timestamptz not null default now()+interval '24 hours');
create index on stories(author_id, expires_at);
create table story_views(story_id uuid references stories on delete cascade, user_id uuid references profiles on delete cascade,
 reaction text check (char_length(reaction)<=8), created_at timestamptz default now(), primary key(story_id,user_id));
create table reposts(post_id uuid references posts on delete cascade, user_id uuid references profiles on delete cascade, created_at timestamptz default now(), primary key(post_id,user_id));
create table notes(user_id uuid primary key references profiles on delete cascade, body text not null check (char_length(body) between 1 and 60),
 expires_at timestamptz not null default now()+interval '24 hours');
alter table stories enable row level security; alter table story_views enable row level security; alter table reposts enable row level security; alter table notes enable row level security;
create policy s_sel on stories for select using (author_id=auth.uid() or is_staff() or (expires_at>now() and can_view_user(author_id) and
 (audience='all' or exists(select 1 from follows where follower_id=auth.uid() and following_id=author_id and status='accepted'))));
create policy s_ins on stories for insert with check (author_id=auth.uid());
create policy s_del on stories for delete using (author_id=auth.uid() or is_staff());
create policy sv_sel on story_views for select using (user_id=auth.uid() or exists(select 1 from stories where id=story_id and author_id=auth.uid()));
create policy sv_ins on story_views for insert with check (user_id=auth.uid() and exists(select 1 from stories where id=story_id));
create policy sv_upd on story_views for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy rp_sel on reposts for select using (exists(select 1 from posts where id=post_id));
create policy rp_ins on reposts for insert with check (user_id=auth.uid() and exists(select 1 from posts where id=post_id));
create policy rp_del on reposts for delete using (user_id=auth.uid());
create policy nt_sel on notes for select using (user_id=auth.uid() or (expires_at>now() and can_view_user(user_id)));
create policy nt_ins on notes for insert with check (user_id=auth.uid());
create policy nt_upd on notes for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy nt_del on notes for delete using (user_id=auth.uid());
