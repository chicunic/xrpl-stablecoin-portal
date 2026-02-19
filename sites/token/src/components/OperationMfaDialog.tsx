import { ShieldCheck } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useI18n } from "@/i18n";
import { verifyOperationMfa } from "@/lib/api";

interface OperationMfaDialogProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export function OperationMfaDialog({ open, onClose, onVerified }: OperationMfaDialogProps) {
  const { t } = useI18n();
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const verifyingRef = useRef(false);

  function reset() {
    setVerifying(false);
    setError("");
    setTotpCode("");
  }

  function handleClose() {
    if (verifying) return;
    reset();
    onClose();
  }

  const handleVerify = useCallback(
    async (code: string) => {
      if (!code || code.length !== 6 || verifyingRef.current) return;
      verifyingRef.current = true;
      setError("");
      setVerifying(true);
      try {
        await verifyOperationMfa(code);
        reset();
        onVerified();
      } catch {
        setError(t("mfa.operationError"));
        setTotpCode("");
        setVerifying(false);
      } finally {
        verifyingRef.current = false;
      }
    },
    [onVerified, t],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent showCloseButton={!verifying}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {t("mfa.operationTitle")}
          </DialogTitle>
          <DialogDescription>{t("mfa.operationEnterCode")}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={totpCode}
            onChange={(v) => {
              setTotpCode(v);
              if (v.length === 6) handleVerify(v);
            }}
            autoFocus
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={verifying}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => handleVerify(totpCode)} disabled={verifying || totpCode.length !== 6}>
            {verifying ? t("mfa.operationVerifying") : t("login.mfaVerify")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
