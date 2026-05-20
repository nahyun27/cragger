-- Community v1: posts + likes + comments
-- Schema accommodates v2 (meetup) and v3 (chat) without future migrations breaking shape.

create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  post_type text not null default 'general',
  title text,
  body text not null,
  gym_id uuid references gyms(id) on delete set null,
  image_urls text[] not null default '{}',
  meetup_at timestamptz,
  meetup_capacity int,
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_posts_created on posts(created_at desc);
create index idx_posts_type on posts(post_type, created_at desc);
create index idx_posts_gym on posts(gym_id) where gym_id is not null;

create table post_likes (
  user_id uuid not null references profiles(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index idx_comments_post on post_comments(post_id, created_at);

alter table posts enable row level security;
alter table post_likes enable row level security;
alter table post_comments enable row level security;

create policy posts_select_all on posts for select using (true);
create policy posts_insert_self on posts for insert with check (auth.uid() = author_id);
create policy posts_update_self on posts for update using (auth.uid() = author_id);
create policy posts_delete_self on posts for delete using (auth.uid() = author_id);

create policy likes_select_all on post_likes for select using (true);
create policy likes_insert_self on post_likes for insert with check (auth.uid() = user_id);
create policy likes_delete_self on post_likes for delete using (auth.uid() = user_id);

create policy comments_select_all on post_comments for select using (true);
create policy comments_insert_self on post_comments for insert with check (auth.uid() = author_id);
create policy comments_delete_self on post_comments for delete using (auth.uid() = author_id);

create or replace function bump_post_like_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update posts set like_count = greatest(0, like_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trg_like_count
  after insert or delete on post_likes
  for each row execute function bump_post_like_count();

create or replace function bump_post_comment_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trg_comment_count
  after insert or delete on post_comments
  for each row execute function bump_post_comment_count();
