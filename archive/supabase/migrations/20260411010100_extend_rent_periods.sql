-- Extend rent_periods table with payment tracking fields
alter table rent_periods
  add column if not exists status text not null default 'upcoming' check (status in ('upcoming', 'due', 'overdue', 'partial', 'paid')),
  add column if not exists amount_paid numeric default 0,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_notes text;

-- Add index for status queries
create index if not exists idx_rent_periods_status on rent_periods(status);
create index if not exists idx_rent_periods_paid_at on rent_periods(paid_at);
