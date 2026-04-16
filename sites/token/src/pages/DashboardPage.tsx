import { Coins, Link, ShieldCheck, ShieldX, Wallet } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TrustLineDialog } from '@/components/TrustLineDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { getFiatBalance, getXrpBalance } from '@/lib/api';
import { formatCurrency, formatTokenAmount } from '@/lib/format';
import { useAuthContext } from '@/lib/useAuthContext';

export function DashboardPage() {
  const { address, trustlines, refreshTrustlines } = useAuthContext();
  const { t } = useI18n();
  const [fiatBalance, setFiatBalance] = useState<number>(0);
  const [balanceMap, setBalanceMap] = useState<Map<string, number>>(new Map());
  const [trustDialogTokenId, setTrustDialogTokenId] = useState('');

  const tokenDisplays = useMemo(
    () =>
      trustlines.map((tl) => ({
        ...tl,
        balance: balanceMap.get(`${tl.currency}:${tl.issuerAddress}`) ?? 0,
      })),
    [trustlines, balanceMap],
  );

  const refreshBalances = useCallback(async () => {
    if (!address) return;
    try {
      const { balances } = await getXrpBalance();
      setBalanceMap(new Map(balances.map((b) => [`${b.currency}:${b.issuer}`, Number(b.value)])));
    } catch {
      // account may not exist on ledger yet
    }
  }, [address]);

  useEffect(() => {
    void getFiatBalance()
      .then((r) => {
        setFiatBalance(r.balance);
      })
      .catch(() => {});
    void refreshBalances();
  }, [address, refreshBalances]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="from-primary/5 to-primary/10 ring-primary/20 bg-gradient-to-br">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="text-primary h-4 w-4" />
              {t('dashboard.totalBalance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-primary text-center text-4xl font-semibold tabular-nums">
              {formatCurrency(fiatBalance + tokenDisplays.reduce((sum, b) => sum + b.balance, 0))}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 ring-emerald-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-emerald-700">{t('dashboard.fiatBalance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-2xl font-semibold tabular-nums">{formatCurrency(fiatBalance)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50/80 to-blue-100/40 ring-blue-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-700">{t('dashboard.tokenBalance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-2xl font-semibold tabular-nums">
              {formatCurrency(tokenDisplays.reduce((sum, b) => sum + b.balance, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Coins className="text-primary h-4 w-4" />
            {t('dashboard.tokenList')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tokenDisplays.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">{t('dashboard.noTokens')}</p>
          ) : (
            <div className="space-y-3">
              {tokenDisplays.map((b) => (
                <div key={b.tokenId} className="flex items-center gap-4 rounded-2xl border p-4">
                  <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                    <Coins className="text-primary h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{b.currency}</span>
                    </div>
                    <p className="text-muted-foreground truncate font-mono text-xs">{b.issuerAddress}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {b.hasTrustline ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-xs text-green-600">{t('dashboard.trustLineDone')}</span>
                        </>
                      ) : (
                        <>
                          <ShieldX className="text-muted-foreground h-3.5 w-3.5" />
                          <span className="text-muted-foreground text-xs">{t('dashboard.trustLineNotSet')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {b.hasTrustline ? (
                      <span className="font-mono text-lg font-semibold tabular-nums">
                        {formatTokenAmount(b.balance)}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setTrustDialogTokenId(b.tokenId);
                        }}
                      >
                        <Link className="mr-1.5 h-3.5 w-3.5" />
                        {t('deposit.trustLineSet')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TrustLineDialog
        tokenId={trustDialogTokenId}
        open={!!trustDialogTokenId}
        onOpenChange={(open) => {
          if (!open) setTrustDialogTokenId('');
        }}
        onSuccess={() => {
          refreshTrustlines();
          void refreshBalances();
        }}
      />
    </div>
  );
}
