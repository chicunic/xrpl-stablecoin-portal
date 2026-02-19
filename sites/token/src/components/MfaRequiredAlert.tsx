import type { TotpSecret } from "firebase/auth";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { MfaSetupDialog } from "@/components/MfaSetupDialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth";

export function MfaRequiredAlert() {
  const { t } = useI18n();
  const { startTotpEnrollment } = useAuth();
  const [mfaSecret, setMfaSecret] = useState<TotpSecret | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  async function handleStart() {
    setError("");
    setStarting(true);
    try {
      const secret = await startTotpEnrollment();
      setMfaSecret(secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.mfaEnrollError"));
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-4xl border border-amber-200 bg-amber-50 p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <p className="font-medium text-sm">{t("mfa.requiredTitle")}</p>
          </div>
          <p className="text-muted-foreground text-sm">{t("mfa.requiredDescription")}</p>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={handleStart} disabled={starting}>
          {starting ? t("common.processing") : t("settings.mfaSetupButton")}
        </Button>
      </div>
      <MfaSetupDialog secret={mfaSecret} onClose={() => setMfaSecret(null)} />
    </>
  );
}
