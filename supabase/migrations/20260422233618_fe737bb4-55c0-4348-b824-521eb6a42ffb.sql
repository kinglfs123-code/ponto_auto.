-- Performance indexes for frequently queried foreign keys and filter combinations
create index if not exists idx_folhas_ponto_empresa on public.folhas_ponto(empresa_id);
create index if not exists idx_folhas_ponto_funcionario on public.folhas_ponto(funcionario_id);
create index if not exists idx_folhas_ponto_empresa_mes on public.folhas_ponto(empresa_id, mes_referencia desc);

create index if not exists idx_holerites_empresa_mes on public.holerites(empresa_id, mes_referencia);
create index if not exists idx_holerites_funcionario on public.holerites(funcionario_id);

create index if not exists idx_registros_folha on public.registros_ponto(folha_id);

create index if not exists idx_relatorios_empresa_created on public.relatorios(empresa_id, created_at desc);

create index if not exists idx_empresas_owner on public.empresas(owner_id);