import { noop } from "@xrpl-stablecoin-portal/shared";
import { ArrowLeftRight, Home, Landmark, Layers, Receipt, Settings } from "lucide-react";
import { type ComponentType, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { getMe } from "@/lib/api";
import { clearAuth, isLoggedIn } from "@/lib/auth";
import type { BankAccount } from "@/lib/types";

interface TabDef {
  path: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  corporateOnly?: boolean;
}

const allTabs: TabDef[] = [
  { path: "/", label: "ホーム", icon: Home },
  { path: "/atm", label: "ATM", icon: Landmark },
  { path: "/transfer", label: "振込", icon: ArrowLeftRight },
  { path: "/transactions", label: "明細", icon: Receipt },
  { path: "/virtual-accounts", label: "バーチャル口座", icon: Layers, corporateOnly: true },
  { path: "/settings", label: "設定", icon: Settings },
];

export function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      void navigate("/login");
      return;
    }
    async function load() {
      try {
        const acc = await getMe();
        setAccount(acc);
      } catch {
        clearAuth();
        void navigate("/login");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [navigate]);

  function refreshAccount() {
    getMe().then(setAccount).catch(noop);
  }

  if (loading || !account) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gray-50">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  const isCorporate = account.accountType === "corporate";
  const visibleTabs = allTabs.filter((tab) => !tab.corporateOnly || isCorporate);

  return (
    <div className="flex min-h-svh flex-col bg-gray-50">
      <Header accountHolder={account.accountHolder} />
      {/* Desktop top nav */}
      <nav className="hidden border-b bg-white sm:block">
        <div className="mx-auto flex h-10 max-w-4xl items-center gap-1 px-4">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path);
            return (
              <button
                type="button"
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <main className="flex-1 pb-16 sm:pb-0">
        <Outlet context={{ account, refreshAccount }} />
      </main>
      <footer className="text-muted-foreground hidden border-t bg-white py-4 text-center text-xs sm:block">
        &copy; {new Date().getFullYear()} NexBridge All rights reserved.
      </footer>
      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-white sm:hidden">
        <div className="flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path);
            return (
              <button
                type="button"
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
