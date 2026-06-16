import { useOutletContext } from "react-router-dom";
import type { BankAccount } from "@/lib/types";

interface AuthContext {
  account: BankAccount;
  refreshAccount: () => void;
}

export function useAuthContext() {
  return useOutletContext<AuthContext>();
}
