/**
 * Estrutura de categorias do DRE — réplica fiel da planilha
 * "DRE_p_automação-2.xlsx" (Espaço Família).
 *
 * Convenções:
 * - `code`: identificador único (ex.: "1.00", "5.10.15", "301").
 * - `sign`: sinal exibido na coluna B da planilha ("+", "-", "=").
 * - `is_subtotal`: true para linhas calculadas (não editáveis).
 * - `auto_from`: códigos do plano de contas (item_codes do Financeiro) que
 *   alimentam a célula automaticamente. Vazio ⇒ totalmente manual.
 * - `formula`: para subtotais — lista de códigos a somar (com seus sinais).
 * - `band`: chave do token de cor de faixa para subtotais
 *   (mapeada em src/index.css: --dre-band-<band>).
 */

export type DreSign = "+" | "-" | "=";
export type DreBand =
  | "receita"
  | "deducoes"
  | "impostos"
  | "cmv"
  | "despesas"
  | "ebit"
  | "financeiras"
  | "lucro"
  | "caixa";

export interface DreCategory {
  code: string;
  label: string;
  sign: DreSign;
  is_subtotal?: boolean;
  /** Códigos do Financeiro que alimentam esta linha. */
  auto_from?: string[];
  /** Para subtotais: códigos somados (sinal já aplicado por cada item). */
  formula?: string[];
  /** Indenta visualmente: 0 = título de seção, 1 = item, 2 = sub-item. */
  indent?: 0 | 1 | 2;
  /** Faixa colorida (apenas em subtotais ou cabeçalhos de bloco). */
  band?: DreBand;
}

const sub = (
  code: string,
  label: string,
  formula: string[],
  band: DreBand,
): DreCategory => ({
  code,
  label,
  sign: "=",
  is_subtotal: true,
  formula,
  indent: 0,
  band,
});

