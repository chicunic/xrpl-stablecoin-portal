import { noop } from "@xrpl-stablecoin-portal/shared";
import { Banknote, Copy, Link, QrCode, Wallet } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrustLineDialog } from "@/components/TrustLineDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import { getVirtualAccount, setupVirtualAccount } from "@/lib/api";
import { getBankName, getBranchName } from "@/lib/banks";
import { useAuthContext } from "@/lib/useAuthContext";
import { cn } from "@/lib/utils";

function FiatDepositTab() {
  const { user, refreshAll, virtualAccount, setVirtualAccount } = useAuthContext();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function handleCopyBankInfo() {
    if (!virtualAccount) return;
    const text = [
      `${t("deposit.bankName")}: ${getBankName(virtualAccount.bankCode)}`,
      `${t("deposit.branchName")}: ${getBranchName(virtualAccount.branchCode)}`,
      `${t("deposit.accountNumber")}: ${virtualAccount.accountNumber}`,
      `${t("deposit.accountHolder")}: ${virtualAccount.accountHolder}`,
    ].join("\n");
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  useEffect(() => {
    if (user.hasVirtualAccount && !virtualAccount) {
      getVirtualAccount().then(setVirtualAccount).catch(noop);
    }
  }, [user.hasVirtualAccount, virtualAccount, setVirtualAccount]);

  async function handleSetup() {
    setError("");
    setLoading(true);
    try {
      const result = await setupVirtualAccount();
      setVirtualAccount(result);
      refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deposit.fiatSetupError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="h-4 w-4 text-emerald-600" />
          {t("deposit.fiatTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!virtualAccount && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-amber-600" />
                  <p className="text-sm font-medium">{t("deposit.fiatSetupTitle")}</p>
                </div>
                <p className="text-muted-foreground text-sm">{t("deposit.fiatSetupDescription")}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSetup} disabled={loading} className="shrink-0">
                {loading ? t("deposit.fiatSetupLoading") : t("deposit.fiatSetupButton")}
              </Button>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
        )}
        <div
          className={cn(
            "space-y-4 rounded-2xl border p-4",
            !virtualAccount && "cursor-not-allowed opacity-50 [&_*]:pointer-events-none",
          )}
        >
          <p className="text-muted-foreground text-sm">{t("deposit.fiatDescription")}</p>
          <div className="flex justify-center">
            <div className="w-72 space-y-2 rounded-2xl border p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("deposit.bankName")}</span>
                <span>{virtualAccount ? getBankName(virtualAccount.bankCode) : "--"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("deposit.branchName")}</span>
                <span>{virtualAccount ? getBranchName(virtualAccount.branchCode) : "--"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("deposit.accountNumber")}</span>
                <span className="font-mono">{virtualAccount?.accountNumber ?? "--"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("deposit.accountHolder")}</span>
                <span>{virtualAccount?.accountHolder ?? "--"}</span>
              </div>
            </div>
          </div>
          {virtualAccount && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" className="w-72" onClick={handleCopyBankInfo}>
                <Copy className="mr-1.5 h-3 w-3" />
                {copied ? t("common.copiedToClipboard") : t("deposit.copyBankInfo")}
              </Button>
            </div>
          )}
          <p className="text-muted-foreground text-xs">{t("deposit.fiatConfirmNote")}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function XrpDepositTab() {
  const { address, tokens, trustlines, refreshTrustlines } = useAuthContext();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tokenId, setTokenId] = useState("");
  const [trustDialogOpen, setTrustDialogOpen] = useState(false);
  const [, setCopied] = useState(false);

  const selectedTrustline = trustlines.find((b) => b.tokenId === tokenId);
  const hasTrustline = selectedTrustline?.hasTrustline ?? false;

  function handleCopy() {
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-4 w-4 text-emerald-600" />
          {t("deposit.xrpTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!address && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-amber-600" />
                  <p className="text-sm font-medium">{t("deposit.xrpNoWalletTitle")}</p>
                </div>
                <p className="text-muted-foreground text-sm">{t("deposit.xrpNoWallet")}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/settings")} className="shrink-0">
                {t("deposit.xrpNoWalletButton")}
              </Button>
            </div>
          )}

          <div
            className={cn(
              "space-y-4 rounded-2xl border p-4",
              !address && "cursor-not-allowed opacity-50 [&_*]:pointer-events-none",
            )}
          >
            <div className="space-y-2">
              <Label>{t("deposit.tokenLabel")}</Label>
              <Select value={tokenId || undefined} onValueChange={setTokenId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("deposit.tokenSelect")} />
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

            {tokenId && !hasTrustline && (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link className="h-5 w-5 text-amber-600" />
                    <p className="text-sm font-medium">{t("deposit.trustLineTitle")}</p>
                  </div>
                  <p className="text-muted-foreground text-sm">{t("deposit.trustLineWarning")}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTrustDialogOpen(true);
                  }}
                  className="shrink-0"
                >
                  {t("deposit.trustLineSet")}
                </Button>
              </div>
            )}

            <TrustLineDialog
              tokenId={tokenId}
              open={trustDialogOpen}
              onOpenChange={setTrustDialogOpen}
              onSuccess={refreshTrustlines}
            />

            <p className="text-muted-foreground text-sm">{t("deposit.xrpSendDescription")}</p>
            <div className="flex justify-center">
              <div className="space-y-4 rounded-2xl border p-6 text-center">
                <div className="flex justify-center">
                  {address ? (
                    <QRCodeSVG value={address} size={200} />
                  ) : (
                    <div className="flex h-[200px] w-[200px] items-center justify-center rounded-2xl border border-dashed">
                      <QrCode className="text-muted-foreground/40 h-12 w-12" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs">{t("deposit.xrpAddress")}</p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="bg-muted rounded px-2 py-1 font-mono text-xs break-all">{address || "--"}</code>
                    {address && (
                      <Button variant="ghost" size="icon-xs" onClick={handleCopy}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">{t("deposit.fiatConfirmNote")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DepositPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Tabs defaultValue="fiat">
        <TabsList className="w-full">
          <TabsTrigger value="fiat" className="flex-1">
            {t("deposit.fiatTitle")}
          </TabsTrigger>
          <TabsTrigger value="xrp" className="flex-1">
            {t("deposit.xrpTitle")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="fiat">
          <FiatDepositTab />
        </TabsContent>
        <TabsContent value="xrp">
          <XrpDepositTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
