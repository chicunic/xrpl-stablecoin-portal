import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/i18n';
import { ensureTrustLine } from '@/lib/api';
import { useAuthContext } from '@/lib/useAuthContext';

interface TrustLineDialogProps {
  tokenId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TrustLineDialog({ tokenId, open, onOpenChange, onSuccess }: TrustLineDialogProps) {
  const { t } = useI18n();
  const { address, tokens } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = tokens.find((tk) => tk.tokenId === tokenId);

  async function handleSetTrustline() {
    setError('');
    setLoading(true);
    try {
      await ensureTrustLine(tokenId);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deposit.trustLineError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!loading) onOpenChange(v);
      }}
    >
      <DialogContent showCloseButton={!loading}>
        <DialogHeader>
          <DialogTitle>{t('deposit.trustLineSet')}</DialogTitle>
          <DialogDescription>{t('deposit.trustLineWarning')}</DialogDescription>
        </DialogHeader>

        {token && (
          <div className="space-y-3 rounded-2xl border p-3 text-sm">
            <div>
              <p className="text-muted-foreground">{t('trustline.account')}</p>
              <p className="truncate font-mono text-xs">{address}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('trustline.currency')}</p>
              <p className="font-medium">{token.currency}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t('trustline.issuer')}</p>
              <p className="truncate font-mono text-xs">{token.issuerAddress}</p>
            </div>
          </div>
        )}

        {error && <p className="text-destructive text-sm">{error}</p>}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
            disabled={loading}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSetTrustline} disabled={loading}>
            {loading ? t('common.setting') : t('deposit.trustLineSet')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
