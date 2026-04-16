import { ArrowRight, ExternalLink, Shield } from 'lucide-react';
import { type SubmitEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OperationMfaDialog } from '@/components/OperationMfaDialog';
import { PrerequisiteAlerts, usePrerequisites } from '@/components/PrerequisiteGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n';
import {
  getBankWhitelist,
  getXrpBalance,
  getXrpWhitelist,
  OperationMfaRequiredError,
  withdrawFiat,
  withdrawXrp,
} from '@/lib/api';
import { getBankName, getBranchName } from '@/lib/banks';
import { formatCurrency, formatTokenAmount } from '@/lib/format';
import type {
  BankAccount,
  FiatWithdrawalResult,
  TrustlineInfo,
  WhitelistAddress,
  XrpWithdrawalResult,
} from '@/lib/types';
import { useAuthContext } from '@/lib/useAuthContext';
import { cn } from '@/lib/utils';
import { explorerTxUrl } from '@/lib/xrpl';

interface TokenBalanceDisplay extends TrustlineInfo {
  balance: number;
}

function FiatWithdrawForm({
  prereq,
  onKycComplete,
}: {
  prereq: { needsKyc: boolean; needsMfa: boolean; disabled: boolean };
  onKycComplete?: () => void;
}) {
  const navigate = useNavigate();
  const { user, refreshAll } = useAuthContext();
  const { t } = useI18n();
  const [bankList, setBankList] = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [operationMfaOpen, setOperationMfaOpen] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [result, setResult] = useState<FiatWithdrawalResult | null>(null);

  useEffect(() => {
    getBankWhitelist()
      .then((list) => {
        setBankList(list);
        if (list.length > 0) setSelectedBank(`${list[0].branchCode}-${list[0].accountNumber}`);
      })
      .catch(() => {})
      .finally(() => {
        setListLoading(false);
      });
  }, []);

  const chosen = bankList.find((b) => `${b.branchCode}-${b.accountNumber}` === selectedBank);

  async function submitWithdraw() {
    if (!chosen) return;
    setError('');
    setLoading(true);
    try {
      const res = await withdrawFiat({
        amount: Number(amount),
        bankAccount: chosen,
      });
      setResult(res);
      refreshAll();
    } catch (err) {
      if (err instanceof OperationMfaRequiredError) {
        setOperationMfaOpen(true);
      } else {
        setError(err instanceof Error ? err.message : t('withdraw.fiatError'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    await submitWithdraw();
  }

  function reset() {
    setResult(null);
    setAmount('');
    setError('');
  }

  if (listLoading) return <p className="text-muted-foreground py-6 text-center">{t('common.loading')}</p>;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRight className="h-4 w-4 text-rose-600" />
            {t('withdraw.fiatTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PrerequisiteAlerts needsKyc={prereq.needsKyc} needsMfa={prereq.needsMfa} onKycComplete={onKycComplete} />
          {bankList.length === 0 && (
            <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-600" />
                  <p className="text-sm font-medium">{t('withdraw.noBankWhitelistTitle')}</p>
                </div>
                <p className="text-muted-foreground text-sm">{t('withdraw.noBankWhitelist')}</p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => navigate('/whitelist')}>
                {t('common.goToWhitelist')}
              </Button>
            </div>
          )}
          {result ? (
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground text-sm">{t('withdraw.fiatCompleted')}</p>
              <p className="text-2xl font-semibold">{formatCurrency(result.amount)}</p>
              {result.txReference && (
                <p className="text-muted-foreground font-mono text-xs">
                  {t('withdraw.referenceNumber')}: {result.txReference}
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={reset}>
                  {t('withdraw.continueWithdraw')}
                </Button>
                <Button className="flex-1" onClick={() => navigate('/')}>
                  {t('common.goHome')}
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className={cn(
                'space-y-4',
                (prereq.disabled || bankList.length === 0) && 'cursor-not-allowed opacity-50 [&_*]:pointer-events-none',
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <div className="flex-1 rounded-2xl border p-4">
                  <p className="text-muted-foreground text-xs">{t('withdraw.amountYen')}</p>
                  <Input
                    type="number"
                    min={1}
                    max={user.fiatBalance}
                    step={1}
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                    }}
                    placeholder={t('withdraw.amountPlaceholder')}
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
                  <p className="text-muted-foreground text-xs">{t('withdraw.destinationAccount')}</p>
                  <Select value={selectedBank || undefined} onValueChange={setSelectedBank}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder={t('withdraw.destinationAccount')} />
                    </SelectTrigger>
                    <SelectContent>
                      {bankList.map((b) => (
                        <SelectItem
                          key={`${b.branchCode}-${b.accountNumber}`}
                          value={`${b.branchCode}-${b.accountNumber}`}
                        >
                          {b.label} - {getBankName(b.bankCode)} {getBranchName(b.branchCode)}/{b.accountNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={
                  prereq.disabled ||
                  bankList.length === 0 ||
                  loading ||
                  !amount ||
                  !selectedBank ||
                  Number(amount) > user.fiatBalance
                }
              >
                {loading ? t('common.processing') : t('withdraw.withdrawButton')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <OperationMfaDialog
        open={operationMfaOpen}
        onClose={() => {
          setOperationMfaOpen(false);
        }}
        onVerified={() => {
          setOperationMfaOpen(false);
          void submitWithdraw();
        }}
      />
    </>
  );
}

function XrpWithdrawForm({ prereq }: { prereq: { needsKyc: boolean; needsMfa: boolean; disabled: boolean } }) {
  const navigate = useNavigate();
  const { tokens, address, trustlines } = useAuthContext();
  const { t } = useI18n();
  const [xrpList, setXrpList] = useState<WhitelistAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [operationMfaOpen, setOperationMfaOpen] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [result, setResult] = useState<XrpWithdrawalResult | null>(null);
  const [balanceMap, setBalanceMap] = useState<Map<string, number>>(new Map());

  const balances: TokenBalanceDisplay[] = trustlines.map((tl) => ({
    ...tl,
    balance: balanceMap.get(`${tl.currency}:${tl.issuerAddress}`) ?? 0,
  }));

  useEffect(() => {
    getXrpWhitelist()
      .then((list) => {
        setXrpList(list);
        if (list.length > 0) setSelectedAddress(list[0].address);
      })
      .catch(() => {})
      .finally(() => {
        setListLoading(false);
      });

    if (address) {
      getXrpBalance()
        .then(({ balances }) => {
          setBalanceMap(new Map(balances.map((b) => [`${b.currency}:${b.issuer}`, Number(b.value)])));
        })
        .catch(() => {});
    }
  }, [address]);

  const selectedBalance = balances.find((b) => b.tokenId === tokenId);

  async function submitWithdraw() {
    setError('');
    setLoading(true);
    try {
      const res = await withdrawXrp({
        tokenId,
        tokenAmount: Number(tokenAmount),
        destinationAddress: selectedAddress,
      });
      setResult(res);
    } catch (err) {
      if (err instanceof OperationMfaRequiredError) {
        setOperationMfaOpen(true);
      } else {
        setError(err instanceof Error ? err.message : t('withdraw.xrpError'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    await submitWithdraw();
  }

  function reset() {
    setResult(null);
    setTokenAmount('');
    setError('');
  }

  if (listLoading) return <p className="text-muted-foreground py-6 text-center">{t('common.loading')}</p>;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRight className="h-4 w-4 text-rose-600" />
            {t('withdraw.xrpTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PrerequisiteAlerts needsKyc={prereq.needsKyc} needsMfa={prereq.needsMfa} />
          {xrpList.length === 0 && (
            <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-600" />
                  <p className="text-sm font-medium">{t('withdraw.noXrpWhitelistTitle')}</p>
                </div>
                <p className="text-muted-foreground text-sm">{t('withdraw.noXrpWhitelist')}</p>
              </div>
              <Button variant="outline" size="sm" className="shrink-0" onClick={() => navigate('/whitelist')}>
                {t('common.goToWhitelist')}
              </Button>
            </div>
          )}
          {result ? (
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground text-sm">{t('withdraw.fiatCompleted')}</p>
              {result.xrplTxHash && (
                <a
                  href={explorerTxUrl(result.xrplTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-1 font-mono text-xs hover:underline"
                >
                  Tx Hash: {result.xrplTxHash}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={reset}>
                  {t('withdraw.continueWithdraw')}
                </Button>
                <Button className="flex-1" onClick={() => navigate('/')}>
                  {t('common.goHome')}
                </Button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className={cn(
                'space-y-4',
                (prereq.disabled || xrpList.length === 0) && 'cursor-not-allowed opacity-50 [&_*]:pointer-events-none',
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <div className="flex-1 rounded-2xl border p-4">
                  <p className="text-muted-foreground text-xs">{t('withdraw.tokenLabel')}</p>
                  <Select value={tokenId || undefined} onValueChange={setTokenId}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder={t('withdraw.tokenSelect')} />
                    </SelectTrigger>
                    <SelectContent>
                      {tokens.map((tk) => (
                        <SelectItem key={tk.tokenId} value={tk.tokenId}>
                          {tk.currency} - {tk.issuerAddress}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground mt-3 text-xs">{t('withdraw.tokenAmount')}</p>
                  <Input
                    type="number"
                    min={1}
                    max={selectedBalance?.balance ?? undefined}
                    step="any"
                    value={tokenAmount}
                    onChange={(e) => {
                      setTokenAmount(e.target.value);
                    }}
                    placeholder={t('withdraw.quantityPlaceholder')}
                    className="mt-1"
                    required
                  />
                  <p className="text-muted-foreground mt-2 text-xs">
                    {t('exchange.availableBalance')}:{' '}
                    {tokenId && selectedBalance
                      ? `${formatTokenAmount(selectedBalance.balance)} ${tokens.find((tk) => tk.tokenId === tokenId)?.currency ?? ''}`
                      : '--'}
                  </p>
                  {tokenAmount && selectedBalance && Number(tokenAmount) > selectedBalance.balance && (
                    <p className="text-destructive mt-1 text-xs">{t('common.insufficientBalance')}</p>
                  )}
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="text-muted-foreground h-5 w-5 rotate-90 sm:rotate-0" />
                </div>
                <div className="flex-1 rounded-2xl border p-4">
                  <p className="text-muted-foreground text-xs">{t('withdraw.destinationAddress')}</p>
                  <Select value={selectedAddress || undefined} onValueChange={setSelectedAddress}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder={t('withdraw.destinationAddress')} />
                    </SelectTrigger>
                    <SelectContent>
                      {xrpList.map((item) => (
                        <SelectItem key={item.address} value={item.address}>
                          {item.label} - {item.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={
                  prereq.disabled ||
                  xrpList.length === 0 ||
                  loading ||
                  !tokenId ||
                  !tokenAmount ||
                  !selectedAddress ||
                  (selectedBalance != null && Number(tokenAmount) > selectedBalance.balance)
                }
              >
                {loading ? t('common.processing') : t('withdraw.withdrawButton')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <OperationMfaDialog
        open={operationMfaOpen}
        onClose={() => {
          setOperationMfaOpen(false);
        }}
        onVerified={() => {
          setOperationMfaOpen(false);
          void submitWithdraw();
        }}
      />
    </>
  );
}

export function WithdrawPage() {
  const { t } = useI18n();
  const prereq = usePrerequisites({ requireKyc: true, requireMfa: true });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Tabs defaultValue="fiat">
        <TabsList className="w-full">
          <TabsTrigger value="fiat" className="flex-1">
            {t('withdraw.fiatTitle')}
          </TabsTrigger>
          <TabsTrigger value="xrp" className="flex-1">
            {t('withdraw.xrpTitle')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="fiat">
          <FiatWithdrawForm prereq={prereq} />
        </TabsContent>
        <TabsContent value="xrp">
          <XrpWithdrawForm prereq={prereq} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
