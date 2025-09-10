-- Refine monthly/yearly generators to count only newly assigned case numbers

create or replace function public.generate_monthly_cases(p_year int, p_month int)
returns integer
language plpgsql
security definer
as $$
declare
  created_count int := 0;
  r public.reports%rowtype;
  assigned text;
begin
  for r in select * from public.reports where date_part('year', created_at) = p_year and date_part('month', created_at) = p_month loop
    assigned := public.ensure_case_number(r);
    if r.case_number is null or r.case_number = '' then
      -- Only count when we actually assigned a new case number
      created_count := created_count + 1;
    end if;
  end loop;
  return created_count;
end;
$$;

create or replace function public.generate_yearly_cases(p_year int)
returns integer
language plpgsql
security definer
as $$
declare
  created_count int := 0;
  r public.reports%rowtype;
  assigned text;
begin
  for r in select * from public.reports where date_part('year', created_at) = p_year loop
    assigned := public.ensure_case_number(r);
    if r.case_number is null or r.case_number = '' then
      created_count := created_count + 1;
    end if;
  end loop;
  return created_count;
end;
$$;


