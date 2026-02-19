import type { TotpSecret } from "firebase/auth";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { KycDialog } from "@/components/KycDialog";
import { MfaSetupDialog } from "@/components/MfaSetupDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/i18n";
import { setupWallet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAuthContext } from "@/lib/useAuthContext";

interface Operator {
  id: string;
  name: string;
  email: string;
  dailyLimit: number;
  allowedOperations: string[];
  createdAt: string;
}

const STORAGE_KEY = "admin_operators";

function loadOperators(): Operator[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOperators(ops: Operator[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
}

const ALL_OPS = ["fiat_deposit", "fiat_withdrawal", "xrp_deposit", "xrp_withdrawal", "exchange"] as const;

const OP_LABEL_KEYS: Record<string, string> = {
  fiat_deposit: "admin.opFiatDeposit",
  fiat_withdrawal: "admin.opFiatWithdrawal",
  xrp_deposit: "admin.opXrpDeposit",
  xrp_withdrawal: "admin.opXrpWithdrawal",
  exchange: "admin.opExchange",
};

export function SettingsPage() {
  const { user, address, refreshAll } = useAuthContext();
  const { t } = useI18n();
  const { hasTotpMfa, startTotpEnrollment } = useAuth();
  const [kycOpen, setKycOpen] = useState(false);
  const [mfaSecret, setMfaSecret] = useState<TotpSecret | null>(null);
  const [mfaStarting, setMfaStarting] = useState(false);
  const [mfaError, setMfaError] = useState("");

  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState("");

  async function handleStartMfa() {
    setMfaError("");
    setMfaStarting(true);
    try {
      const secret = await startTotpEnrollment();
      setMfaSecret(secret);
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : t("settings.mfaEnrollError"));
    } finally {
      setMfaStarting(false);
    }
  }

  async function handleSetupWallet() {
    setWalletError("");
    setWalletLoading(true);
    try {
      await setupWallet();
      refreshAll();
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : t("settings.walletError"));
    } finally {
      setWalletLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("settings.accountInfo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("settings.uid")}</span>
              <span className="font-mono text-xs">{user.uid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("settings.email")}</span>
              <span className="truncate pl-4">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("settings.displayName")}</span>
              <span>{user.name || "-"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("settings.kycStatus")}</span>
              {user.kycStatus === "approved" ? (
                <span className="text-green-600">{t("settings.kycApproved")}</span>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => setKycOpen(true)}>
                    {t("settings.kycGoToPage")}
                  </Button>
                  <KycDialog open={kycOpen} onOpenChange={setKycOpen} onSuccess={refreshAll} />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("settings.walletSetup")}</CardTitle>
        </CardHeader>
        <CardContent>
          {address ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("settings.xrpAddress")}</span>
                <span className="truncate pl-4 font-mono text-xs">{address}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <p className="text-muted-foreground text-sm">{t("settings.walletDescription")}</p>
                <Button onClick={handleSetupWallet} disabled={walletLoading} className="shrink-0">
                  {walletLoading ? t("common.setting") : t("settings.walletSetupButton")}
                </Button>
              </div>
              {walletError && <p className="text-destructive text-sm">{walletError}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("settings.mfaTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {hasTotpMfa ? (
            <p className="text-green-600 text-sm">{t("settings.mfaEnabled")}</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <p className="text-muted-foreground text-sm">{t("settings.mfaDescription")}</p>
                <Button onClick={handleStartMfa} disabled={mfaStarting} className="shrink-0">
                  {mfaStarting ? t("common.processing") : t("settings.mfaSetupButton")}
                </Button>
              </div>
              {mfaError && <p className="text-destructive text-sm">{mfaError}</p>}
            </div>
          )}
        </CardContent>
      </Card>
      <MfaSetupDialog
        secret={mfaSecret}
        onClose={() => {
          setMfaSecret(null);
          refreshAll();
        }}
      />

      <Separator />

      <AdminCard />
    </div>
  );
}

function AdminCard() {
  const { t } = useI18n();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [allowedOps, setAllowedOps] = useState<string[]>([]);

  useEffect(() => {
    setOperators(loadOperators());
  }, []);

  function handleToggleOp(op: string) {
    setAllowedOps((prev) => (prev.includes(op) ? prev.filter((o) => o !== op) : [...prev, op]));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const newOp: Operator = {
      id: crypto.randomUUID(),
      name,
      email,
      dailyLimit: Number(dailyLimit) || 0,
      allowedOperations: allowedOps,
      createdAt: new Date().toISOString(),
    };
    const updated = [...operators, newOp];
    setOperators(updated);
    saveOperators(updated);
    setName("");
    setEmail("");
    setDailyLimit("");
    setAllowedOps([]);
    setShowAdd(false);
  }

  function handleRemove(id: string) {
    if (!confirm(t("admin.removeConfirm"))) return;
    const updated = operators.filter((op) => op.id !== id);
    setOperators(updated);
    saveOperators(updated);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t("admin.title")}</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? t("common.cancel") : t("admin.addOperator")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showAdd && (
          <div className="mb-4 rounded-2xl border p-4">
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("admin.name")}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.email")}</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("admin.dailyLimitYen")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.allowedOps")}</Label>
                <div className="flex flex-wrap gap-3">
                  {ALL_OPS.map((op) => (
                    <label key={op} htmlFor={`op-${op}`} className="flex items-center gap-1.5 text-sm">
                      <Checkbox
                        id={`op-${op}`}
                        checked={allowedOps.includes(op)}
                        onCheckedChange={() => handleToggleOp(op)}
                      />
                      {t(OP_LABEL_KEYS[op])}
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={!name || !email || !dailyLimit || allowedOps.length === 0}>
                {t("admin.addOperator")}
              </Button>
            </form>
          </div>
        )}

        <p className="mb-3 text-muted-foreground text-sm">{t("admin.operatorList")}</p>

        {operators.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground text-sm">{t("admin.emptyList")}</p>
        ) : (
          <div className="space-y-3">
            {operators.map((op) => (
              <div key={op.id} className="flex items-start gap-4 rounded-2xl border p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{op.name}</span>
                    <span className="text-muted-foreground text-xs">{op.email}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-xs">
                    <span>
                      {t("admin.dailyLimit")}: ¥{op.dailyLimit.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {op.allowedOperations.map((aop) => (
                      <span key={aop} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {t(OP_LABEL_KEYS[aop])}
                      </span>
                    ))}
                  </div>
                </div>
                <Button variant="ghost" size="icon-xs" className="shrink-0" onClick={() => handleRemove(op.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
