alter table tasks add column if not exists reminder_at timestamptz;
alter table tasks add column if not exists assigned_to text;
alter table tasks add column if not exists task_photos text[] default '{}';
