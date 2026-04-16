import { getSessionToken, setSessionToken } from './auth';
import { auth } from './firebase';
import type {
  BankAccount,
  ExchangeOrder,
  FiatTransaction,
  FiatWithdrawalResult,
  Invoice,
  InvoiceType,
  KycInfo,
  MfaVerifyResult,
  ParsedInvoiceData,
  Token,
  TrustlineInfo,
  User,
  VirtualAccount,
  WhitelistAddress,
  XrpBalance,
  XrpTransaction,
  XrpWithdrawalResult,
} from './types';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
const MFA_COOKIE = 'mfa_token';
const MFA_MAX_AGE_SEC = 120; // 2 minutes

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAgeSec: number): void {
  void cookieStore.set({
    name,
    value: encodeURIComponent(value),
    path: '/',
    expires: Date.now() + maxAgeSec * 1000,
    sameSite: 'lax',
  });
}

function deleteCookie(name: string): void {
  void cookieStore.delete({ name, path: '/' });
}

export function getMfaToken(): string | null {
  return getCookie(MFA_COOKIE);
}

export function setMfaToken(token: string | null): void {
  if (token) {
    setCookie(MFA_COOKIE, token, MFA_MAX_AGE_SEC);
  } else {
    deleteCookie(MFA_COOKIE);
  }
}

export async function refreshSession(): Promise<void> {
  const idToken = await auth.currentUser?.getIdToken(true);
  if (!idToken) throw new Error('Not signed in');
  const currentSession = getSessionToken();
  const res = await fetch(`${API_BASE}/api/v1/session/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(currentSession ? { Authorization: `Bearer ${currentSession}` } : {}),
    },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: 'Unknown error' }))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${String(res.status)}`);
  }
  const data = (await res.json()) as { sessionToken: string };
  setSessionToken(data.sessionToken);
}

export class MfaRequiredError extends Error {
  constructor() {
    super('MFA required');
    this.name = 'MfaRequiredError';
  }
}

export class OperationMfaRequiredError extends Error {
  constructor() {
    super('MFA verification required');
    this.name = 'OperationMfaRequiredError';
  }
}

export class KycRequiredError extends Error {
  constructor() {
    super('KYC required');
    this.name = 'KycRequiredError';
  }
}

function throwIfForbidden(status: number, body: { code?: string; error?: string }): void {
  if (status !== 403) return;
  if (body.code === 'MFA_REQUIRED') throw new OperationMfaRequiredError();
  if (body.error === 'KYC required') throw new KycRequiredError();
  if (body.error === 'MFA required') throw new MfaRequiredError();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers ?? {}) as Record<string, string>),
  };
  const token = getSessionToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const currentMfaToken = getMfaToken();
  if (currentMfaToken) {
    headers['X-MFA-Token'] = currentMfaToken;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (currentMfaToken) {
    setMfaToken(null);
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: 'Unknown error' }))) as { code?: string; error?: string };
    throwIfForbidden(res.status, body);
    throw new Error(body.error ?? `HTTP ${String(res.status)}`);
  }
  return res.json() as Promise<T>;
}

export function getMe() {
  return request<User>('/api/v1/users/me');
}

export function setupWallet() {
  return request<{ address: string }>('/api/v1/users/me/wallet', {
    method: 'POST',
  });
}

export function getVirtualAccount() {
  return request<VirtualAccount>('/api/v1/users/me/virtual-account');
}

export function setupVirtualAccount() {
  return request<VirtualAccount>('/api/v1/users/me/virtual-account', {
    method: 'POST',
  });
}

export function listTokens() {
  return request<Token[]>('/api/v1/tokens');
}

export function getToken(tokenId: string) {
  return request<Token>(`/api/v1/tokens/${tokenId}`);
}

export function ensureTrustLine(tokenId: string) {
  return request<{ tokenId: string; currency: string; status: string }>(`/api/v1/tokens/${tokenId}/trustline`, {
    method: 'POST',
  });
}

