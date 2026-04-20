create table if not exists public.indicadores_manutencao (
  id uuid primary key default gen_random_uuid(),
  mes text not null,
  ano integer not null,
  total_corretivas_abertas integer default 0,
  total_corretivas_fechadas integer default 0,
  total_preventivas_abertas integer default 0,
  total_preventivas_fechadas integer default 0,
  eng_corretivas_abertas integer default 0,
  eng_corretivas_fechadas integer default 0,
  eng_pct_corretivas_fechadas numeric default 0,
  eng_corretivas_atendidas_prazo integer default 0,
  eng_pct_corretivas_atendidas_prazo numeric default 0,
  eng_preventivas_abertas integer default 0,
  eng_preventivas_fechadas integer default 0,
  eng_pct_preventivas_fechadas numeric default 0,
  eng_os_emergentes integer default 0,
  eng_pct_sla_triagem_emergente numeric default 0,
  eng_pct_sla_fechamento_emergente numeric default 0,
  eng_os_urgentes integer default 0,
  eng_pct_sla_triagem_urgente numeric default 0,
  eng_pct_sla_fechamento_urgente numeric default 0,
  eng_os_pouco_urgentes integer default 0,
  eng_pct_sla_triagem_poucourgente numeric default 0,
  eng_pct_sla_fechamento_poucourgente numeric default 0,
  eng_pct_emergentes numeric default 0,
  eng_pct_urgentes numeric default 0,
  eng_pct_poucourgentes numeric default 0,
  pred_corretivas_abertas integer default 0,
  pred_corretivas_fechadas integer default 0,
  pred_pct_corretivas_fechadas numeric default 0,
  pred_preventivas_abertas integer default 0,
  pred_preventivas_fechadas integer default 0,
  pred_pct_preventivas_fechadas numeric default 0,
  pred_ar_sc_gd_abertas integer default 0,
  pred_ar_sc_gd_fechadas integer default 0,
  pred_ar_cg_gz_abertas integer default 0,
  pred_ar_cg_gz_fechadas integer default 0,
  pred_demais_abertas integer default 0,
  pred_demais_fechadas integer default 0,
  pred_os_emergentes integer default 0,
  pred_pct_sla_triagem_emergente numeric default 0,
  pred_pct_sla_fechamento_emergente numeric default 0,
  pred_os_urgentes integer default 0,
  pred_pct_sla_triagem_urgente numeric default 0,
  pred_pct_sla_fechamento_urgente numeric default 0,
  pred_os_pouco_urgentes integer default 0,
  pred_pct_sla_triagem_poucourgente numeric default 0,
  pred_pct_sla_fechamento_poucourgente numeric default 0,
  created_at timestamptz default now(),
  unique(mes, ano)
);

create table if not exists public.tecnicos_manutencao (
  id uuid primary key default gen_random_uuid(),
  mes text not null,
  ano integer not null,
  nome text not null,
  setor text not null,
  corretivas integer default 0,
  preventivas integer default 0,
  total_os integer default 0,
  atendidas_no_prazo integer default 0,
  fechadas_no_prazo integer default 0,
  percentual_atendimento numeric default 0,
  percentual_fechamento numeric default 0,
  created_at timestamptz default now()
);

alter table public.indicadores_manutencao enable row level security;
alter table public.tecnicos_manutencao enable row level security;

create policy "Authenticated can read indicadores_manutencao" on public.indicadores_manutencao for select to authenticated using (true);
create policy "Authenticated can insert indicadores_manutencao" on public.indicadores_manutencao for insert to authenticated with check (true);
create policy "Authenticated can update indicadores_manutencao" on public.indicadores_manutencao for update to authenticated using (true) with check (true);
create policy "Authenticated can delete indicadores_manutencao" on public.indicadores_manutencao for delete to authenticated using (true);

create policy "Authenticated can read tecnicos_manutencao" on public.tecnicos_manutencao for select to authenticated using (true);
create policy "Authenticated can insert tecnicos_manutencao" on public.tecnicos_manutencao for insert to authenticated with check (true);
create policy "Authenticated can update tecnicos_manutencao" on public.tecnicos_manutencao for update to authenticated using (true) with check (true);
create policy "Authenticated can delete tecnicos_manutencao" on public.tecnicos_manutencao for delete to authenticated using (true);