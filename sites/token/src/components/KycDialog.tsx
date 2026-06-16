import { noop } from "@xrpl-stablecoin-portal/shared";
import { type SubmitEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import { refreshSession, submitKyc } from "@/lib/api";

interface KycDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

/** Detects full-width ASCII variants (U+FF01-FF5E) in the address field. */
function hasInvalidFullWidth(value: string): boolean {
  return /[\uFF01-\uFF5E]/.test(value);
}

function hasConsecutiveSpaces(value: string): boolean {
  return /\s{2,}/.test(value);
}

export function KycDialog({ open, onOpenChange, onSuccess }: KycDialogProps) {
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [city, setCity] = useState("");
  const [town, setTown] = useState("");
  const [address, setAddress] = useState("");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFullName("");
      setPhoneNumber("");
      setPostalCode("");
      setPrefecture("");
      setCity("");
      setTown("");
      setAddress("");
      setError("");
    }
  }, [open]);

  const [postalInvalid, setPostalInvalid] = useState(false);

  // Postal code auto-lookup
  useEffect(() => {
    setPrefecture("");
    setCity("");
    setTown("");
    setPostalInvalid(false);
    if (postalCode.length !== 7) return;
    if (!/^\d{7}$/.test(postalCode)) return;
    fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`)
      .then((res) => res.json())
      .then((data: { results?: { address1: string; address2: string; address3: string }[] }) => {
        if (data.results?.[0]) {
          const r = data.results[0];
          setPrefecture(r.address1);
          setCity(r.address2);
          setTown(r.address3 || "");
        } else {
          setPostalInvalid(true);
        }
      })
      .catch(noop);
  }, [postalCode]);

  const phoneInvalid = phoneNumber.length > 0 && !/^0\d{9,10}$/.test(phoneNumber);
  const addressInvalid = address.length > 0 && (hasInvalidFullWidth(address) || hasConsecutiveSpaces(address));
  const formIncomplete = !fullName || !phoneNumber || !postalCode || !prefecture || !city || !address;

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (addressInvalid) return;
    setError("");
    setSubmitting(true);
    try {
      await submitKyc({
        fullName,
        phoneNumber,
        postalCode,
        prefecture,
        city,
        town,
        address,
      });
      await refreshSession();
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("kyc.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!submitting) onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={!submitting}>
        <DialogHeader>
          <DialogTitle>{t("kyc.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="kyc-fullName">氏名</Label>
            <Input
              id="kyc-fullName"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
              }}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="kyc-phoneNumber">電話番号</Label>
            <Input
              id="kyc-phoneNumber"
              type="tel"
              inputMode="numeric"
              placeholder="09012345678"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value.replace(/\D/g, ""));
              }}
              pattern="0\d{9,10}"
              className={phoneInvalid ? "border-destructive" : ""}
              required
            />
            {phoneInvalid && <p className="text-destructive text-xs">0から始まる10〜11桁の番号を入力してください</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="kyc-postalCode">郵便番号</Label>
            <Input
              id="kyc-postalCode"
              inputMode="numeric"
              placeholder="1234567"
              value={postalCode}
              onChange={(e) => {
                setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 7));
              }}
              pattern="\d{7}"
              maxLength={7}
              className={postalInvalid ? "border-destructive" : ""}
              required
            />
            {postalInvalid && <p className="text-destructive text-xs">有効な郵便番号を入力してください</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="kyc-prefecture">都道府県</Label>
            <Input id="kyc-prefecture" value={prefecture} readOnly className="bg-muted" placeholder="自動入力" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="kyc-city">市区町村</Label>
            <Input id="kyc-city" value={city} readOnly className="bg-muted" placeholder="自動入力" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="kyc-town">町域</Label>
            <Input id="kyc-town" value={town} readOnly className="bg-muted" placeholder="自動入力" />
          </div>

          <div className="space-y-1">
            <Label htmlFor="kyc-address">番地・建物名など</Label>
            <Input
              id="kyc-address"
              placeholder="1-2-3 ○○マンション101"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
              }}
              className={addressInvalid ? "border-destructive" : ""}
              required
            />
            {addressInvalid && <p className="text-destructive text-xs">数字・英字・記号は半角で入力してください</p>}
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button
            type="submit"
            disabled={submitting || phoneInvalid || postalInvalid || addressInvalid || formIncomplete}
            className="w-full"
          >
            {submitting ? t("kyc.submitting") : t("kyc.submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
