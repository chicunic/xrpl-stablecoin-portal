import type { BankTransaction } from "@/lib/types";

type TransactionType = BankTransaction["type"];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string | number): string {
  const d = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const txTypeLabelMap: Record<TransactionType, string> = {
  atm_in: "ATM入金",
  atm_out: "ATM出金",
  transfer_in: "振込入金",
  transfer_out: "振込出金",
};

export function txTypeLabel(type: TransactionType): string {
  return txTypeLabelMap[type];
}

export function isIncome(type: TransactionType): boolean {
  return type === "atm_in" || type === "transfer_in";
}
