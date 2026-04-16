import { useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/i18n';
import { useAuth } from '@/lib/auth';

export function Header({ name }: { name?: string }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    void navigate('/login');
  }

  function handleHome() {
    void navigate(user ? '/' : '/login');
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <button
          type="button"
          onClick={handleHome}
          className="flex items-center gap-2 transition-opacity hover:opacity-70 sm:gap-3"
        >
          <img src="/logo-full.svg" alt="NexBridge" className="h-7 sm:h-8" />
          <Separator orientation="vertical" className="hidden h-5 sm:block" />
          <span className="text-muted-foreground hidden text-sm sm:inline">{t('header.subtitle')}</span>
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          {name && (
            <>
              <span className="text-muted-foreground hidden text-sm sm:inline">{t('common.honorific', name)}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                {t('header.logout')}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
