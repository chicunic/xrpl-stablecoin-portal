import { KycRequiredAlert } from "@/components/KycRequiredAlert";
import { MfaRequiredAlert } from "@/components/MfaRequiredAlert";
import { useAuth } from "@/lib/auth";
import { useAuthContext } from "@/lib/useAuthContext";

export function usePrerequisites({ requireKyc = true, requireMfa = false } = {}) {
  const { user } = useAuthContext();
  const { hasTotpMfa } = useAuth();

  const needsKyc = requireKyc && user.kycStatus !== "approved";
  const needsMfa = requireMfa && !hasTotpMfa;

  return { needsKyc, needsMfa, disabled: needsKyc || needsMfa };
}

export function PrerequisiteAlerts({
  needsKyc,
  needsMfa,
  onKycComplete,
}: {
  needsKyc: boolean;
  needsMfa: boolean;
  onKycComplete?: () => void;
}) {
  if (!needsKyc && !needsMfa) return null;

  return (
    <div className="mb-4 space-y-3">
      {needsKyc && <KycRequiredAlert onSuccess={onKycComplete} />}
      {needsMfa && <MfaRequiredAlert />}
    </div>
  );
}
