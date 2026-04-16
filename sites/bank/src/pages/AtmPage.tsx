import { type SubmitEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deposit, withdraw } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { useAuthContext } from '@/lib/useAuthContext';

interface AtmFormProps {
  id: string;
  title: string;
  doneMessage: string;
  continueLabel: string;
  submitLabel: string;
  errorFallback: string;
  balance?: number;
  onSubmit: (amount: number, pin: string) => Promise<{ balance: number }>;
  onSuccess: () => void;
}

function AtmForm({
  id,
  title,
  doneMessage,
  continueLabel,
  submitLabel,
  errorFallback,
  balance,
  onSubmit,
  onSuccess,
}: AtmFormProps) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  function reset() {
    setResult(null);
    setAmount('');
    setPin('');
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await onSubmit(Number(amount), pin);
      setResult(res.balance);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : errorFallback);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {result !== null ? (
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground text-sm">{doneMessage}</p>
            <p className="text-2xl font-semibold">{formatCurrency(Number(amount))}</p>
            <p className="text-muted-foreground text-sm">残高: {formatCurrency(result)}</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={reset}>
                {continueLabel}
              </Button>
              <Button className="flex-1" onClick={() => navigate('/')}>
                ホームへ戻る
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${id}Amount`}>金額（円）</Label>
              <Input
                id={`${id}Amount`}
                type="number"
                min={1}
                max={balance}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                }}
                placeholder="金額を入力"
                required
              />
              {balance !== undefined && (
                <>
                  <p className="text-muted-foreground text-xs">残高: {formatCurrency(balance)}</p>
                  {amount && Number(amount) > balance && (
                    <p className="text-destructive text-xs">金額が残高を超えています</p>
                  )}
                </>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}Pin`}>暗証番号</Label>
              <Input
                id={`${id}Pin`}
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                }}
                placeholder="暗証番号を入力"
                required
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !amount || pin.length !== 4 || (balance !== undefined && Number(amount) > balance)}
            >
              {loading ? '処理中...' : submitLabel}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function AtmPage() {
  const { account, refreshAccount } = useAuthContext();

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <Tabs defaultValue="deposit">
        <TabsList className="w-full">
          <TabsTrigger value="deposit" className="flex-1">
            入金
          </TabsTrigger>
          <TabsTrigger value="withdraw" className="flex-1">
            出金
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deposit">
          <AtmForm
            id="deposit"
            title="入金（お預入れ）"
            doneMessage="入金が完了しました"
            continueLabel="続けて入金"
            submitLabel="入金する"
            errorFallback="入金に失敗しました"
            onSubmit={deposit}
            onSuccess={refreshAccount}
          />
        </TabsContent>

        <TabsContent value="withdraw">
          <AtmForm
            id="withdraw"
            title="出金（お引出し）"
            doneMessage="出金が完了しました"
            continueLabel="続けて出金"
            submitLabel="出金する"
            errorFallback="出金に失敗しました"
            balance={account.balance}
            onSubmit={withdraw}
            onSuccess={refreshAccount}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
