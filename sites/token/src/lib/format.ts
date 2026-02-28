import { isValidClassicAddress } from "ripple-address-codec";
import type { TransactionType } from "@/lib/types";

type TFn = (key: string, ...args: unknown[]) => string;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTokenAmount(amount: number | string): string {
  const num = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  return new Intl.NumberFormat("ja-JP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  }).format(num);
}

export function formatDate(value: string | number): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function txTypeLabel(type: TransactionType, t: TFn): string {
  return t(`transaction.${type}`);
}

export function isIncomeType(type: TransactionType): boolean {
  return type === "deposit" || type === "exchange_in" || type === "refund";
}

export function isValidXrpAddress(address: string): boolean {
  return isValidClassicAddress(address);
}
