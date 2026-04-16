import { UserCheck } from 'lucide-react';
import { useState } from 'react';
import { KycDialog } from '@/components/KycDialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

interface KycRequiredAlertProps {
  onSuccess?: () => void;
}

export function KycRequiredAlert({ onSuccess }: KycRequiredAlertProps) {
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-4xl border border-blue-200 bg-blue-50 p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            <p className="text-sm font-medium">{t('kyc.requiredTitle')}</p>
          </div>
          <p className="text-muted-foreground text-sm">{t('kyc.requiredDescription')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          {t('kyc.goToKyc')}
        </Button>
      </div>
      <KycDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={() => onSuccess?.()} />
    </>
  );
}
