import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { authorizeToken } from "@/lib/api";
import { useAuthContext } from "@/lib/useAuthContext";

interface AuthorizeDialogProps {
  tokenId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AuthorizeDialog({ tokenId, open, onOpenChange, onSuccess }: AuthorizeDialogProps) {
  const { t } = useI18n();
  const { address, tokens } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = tokens.find((tk) => tk.tokenId === tokenId);

  async function handleAuthorize() {
    setError("");
    setLoading(true);
    try {
      await authorizeToken(tokenId);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deposit.authorizeError"));
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
          <DialogTitle>{t("deposit.authorize")}</DialogTitle>
          <DialogDescription>{t("deposit.authorizeWarning")}</DialogDescription>
        </DialogHeader>

        {token && (
          <div className="space-y-3 rounded-2xl border p-3 text-sm">
            <div>
              <p className="text-muted-foreground">{t("authorization.account")}</p>
              <p className="truncate font-mono text-xs">{address}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("authorization.token")}</p>
              <p className="font-medium">{token.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("authorization.issuer")}</p>
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
            {t("common.cancel")}
          </Button>
          <Button onClick={handleAuthorize} disabled={loading}>
            {loading ? t("common.setting") : t("deposit.authorize")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
