export type PaymentMethod = "boleto" | "pix" | "transferencia" | "dinheiro" | "cartao";
export type PayableStatus = "pendente" | "pago" | "cancelado";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "boleto", label: "Boleto" },
  { value: "pix", label: "PIX" },
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
];

export interface Supplier {
  id: string;
  empresa_id: string;
  name: string;
  cnpj: string;
  default_payment_method: PaymentMethod | null;
  default_item_code: string | null;
  default_due_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface Payable {
  id: string;
  empresa_id: string;
  supplier_id: string;
  arrival_date: string;
  amount: number;
  due_date: string;
  payment_method: PaymentMethod;
  item_code: string;
  status: PayableStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}
