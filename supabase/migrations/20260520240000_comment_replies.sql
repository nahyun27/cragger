-- Thread comments via self-referential parent_comment_id.
-- Cascade so deleting a parent comment also removes its replies.

alter table post_comments
  add column parent_comment_id uuid references post_comments(id) on delete cascade;

create index idx_comments_parent on post_comments(parent_comment_id)
  where parent_comment_id is not null;
