import { Check, Copy } from 'lucide-react';
import { type SubmitEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { generateApiToken, updateMe } from '@/lib/api';
import { saveAccount } from '@/lib/auth';
import { useAuthContext } from '@/lib/useAuthContext';

export function SettingsPage() {
  const { account, refreshAccount } = useAuthContext();

  // Name form
  const [accountHolder, setAccountHolder] = useState(account.accountHolder);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');
  const [nameLoading, setNameLoading] = useState(false);

  // PIN form
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Pubsub
  const [pubsubEnabled, setPubsubEnabled] = useState(account.pubsubEnabled);
  const [pubsubLoading, setPubsubLoading] = useState(false);

  // API Token
  const [apiToken, setApiToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleNameSubmit(e: SubmitEvent) {
    e.preventDefault();
    setNameError('');
    setNameSuccess('');
    setNameLoading(true);
    try {
      const updated = await updateMe({ accountHolder });
      saveAccount(updated);
      refreshAccount();
      setNameSuccess('名義を更新しました');
    } catch (err) {
      setNameError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setNameLoading(false);
    }
  }

  async function handleTogglePubsub() {
    setPubsubLoading(true);
    try {
      const next = !pubsubEnabled;
      const updated = await updateMe({ pubsubEnabled: next });
      saveAccount(updated);
      refreshAccount();
      setPubsubEnabled(next);
    } catch {
      // revert on failure
    } finally {
      setPubsubLoading(false);
    }
  }

  async function handleGenerateToken() {
    setTokenError('');
    setTokenLoading(true);
    try {
      const res = await generateApiToken();
      setApiToken(res.token);
      setCopied(false);
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : 'トークンの生成に失敗しました');
    } finally {
      setTokenLoading(false);
    }
  }

  async function handleCopyToken() {
    await navigator.clipboard.writeText(apiToken);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  async function handlePinSubmit(e: SubmitEvent) {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');
    setPinLoading(true);
    try {
      await updateMe({ pin: newPin, oldPin });
      setPinSuccess('暗証番号を変更しました');
      setOldPin('');
      setNewPin('');
    } catch (err) {
      setPinError(err instanceof Error ? err.message : '変更に失敗しました');
    } finally {
      setPinLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-6">
      {/* Update name */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">名義変更</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountHolder">口座名義</Label>
              <Input
                id="accountHolder"
                value={accountHolder}
                onChange={(e) => {
                  setAccountHolder(e.target.value);
                }}
                placeholder="口座名義を入力"
                required
              />
            </div>
            {nameError && <p className="text-destructive text-sm">{nameError}</p>}
            {nameSuccess && <p className="text-sm text-green-700">{nameSuccess}</p>}
            <Button type="submit" disabled={nameLoading || !accountHolder} className="w-full">
              {nameLoading ? '更新中...' : '名義を更新'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Change PIN */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">暗証番号変更</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oldPin">現在の暗証番号</Label>
              <Input
                id="oldPin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={oldPin}
                onChange={(e) => {
                  setOldPin(e.target.value.replace(/\D/g, ''));
                }}
                placeholder="現在の暗証番号を入力"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPin">新しい暗証番号</Label>
              <Input
                id="newPin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => {
                  setNewPin(e.target.value.replace(/\D/g, ''));
                }}
                placeholder="新しい暗証番号を入力"
                required
              />
            </div>
            {pinError && <p className="text-destructive text-sm">{pinError}</p>}
            {pinSuccess && <p className="text-sm text-green-700">{pinSuccess}</p>}
            <Button
              type="submit"
              disabled={pinLoading || oldPin.length !== 4 || newPin.length !== 4}
              className="w-full"
            >
              {pinLoading ? '変更中...' : '暗証番号を変更'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {account.accountType === 'corporate' && (
        <>
          <Separator />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">入金通知（Pub/Sub）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-sm">入金時にPub/Subメッセージを受信する</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pubsubEnabled}
                  disabled={pubsubLoading}
                  onClick={handleTogglePubsub}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    pubsubEnabled ? 'bg-primary' : 'bg-input'
                  }`}
                >
                  <span
                    className={`bg-background pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform ${
                      pubsubEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          <Separator />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">API Token</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                外部システム連携用のAPIトークンを生成します。生成後は安全な場所に保管してください。
              </p>
              {apiToken && (
                <div className="flex items-center gap-2">
                  <Input value={apiToken} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={handleCopyToken}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              )}
              {tokenError && <p className="text-destructive text-sm">{tokenError}</p>}
              <Button onClick={handleGenerateToken} disabled={tokenLoading} className="w-full">
                {tokenLoading ? '生成中...' : 'トークンを生成'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
