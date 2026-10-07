export type FiatTransactionType = "deposit" | "withdrawal" | "exchange_in" | "exchange_out" | "refund";

export type MptTransactionType = "deposit" | "withdrawal" | "exchange_in" | "exchange_out" | "invoice_payment";

export interface MfaVerifyResult {
  status: string;
  mfaToken: string;
  expiresIn: number;
}

export type InvoiceStatus = "pending" | "paid" | "failed" | "cancelled";

export type InvoiceType = "send" | "pay";

export interface Invoice {
  invoiceId: string;
  userId: string;
  type: InvoiceType;
  tokenId: string;
  amount: number;
  recipientAddress: string;
  recipientName: string;
  description: string;
  dueDate?: string;
  status: InvoiceStatus;
  xrplTxHash?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  paymentId?: string;
}

export interface ParsedInvoiceData {
  tokenId: string;
  amount: number;
  recipientAddress: string;
  recipientName: string;
  description: string;
  dueDate?: string;
  invoiceId?: string;
}

export interface BankAccount {
  bankCode: string;
  branchCode: string;
  accountNumber: string;
  accountHolder: string;
  label: string;
  createdAt: string;
}

export interface VirtualAccount {
  bankCode: string;
  branchCode: string;
  accountNumber: string;
  accountHolder: string;
  label: string;
  createdAt: string;
}

export interface WhitelistAddress {
  address: string;
  label: string;
  createdAt: string;
}

export interface User {
  uid: string;
  email: string;
  name: string;
  fiatBalance: number;
  kycStatus: "none" | "approved";
  hasWallet: boolean;
  hasVirtualAccount: boolean;
  walletAddress?: string;
  createdAt: string;
}

export interface KycInfo {
  fullName: string;
  phoneNumber: string;
  postalCode: string;
  prefecture: string;
  city: string;
  town: string;
  address: string;
  status: "none" | "approved";
  submittedAt: string;
  credentialTxHash?: string;
  credentialAcceptTxHash?: string;
  credentialStatus?: "issued" | "accepted" | "failed";
}

export interface Token {
  tokenId: string;
  name: string;
  domain: string;
  issuerAddress: string;
  mptIssuanceId: string;
  assetScale: number;
  maximumAmount: string;
  transferFee: number;
  permissionedDomainId?: string;
}

export interface FiatTransaction {
  transactionId: string;
  type: FiatTransactionType;
  amount: number;
  balance: number;
  description: string;
  relatedOrderId?: string;
  createdAt: string;
}

export interface ExchangeOrder {
  orderId: string;
  userId: string;
  tokenId: string;
  direction: "fiat_to_token" | "token_to_fiat";
  amount: number;
  status: "pending" | "fiat_debited" | "token_burned" | "completed" | "failed";
  xrplTxHash?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FiatWithdrawalResult {
  amount: number;
  destination: {
    bankCode: string;
    branchCode: string;
    accountNumber: string;
    accountHolder: string;
  };
  txReference: string;
}

export interface MptWithdrawalResult {
  tokenId: string;
  amount: number;
  destinationAddress: string;
  xrplTxHash: string;
}

export interface MptBalance {
  mptIssuanceId: string;
  value: string;
}

export interface MptTransaction {
  transactionId: string;
  tokenId: string;
  type: MptTransactionType;
  amount: number;
  description: string;
  relatedOrderId?: string;
  txHash?: string;
  createdAt: string;
}

export interface TokenAuthorizationStatus {
  tokenId: string;
  name: string;
  issuerAddress: string;
  mptIssuanceId: string;
  hasAuthorization: boolean;
}

export interface CredentialStatus {
  exists: boolean;
  accepted: boolean;
  expiration?: number;
}

export interface CredentialAcceptResult {
  credentialTxHash: string;
  credentialAcceptTxHash: string;
  credentialStatus: "accepted";
}
