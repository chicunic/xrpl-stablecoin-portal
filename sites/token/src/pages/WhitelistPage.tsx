import { Trash2 } from "lucide-react";
import { type SubmitEvent, useCallback, useEffect, useRef, useState } from "react";
import { OperationMfaDialog } from "@/components/OperationMfaDialog";
import { PrerequisiteAlerts, usePrerequisites } from "@/components/PrerequisiteGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import {
  addBankWhitelist,
  addXrpWhitelist,
  getBankWhitelist,
  getXrpWhitelist,
  OperationMfaRequiredError,
  removeBankWhitelist,
  removeXrpWhitelist,
} from "@/lib/api";
import { BANKS, BRANCHES, getBankName, getBranchName } from "@/lib/banks";
import { formatDate, isValidXrpAddress } from "@/lib/format";
import type { BankAccount, WhitelistAddress } from "@/lib/types";
import { useAuthContext } from "@/lib/useAuthContext";

function XrpWhitelistTab({
  prereq,
  onKycComplete,
}: {
  prereq: { needsKyc: boolean; needsMfa: boolean; disabled: boolean };
  onKycComplete?: () => void;
}) {
  const { t } = useI18n();
  const [list, setList] = useState<WhitelistAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [operationMfaOpen, setOperationMfaOpen] = useState(false);
  const pendingRetry = useRef<(() => Promise<void>) | null>(null);

  function reload() {
    getXrpWhitelist()
      .then(setList)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  const submitAdd = useCallback(async () => {
    setError("");
    setAdding(true);
    try {
      await addXrpWhitelist({ address, label });
      setAddress("");
      setLabel("");
      setRecipientName("");
      setRelationship("");
      setPurpose("");
      setShowAdd(false);
      reload();
    } catch (err) {
      if (err instanceof OperationMfaRequiredError) {
        pendingRetry.current = submitAdd;
        setOperationMfaOpen(true);
      } else {
        setError(err instanceof Error ? err.message : t("whitelist.addError"));
      }
    } finally {
      setAdding(false);
    }
  }, [address, label, recipientName, relationship, purpose, t]);

  async function handleAdd(e: SubmitEvent) {
    e.preventDefault();
    if (!isValidXrpAddress(address)) {
      setError(t("whitelist.invalidXrpAddress"));
      return;
    }
    await submitAdd();
  }

  const submitRemove = useCallback(
    async (addr: string) => {
      try {
        await removeXrpWhitelist(addr);
        reload();
      } catch (err) {
        if (err instanceof OperationMfaRequiredError) {
          pendingRetry.current = () => submitRemove(addr);
          setOperationMfaOpen(true);
        } else {
          setError(err instanceof Error ? err.message : t("whitelist.removeError"));
        }
      }
    },
    [t],
  );

  if (loading) return <p className="py-6 text-center text-muted-foreground">{t("common.loading")}</p>;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("whitelist.xrpTitle")}</CardTitle>
            <Button variant="outline" size="sm" disabled={prereq.disabled} onClick={() => setShowAdd(!showAdd)}>
              {showAdd ? t("common.cancel") : t("common.add")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <PrerequisiteAlerts needsKyc={prereq.needsKyc} needsMfa={prereq.needsMfa} onKycComplete={onKycComplete} />
          {error && <p className="mb-4 text-destructive text-sm">{error}</p>}
          {showAdd && (
            <div className="mb-4 rounded-2xl border p-4">
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="space-y-2">
                  <Label>{t("whitelist.addXrpLabel")}</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t("whitelist.addXrpPlaceholder")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("whitelist.label")}</Label>
                  <Input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={t("whitelist.labelPlaceholder")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("whitelist.recipientName")}</Label>
                  <Input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder={t("whitelist.recipientNamePlaceholder")}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("whitelist.relationship")}</Label>
                    <Select value={relationship || undefined} onValueChange={setRelationship}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">{t("whitelist.relationshipSelf")}</SelectItem>
                        <SelectItem value="family">{t("whitelist.relationshipFamily")}</SelectItem>
                        <SelectItem value="company">{t("whitelist.relationshipCompany")}</SelectItem>
                        <SelectItem value="other">{t("whitelist.relationshipOther")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("whitelist.purpose")}</Label>
                    <Select value={purpose || undefined} onValueChange={setPurpose}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="investment">{t("whitelist.purposeInvestment")}</SelectItem>
                        <SelectItem value="trade">{t("whitelist.purposeTrade")}</SelectItem>
                        <SelectItem value="personal">{t("whitelist.purposePersonal")}</SelectItem>
                        <SelectItem value="other">{t("whitelist.purposeOther")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={adding || !address || !label || !recipientName || !relationship || !purpose}
                >
                  {adding ? t("common.adding") : t("common.add")}
                </Button>
              </form>
            </div>
          )}
          <p className="mb-3 text-muted-foreground text-sm">{t("common.totalCount", list.length)}</p>
          {list.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">{t("whitelist.emptyList")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {list.map((item) => (
                <div key={item.address} className="flex items-start gap-4 rounded-2xl border p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.label}</span>
                      <span className="text-muted-foreground text-xs">{formatDate(item.createdAt)}</span>
                    </div>
                    <p className="mt-1 break-all font-mono text-muted-foreground text-xs">{item.address}</p>
                    {item.recipientName && (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-xs">
                        <span>
                          {t("whitelist.recipientName")}: {item.recipientName}
                        </span>
                        {item.relationship && (
                          <span>
                            {t("whitelist.relationship")}:{" "}
                            {t(
                              `whitelist.relationship${item.relationship.charAt(0).toUpperCase()}${item.relationship.slice(1)}`,
                            )}
                          </span>
                        )}
                        {item.purpose && (
                          <span>
                            {t("whitelist.purpose")}:{" "}
                            {t(`whitelist.purpose${item.purpose.charAt(0).toUpperCase()}${item.purpose.slice(1)}`)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0"
                    disabled={prereq.disabled}
                    onClick={() => submitRemove(item.address)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <OperationMfaDialog
        open={operationMfaOpen}
        onClose={() => setOperationMfaOpen(false)}
        onVerified={() => {
          setOperationMfaOpen(false);
          const retry = pendingRetry.current;
          pendingRetry.current = null;
          retry?.();
        }}
      />
    </>
  );
}

function BankWhitelistTab({
  prereq,
  onKycComplete,
}: {
  prereq: { needsKyc: boolean; needsMfa: boolean; disabled: boolean };
  onKycComplete?: () => void;
}) {
  const { t } = useI18n();
  const [list, setList] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [bankCode, setBankCode] = useState(Object.keys(BANKS)[0] ?? "");
  const [branchCode, setBranchCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [operationMfaOpen, setOperationMfaOpen] = useState(false);
  const pendingRetry = useRef<(() => Promise<void>) | null>(null);

  function reload() {
    getBankWhitelist()
      .then(setList)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  const submitAdd = useCallback(async () => {
    setError("");
    setAdding(true);
    try {
      await addBankWhitelist({ bankCode, branchCode, accountNumber, accountHolder, label });
      setBankCode(Object.keys(BANKS)[0] ?? "");
      setBranchCode("");
      setAccountNumber("");
      setAccountHolder("");
      setLabel("");
      setShowAdd(false);
      reload();
    } catch (err) {
      if (err instanceof OperationMfaRequiredError) {
        pendingRetry.current = submitAdd;
        setOperationMfaOpen(true);
      } else {
        setError(err instanceof Error ? err.message : t("whitelist.addError"));
      }
    } finally {
      setAdding(false);
    }
  }, [bankCode, branchCode, accountNumber, accountHolder, label, t]);

  async function handleAdd(e: SubmitEvent) {
    e.preventDefault();
    await submitAdd();
  }

  const submitRemove = useCallback(
    async (item: BankAccount) => {
      try {
        await removeBankWhitelist(`${item.branchCode}-${item.accountNumber}`);
        reload();
      } catch (err) {
        if (err instanceof OperationMfaRequiredError) {
          pendingRetry.current = () => submitRemove(item);
          setOperationMfaOpen(true);
        } else {
          setError(err instanceof Error ? err.message : t("whitelist.removeError"));
        }
      }
    },
    [t],
  );

  if (loading) return <p className="py-6 text-center text-muted-foreground">{t("common.loading")}</p>;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t("whitelist.bankTitle")}</CardTitle>
            <Button variant="outline" size="sm" disabled={prereq.disabled} onClick={() => setShowAdd(!showAdd)}>
              {showAdd ? t("common.cancel") : t("common.add")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <PrerequisiteAlerts needsKyc={prereq.needsKyc} needsMfa={prereq.needsMfa} onKycComplete={onKycComplete} />
          {error && <p className="mb-4 text-destructive text-sm">{error}</p>}
          {showAdd && (
            <div className="mb-4 rounded-2xl border p-4">
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="space-y-2">
                  <Label>{t("whitelist.label")}</Label>
                  <Input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={t("whitelist.labelPlaceholder")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("whitelist.bankLabel")}</Label>
                  <Select value={bankCode} onValueChange={setBankCode}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BANKS).map(([code, name]) => (
                        <SelectItem key={code} value={code}>
                          {name} ({code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("whitelist.branchLabel")}</Label>
                    <Select value={branchCode || undefined} onValueChange={setBranchCode}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("whitelist.branchSelect")} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(BRANCHES).map(([code, name]) => (
                          <SelectItem key={code} value={code}>
                            {name} ({code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("whitelist.accountNumber")}</Label>
                    <Input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder={t("whitelist.accountNumberPlaceholder")}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("whitelist.accountHolderLabel")}</Label>
                  <Input
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder={t("whitelist.accountHolderPlaceholder")}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={adding || !bankCode || !branchCode || !accountNumber || !accountHolder || !label}
                >
                  {adding ? t("common.adding") : t("common.add")}
                </Button>
              </form>
            </div>
          )}
          <p className="mb-3 text-muted-foreground text-sm">{t("common.totalCount", list.length)}</p>
          {list.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">{t("whitelist.emptyList")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {list.map((item) => (
                <div
                  key={`${item.branchCode}-${item.accountNumber}`}
                  className="flex items-start gap-4 rounded-2xl border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.label}</span>
                      <span className="text-muted-foreground text-xs">{formatDate(item.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm">
                      {getBankName(item.bankCode)} {getBranchName(item.branchCode)} / {item.accountNumber}
                    </p>
                    <p className="mt-0.5 text-muted-foreground text-xs">{item.accountHolder}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="shrink-0"
                    disabled={prereq.disabled}
                    onClick={() => submitRemove(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <OperationMfaDialog
        open={operationMfaOpen}
        onClose={() => setOperationMfaOpen(false)}
        onVerified={() => {
          setOperationMfaOpen(false);
          const retry = pendingRetry.current;
          pendingRetry.current = null;
          retry?.();
        }}
      />
    </>
  );
}

export function WhitelistPage() {
  const { t } = useI18n();
  const { refreshAll } = useAuthContext();
  const prereq = usePrerequisites({ requireKyc: true, requireMfa: true });

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Tabs defaultValue="bank">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="bank" className="flex-1">
            {t("whitelist.bankTab")}
          </TabsTrigger>
          <TabsTrigger value="xrp" className="flex-1">
            {t("whitelist.xrpTab")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bank">
          <BankWhitelistTab prereq={prereq} onKycComplete={refreshAll} />
        </TabsContent>
        <TabsContent value="xrp">
          <XrpWhitelistTab prereq={prereq} onKycComplete={refreshAll} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
