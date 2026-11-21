alter table stories add column if not exists music_id text check (music_id ~ '^[A-Za-z0-9_-]{11}$');
alter table stories add column if not exists music_title text check (char_length(music_title) <= 150);
