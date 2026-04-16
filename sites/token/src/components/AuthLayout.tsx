import { ArrowLeftRight, Download, FileText, Home, List, Settings, Shield, Upload } from 'lucide-react';
import { type ComponentType, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useI18n } from '@/i18n';
import { getMe, getTrustlines, listTokens } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Token, TrustlineInfo, User, VirtualAccount } from '@/lib/types';

interface TabDef {
  path: string;
  labelKey: string;
  icon: ComponentType<{ className?: string }>;
}

const allTabs: TabDef[] = [
  { path: '/', labelKey: 'nav.home', icon: Home },
  { path: '/deposit', labelKey: 'nav.deposit', icon: Download },
  { path: '/withdraw', labelKey: 'nav.withdraw', icon: Upload },
  { path: '/exchange', labelKey: 'nav.exchange', icon: ArrowLeftRight },
  { path: '/invoices', labelKey: 'nav.invoices', icon: FileText },
  { path: '/whitelist', labelKey: 'nav.whitelist', icon: Shield },
  { path: '/orders', labelKey: 'nav.orders', icon: List },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings },
];

function isTabActive(tabPath: string, currentPath: string): boolean {
  return tabPath === '/' ? currentPath === '/' : currentPath.startsWith(tabPath);
}

export function AuthLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const { user: firebaseUser, loading: authLoading, logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [address, setAddress] = useState('');
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [trustlines, setTrustlines] = useState<TrustlineInfo[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    const [u, tks, tls] = await Promise.all([getMe(), listTokens(), getTrustlines()]);
    setUser(u);
    setTokens(tks);
    setAddress(u.walletAddress ?? '');
    setTrustlines(tls);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      void navigate('/login');
      return;
    }
    void loadAll()
      .catch(() => {
        void logout();
        void navigate('/login');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [firebaseUser, authLoading, navigate, logout]);

  function refreshAll() {
    loadAll().catch(() => {});
  }

  if (authLoading || loading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-gray-50">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-gray-50">
      <Header name={user.name || user.email} />
      <nav className="hidden border-b bg-white sm:block">
        <div className="mx-auto flex h-10 max-w-4xl items-center gap-1 px-4">
          {allTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab.path, location.pathname);
            return (
              <button
                type="button"
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`inline-flex items-center gap-1.5 rounded-4xl px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </nav>
      <main className="flex-1 pb-16 sm:pb-0">
        <Outlet
          context={{
            user,
            tokens,
            address,
            refreshAll,
            virtualAccount,
            setVirtualAccount,
            trustlines,
            refreshTrustlines: () =>
              getTrustlines()
                .then(setTrustlines)
                .catch(() => {}),
          }}
        />
      </main>
      <footer className="text-muted-foreground hidden border-t bg-white py-4 text-center text-xs sm:block">
        &copy; {new Date().getFullYear()} {t('footer.copyright')}
      </footer>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-white sm:hidden">
        <div className="flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
          {allTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab.path, location.pathname);
            return (
              <button
                type="button"
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                  active ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
