-- 게시글 투표(poll). 색깔 V그레이드 투표(grade_votes) 와 별개.
-- post 에 종속 → post.crew_id 가 RLS 처리 (전체/크루 분리 자동).

create table post_polls (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  question    text not null,
  is_multi    boolean not null default false,
  closes_at   timestamptz,
  created_at  timestamptz not null default now()
);
create index idx_polls_post on post_polls(post_id);

create table poll_options (
  id           uuid primary key default gen_random_uuid(),
  poll_id      uuid not null references post_polls(id) on delete cascade,
  label        text not null,
  order_index  int  not null default 0,
  vote_count   int  not null default 0
);
create index idx_poll_options_poll on poll_options(poll_id, order_index);

create table poll_votes (
  poll_id    uuid not null references post_polls(id) on delete cascade,
  option_id  uuid not null references poll_options(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, option_id, user_id)
);
create index idx_poll_votes_user on poll_votes(poll_id, user_id);

alter table post_polls   enable row level security;
alter table poll_options enable row level security;
alter table poll_votes   enable row level security;

-- 조회: post RLS 가 crew_id 처리하므로 일단 전체 허용.
-- (post 자체를 못 봐도 poll 만 보이는 시나리오는 무의미)
create policy polls_select_all     on post_polls   for select using (true);
create policy poll_opts_select_all on poll_options for select using (true);
create policy poll_votes_select_all on poll_votes  for select using (true);

-- 생성: post 작성자만
create policy polls_insert_author on post_polls for insert with check (
  exists (
    select 1 from posts
    where posts.id = post_polls.post_id and posts.author_id = auth.uid()
  )
);
create policy poll_opts_insert_author on poll_options for insert with check (
  exists (
    select 1 from post_polls p
    join posts po on po.id = p.post_id
    where p.id = poll_options.poll_id and po.author_id = auth.uid()
  )
);

-- 투표: 본인만 추가/삭제
create policy poll_votes_insert_self on poll_votes for insert with check (auth.uid() = user_id);
create policy poll_votes_delete_self on poll_votes for delete using (auth.uid() = user_id);

-- vote_count 동기화 트리거 (security definer 로 RLS 우회)
create or replace function bump_poll_option_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update poll_options set vote_count = vote_count + 1 where id = new.option_id;
  elsif tg_op = 'DELETE' then
    update poll_options set vote_count = greatest(0, vote_count - 1) where id = old.option_id;
  end if;
  return null;
end;
$$;

create trigger trg_poll_opt_count
  after insert or delete on poll_votes
  for each row execute function bump_poll_option_count();
