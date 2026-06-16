import type { BankAccount } from "./types";

const ACCOUNT_KEY = "bank_account";

function getCookie(name: string): string | null {
  const match = new RegExp(`(?:^|; )${name}=([^;]*)`).exec(document.cookie);
  return match ? decodeURIComponent(match[1] ?? "") : null;
}

function setCookie(name: string, value: string, maxAgeSec: number): void {
  void cookieStore.set({
    name,
    value: encodeURIComponent(value),
    path: "/",
    expires: Date.now() + maxAgeSec * 1000,
    sameSite: "lax",
  });
}

function deleteCookie(name: string): void {
  void cookieStore.delete({ name, path: "/" });
}

const TOKEN_MAX_AGE = 24 * 60 * 60; // 1 day

export function saveAccount(account: BankAccount) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}

export function getSavedAccount(): BankAccount | null {
  const raw = localStorage.getItem(ACCOUNT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BankAccount;
  } catch {
    return null;
  }
}

export function saveToken(token: string) {
  setCookie("token", token, TOKEN_MAX_AGE);
}

export function getAuthToken(): string | null {
  return getCookie("token");
}

export function clearAuth() {
  localStorage.removeItem(ACCOUNT_KEY);
  deleteCookie("token");
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem(ACCOUNT_KEY);
}
