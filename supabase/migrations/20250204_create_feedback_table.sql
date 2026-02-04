-- Create feedback table for test user submissions
create table feedback (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'general',  -- 'bug', 'feature', 'general'
  message text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table feedback enable row level security;

-- Allow anyone to submit feedback (even anonymous users)
create policy "Anyone can submit feedback"
  on feedback for insert
  with check (true);

-- Allow authenticated users to view feedback (only those who know the URL)
create policy "Authenticated users can view feedback"
  on feedback for select
  using (auth.role() = 'authenticated');

-- Create index for sorting by date
create index feedback_created_at_idx on feedback(created_at desc);
