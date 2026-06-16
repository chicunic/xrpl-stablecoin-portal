export const BANK_NAME = "デモ銀行";

export interface Branch {
  code: string;
  name: string;
  accountType: "personal" | "corporate";
}

export const BRANCHES: Branch[] = [
  { code: "001", name: "法人支店", accountType: "corporate" },
  { code: "002", name: "個人支店", accountType: "personal" },
];

export const BRANCH_MAP: Record<string, string> = Object.fromEntries(BRANCHES.map((b) => [b.code, b.name]));

export const BANK_CODE = "9999";

export const BANK_CODE_MAP: Record<string, string> = {
  [BANK_CODE]: BANK_NAME,
};
