-- Native FCM device tokens (separate from web push_subscriptions; a user may have multiple devices)
create table if not exists fcm_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null references users(id) on delete cascade,
  token      text not null unique,
  platform   text default 'android',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_fcm_tokens_user on fcm_tokens(user_id);
alter table fcm_tokens disable row level security;
