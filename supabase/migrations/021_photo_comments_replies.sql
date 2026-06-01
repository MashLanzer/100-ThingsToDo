alter table photo_comments add column if not exists parent_comment_id uuid references photo_comments(id) on delete cascade;
