import { type SubmitEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { login } from "@/lib/api";
import { saveAccount, saveToken } from "@/lib/auth";
import { BRANCHES } from "@/lib/constants";

type AccountType = "personal" | "corporate";

function LoginForm({ accountType }: { accountType: AccountType }) {
  const navigate = useNavigate();
  const [branchCode, setBranchCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const branches = BRANCHES.filter((b) => b.accountType === accountType);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, account } = await login({ branchCode, accountNumber, pin });
      saveToken(token);
      saveAccount(account);
      void navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${accountType}-branchCode`}>支店</Label>
        <select
          id={`${accountType}-branchCode`}
          value={branchCode}
          onChange={(e) => {
            setBranchCode(e.target.value);
          }}
          className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
          required
        >
          <option value="" disabled>
            支店を選択してください
          </option>
          {branches.map((b) => (
            <option key={b.code} value={b.code}>
              {b.code} - {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${accountType}-accountNumber`}>口座番号</Label>
        <Input
          id={`${accountType}-accountNumber`}
          inputMode="numeric"
          maxLength={7}
          value={accountNumber}
          onChange={(e) => {
            setAccountNumber(e.target.value.replace(/\D/g, ""));
          }}
          placeholder="口座番号を入力（7桁）"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${accountType}-pin`}>暗証番号（4桁）</Label>
        <Input
          id={`${accountType}-pin`}
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ""));
          }}
          placeholder="暗証番号を入力"
          required
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button
        type="submit"
        className="w-full"
        disabled={loading || !branchCode || accountNumber.length !== 7 || pin.length !== 4}
      >
        {loading ? "ログイン中..." : "ログイン"}
      </Button>
    </form>
  );
}

export function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col bg-gray-50">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <img src="/logo-full.svg" alt="NexBridge" className="mx-auto mb-2 h-10" />
            <CardTitle className="text-xl">ログイン</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="personal">
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="personal" className="flex-1">
                  個人
                </TabsTrigger>
                <TabsTrigger value="corporate" className="flex-1">
                  法人
                </TabsTrigger>
              </TabsList>
              <TabsContent value="personal">
                <LoginForm accountType="personal" />
              </TabsContent>
              <TabsContent value="corporate">
                <LoginForm accountType="corporate" />
              </TabsContent>
            </Tabs>
            <p className="text-muted-foreground mt-4 text-center text-sm">
              口座をお持ちでない方は
              <Link to="/register" className="text-primary ml-1 underline">
                新規口座開設
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
