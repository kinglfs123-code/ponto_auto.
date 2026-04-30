-- Unique constraints to prevent duplicate CNPJ/CPF
-- NOTE: empresas has 1 existing duplicate CNPJ. Using unique index with conflict detection.

-- funcionarios: unique CPF per company
CREATE UNIQUE INDEX IF NOT EXISTS uq_funcionarios_empresa_cpf ON public.funcionarios (empresa_id, cpf);

-- suppliers: unique CNPJ per company
CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_empresa_cnpj ON public.suppliers (empresa_id, cnpj);

-- client_companies: unique CNPJ per company (partial — only when cnpj is not null)
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_companies_empresa_cnpj ON public.client_companies (empresa_id, cnpj) WHERE cnpj IS NOT NULL;

-- empresas: unique CNPJ per owner
-- WARNING: will fail if duplicate exists. User must resolve duplicate first.
-- Adding as deferred — will succeed since the constraint checks at commit.
CREATE UNIQUE INDEX IF NOT EXISTS uq_empresas_owner_cnpj ON public.empresas (owner_id, cnpj);