import { ShieldAlert, UserX } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KycDialog } from "@/components/KycDialog";
import { useI18n } from "@/i18n";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/types";

export function AccountAlerts({ user, onKycComplete }: { user: User; onKycComplete?: () => void }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { hasTotpMfa } = useAuth();
  const [kycOpen, setKycOpen] = useState(false);

  const showMfa = !hasTotpMfa;
  const showKyc = user.kycStatus !== "approved";

  if (!showMfa && !showKyc) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-2 px-4 pt-4">
      {showMfa && (
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="flex w-full items-center gap-3 rounded-4xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100"
        >
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm">{t("alerts.mfaTitle")}</p>
            <p className="text-muted-foreground text-xs">{t("alerts.mfaDescription")}</p>
          </div>
          <span className="shrink-0 text-muted-foreground text-xs">&rsaquo;</span>
        </button>
      )}
      {showKyc && (
        <>
          <button
            type="button"
            onClick={() => setKycOpen(true)}
            className="flex w-full items-center gap-3 rounded-4xl border border-blue-200 bg-blue-50 px-4 py-3 text-left transition-colors hover:bg-blue-100"
          >
            <UserX className="h-5 w-5 shrink-0 text-blue-600" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{t("alerts.kycTitle")}</p>
              <p className="text-muted-foreground text-xs">{t("alerts.kycDescription")}</p>
            </div>
            <span className="shrink-0 text-muted-foreground text-xs">&rsaquo;</span>
          </button>
          <KycDialog open={kycOpen} onOpenChange={setKycOpen} onSuccess={() => onKycComplete?.()} />
        </>
      )}
    </div>
  );
}
