export interface Empresa {
  id: string;
  cnpj: string;
  nome: string;
  jornada_padrao: string;
}

export interface Funcionario {
  id: string;
  empresa_id: string;
  nome_completo: string;
  cpf: string;
  email: string | null;
  data_nascimento: string | null;
  cargo: string | null;
  horario_entrada: string;
  horario_saida: string;
}

export interface FuncionarioBasic {
  id: string;
  nome_completo: string;
  email: string | null;
  cargo: string | null;
}

export interface Folha {
  id: string;
  funcionario: string;
  mes_referencia: string;
  status: string;
  empresa_id: string;
}

export interface Holerite {
  id: string;
  funcionario_id: string;
  mes_referencia: string;
  pdf_path: string;
  enviado: boolean;
  enviado_em: string | null;
}

export interface Relatorio {
  id: string;
  empresa_id: string;
  mes_referencia: string;
  pdf_path: string;
  created_at: string;
}
