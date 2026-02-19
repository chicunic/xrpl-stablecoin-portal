import { Coins, Link, ShieldCheck, ShieldX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TrustLineDialog } from "@/components/TrustLineDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { getFiatBalance, getXrpBalance } from "@/lib/api";
import { formatCurrency, formatTokenAmount } from "@/lib/format";
import { useAuthContext } from "@/lib/useAuthContext";

export function DashboardPage() {
  const { user, address, trustlines, refreshTrustlines } = useAuthContext();
  const { t } = useI18n();
  const [fiatBalance, setFiatBalance] = useState<number>(0);
  const [balanceMap, setBalanceMap] = useState<Map<string, number>>(new Map());
  const [trustDialogTokenId, setTrustDialogTokenId] = useState("");

  const tokenDisplays = useMemo(
    () =>
      trustlines.map((tl) => ({
        ...tl,
        balance: balanceMap.get(`${tl.currency}:${tl.issuerAddress}`) ?? 0,
      })),
    [trustlines, balanceMap],
  );

  async function refreshBalances() {
    if (!address) return;
    try {
      const { balances } = await getXrpBalance();
      setBalanceMap(new Map(balances.map((b) => [`${b.currency}:${b.issuer}`, Number(b.value)])));
    } catch {
      // account may not exist on ledger yet
    }
  }

  useEffect(() => {
    getFiatBalance()
      .then((r) => setFiatBalance(r.balance))
      .catch(() => {});
    refreshBalances();
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("dashboard.accountInfo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <p className="text-muted-foreground">{t("dashboard.email")}</p>
              <p className="truncate">{user.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("dashboard.displayName")}</p>
              <p>{user.name || "-"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("dashboard.totalBalance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center font-semibold text-3xl tabular-nums">
              {formatCurrency(fiatBalance + tokenDisplays.reduce((sum, b) => sum + b.balance, 0))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("dashboard.fiatBalance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center font-semibold text-3xl tabular-nums">{formatCurrency(fiatBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("dashboard.tokenBalance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center font-semibold text-3xl tabular-nums">
              {formatCurrency(tokenDisplays.reduce((sum, b) => sum + b.balance, 0))}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("dashboard.tokenList")}</CardTitle>
        </CardHeader>
        <CardContent>
          {tokenDisplays.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground text-sm">{t("dashboard.noTokens")}</p>
          ) : (
            <div className="space-y-3">
              {tokenDisplays.map((b) => (
                <div key={b.tokenId} className="flex items-center gap-4 rounded-2xl border p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Coins className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{b.currency}</span>
                    </div>
                    <p className="truncate font-mono text-muted-foreground text-xs">{b.issuerAddress}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {b.hasTrustline ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-green-600 text-xs">{t("dashboard.trustLineDone")}</span>
                        </>
                      ) : (
                        <>
                          <ShieldX className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground text-xs">{t("dashboard.trustLineNotSet")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {b.hasTrustline ? (
                      <span className="font-mono font-semibold text-lg tabular-nums">
                        {formatTokenAmount(b.balance)}
                      </span>
                    ) : (
                      <Button size="sm" onClick={() => setTrustDialogTokenId(b.tokenId)}>
                        <Link className="mr-1.5 h-3.5 w-3.5" />
                        {t("deposit.trustLineSet")}
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
          if (!open) setTrustDialogTokenId("");
        }}
        onSuccess={() => {
          refreshTrustlines();
          refreshBalances();
        }}
      />
    </div>
  );
}
