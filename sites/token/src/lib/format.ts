import { isValidClassicAddress } from "ripple-address-codec";
import type { FiatTransactionType, MptTransactionType } from "@/lib/types";

type TransactionType = FiatTransactionType | MptTransactionType;

type TFn = (key: string, ...args: unknown[]) => string;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * MPToken amounts are integer atomic units on-chain; `assetScale` is the number of
 * decimal places the issuer declares. The backend always sends/receives the raw integer,
 * so scaling is purely a frontend display/input concern.
 *
 * Format a raw integer atomic value into a human-readable string with `assetScale` decimals.
 * String-based to avoid floating-point error; the integer part is grouped with thousands separators.
 */
export function formatMptAmount(raw: number | string, assetScale: number): string {
  const negative = String(raw).trim().startsWith("-");
  const digits = String(raw).replace(/^[-+]/, "").replace(/\D/g, "") || "0";

  let intPart: string;
  let fracPart = "";
  if (assetScale <= 0) {
    intPart = digits;
  } else {
    const padded = digits.padStart(assetScale + 1, "0");
    intPart = padded.slice(0, padded.length - assetScale);
    fracPart = padded.slice(padded.length - assetScale).replace(/0+$/, "");
  }

  const groupedInt = new Intl.NumberFormat("ja-JP").format(BigInt(intPart));
  const sign = negative && digits !== "0" ? "-" : "";
  return fracPart ? `${sign}${groupedInt}.${fracPart}` : `${sign}${groupedInt}`;
}

/**
 * Convert a raw integer atomic value into a plain decimal string (no thousands separators),
 * suitable for prefilling a numeric <input> (e.g. amount parsed from an invoice PDF).
 */
export function rawToInput(raw: number | string, assetScale: number): string {
  const digits = String(raw).replace(/^[-+]/, "").replace(/\D/g, "") || "0";
  if (assetScale <= 0) return String(Number(digits));
  const padded = digits.padStart(assetScale + 1, "0");
  const intPart = String(Number(padded.slice(0, padded.length - assetScale)));
  const fracPart = padded.slice(padded.length - assetScale).replace(/0+$/, "");
  return fracPart ? `${intPart}.${fracPart}` : intPart;
}

/**
 * Convert a human-entered display value (may contain a decimal point) back into the raw
 * integer atomic value to submit to the backend. Extra decimals beyond `assetScale` are truncated.
 */
export function toRawAmount(display: string | number, assetScale: number): number {
  const str = String(display).trim();
  const [intRaw = "", fracRaw = ""] = str.replace(/[^\d.]/g, "").split(".");
  const scale = Math.max(0, assetScale);
  const frac = fracRaw.slice(0, scale).padEnd(scale, "0");
  const combined = `${intRaw}${frac}`.replace(/^0+(?=\d)/, "");
  return Number(combined || "0");
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
