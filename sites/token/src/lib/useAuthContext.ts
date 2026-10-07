import { useOutletContext } from "react-router-dom";
import type { Token, TokenAuthorizationStatus, User, VirtualAccount } from "@/lib/types";

interface AuthContext {
  user: User;
  tokens: Token[];
  address: string;
  refreshAll: () => void;
  virtualAccount: VirtualAccount | null;
  setVirtualAccount: (va: VirtualAccount) => void;
  authorizations: TokenAuthorizationStatus[];
  refreshAuthorizations: () => void;
}

export function useAuthContext() {
  return useOutletContext<AuthContext>();
}
