import type { TotpSecret } from 'firebase/auth';
import { ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useI18n } from '@/i18n';
import { refreshSession } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useAuthContext } from '@/lib/useAuthContext';

interface MfaSetupDialogProps {
  secret: TotpSecret | null;
  onClose: () => void;
}

export function MfaSetupDialog({ secret, onClose }: MfaSetupDialogProps) {
  const { user } = useAuthContext();
  const { t } = useI18n();
  const { finalizeTotpEnrollment } = useAuth();

  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadingRef = useRef(false);

  function reset() {
    setTotpCode('');
    setLoading(false);
    setError('');
    loadingRef.current = false;
  }

  function handleClose() {
    if (loading) return;
    reset();
    onClose();
  }

  const handleFinalize = useCallback(
    async (code: string) => {
      if (!secret || !code || code.length !== 6 || loadingRef.current) return;
      loadingRef.current = true;
      setError('');
      setLoading(true);
      try {
        await finalizeTotpEnrollment(secret, code);
        await refreshSession();
        reset();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('settings.mfaVerifyError'));
        setTotpCode('');
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [secret, finalizeTotpEnrollment, onClose, t],
  );

  return (
    <Dialog
      open={!!secret}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {t('settings.mfaTitle')}
          </DialogTitle>
          <DialogDescription>{t('settings.mfaScanQr')}</DialogDescription>
        </DialogHeader>

        {secret && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleFinalize(totpCode);
            }}
            className="space-y-4"
          >
            <div className="flex justify-center">
              <QRCodeSVG value={secret.generateQrCodeUrl(user.email, 'XRPL Stablecoin')} size={200} />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-muted-foreground text-xs">{t('settings.mfaSecretKey')}</p>
              <p className="bg-muted rounded px-2 py-1 font-mono text-xs break-all">{secret.secretKey}</p>
            </div>
            <InputOTP
              maxLength={6}
              value={totpCode}
              onChange={(v) => {
                setTotpCode(v);
                if (v.length === 6) void handleFinalize(v);
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
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || totpCode.length !== 6}>
              {loading ? t('common.processing') : t('settings.mfaVerifyButton')}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
