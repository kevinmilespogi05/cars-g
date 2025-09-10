-- Case management additions: duty scheduling, requester ratings, and generation helpers

-- 1) Duty schedule table (dispatcher/receiver AM/PM)
create table if not exists public.duty_schedules (
    id uuid primary key default gen_random_uuid(),
    duty_date date not null,
    shift text not null check (shift in ('AM','PM')),
    dispatcher_user_id uuid references public.profiles(id) on delete set null,
    receiver_user_id uuid references public.profiles(id) on delete set null,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(duty_date, shift)
);

-- 2) Requester ratings table (1-5 stars) for a report/case
create table if not exists public.report_ratings (
    id uuid primary key default gen_random_uuid(),
    report_id uuid not null references public.reports(id) on delete cascade,
    requester_user_id uuid not null references public.profiles(id) on delete cascade,
    stars integer not null check (stars between 1 and 5),
    comment text,
    created_at timestamptz not null default now(),
    unique(report_id, requester_user_id)
);

-- Helpful indexes
create index if not exists idx_duty_schedules_date on public.duty_schedules(duty_date, shift);
create index if not exists idx_report_ratings_report on public.report_ratings(report_id);

-- 3) Generation helpers: assign case_number if missing and create monthly/yearly placeholders
-- Function: ensure case_number present
create or replace function public.ensure_case_number(report_row public.reports)
returns text
language plpgsql
as $$
declare
  new_case text;
begin
  if report_row.case_number is not null and report_row.case_number <> '' then
    return report_row.case_number;
  end if;
  new_case := to_char(now(), 'YYYYMMDD') || '-' || lpad((floor(random()*100000))::int::text, 5, '0');
  update public.reports set case_number = new_case where id = report_row.id;
  return new_case;
end;
$$;

-- RPC: generate_monthly_cases(year int, month int)
create or replace function public.generate_monthly_cases(p_year int, p_month int)
returns integer
language plpgsql
security definer
as $$
declare
  created_count int := 0;
  r public.reports%rowtype;
begin
  for r in select * from public.reports where date_part('year', created_at) = p_year and date_part('month', created_at) = p_month loop
    perform public.ensure_case_number(r);
    created_count := created_count + 1;
  end loop;
  return created_count;
end;
$$;

-- RPC: generate_yearly_cases(year int)
create or replace function public.generate_yearly_cases(p_year int)
returns integer
language plpgsql
security definer
as $$
declare
  created_count int := 0;
  r public.reports%rowtype;
begin
  for r in select * from public.reports where date_part('year', created_at) = p_year loop
    perform public.ensure_case_number(r);
    created_count := created_count + 1;
  end loop;
  return created_count;
end;
$$;

-- Basic permissive RLS (align with existing project policies)
alter table public.duty_schedules enable row level security;
alter table public.report_ratings enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'duty_schedules' and policyname = 'duty_schedules_read'
  ) then
    create policy duty_schedules_read on public.duty_schedules for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'duty_schedules' and policyname = 'duty_schedules_write_admin'
  ) then
    create policy duty_schedules_write_admin on public.duty_schedules for all to authenticated using (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','moderator'))
    ) with check (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','moderator'))
    );
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'report_ratings' and policyname = 'report_ratings_read'
  ) then
    create policy report_ratings_read on public.report_ratings for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'report_ratings' and policyname = 'report_ratings_write_owner'
  ) then
    create policy report_ratings_write_owner on public.report_ratings for insert with check (requester_user_id = auth.uid());
  end if;
end $$;


