export interface BankAccount {
  accountId: string;
  accountNumber: string;
  accountType: "personal" | "corporate";
  accountHolder: string;
  bankCode: string;
  branchCode: string;
  balance: number;
  pubsubEnabled?: boolean;
  transactionSequence: number;
  createdAt: string;
  updatedAt: string;
}

export interface Counterparty {
  bankCode: string;
  branchCode: string;
  accountNumber: string;
  accountHolder: string;
}

export interface BankTransaction {
  transactionId: string;
  accountId: string;
  type: "atm_in" | "atm_out" | "transfer_in" | "transfer_out";
  amount: number;
  balance: number;
  counterparty: Counterparty | null;
  sequenceNumber: number;
  description: string;
  virtualAccountNumber?: string;
  virtualAccountLabel?: string;
  createdAt: string;
}

export interface BankVirtualAccount {
  virtualAccountId: string;
  accountNumber: string;
  bankCode: string;
  branchCode: string;
  accountHolder: string;
  parentAccountId: string;
  parentAccountNumber: string;
  label: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** RFC 9457 Problem Details — the backend's error response shape. */
export interface ApiError {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: { path: string; message: string }[];
}
