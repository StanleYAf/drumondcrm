create table if not exists public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  mes text,
  ano integer,
  numero text,
  tipo_servico text,
  estado text,
  solicitante text,
  localizacao text,
  tipo_equipamento text,
  numero_serie text,
  tag text,
  modelo text,
  fabricante text,
  responsavel text,
  data_criacao date,
  data_conclusao date,
  prioridade text,
  problema_relatado text,
  plano text,
  quadro_trabalho text,
  atendimento text,
  estado_tempo_atendimento text,
  estado_tempo_fechamento text,
  created_at timestamptz not null default now()
);

alter table public.ordens_servico enable row level security;

create policy "Authenticated can read ordens_servico"
  on public.ordens_servico for select
  to authenticated using (true);

create policy "Authenticated can insert ordens_servico"
  on public.ordens_servico for insert
  to authenticated with check (true);

create policy "Authenticated can update ordens_servico"
  on public.ordens_servico for update
  to authenticated using (true) with check (true);

create policy "Authenticated can delete ordens_servico"
  on public.ordens_servico for delete
  to authenticated using (true);

create index if not exists idx_ordens_servico_cliente_mes_ano
  on public.ordens_servico(cliente_id, ano, mes);
create index if not exists idx_ordens_servico_tag on public.ordens_servico(tag);
create index if not exists idx_ordens_servico_numero_serie on public.ordens_servico(numero_serie);