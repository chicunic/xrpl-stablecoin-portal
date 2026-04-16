import { ArrowRight, ExternalLink, Link } from 'lucide-react';
import { type SubmitEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrerequisiteAlerts, usePrerequisites } from '@/components/PrerequisiteGuard';
import { TrustLineDialog } from '@/components/TrustLineDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n';
import { exchangeFiatToXrp, exchangeXrpToFiat, getXrpBalance } from '@/lib/api';
import { formatCurrency, formatTokenAmount } from '@/lib/format';
import type { ExchangeOrder, Token, TrustlineInfo, User } from '@/lib/types';
import { useAuthContext } from '@/lib/useAuthContext';
import { cn } from '@/lib/utils';
import { explorerTxUrl } from '@/lib/xrpl';

interface TokenBalanceDisplay extends TrustlineInfo {
  balance: number;
}

function ExchangeForm({
  direction,
  tokens,
  user,
  prereq,
  onKycComplete,
}: {
  direction: 'fiat_to_token' | 'token_to_fiat';
  tokens: Token[];
  user: User;
  prereq: { needsKyc: boolean; needsMfa: boolean; disabled: boolean };
  onKycComplete?: () => void;
}) {
  const navigate = useNavigate();
  const { address, trustlines, refreshTrustlines } = useAuthContext();
  const { t } = useI18n();
  const isFiatToToken = direction === 'fiat_to_token';
  const [tokenId, setTokenId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExchangeOrder | null>(null);
  const [balanceMap, setBalanceMap] = useState<Map<string, number>>(new Map());
  const [trustDialogOpen, setTrustDialogOpen] = useState(false);

  const balances: TokenBalanceDisplay[] = trustlines.map((tl) => ({
    ...tl,
    balance: balanceMap.get(`${tl.currency}:${tl.issuerAddress}`) ?? 0,
  }));

  const fetchBalances = useCallback(async () => {
    if (!address) return;
    try {
      const { balances } = await getXrpBalance();
      setBalanceMap(new Map(balances.map((b) => [`${b.currency}:${b.issuer}`, Number(b.value)])));
    } catch {
      // account may not exist on ledger yet
    }
  }, [address]);

  useEffect(() => {
    void fetchBalances();
  }, [fetchBalances]);

  const selectedToken = tokens.find((tk) => tk.tokenId === tokenId);
  const selectedBalance = balances.find((b) => b.tokenId === tokenId);
  const hasTrustline = !isFiatToToken || (selectedBalance?.hasTrustline ?? false);

  function handleTokenChange(newTokenId: string) {
    setTokenId(newTokenId);
    if (!isFiatToToken) {
      void fetchBalances();
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = isFiatToToken
        ? await exchangeFiatToXrp({ tokenId, fiatAmount: Number(amount) })
        : await exchangeXrpToFiat({ tokenId, tokenAmount: Number(amount) });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('exchange.error'));
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setAmount('');
    setError('');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowRight className="h-4 w-4 text-amber-600" />
          {isFiatToToken ? t('exchange.fiatToToken') : t('exchange.tokenToFiat')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PrerequisiteAlerts needsKyc={prereq.needsKyc} needsMfa={prereq.needsMfa} onKycComplete={onKycComplete} />
        {result ? (
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground text-sm">
              {result.status === 'completed' ? t('exchange.completed') : t('exchange.accepted')}
            </p>
            <div className="space-y-1 rounded-2xl border p-3 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('exchange.amount')}</span>
                <span>
                  {result.direction === 'fiat_to_token'
                    ? formatCurrency(result.amount)
                    : `${formatTokenAmount(result.amount)} ${selectedToken?.currency ?? ''}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('exchange.status')}</span>
                <span>{result.status}</span>
              </div>
              {result.xrplTxHash && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tx Hash</span>
                  <a
                    href={explorerTxUrl(result.xrplTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary inline-flex items-center gap-1 font-mono text-xs hover:underline"
                  >
                    {result.xrplTxHash}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                {t('exchange.continueExchange')}
              </Button>
              <Button className="flex-1" onClick={() => navigate('/')}>
                {t('common.goHome')}
              </Button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className={cn('space-y-4', prereq.disabled && 'cursor-not-allowed opacity-50 [&_*]:pointer-events-none')}
          >
            {isFiatToToken && tokenId && !hasTrustline && (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link className="h-5 w-5 text-amber-600" />
                    <p className="text-sm font-medium">{t('deposit.trustLineTitle')}</p>
                  </div>
                  <p className="text-muted-foreground text-sm">{t('deposit.trustLineWarning')}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTrustDialogOpen(true);
                  }}
                  className="shrink-0"
                >
                  {t('deposit.trustLineSet')}
                </Button>
              </div>
            )}
            <TrustLineDialog
              tokenId={tokenId}
              open={trustDialogOpen}
              onOpenChange={setTrustDialogOpen}
              onSuccess={() => {
                refreshTrustlines();
                void fetchBalances();
              }}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              {isFiatToToken ? (
                <>
                  <div className="flex-1 rounded-2xl border p-4">
                    <p className="text-muted-foreground text-xs">{t('exchange.amountYen')}</p>
                    <Input
                      type="number"
                      min={1}
                      max={user.fiatBalance}
                      step={1}
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                      }}
                      placeholder={t('exchange.amountPlaceholder')}
                      className="mt-1"
                      required
                    />
                    <p className="text-muted-foreground mt-2 text-xs">
                      {t('exchange.availableBalance')}: {formatCurrency(user.fiatBalance)}
                    </p>
                    {amount && Number(amount) > user.fiatBalance && (
                      <p className="text-destructive mt-1 text-xs">{t('common.insufficientBalance')}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="text-muted-foreground h-5 w-5 rotate-90 sm:rotate-0" />
                  </div>
                  <div className="flex-1 rounded-2xl border p-4">
                    <p className="text-muted-foreground text-xs">{t('exchange.tokenLabel')}</p>
                    <Select value={tokenId || undefined} onValueChange={handleTokenChange}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue placeholder={t('exchange.tokenSelect')} />
                      </SelectTrigger>
                      <SelectContent>
                        {tokens.map((tk) => (
                          <SelectItem key={tk.tokenId} value={tk.tokenId}>
                            {tk.currency} - {tk.issuerAddress}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 space-y-3 rounded-2xl border p-4">
                    <div>
                      <p className="text-muted-foreground text-xs">{t('exchange.tokenLabel')}</p>
                      <Select value={tokenId || undefined} onValueChange={handleTokenChange}>
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue placeholder={t('exchange.tokenSelect')} />
                        </SelectTrigger>
                        <SelectContent>
                          {tokens.map((tk) => (
                            <SelectItem key={tk.tokenId} value={tk.tokenId}>
                              {tk.currency} - {tk.issuerAddress}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{t('exchange.tokenAmount')}</p>
                      <Input
                        type="number"
                        min={1}
                        max={selectedBalance?.balance ?? undefined}
                        step="any"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                        }}
                        placeholder={t('exchange.quantityPlaceholder')}
                        className="mt-1"
                        required
                      />
                      <p className="text-muted-foreground mt-2 text-xs">
                        {t('exchange.availableBalance')}:{' '}
                        {tokenId && selectedBalance
                          ? `${formatTokenAmount(selectedBalance.balance)} ${selectedToken?.currency ?? ''}`
                          : '--'}
                      </p>
                      {amount && selectedBalance && Number(amount) > selectedBalance.balance && (
                        <p className="text-destructive mt-1 text-xs">{t('common.insufficientBalance')}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="text-muted-foreground h-5 w-5 rotate-90 sm:rotate-0" />
                  </div>
                  <div className="flex-1 rounded-2xl border p-4">
                    <p className="text-muted-foreground text-xs">{t('orders.fiatTab')}</p>
                    <p className="text-muted-foreground mt-2 text-sm">
                      {amount ? formatCurrency(Number(amount)) : '--'}
                    </p>
                  </div>
                </>
              )}
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={
                prereq.disabled ||
                loading ||
                !tokenId ||
                !amount ||
                !hasTrustline ||
                (isFiatToToken && Number(amount) > user.fiatBalance) ||
                (!isFiatToToken && selectedBalance != null && Number(amount) > selectedBalance.balance)
              }
            >
              {loading ? t('common.processing') : t('exchange.exchangeButton')}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function ExchangePage() {
  const { user, tokens, refreshAll } = useAuthContext();
  const { t } = useI18n();
  const prereq = usePrerequisites({ requireKyc: true });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Tabs defaultValue="fiat_to_token">
        <TabsList className="w-full">
          <TabsTrigger value="fiat_to_token" className="flex-1">
            {t('exchange.fiatToToken')}
          </TabsTrigger>
          <TabsTrigger value="token_to_fiat" className="flex-1">
            {t('exchange.tokenToFiat')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="fiat_to_token">
          <ExchangeForm
            direction="fiat_to_token"
            tokens={tokens}
            user={user}
            prereq={prereq}
            onKycComplete={refreshAll}
          />
        </TabsContent>
        <TabsContent value="token_to_fiat">
          <ExchangeForm
            direction="token_to_fiat"
            tokens={tokens}
            user={user}
            prereq={prereq}
            onKycComplete={refreshAll}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
