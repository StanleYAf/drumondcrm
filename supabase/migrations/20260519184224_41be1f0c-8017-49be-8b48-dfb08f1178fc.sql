create table if not exists public.financeiro (
  id uuid primary key default gen_random_uuid(),
  mes text not null,
  ano integer not null,
  servicos_avulsos numeric default 0,
  vendas numeric default 0,
  contratos numeric default 0,
  geral numeric default 0,
  meta_servicos numeric default 32000,
  meta_vendas numeric default 25000,
  meta_contratos numeric default 150000,
  meta_geral numeric default 157000,
  created_at timestamptz default now(),
  unique(mes, ano)
);

alter table public.financeiro enable row level security;

create policy "Authenticated can read financeiro" on public.financeiro for select to authenticated using (true);
create policy "Authenticated can insert financeiro" on public.financeiro for insert to authenticated with check (true);
create policy "Authenticated can update financeiro" on public.financeiro for update to authenticated using (true) with check (true);
create policy "Authenticated can delete financeiro" on public.financeiro for delete to authenticated using (true);