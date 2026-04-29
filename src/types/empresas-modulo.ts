export type BillingStatus = "aguardando_oc" | "faturado";
export type PaymentStatusBilling = "a_receber" | "recebido" | "recebido_com_atraso" | "atrasado";

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  aguardando_oc: "Aguardando OC",
  faturado: "Faturado",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusBilling, string> = {
  a_receber: "A receber",
  recebido: "Recebido",
  recebido_com_atraso: "Recebido com atraso",
  atrasado: "Atrasado",
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
  payment_status: PaymentStatusBilling;
  created_at: string;
  updated_at: string;
}

/** Computes payment status from due/received dates and current billing status. */
export function computePaymentStatus(opts: {
  due_date: string | null;
  received_date: string | null;
  today: string;
}): PaymentStatusBilling {
  const { due_date, received_date, today } = opts;
  if (received_date) {
    if (due_date && received_date > due_date) return "recebido_com_atraso";
    return "recebido";
  }
  if (due_date && due_date < today) return "atrasado";
  return "a_receber";
}
