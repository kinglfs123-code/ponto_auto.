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
  intervalo: string;
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

export type CategoriaDocumento = "contrato" | "epi" | "aso" | "outros";

export interface FuncionarioDocumento {
  id: string;
  funcionario_id: string;
  empresa_id: string;
  categoria: CategoriaDocumento;
  nome_arquivo: string;
  storage_path: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  created_at: string;
}

export type StatusFerias = "planejada" | "em_andamento" | "concluida";

export interface FuncionarioFerias {
  id: string;
  funcionario_id: string;
  empresa_id: string;
  data_inicio: string;
  data_fim: string;
  dias: number;
  status: StatusFerias;
  observacao: string | null;
  created_at: string;
}