export const DRE_CATEGORIES: DreCategory[] = [
  // ========== 1.00 Receita Bruta ==========
  sub("1.00", "Receita Bruta", ["1.01", "1.02", "1.03", "1.04", "1.05", "1.06"], "receita"),
  { code: "1.01", label: "Vendas Varejo", sign: "+", indent: 1 },
  { code: "1.02", label: "Vendas Empresas", sign: "+", indent: 1 },
  { code: "1.03", label: "Linha livre", sign: "+", indent: 1 },
  { code: "1.04", label: "Linha livre", sign: "+", indent: 1 },
  { code: "1.05", label: "Linha livre", sign: "+", indent: 1 },
  { code: "1.06", label: "Linha livre", sign: "+", indent: 1 },

  // ========== 2.00 Deduções ==========
  sub("2.00", "Deduções de Vendas (var)", ["2.01", "2.02"], "deducoes"),
  { code: "2.01", label: "Devoluções", sign: "-", indent: 1 },
  { code: "2.02", label: "Perdas de Inadimplência", sign: "-", indent: 1 },

  // ========== 3.00 Receita Líquida ==========
  sub("3.00", "Receita (1 − 2)", ["1.00", "-2.00"], "receita"),

  // ========== 4.00 Impostos sobre Vendas ==========
  sub("4.00", "Impostos sobre Vendas (var)", ["201", "4.02", "4.03", "4.04", "4.05", "4.06", "4.07"], "impostos"),
  { code: "201", label: "Simples", sign: "-", auto_from: ["201"], indent: 1 },
  { code: "4.02", label: "Provisão para Impostos", sign: "-", indent: 1 },
  { code: "4.03", label: "COFINS", sign: "-", indent: 1 },
  { code: "4.04", label: "Linha livre", sign: "-", indent: 1 },
  { code: "4.05", label: "Linha livre", sign: "-", indent: 1 },
  { code: "4.06", label: "Linha livre", sign: "-", indent: 1 },
  { code: "4.07", label: "Linha livre", sign: "-", indent: 1 },

  // ========== 5.00 CMV ==========
  sub("5.00", "CMV (var)", [
    "5.01", "301", "302", "303", "304", "305",
    "5.07", "5.08", "-5.09", "5.10", "5.11", "5.12",
  ], "cmv"),
  { code: "5.01", label: "Estoque Inicial", sign: "+", indent: 1 },
  { code: "301", label: "Matéria-Prima, Bebidas e Produtos", sign: "-", auto_from: ["301"], indent: 1 },
  { code: "302", label: "ICMS", sign: "-", auto_from: ["302"], indent: 1 },
  { code: "303", label: "Gás", sign: "-", auto_from: ["303"], indent: 1 },
  { code: "304", label: "Energia", sign: "-", auto_from: ["304"], indent: 1 },
  { code: "305", label: "Água", sign: "-", auto_from: ["305"], indent: 1 },

  // 5.07 Impostos sobre compras
  sub("5.07", "Custos (var) — Impostos sobre compras", ["5.07.01", "5.07.02", "5.07.03", "5.07.04", "5.07.05"], "cmv"),
  { code: "5.07.01", label: "ICMS", sign: "+", indent: 2 },
  { code: "5.07.02", label: "PIS", sign: "+", indent: 2 },
  { code: "5.07.03", label: "COFINS", sign: "+", indent: 2 },
  { code: "5.07.04", label: "Linha livre", sign: "+", indent: 2 },
  { code: "5.07.05", label: "Linha livre", sign: "+", indent: 2 },

  // 5.08 Pessoal produção variável
  sub("5.08", "Custos c/ pessoal prod, execução (var)", [
    "5.08.01", "5.08.02", "5.08.03", "5.08.04", "5.08.05", "5.08.06", "5.08.08",
  ], "cmv"),
  { code: "5.08.01", label: "Mão de Obra Própria", sign: "+", indent: 2 },
  { code: "5.08.02", label: "Provisão para 13º Salário", sign: "+", indent: 2 },
  { code: "5.08.03", label: "Provisão para Férias", sign: "+", indent: 2 },
  { code: "5.08.04", label: "FGTS", sign: "+", indent: 2 },
  { code: "5.08.05", label: "Provisão de FGTS (13° e Férias)", sign: "+", indent: 2 },
  { code: "5.08.06", label: "Provisão Multa Rescisória do FGTS", sign: "+", indent: 2 },
  { code: "5.08.08", label: "Provisão INSS (13° e Férias)", sign: "+", indent: 2 },

  // 5.09 Estoque Final (entra negativo no CMV)
  { code: "5.09", label: "Estoque Final", sign: "-", indent: 1 },

  // 5.10 Pessoal produção fixo
  sub("5.10", "Custos c/ pessoal prod, execução (fix)", [
    "5.10.01","5.10.02","5.10.03","5.10.04","5.10.05","5.10.06","5.10.08",
    "5.10.09","5.10.10","5.10.11","5.10.12","5.10.13","5.10.14",
    "5.10.15","5.10.16","5.10.17","5.10.18","5.10.19","5.10.20",
  ], "cmv"),
  { code: "5.10.01", label: "SALÁRIO BRUTO", sign: "+", indent: 2 },
  { code: "5.10.02", label: "Provisão para 13º Salário", sign: "+", indent: 2 },
  { code: "5.10.03", label: "Provisão para Férias", sign: "+", indent: 2 },
  { code: "5.10.04", label: "FGTS", sign: "+", indent: 2 },
  { code: "5.10.05", label: "Provisão de FGTS (13° e Férias)", sign: "+", indent: 2 },
  { code: "5.10.06", label: "Provisão Multa Rescisória do FGTS", sign: "+", indent: 2 },
  { code: "5.10.08", label: "Provisão INSS (13° e Férias)", sign: "+", indent: 2 },
  { code: "5.10.09", label: "Vale Transporte", sign: "+", indent: 2 },
  { code: "5.10.10", label: "Refeição", sign: "+", indent: 2 },
  { code: "5.10.11", label: "Cesta básica", sign: "+", indent: 2 },
  { code: "5.10.12", label: "Seguro de vida", sign: "+", indent: 2 },
  { code: "5.10.13", label: "Plano de saúde", sign: "+", indent: 2 },
  { code: "5.10.14", label: "Outros gastos com pessoal", sign: "+", indent: 2 },
  { code: "5.10.15", label: "Pró-labore bruto (valor recibo)", sign: "+", indent: 2 },
  { code: "5.10.16", label: "INSS empresa (sobre pró-labore)", sign: "+", indent: 2 },
  { code: "5.10.17", label: "Retirada complementar", sign: "+", indent: 2 },
  { code: "5.10.18", label: "Plano de saúde (sócios)", sign: "+", indent: 2 },
  { code: "5.10.19", label: "Retirada em produtos", sign: "+", indent: 2 },
  { code: "5.10.20", label: "Linha livre", sign: "+", indent: 2 },

  // 5.11 Veículos (produção)
  sub("5.11", "Custos c/ veículos (fix)", ["5.11.01", "5.11.02", "5.11.03", "5.11.04"], "cmv"),
  { code: "5.11.01", label: "Combustível veículos", sign: "+", indent: 2 },
  { code: "5.11.02", label: "Manutenção veículos", sign: "+", indent: 2 },
  { code: "5.11.03", label: "Seguro veículos", sign: "+", indent: 2 },
  { code: "5.11.04", label: "IPVA + DPVAT + TRLAV", sign: "+", indent: 2 },

  // 5.12 Demais custos produção
  sub("5.12", "Demais custos produção, execução (fix)", [
    "5.12.01","5.12.02","5.12.03","5.12.04","5.12.05","5.12.06",
    "5.12.07","5.12.08","5.12.09","5.12.10","5.12.11",
  ], "cmv"),
  { code: "5.12.01", label: "Água", sign: "+", indent: 2 },
  { code: "5.12.02", label: "Energia", sign: "+", indent: 2 },
  { code: "5.12.03", label: "Gás", sign: "+", indent: 2 },
  { code: "5.12.04", label: "Aluguéis", sign: "+", indent: 2 },
  { code: "5.12.05", label: "IPTU", sign: "+", indent: 2 },
  { code: "5.12.06", label: "Condomínios", sign: "+", indent: 2 },
  { code: "5.12.07", label: "Conservação de Bens / Instalações", sign: "+", indent: 2 },
  { code: "5.12.08", label: "Manutenção preventiva máquinas e equip.", sign: "+", indent: 2 },
  { code: "5.12.09", label: "Seguro de equipamentos", sign: "+", indent: 2 },
  { code: "5.12.10", label: "Depreciações ou Amortizações equip.", sign: "+", indent: 2 },
  { code: "5.12.11", label: "Outros Gastos", sign: "+", indent: 2 },

  // ========== 6.00 Lucro Bruto ==========
  sub("6.00", "Lucro Bruto", ["3.00", "-4.00", "-5.00"], "lucro"),

  // ========== 7.00 Despesas Variáveis com Vendas ==========
  sub("7.00", "Despesas Variáveis c/ Vendas (var)", ["401", "402", "403", "498", "499"], "despesas"),
  { code: "401", label: "Comissões", sign: "-", auto_from: ["401"], indent: 1 },
  { code: "402", label: "Entregas", sign: "-", auto_from: ["402"], indent: 1 },
  { code: "403", label: "Couvert Artístico", sign: "-", auto_from: ["403"], indent: 1 },
  { code: "498", label: "Taxas de Cartão (1,80%)", sign: "-", auto_from: ["498"], indent: 1 },
  { code: "499", label: "Outras Despesas Variáveis com Vendas", sign: "-", auto_from: ["499"], indent: 1 },

  // ========== 8.00 Pessoal comercial variável ==========
  sub("8.00", "Despesas c/ pessoal comercial (var)", [
    "8.01","8.02","8.03","8.04","8.05","8.06","8.08","8.09","8.10",
  ], "despesas"),
  { code: "8.01", label: "Comissões sobre vendas", sign: "-", indent: 1 },
  { code: "8.02", label: "Provisão para 13º Salário", sign: "-", indent: 1 },
  { code: "8.03", label: "Provisão para Férias", sign: "-", indent: 1 },
  { code: "8.04", label: "FGTS", sign: "-", indent: 1 },
  { code: "8.05", label: "Provisão de FGTS (13° e Férias)", sign: "-", indent: 1 },
  { code: "8.06", label: "Provisão Multa Rescisória do FGTS", sign: "-", indent: 1 },
  { code: "8.08", label: "Provisão INSS (13° e Férias)", sign: "-", indent: 1 },
  { code: "8.09", label: "Outros gastos com pessoal", sign: "-", indent: 1 },
  { code: "8.10", label: "Linha livre", sign: "-", indent: 1 },

  // ========== 9.00 Pessoal comercial fixo ==========
  sub("9.00", "Despesas c/ pessoal comercial (fix)", [
    "9.01","9.02","9.03","9.04","9.05","9.06","9.07","9.08",
    "9.09","9.10","9.11","9.12","9.13","9.14","9.15","9.16","9.17","9.18",
  ], "despesas"),
  { code: "9.01", label: "SALÁRIO BRUTO", sign: "-", indent: 1 },
  { code: "9.02", label: "Provisão para 13º Salário", sign: "-", indent: 1 },
  { code: "9.03", label: "Provisão para Férias", sign: "-", indent: 1 },
  { code: "9.04", label: "FGTS", sign: "-", indent: 1 },
  { code: "9.05", label: "Provisão de FGTS (13° e Férias)", sign: "-", indent: 1 },
  { code: "9.06", label: "Provisão Multa Rescisória do FGTS", sign: "-", indent: 1 },
  { code: "9.07", label: "INSS (CPP)", sign: "-", indent: 1 },
  { code: "9.08", label: "Provisão INSS (13° e Férias)", sign: "-", indent: 1 },
  { code: "9.09", label: "Vale Transporte", sign: "-", indent: 1 },
  { code: "9.10", label: "Refeição", sign: "-", indent: 1 },
  { code: "9.11", label: "Cesta básica", sign: "-", indent: 1 },
  { code: "9.12", label: "Seguro de vida", sign: "-", indent: 1 },
  { code: "9.13", label: "Plano de saúde", sign: "-", indent: 1 },
  { code: "9.14", label: "Treinamento / desenvolvimento", sign: "-", indent: 1 },
  { code: "9.15", label: "Linha livre", sign: "-", indent: 1 },
  { code: "9.16", label: "Linha livre", sign: "-", indent: 1 },
  { code: "9.17", label: "Linha livre", sign: "-", indent: 1 },
  { code: "9.18", label: "Linha livre", sign: "-", indent: 1 },

  // ========== 10.00 Despesas Fixas com Colaboradores ==========
  sub("10.00", "Despesas Fixas c/ Colaboradores (fix)", ["501", "502", "503", "599"], "despesas"),
  { code: "501", label: "Despesa com Folha de Pgto.", sign: "-", auto_from: ["501"], indent: 1 },
  { code: "502", label: "Encargos (INSS, FGTS, IRPF)", sign: "-", auto_from: ["502"], indent: 1 },
  { code: "503", label: "Retirada Pró-labore", sign: "-", auto_from: ["503"], indent: 1 },
  { code: "599", label: "Provisão de 13º", sign: "-", auto_from: ["599"], indent: 1 },

  // ========== 11.00 Concessionárias ==========
  sub("11.00", "Despesas c/ Concessionárias (fix)", ["11.01", "11.02", "11.03", "11.04", "11.05", "11.06"], "despesas"),
  { code: "11.01", label: "TELEFONE, TV E INTERNET", sign: "-", indent: 1 },
  { code: "11.02", label: "ENERGIA", sign: "-", indent: 1 },
  { code: "11.03", label: "ÁGUA", sign: "-", indent: 1 },
  { code: "11.04", label: "Linha livre", sign: "-", indent: 1 },
  { code: "11.05", label: "Linha livre", sign: "-", indent: 1 },
  { code: "11.06", label: "Linha livre", sign: "-", indent: 1 },

  // ========== 12.00 Veículos (admin) ==========
  sub("12.00", "Despesas c/ veículos (fix)", ["12.01", "12.02", "12.03", "12.04"], "despesas"),
  { code: "12.01", label: "COMBUSTÍVEL", sign: "-", indent: 1 },
  { code: "12.02", label: "MANUTENÇÃO", sign: "-", indent: 1 },
  { code: "12.03", label: "SEGUROS E TAXAS", sign: "-", indent: 1 },
  { code: "12.04", label: "OUTROS", sign: "-", indent: 1 },

  // ========== 13.00 Marketing ==========
  sub("13.00", "Despesas c/ marketing (fix)", ["13.01", "13.02", "13.03"], "despesas"),
  { code: "13.01", label: "PROPAGANDA", sign: "-", indent: 1 },
  { code: "13.02", label: "Linha livre", sign: "-", indent: 1 },
  { code: "13.03", label: "Linha livre", sign: "-", indent: 1 },

  // ========== 14.00 Serviços de Terceiros ==========
  sub("14.00", "Despesas c/ serviços de Terceiros (fix)", [
    "14.01","14.02","14.03","14.04","14.05","14.06","14.07","14.08","14.09",
  ], "despesas"),
  { code: "14.01", label: "SERVIÇOS DE TERCEIROS", sign: "-", indent: 1 },
  { code: "14.02", label: "Segurança (alarme)", sign: "-", indent: 1 },
  { code: "14.03", label: "Sistema", sign: "-", indent: 1 },
  { code: "14.04", label: "Linha livre", sign: "-", indent: 1 },
  { code: "14.05", label: "Linha livre", sign: "-", indent: 1 },
  { code: "14.06", label: "Linha livre", sign: "-", indent: 1 },
  { code: "14.07", label: "Linha livre", sign: "-", indent: 1 },
  { code: "14.08", label: "Linha livre", sign: "-", indent: 1 },
  { code: "14.09", label: "Linha livre", sign: "-", indent: 1 },

  // ========== 15.00 Despesas Adm/Gerais ==========
  sub("15.00", "Despesas Adm/ Gerais (fix)", [
    "601","602","603","604","605","606","607","608","609","610","611","612","699","15.99",
  ], "despesas"),
  { code: "601", label: "Aluguel, condomínio, IPTU e Alvará", sign: "-", auto_from: ["601"], indent: 1 },
  { code: "602", label: "Telefone, Internet e TV", sign: "-", auto_from: ["602"], indent: 1 },
  { code: "603", label: "Material de escritório / limpeza e consumo", sign: "-", auto_from: ["603"], indent: 1 },
  { code: "604", label: "Sistemas", sign: "-", auto_from: ["604"], indent: 1 },
  { code: "605", label: "Honorários contábeis / advocatícios", sign: "-", auto_from: ["605"], indent: 1 },
  { code: "606", label: "Consultorias e treinamentos", sign: "-", auto_from: ["606"], indent: 1 },
  { code: "607", label: "Manutenção máquinas, mobiliário e reposição", sign: "-", auto_from: ["607"], indent: 1 },
  { code: "608", label: "Manutenção de instalações", sign: "-", auto_from: ["608"], indent: 1 },
  { code: "609", label: "Despesas Comerciais e Mkt", sign: "-", auto_from: ["609"], indent: 1 },
  { code: "610", label: "Despesas com Veículos", sign: "-", auto_from: ["610"], indent: 1 },
  { code: "611", label: "Segurança", sign: "-", auto_from: ["611"], indent: 1 },
  { code: "612", label: "Tarifas bancárias", sign: "-", auto_from: ["612"], indent: 1 },
  { code: "699", label: "Outras Despesas Adm / Gerais", sign: "-", auto_from: ["699"], indent: 1 },
  { code: "15.99", label: "Depreciações", sign: "-", indent: 1 },

  // ========== 16.00 EBIT ==========
  sub("16.00", "Lucro Operacional (EBIT)", [
    "6.00","-7.00","-8.00","-9.00","-10.00","-11.00","-12.00","-13.00","-14.00","-15.00",
  ], "ebit"),

  // ========== 17.00 Despesas Financeiras Fixas ==========
  sub("17.00", "Despesas Financeiras Fixas (fix)", ["702", "703", "704", "799"], "financeiras"),
  { code: "702", label: "Juros e Multas Pagos a Fornecedores", sign: "-", auto_from: ["702"], indent: 1 },
  { code: "703", label: "Juros de Empréstimos / Financiamentos", sign: "-", auto_from: ["703"], indent: 1 },
  { code: "704", label: "IOF", sign: "-", auto_from: ["704"], indent: 1 },
  { code: "799", label: "Outras Despesas Financeiras", sign: "-", auto_from: ["799"], indent: 1 },

  // ========== 18.00 Despesas Financeiras Variáveis ==========
  sub("18.00", "Despesas Financeiras Variáveis (var)", ["18.01", "18.02", "18.03", "18.04"], "financeiras"),
  { code: "18.01", label: "Linha livre", sign: "-", indent: 1 },
  { code: "18.02", label: "Linha livre", sign: "-", indent: 1 },
  { code: "18.03", label: "Linha livre", sign: "-", indent: 1 },
  { code: "18.04", label: "Linha livre", sign: "-", indent: 1 },

  // ========== 19.00 Receitas Financeiras ==========
  sub("19.00", "Receitas Financeiras", ["701", "19.02", "19.03"], "financeiras"),
  { code: "701", label: "Receitas Financeiras", sign: "+", auto_from: ["701"], indent: 1 },
  { code: "19.02", label: "Juros de clientes (atraso)", sign: "+", indent: 1 },
  { code: "19.03", label: "Descontos Recebidos", sign: "+", indent: 1 },

  // ========== 20.00 Outras Receitas ==========
  sub("20.00", "Outras Receitas", ["20.01", "20.02", "20.03"], "receita"),
  { code: "20.01", label: "Venda de ativos imobilizados (ganho)", sign: "+", indent: 1 },
  { code: "20.02", label: "Rec. Juros/multas atraso", sign: "+", indent: 1 },
  { code: "20.03", label: "Linha livre", sign: "+", indent: 1 },

  // ========== 21.00 Outras Despesas ==========
  sub("21.00", "Outras Despesas", ["21.01", "21.02", "21.03"], "despesas"),
  { code: "21.01", label: "Outras despesas", sign: "-", indent: 1 },
  { code: "21.02", label: "Perda de Estoque", sign: "-", indent: 1 },
  { code: "21.03", label: "Linha livre", sign: "-", indent: 1 },

  // ========== 22.00 Lucro antes do IRPJ e CSLL ==========
  sub("22.00", "Lucro (antes do IRPJ e da CSLL)", [
    "16.00","-17.00","-18.00","19.00","20.00","-21.00",
  ], "lucro"),
  { code: "22.01", label: "Imposto Renda (IRPJ)", sign: "-", indent: 1 },
  { code: "22.02", label: "Contribuição Social (CSLL)", sign: "-", indent: 1 },
  { code: "22.03", label: "Adicional de IR", sign: "-", indent: 1 },

  // ========== 23.00 Lucro Líquido ==========
  sub("23.00", "Lucro Líquido", ["22.00", "-22.01", "-22.02", "-22.03"], "lucro"),

  // ========== 24.00 Destinação de Lucros / Movimentação de Caixa ==========
  sub("24.00", "Destinação de Lucros / Movimentação de Caixa", [
    "-801","-899",
    "901","902","903","904","905","906","999",
  ], "caixa"),
  // Movimentação dos sócios
  { code: "801", label: "Distribuição de Lucros", sign: "-", indent: 1 },
  { code: "899", label: "Outras Movimentações de Sócios", sign: "-", indent: 1 },
  // Entradas de caixa
  { code: "901", label: "Aporte de Capital", sign: "+", indent: 1 },
  { code: "902", label: "Crédito de Financiamento", sign: "+", indent: 1 },
  { code: "903", label: "Empréstimos Obtidos", sign: "+", indent: 1 },
  { code: "904", label: "Resgate de Aplicação", sign: "+", indent: 1 },
  { code: "905", label: "Venda de Imobilizado", sign: "+", indent: 1 },
  { code: "906", label: "Recebimento de Empréstimos Concedidos", sign: "+", indent: 1 },
  { code: "999", label: "Outras Entradas", sign: "+", indent: 1 },
];

/** Lookup por código. */
export const DRE_INDEX: Record<string, DreCategory> = Object.fromEntries(
  DRE_CATEGORIES.map((c) => [c.code, c]),
);

/** Códigos cujo subtotal representa indicadores principais (cards). */
export const DRE_HEADLINE_CODES = ["1.00", "3.00", "6.00", "16.00", "22.00", "23.00"] as const;

/**
 * Mapa estático band → classes Tailwind.
 * Mantido como literal para o Tailwind detectar via JIT.
 */
export const DRE_BAND_BG: Record<DreBand, string> = {
  receita:     "bg-[hsl(var(--dre-band-receita))]",
  deducoes:    "bg-[hsl(var(--dre-band-deducoes))]",
  impostos:    "bg-[hsl(var(--dre-band-impostos))]",
  cmv:         "bg-[hsl(var(--dre-band-cmv))]",
  despesas:    "bg-[hsl(var(--dre-band-despesas))]",
  ebit:        "bg-[hsl(var(--dre-band-ebit))]",
  financeiras: "bg-[hsl(var(--dre-band-financeiras))]",
  lucro:       "bg-[hsl(var(--dre-band-lucro))]",
  caixa:       "bg-[hsl(var(--dre-band-caixa))]",
};