export function getFiatBalance() {
  return request<{ balance: number }>('/api/v1/balance/fiat');
}

export function getXrpBalance() {
  return request<{ address: string; balances: XrpBalance[] }>('/api/v1/balance/xrp');
}

export function getFiatTransactions() {
  return request<FiatTransaction[]>('/api/v1/balance/fiat/transactions');
}

export function getXrpTransactions() {
  return request<XrpTransaction[]>('/api/v1/balance/xrp/transactions');
}

export function getTrustlines() {
  return request<TrustlineInfo[]>('/api/v1/balance/trustlines');
}

export function exchangeFiatToXrp(data: { tokenId: string; fiatAmount: number }) {
  return request<ExchangeOrder>('/api/v1/exchange/fiat-to-xrp', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function exchangeXrpToFiat(data: { tokenId: string; tokenAmount: number }) {
  return request<ExchangeOrder>('/api/v1/exchange/xrp-to-fiat', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getXrpWhitelist() {
  return request<WhitelistAddress[]>('/api/v1/whitelist/xrp');
}

export function addXrpWhitelist(data: { address: string; label: string }) {
  return request<WhitelistAddress>('/api/v1/whitelist/xrp', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function removeXrpWhitelist(address: string) {
  return request<{ status: string }>(`/api/v1/whitelist/xrp/${address}`, {
    method: 'DELETE',
  });
}

export function getBankWhitelist() {
  return request<BankAccount[]>('/api/v1/whitelist/bank');
}

export function addBankWhitelist(data: {
  bankCode: string;
  branchCode: string;
  accountNumber: string;
  accountHolder: string;
  label: string;
}) {
  return request<BankAccount>('/api/v1/whitelist/bank', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function removeBankWhitelist(id: string) {
  return request<{ status: string }>(`/api/v1/whitelist/bank/${id}`, {
    method: 'DELETE',
  });
}

export function withdrawFiat(data: { amount: number; bankAccount: BankAccount }) {
  return request<FiatWithdrawalResult>('/api/v1/withdraw/fiat', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function withdrawXrp(data: { tokenId: string; tokenAmount: number; destinationAddress: string }) {
  return request<XrpWithdrawalResult>('/api/v1/withdraw/xrp', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function submitKyc(data: {
  fullName: string;
  phoneNumber: string;
  postalCode: string;
  prefecture: string;
  city: string;
  town: string;
  address: string;
}) {
  return request<KycInfo>('/api/v1/users/me/kyc', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function sendInvoice(data: Omit<ParsedInvoiceData, 'invoiceId'>): Promise<Invoice> {
  return request<Invoice>('/api/v1/invoices/send', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function payInvoice(data: ParsedInvoiceData): Promise<Invoice> {
  return request<Invoice>('/api/v1/invoices/pay', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function parseInvoicePdf(pdf: File): Promise<ParsedInvoiceData> {
  const formData = new FormData();
  formData.append('pdf', pdf);

  const headers: Record<string, string> = {};
  const token = getSessionToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/v1/invoices/pay/parse-pdf`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: 'Unknown error' }))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${String(res.status)}`);
  }

  return res.json() as Promise<ParsedInvoiceData>;
}

export function listInvoices(type?: InvoiceType) {
  const query = type ? `?type=${type}` : '';
  return request<Invoice[]>(`/api/v1/invoices${query}`);
}

export function getInvoice(invoiceId: string) {
  return request<Invoice>(`/api/v1/invoices/${invoiceId}`);
}

export function cancelInvoice(invoiceId: string) {
  return request<Invoice>(`/api/v1/invoices/${invoiceId}/cancel`, {
    method: 'POST',
  });
}

export async function verifyOperationMfa(code: string): Promise<MfaVerifyResult> {
  const result = await request<MfaVerifyResult>('/api/v1/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  setMfaToken(result.mfaToken);
  return result;
}
