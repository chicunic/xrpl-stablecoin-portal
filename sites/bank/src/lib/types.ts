export interface BankAccount {
  accountId: string;
  accountNumber: string;
  accountType: "personal" | "corporate";
  accountHolder: string;
  bankCode: string;
  branchCode: string;
  balance: number;
  pubsubEnabled: boolean;
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
  virtualAccountNumber: string;
  virtualAccountLabel: string;
  createdAt: string;
}

export interface BankVirtualAccount {
  virtualAccountId: string;
  accountNumber: string;
  branchCode: string;
  parentAccountId: string;
  parentAccountNumber: string;
  label: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string;
}
