import { CheckCircle2 } from 'lucide-react';
import { type SubmitEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/i18n';
import { refreshSession, submitKyc } from '@/lib/api';
import { useAuthContext } from '@/lib/useAuthContext';

export function KycPage() {
  const { t } = useI18n();
  const { user, refreshAll } = useAuthContext();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [city, setCity] = useState('');
  const [town, setTown] = useState('');
  const [address, setAddress] = useState('');

  const [postalInvalid, setPostalInvalid] = useState(false);

  useEffect(() => {
    setPrefecture('');
    setCity('');
    setTown('');
    setPostalInvalid(false);
    const digits = postalCode.replace(/-/g, '');
    if (digits.length !== 7) return;
    fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits}`)
      .then((res) => res.json())
      .then((data: { results?: { address1: string; address2: string; address3: string }[] }) => {
        if (data.results?.[0]) {
          const r = data.results[0];
          setPrefecture(r.address1);
          setCity(r.address2);
          setTown(r.address3 || '');
        } else {
          setPostalInvalid(true);
        }
      })
      .catch(() => {});
  }, [postalCode]);

  const phoneInvalid = phoneNumber.length > 0 && !/^0\d{9,10}$/.test(phoneNumber);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await submitKyc({
        fullName,
        phoneNumber,
        postalCode: postalCode.replace(/-/g, ''),
        prefecture,
        city,
        town,
        address,
      });
      await refreshSession();
      refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('kyc.error'));
    } finally {
      setSubmitting(false);
    }
  }

  if (user.kycStatus === 'approved') {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              {t('kyc.approved')}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('kyc.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">氏名</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                }}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phoneNumber">電話番号</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="09012345678"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                }}
                pattern="0\d{9,10}"
                className={phoneInvalid ? 'border-destructive' : ''}
                required
              />
              {phoneInvalid && <p className="text-destructive text-xs">0から始まる10〜11桁の番号を入力してください</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="postalCode">郵便番号</Label>
              <Input
                id="postalCode"
                placeholder="123-4567"
                value={postalCode}
                onChange={(e) => {
                  setPostalCode(e.target.value);
                }}
                pattern="\d{3}-?\d{4}"
                className={postalInvalid ? 'border-destructive' : ''}
                required
              />
              {postalInvalid && <p className="text-destructive text-xs">有効な郵便番号を入力してください</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prefecture">都道府県</Label>
              <Input id="prefecture" value={prefecture} readOnly className="bg-muted" placeholder="自動入力" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city">市区町村</Label>
              <Input id="city" value={city} readOnly className="bg-muted" placeholder="自動入力" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="town">町域</Label>
              <Input id="town" value={town} readOnly className="bg-muted" placeholder="自動入力" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">番地・建物名など</Label>
              <Input
                id="address"
                placeholder="1-2-3 ○○マンション101"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                }}
                required
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button
              type="submit"
              disabled={
                submitting ||
                phoneInvalid ||
                postalInvalid ||
                !fullName ||
                !phoneNumber ||
                !postalCode ||
                !prefecture ||
                !city ||
                !address
              }
              className="w-full"
            >
              {submitting ? t('kyc.submitting') : t('kyc.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
