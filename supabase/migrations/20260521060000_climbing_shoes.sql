-- User-owned climbing shoe rack.
-- Per-user list of shoes with brand/model/size + lifecycle status.
-- image_url column reserved for future avatar-style upload pipeline.

create table climbing_shoes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  brand        text,
  model        text not null,
  size         text,
  status       text not null default 'active',
    -- active / retired / resole_pending
  purchased_at date,
  image_url    text,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_shoes_user on climbing_shoes(user_id, created_at desc);

alter table climbing_shoes enable row level security;

create policy shoes_select_self on climbing_shoes
  for select using (auth.uid() = user_id);
create policy shoes_insert_self on climbing_shoes
  for insert with check (auth.uid() = user_id);
create policy shoes_update_self on climbing_shoes
  for update using (auth.uid() = user_id);
create policy shoes_delete_self on climbing_shoes
  for delete using (auth.uid() = user_id);
