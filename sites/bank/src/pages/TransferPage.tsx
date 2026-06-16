import { type SubmitEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lookupAccount, transfer } from "@/lib/api";
import { BRANCHES, BRANCH_MAP } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { useAuthContext } from "@/lib/useAuthContext";

type Step = "form" | "confirm" | "done";

interface LookupResult {
  accountHolder: string;
  bankCode: string;
  branchCode: string;
  accountNumber: string;
}

export function TransferPage() {
  const navigate = useNavigate();
  const { account, refreshAccount } = useAuthContext();
  const [step, setStep] = useState<Step>("form");
  const [toBranchCode, setToBranchCode] = useState("");
  const [toAccountNumber, setToAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [result, setResult] = useState<{
    balance: number;
    transactionId: string;
  } | null>(null);

  async function handleConfirm(e: SubmitEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const info = await lookupAccount(toBranchCode, toAccountNumber);
      setLookup(info);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "振込先の確認に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleTransfer() {
    setError("");
    setLoading(true);
    try {
      const res = await transfer(toBranchCode, toAccountNumber, Number(amount), pin);
      setResult(res);
      setStep("done");
      refreshAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : "振込に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("form");
    setToBranchCode("");
    setToAccountNumber("");
    setAmount("");
    setPin("");
    setError("");
    setLookup(null);
    setResult(null);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">振込（お振込み）</CardTitle>
        </CardHeader>
        <CardContent>
          {step === "done" && result ? (
            <div className="space-y-4 text-center">
              <p className="text-muted-foreground text-sm">振込が完了しました</p>
              <p className="text-2xl font-semibold">{formatCurrency(Number(amount))}</p>
              <div className="space-y-1 rounded-md border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">振込先</span>
                  <span>{lookup?.accountHolder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">振込先支店</span>
                  <span>
                    {toBranchCode} {BRANCH_MAP[toBranchCode]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">振込先口座</span>
                  <span className="font-mono">{toAccountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">取引ID</span>
                  <span className="font-mono text-xs">{result.transactionId}</span>
                </div>
              </div>
              <p className="text-muted-foreground text-sm">残高: {formatCurrency(result.balance)}</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={reset}>
                  続けて振込
                </Button>
                <Button className="flex-1" onClick={() => navigate("/")}>
                  ホームへ戻る
                </Button>
              </div>
            </div>
          ) : step === "confirm" && lookup ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-center text-sm">以下の内容で振込みます。ご確認ください。</p>
              <div className="space-y-2 rounded-md border p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">振込先名義</span>
                  <span className="font-medium">{lookup.accountHolder}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">振込先支店</span>
                  <span>
                    {toBranchCode} {BRANCH_MAP[toBranchCode]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">振込先口座</span>
                  <span className="font-mono">{toAccountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">振込金額</span>
                  <span className="font-medium">{formatCurrency(Number(amount))}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">暗証番号</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, ""));
                  }}
                  placeholder="暗証番号を入力"
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep("form");
                    setPin("");
                    setError("");
                  }}
                  disabled={loading}
                >
                  戻る
                </Button>
                <Button className="flex-1" onClick={handleTransfer} disabled={loading || pin.length !== 4}>
                  {loading ? "処理中..." : "振込を実行"}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="toBranch">振込先支店</Label>
                <select
                  id="toBranch"
                  value={toBranchCode}
                  onChange={(e) => {
                    setToBranchCode(e.target.value);
                  }}
                  className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
                  required
                >
                  <option value="" disabled>
                    支店を選択してください
                  </option>
                  {BRANCHES.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.code} - {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="toAccount">振込先口座番号</Label>
                <Input
                  id="toAccount"
                  inputMode="numeric"
                  maxLength={7}
                  value={toAccountNumber}
                  onChange={(e) => {
                    setToAccountNumber(e.target.value.replace(/\D/g, ""));
                  }}
                  placeholder="口座番号を入力（7桁）"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">振込金額（円）</Label>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  max={account.balance}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                  }}
                  placeholder="金額を入力"
                  required
                />
                <p className="text-muted-foreground text-xs">残高: {formatCurrency(account.balance)}</p>
                {amount && Number(amount) > account.balance && (
                  <p className="text-destructive text-xs">金額が残高を超えています</p>
                )}
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={
                  loading ||
                  !toBranchCode ||
                  toAccountNumber.length !== 7 ||
                  !amount ||
                  Number(amount) > account.balance
                }
              >
                {loading ? "確認中..." : "確認する"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
