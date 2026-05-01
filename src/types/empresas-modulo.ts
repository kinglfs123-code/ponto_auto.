export type BillingStatus = "aguardando_oc" | "faturado" | "pendente_pagamento" | "pago";

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  aguardando_oc: "Aguardando OC",
  faturado: "Faturado",
  pendente_pagamento: "Pendente Pagamento",
  pago: "Pago",
};

export const BILLING_STATUS_TONE: Record<BillingStatus, string> = {
  aguardando_oc: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  faturado: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  pendente_pagamento: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  pago: "bg-success/15 text-success border-success/30",
};

export interface ClientCompany {
  id: string;
  empresa_id: string;
  name: string;
  cnpj: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientBilling {
  id: string;
  empresa_id: string;
  client_company_id: string;
  reference_month: string;
  measurement_date: string | null;
  send_date: string | null;
  description: string | null;
  amount: number;
  due_date: string | null;
  received_date: string | null;
  billing_status: BillingStatus;
  payment_status: string;
  oc_number: string | null;
  created_at: string;
  updated_at: string;
}
