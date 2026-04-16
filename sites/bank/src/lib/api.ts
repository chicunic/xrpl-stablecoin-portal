import { getAuthToken } from './auth';
import type { BankAccount, BankTransaction, BankVirtualAccount } from './types';

const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body: { error?: string } = (await res.json().catch(() => ({ error: 'Unknown error' }))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${String(res.status)}`);
  }
  return res.json() as Promise<T>;
}

// Account
export function createAccount(data: { pin: string; accountHolder: string; accountType?: 'personal' | 'corporate' }) {
  return request<BankAccount>('/api/v1/accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function login(data: { branchCode: string; accountNumber: string; pin: string }) {
  return request<{ token: string; account: BankAccount }>('/api/v1/accounts/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getMe() {
  return request<BankAccount>('/api/v1/accounts/me');
}

export function updateMe(data: { accountHolder?: string; pin?: string; oldPin?: string; pubsubEnabled?: boolean }) {
  return request<BankAccount>('/api/v1/accounts/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function generateApiToken() {
  return request<{ token: string }>('/api/v1/accounts/me/api-token', {
    method: 'POST',
  });
}

export function lookupAccount(branchCode: string, accountNumber: string) {
  const params = new URLSearchParams({ branchCode, accountNumber });
  return request<{
    accountHolder: string;
    bankCode: string;
    branchCode: string;
    accountNumber: string;
    isVirtualAccount: boolean;
    parentAccountNumber: string;
    label: string;
  }>(`/api/v1/accounts/lookup?${params}`);
}

// ATM
export function deposit(amount: number, pin: string) {
  return request<{ balance: number }>('/api/v1/atm/deposit', {
    method: 'POST',
    body: JSON.stringify({ amount, pin }),
  });
}

export function withdraw(amount: number, pin: string) {
  return request<{ balance: number }>('/api/v1/atm/withdrawal', {
    method: 'POST',
    body: JSON.stringify({ amount, pin }),
  });
}

// Transfer
export function transfer(toBranchCode: string, toAccountNumber: string, amount: number, pin: string) {
  return request<{ balance: number; transactionId: string }>('/api/v1/transfers', {
    method: 'POST',
    body: JSON.stringify({ toBranchCode, toAccountNumber, amount, pin }),
  });
}

// Transactions
export function getTransactions() {
  return request<BankTransaction[]>('/api/v1/transactions');
}

// Virtual Accounts
export function createVirtualAccount(label: string) {
  return request<BankVirtualAccount>('/api/v1/accounts/me/virtual-accounts', {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
}

export function listVirtualAccounts() {
  return request<BankVirtualAccount[]>('/api/v1/accounts/me/virtual-accounts');
}

export function getVirtualAccount(virtualAccountId: string) {
  return request<BankVirtualAccount>(`/api/v1/accounts/me/virtual-accounts/${virtualAccountId}`);
}

export function updateVirtualAccount(virtualAccountId: string, data: { label?: string; isActive?: boolean }) {
  return request<BankVirtualAccount>(`/api/v1/accounts/me/virtual-accounts/${virtualAccountId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
