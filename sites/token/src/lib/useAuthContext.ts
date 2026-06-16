import { useOutletContext } from "react-router-dom";
import type { Token, TrustlineInfo, User, VirtualAccount } from "@/lib/types";

interface AuthContext {
  user: User;
  tokens: Token[];
  address: string;
  refreshAll: () => void;
  virtualAccount: VirtualAccount | null;
  setVirtualAccount: (va: VirtualAccount) => void;
  trustlines: TrustlineInfo[];
  refreshTrustlines: () => void;
}

export function useAuthContext() {
  return useOutletContext<AuthContext>();
}
